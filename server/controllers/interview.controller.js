import fs from "fs"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import { runDecisionEngine } from "../services/decision.engine.js";
import User from "../models/user.model.js";
import Interview from "../models/interview.model.js";

const isOwnedInterview = (interview, userId) =>
  String(interview.userId) === String(userId);

const clampScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 10) return 10;
  return parsed;
};

const normalizeBuzzwordDensity = (value) => {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
};

const parseStrictJson = (aiResponse) => {
  if (!aiResponse || typeof aiResponse !== "string") {
    throw new Error("AI returned empty response");
  }

  try {
    return JSON.parse(aiResponse);
  } catch {
    const match = aiResponse.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("AI response is not valid JSON");
    }
    return JSON.parse(match[0]);
  }
};

const normalizeEvaluation = (parsed) => {
  const conceptual = clampScore(parsed?.conceptual_correctness);
  const implementation = clampScore(parsed?.implementation_depth);
  const tradeoff = clampScore(parsed?.tradeoff_awareness);
  const clarity = clampScore(parsed?.clarity);
  const confidence = clampScore(parsed?.confidence);

  const finalScore = Number(
    ((conceptual + implementation + tradeoff + clarity + confidence) / 5).toFixed(1)
  );

  return {
    conceptual_correctness: conceptual,
    implementation_depth: implementation,
    tradeoff_awareness: tradeoff,
    clarity,
    confidence,
    vagueness_flag: Boolean(parsed?.vagueness_flag),
    buzzword_density: normalizeBuzzwordDensity(parsed?.buzzword_density),
    feedback:
      typeof parsed?.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : "You showed effort. Improve depth and explain practical tradeoffs more clearly.",
    finalScore,
  };
};

const normalizeSessionState = (sessionState, questions) => {
  const safeState = sessionState && typeof sessionState === "object" ? sessionState : {};

  return {
    current_difficulty: Number.isFinite(Number(safeState.current_difficulty))
      ? Math.max(1, Math.min(5, Math.round(Number(safeState.current_difficulty))))
      : 2,
    weakness_tags: Array.isArray(safeState.weakness_tags) ? safeState.weakness_tags : [],
    strengths: Array.isArray(safeState.strengths) ? safeState.strengths : [],
    confidence_score: Number.isFinite(Number(safeState.confidence_score))
      ? Math.max(0, Math.min(10, Number(safeState.confidence_score)))
      : 5,
    strategy_history: Array.isArray(safeState.strategy_history) ? safeState.strategy_history : [],
    question_history: Array.isArray(safeState.question_history)
      ? safeState.question_history
      : questions
          .map((item) => (typeof item?.question === "string" ? item.question.trim() : ""))
          .filter(Boolean),
  };
};

const getDifficultyMeta = (difficulty) => {
  if (difficulty >= 4) {
    return { label: "hard", timeLimit: 120 };
  }
  if (difficulty >= 3) {
    return { label: "medium", timeLimit: 90 };
  }
  return { label: "easy", timeLimit: 60 };
};

const dedupeList = (items) => [...new Set(items.filter(Boolean))];

const deriveResumeFocusAreas = (resumeText, weaknessTags) => {
  const safeResume = typeof resumeText === "string" ? resumeText.toLowerCase() : "";
  const fromWeakness = weaknessTags.slice(0, 3);
  const fromResume = [];

  if (safeResume.includes("deployment")) fromResume.push("deployment");
  if (safeResume.includes("monitor")) fromResume.push("monitoring");
  if (safeResume.includes("scal")) fromResume.push("scalability");
  if (safeResume.includes("architecture")) fromResume.push("architecture");

  return dedupeList([...fromWeakness, ...fromResume]).slice(0, 3);
};

const buildFallbackQuestion = (strategy, role, focusAreas) => {
  const safeRole = role || "this role";
  const focusText = focusAreas.length ? focusAreas.join(", ") : "your recent project";

  if (strategy === "clarify") {
    return `Can you clarify your core approach for ${safeRole} and explain the exact problem you solved in ${focusText}?`;
  }
  if (strategy === "probe_deeper") {
    return `Please go deeper into your implementation details for ${focusText}, including tradeoffs, failure cases, and production constraints.`;
  }
  if (strategy === "ask_example") {
    return `Give one concrete production example from ${focusText} with measurable impact and the key decisions you made.`;
  }
  if (strategy === "increase_difficulty") {
    return `Design a harder ${safeRole} scenario for ${focusText} and explain how you would scale, monitor, and debug it end to end.`;
  }
  return `Switching topic slightly, explain how your ${safeRole} experience prepared you to handle ambiguity in ${focusText}.`;
};

const generateAdaptiveQuestion = async ({
  interview,
  strategy,
  difficultyLabel,
  weaknessTags,
  strengths,
  questionHistory,
}) => {
  const focusAreas = deriveResumeFocusAreas(interview?.resumeText, weaknessTags);
  const fallbackQuestion = buildFallbackQuestion(strategy, interview?.role, focusAreas);

  const messages = [
    {
      role: "system",
      content: `
You are an adaptive interviewer.
Generate exactly one interview question as one sentence.
Rules:
- 15 to 28 words
- no numbering
- no preface or explanation
- must follow strategy and focus areas
- difficulty should be ${difficultyLabel}
- return plain text only
`,
    },
    {
      role: "user",
      content: `
Role: ${interview?.role || "Unknown"}
Experience: ${interview?.experience || "Unknown"}
Mode: ${interview?.mode || "Technical"}
Strategy: ${strategy}
Weakness tags: ${weaknessTags.join(", ") || "none"}
Strength tags: ${strengths.join(", ") || "none"}
Focus areas: ${focusAreas.join(", ") || "none"}
Recent questions: ${questionHistory.slice(-3).join(" | ") || "none"}
Resume context: ${(interview?.resumeText || "").slice(0, 700)}
`,
    },
  ];

  try {
    const aiResponse = await askAi(messages);
    const firstLine = String(aiResponse || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)[0];

    if (!firstLine) {
      return { question: fallbackQuestion, focusAreas };
    }
    return { question: firstLine, focusAreas };
  } catch {
    return { question: fallbackQuestion, focusAreas };
  }
};

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }
    const filepath = req.file.path

    const fileBuffer = await fs.promises.readFile(filepath)
    const uint8Array = new Uint8Array(fileBuffer)

    const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

    let resumeText = "";

    // Extract text from all pages
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const pageText = content.items.map(item => item.str).join(" ");
      resumeText += pageText + "\n";
    }


    resumeText = resumeText
      .replace(/\s+/g, " ")
      .trim();

    const messages = [
      {
        role: "system",
        content: `
Extract structured data from resume.

Return strictly JSON:

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`
      },
      {
        role: "user",
        content: resumeText
      }
    ];


    const aiResponse = await askAi(messages)

    const parsed = JSON.parse(aiResponse);

    fs.unlinkSync(filepath)


    res.json({
      role: parsed.role,
      experience: parsed.experience,
      projects: parsed.projects,
      skills: parsed.skills,
      resumeText
    });

  } catch (error) {
    console.error(error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    return res.status(500).json({ message: "Failed to analyze resume" });
  }
};


export const generateQuestion = async (req, res) => {
  try {
    let { role, experience, mode, resumeText, projects, skills } = req.body

    if (!req.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    role = role?.trim();
    experience = experience?.trim();
    mode = mode?.trim();

    if (!role || !experience || !mode) {
      return res.status(400).json({ message: "Role, Experience and Mode are required." })
    }

    const user = await User.findById(req.userId)

    if (!user) {
      return res.status(404).json({
        message: "User not found."
      });
    }

    if (user.credits < 50) {
      return res.status(400).json({
        message: "Not enough credits. Minimum 50 required."
      });
    }

    const projectText = Array.isArray(projects) && projects.length
      ? projects.join(", ")
      : "None";

    const skillsText = Array.isArray(skills) && skills.length
      ? skills.join(", ")
      : "None";

    const safeResume = resumeText?.trim() || "None";

    const userPrompt = `
    Role:${role}
    Experience:${experience}
    InterviewMode:${mode}
    Projects:${projectText}
    Skills:${skillsText},
    Resume:${safeResume}
    `;

    if (!userPrompt.trim()) {
      return res.status(400).json({
        message: "Prompt content is empty."
      });
    }

    const messages = [

      {
        role: "system",
        content: `
You are a real human interviewer conducting a professional interview.

Speak in simple, natural English as if you are directly talking to the candidate.

Generate exactly 5 interview questions.

Strict Rules:
- Each question must contain between 15 and 25 words.
- Each question must be a single complete sentence.
- Do NOT number them.
- Do NOT add explanations.
- Do NOT add extra text before or after.
- One question per line only.
- Keep language simple and conversational.
- Questions must feel practical and realistic.

Difficulty progression:
Question 1 → easy  
Question 2 → easy  
Question 3 → medium  
Question 4 → medium  
Question 5 → hard  

Make questions based on the candidate’s role, experience,interviewMode, projects, skills, and resume details.
`
      }
      ,
      {
        role: "user",
        content: userPrompt
      }
    ];


    const aiResponse = await askAi(messages)

    if (!aiResponse || !aiResponse.trim()) {

      return res.status(500).json({
        message: "AI returned empty response."
      });

    }

    const questionsArray = aiResponse
      .split("\n")
      .map(q => q.trim())
      .filter(q => q.length > 0)
      .slice(0, 5);

    if (questionsArray.length === 0) {

      return res.status(500).json({
        message: "AI failed to generate questions."
      });
    }

    user.credits -= 50;
    await user.save();

    const interview = await Interview.create({
      userId: user._id,
      role,
      experience,
      mode,
      resumeText: safeResume,
      questions: questionsArray.map((q, index) => ({
        question: q,
        difficulty: ["easy", "easy", "medium", "medium", "hard"][index],
        timeLimit: [60, 60, 90, 90, 120][index],
      }))
    })

    res.json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name,
      questions: interview.questions
    });
  } catch (error) {
    console.error("failed to create interview", error);
    return res.status(500).json({ message: "failed to create interview" })
  }
}


export const submitAnswer = async (req, res) => {
  try {
    const { interviewId, questionIndex, answer, timeTaken } = req.body ?? {}
    const safeInterviewId = typeof interviewId === "string" ? interviewId.trim() : "";
    const safeTimeTaken = Number(timeTaken);

    if (!safeInterviewId) {
      return res.status(400).json({ message: "Interview id is required" });
    }
    if (!Number.isInteger(questionIndex) || questionIndex < 0) {
      return res.status(400).json({ message: "Invalid question index" });
    }
    if (!Number.isFinite(safeTimeTaken) || safeTimeTaken < 0) {
      return res.status(400).json({ message: "Invalid time taken" });
    }

    const interview = await Interview.findById(safeInterviewId)
    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }
    if (!isOwnedInterview(interview, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (questionIndex >= interview.questions.length) {
      return res.status(400).json({ message: "Invalid question index" });
    }

    const question = interview.questions[questionIndex]
    const safeAnswer = typeof answer === "string" ? answer.trim() : "";
    const sessionState = normalizeSessionState(interview.sessionState, interview.questions);

    // If no answer
    if (!safeAnswer) {
      question.score = 0;
      question.feedback = "You did not submit an answer.";
      question.answer = "";
      sessionState.question_history = dedupeList([
        ...sessionState.question_history,
        question.question,
      ]);
      interview.sessionState = sessionState;

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }

    // If time exceeded
    if (safeTimeTaken > question.timeLimit) {
      question.score = 0;
      question.feedback = "Time limit exceeded. Answer not evaluated.";
      question.answer = safeAnswer;

      sessionState.question_history = dedupeList([
        ...sessionState.question_history,
        question.question,
      ]);
      interview.sessionState = sessionState;

      await interview.save();

      return res.json({
        feedback: question.feedback
      });
    }


    const messages = [
      {
        role: "system",
        content: `
You are a strict interview evaluator.
Evaluate the candidate response and return ONLY valid JSON.
Do not include markdown, explanation, or extra text.

Return this exact schema:
{
  "conceptual_correctness": 1-10,
  "implementation_depth": 1-10,
  "tradeoff_awareness": 1-10,
  "clarity": 1-10,
  "confidence": 1-10,
  "vagueness_flag": boolean,
  "buzzword_density": "low" | "medium" | "high",
  "feedback": "10 to 18 words, professional and actionable"
}
`
      }
      ,
      {
        role: "user",
        content: `
Question: ${question.question}
Answer: ${safeAnswer}
`
      }
    ];

    const aiResponse = await askAi(messages)
    const parsed = parseStrictJson(aiResponse);
    const evaluation = normalizeEvaluation(parsed);

    question.answer = safeAnswer;
    question.confidence = evaluation.confidence;
    question.communication = evaluation.clarity;
    question.correctness = evaluation.conceptual_correctness;
    question.score = evaluation.finalScore;
    question.feedback = evaluation.feedback;

    const questionHistory = dedupeList([
      ...sessionState.question_history,
      question.question,
    ]);

    const decision = runDecisionEngine({
      evaluation: {
        conceptual_correctness: evaluation.conceptual_correctness,
        implementation_depth: evaluation.implementation_depth,
        tradeoff_awareness: evaluation.tradeoff_awareness,
        clarity: evaluation.clarity,
        confidence: evaluation.confidence,
        vagueness_flag: evaluation.vagueness_flag,
        buzzword_density: evaluation.buzzword_density,
      },
      sessionState: {
        ...sessionState,
        question_history: questionHistory,
      },
    });

    const updatedSessionState = {
      ...decision.updated_session_state,
      question_history: questionHistory,
    };

    const difficultyMeta = getDifficultyMeta(updatedSessionState.current_difficulty);
    const nextQuestionIndex = questionIndex + 1;
    let nextQuestionText = null;

    if (nextQuestionIndex < interview.questions.length) {
      const adaptiveQuestion = await generateAdaptiveQuestion({
        interview,
        strategy: decision.next_strategy,
        difficultyLabel: difficultyMeta.label,
        weaknessTags: updatedSessionState.weakness_tags,
        strengths: updatedSessionState.strengths,
        questionHistory,
      });

      const nextQuestionPayload = {
        question: adaptiveQuestion.question,
        difficulty: difficultyMeta.label,
        timeLimit: difficultyMeta.timeLimit,
        answer: "",
        feedback: "",
        score: 0,
        confidence: 0,
        communication: 0,
        correctness: 0,
      };

      const existingNextQuestion = interview.questions[nextQuestionIndex];
      if (!existingNextQuestion.answer) {
        existingNextQuestion.question = nextQuestionPayload.question;
        existingNextQuestion.difficulty = nextQuestionPayload.difficulty;
        existingNextQuestion.timeLimit = nextQuestionPayload.timeLimit;
        nextQuestionText = existingNextQuestion.question;
      }
    }

    interview.sessionState = updatedSessionState;

    await interview.save();

    return res.status(200).json({
      feedback: evaluation.feedback,
      nextQuestion: nextQuestionText,
      nextStrategy: decision.next_strategy,
      sessionState: updatedSessionState,
      evaluation: {
        conceptual_correctness: evaluation.conceptual_correctness,
        implementation_depth: evaluation.implementation_depth,
        tradeoff_awareness: evaluation.tradeoff_awareness,
        clarity: evaluation.clarity,
        confidence: evaluation.confidence,
        vagueness_flag: evaluation.vagueness_flag,
        buzzword_density: evaluation.buzzword_density,
      },
    })
  } catch (error) {
    console.error("failed to submit answer", error);
    return res.status(500).json({ message: "failed to submit answer" })

  }
}


export const finishInterview = async (req, res) => {
  try {
    const { interviewId } = req.body ?? {}
    const safeInterviewId = typeof interviewId === "string" ? interviewId.trim() : "";

    if (!safeInterviewId) {
      return res.status(400).json({ message: "Interview id is required" });
    }

    const interview = await Interview.findById(safeInterviewId)
    if (!interview) {
      return res.status(404).json({ message: "failed to find Interview" })
    }
    if (!isOwnedInterview(interview, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const totalQuestions = interview.questions.length;

    let totalScore = 0;
    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalScore += q.score || 0;
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });

    const finalScore = totalQuestions
      ? totalScore / totalQuestions
      : 0;

    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;

    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;

    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

    interview.finalScore = finalScore;
    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      finalScore: Number(finalScore.toFixed(1)),
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions.map((q) => ({
        question: q.question,
        score: q.score || 0,
        feedback: q.feedback || "",
        confidence: q.confidence || 0,
        communication: q.communication || 0,
        correctness: q.correctness || 0,
      })),
    })
  } catch (error) {
    console.error("failed to finish Interview", error);
    return res.status(500).json({ message: "failed to finish Interview" })
  }
}


export const getMyInterviews = async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .select("role experience mode finalScore status createdAt");

    return res.status(200).json(interviews)

  } catch (error) {
    console.error("failed to find currentUser Interview", error);
    return res.status(500).json({ message: "failed to find currentUser Interview" })
  }
}

export const getInterviewReport = async (req, res) => {
  try {
    const interviewId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!interviewId) {
      return res.status(400).json({ message: "Interview id is required" });
    }

    const interview = await Interview.findById(interviewId)

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }
    if (!isOwnedInterview(interview, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }


    const totalQuestions = interview.questions.length;

    let totalConfidence = 0;
    let totalCommunication = 0;
    let totalCorrectness = 0;

    interview.questions.forEach((q) => {
      totalConfidence += q.confidence || 0;
      totalCommunication += q.communication || 0;
      totalCorrectness += q.correctness || 0;
    });
    const avgConfidence = totalQuestions
      ? totalConfidence / totalQuestions
      : 0;

    const avgCommunication = totalQuestions
      ? totalCommunication / totalQuestions
      : 0;

    const avgCorrectness = totalQuestions
      ? totalCorrectness / totalQuestions
      : 0;

    return res.json({
      finalScore: interview.finalScore,
      confidence: Number(avgConfidence.toFixed(1)),
      communication: Number(avgCommunication.toFixed(1)),
      correctness: Number(avgCorrectness.toFixed(1)),
      questionWiseScore: interview.questions
    });

  } catch (error) {
    console.error("failed to find currentUser Interview report", error);
    return res.status(500).json({ message: "failed to find currentUser Interview report" })
  }
}




