import fs from "fs"
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import { askAi } from "../services/openRouter.service.js";
import { runDecisionEngine } from "../services/decision.engine.js";
import { runGapEngine } from "../services/gap.engine.js";
import { buildInterviewPlan } from "../services/interviewPlanner.service.js";
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

const roundToSingleDecimal = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Number(parsed.toFixed(1));
};

const normalizeBuzzwordDensity = (value) => {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
};

const clampPercent = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 100) return 100;
  return Math.round(parsed);
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

const askAiForJson = async (messages, fallbackValue, onFallback) => {
  try {
    const firstResponse = await askAi(messages);
    return parseStrictJson(firstResponse);
  } catch (firstError) {
    try {
      const retryMessages = [
        {
          role: "system",
          content: "Return valid JSON only. No markdown. No explanation.",
        },
        ...messages,
      ];
      const retryResponse = await askAi(retryMessages);
      return parseStrictJson(retryResponse);
    } catch (retryError) {
      if (typeof onFallback === "function") {
        onFallback(firstError, retryError);
      }
      return typeof fallbackValue === "function" ? fallbackValue() : fallbackValue;
    }
  }
};

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const normalizeTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => normalizeText(item).toLowerCase()).filter(Boolean))];
};

const toTitleCase = (value) =>
  value
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();

const toTitleList = (items) => items.map((item) => toTitleCase(item));

const parseMaybeJson = (value) => {
  if (!value) return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const getBodyList = (body, key) => {
  if (!body || typeof body !== "object") return [];
  const direct = body[key];
  const bracketed = body[`${key}[]`];
  const rawValue = bracketed ?? direct;

  if (Array.isArray(rawValue)) {
    return rawValue;
  }
  if (typeof rawValue === "string" && rawValue.trim()) {
    return [rawValue];
  }
  return [];
};

const normalizeWeightedSkillList = (value) => {
  const safeList = Array.isArray(value) ? value : [];
  const seen = new Set();
  const result = [];

  for (const item of safeList) {
    const name = normalizeText(item?.name ?? item);
    if (!name) continue;
    const normalizedName = name.toLowerCase();
    if (seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    const weight = Number(item?.weight);
    result.push({
      name: toTitleCase(normalizedName),
      weight: Number.isFinite(weight) ? Math.max(1, Math.min(10, Math.round(weight))) : 1,
    });
  }

  return result;
};

const normalizeWeakEvidenceSkills = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      skill: toTitleCase(normalizeText(item?.skill ?? "")),
      reason: normalizeText(item?.reason ?? ""),
    }))
    .filter((item) => item.skill);
};

const normalizeJdAlignment = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const strength = item?.strength === "strong" || item?.strength === "ok"
        ? item.strength
        : "weak";

      return {
        skill: toTitleCase(normalizeText(item?.skill ?? "")),
        strength,
      };
    })
    .filter((item) => item.skill);
};

const normalizeRoundMix = (value) => {
  const safeRounds = Array.isArray(value) ? value : [];
  const fallbackRoundMix = [
    { roundType: "behavioral", count: 1 },
    { roundType: "technical", count: 3 },
    { roundType: "situational", count: 1 },
  ];

  const normalizedRounds = safeRounds
    .map((item) => {
      const roundType = item?.roundType;
      const count = Number(item?.count);
      if (
        roundType !== "behavioral" &&
        roundType !== "technical" &&
        roundType !== "situational"
      ) {
        return null;
      }

      return {
        roundType,
        count: Number.isFinite(count) ? Math.max(1, Math.min(5, Math.round(count))) : 1,
      };
    })
    .filter(Boolean);

  return normalizedRounds.length ? normalizedRounds : fallbackRoundMix;
};

const normalizeBlueprintDays = (value) => {
  if (!Array.isArray(value)) return [];

  return value
    .map((item, index) => ({
      day: Number.isFinite(Number(item?.day))
        ? Math.max(1, Math.min(7, Math.round(Number(item.day))))
        : index + 1,
      title: normalizeText(item?.title ?? ""),
      tasks: Array.isArray(item?.tasks)
        ? item.tasks.map((task) => normalizeText(task)).filter(Boolean).slice(0, 5)
        : [],
      expectedOutcome: normalizeText(item?.expectedOutcome ?? ""),
    }))
    .filter((item) => item.title || item.tasks.length || item.expectedOutcome);
};

const safeUnlinkFile = (path) => {
  if (!path) return;
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
};

const extractPdfTextFromPath = async (filepath) => {
  const fileBuffer = await fs.promises.readFile(filepath);
  const uint8Array = new Uint8Array(fileBuffer);
  const pdf = await pdfjsLib.getDocument({ data: uint8Array }).promise;

  let extracted = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    extracted += `${content.items.map((item) => item.str).join(" ")}\n`;
  }

  return extracted.replace(/\s+/g, " ").trim();
};

const extractKeywordsFromText = (text, limit = 12) => {
  const safeText = normalizeText(text).toLowerCase();
  if (!safeText) return [];

  const stopWords = new Set([
    "with", "from", "that", "this", "have", "your", "their", "about",
    "using", "into", "over", "under", "between", "where", "which", "while",
    "would", "could", "should", "role", "experience", "skills", "project",
    "projects", "team", "work", "worked", "build", "built", "years", "year",
  ]);

  const tokens = safeText
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !stopWords.has(token));

  return [...new Set(tokens)].slice(0, limit);
};

const normalizeResumeAnalysis = ({
  role,
  experience,
  resumeText,
  projects,
  skills,
  resumeAnalysis,
}) => {
  const safeAnalysis = resumeAnalysis && typeof resumeAnalysis === "object" ? resumeAnalysis : {};

  const normalizedSkills = normalizeTextList(
    safeAnalysis.skills ?? skills
  );
  const normalizedProjects = normalizeTextList(
    safeAnalysis.projects ?? projects
  );
  const normalizedKeywords = normalizeTextList([
    ...(Array.isArray(safeAnalysis.keywords) ? safeAnalysis.keywords : []),
    ...extractKeywordsFromText(resumeText),
    ...normalizedSkills,
  ]);

  return {
    role: normalizeText(safeAnalysis.role || role) || "unknown",
    experience: normalizeText(safeAnalysis.experience || experience) || "unknown",
    projects: toTitleList(normalizedProjects),
    skills: toTitleList(normalizedSkills),
    keywords: normalizedKeywords.slice(0, 20),
  };
};

const buildResumeFallbackAnalysis = ({ role, experience, resumeText, projects, skills }) => {
  const safeText = normalizeText(resumeText);
  const lowered = safeText.toLowerCase();

  const rolePatterns = [
    "software engineer",
    "frontend developer",
    "backend developer",
    "full stack developer",
    "data scientist",
    "machine learning engineer",
    "devops engineer",
    "qa engineer",
    "product manager",
  ];

  const inferredRole = rolePatterns.find((item) => lowered.includes(item)) || normalizeText(role);
  const expMatch = lowered.match(/(\d+)\s*\+?\s*(years?|yrs?)/i);
  const inferredExperience = expMatch ? `${expMatch[1]} years` : normalizeText(experience);

  const skillBank = [
    "javascript", "typescript", "react", "node", "express", "mongodb", "sql", "python",
    "java", "c++", "firebase", "aws", "docker", "kubernetes", "tailwind", "redux",
    "rest api", "system design", "machine learning", "nlp",
  ];

  const inferredSkills = skillBank.filter((item) => lowered.includes(item)).slice(0, 10);

  return normalizeResumeAnalysis({
    role: inferredRole || "unknown",
    experience: inferredExperience || "unknown",
    resumeText: safeText,
    projects,
    skills: Array.isArray(skills) && skills.length ? skills : inferredSkills,
    resumeAnalysis: {
      role: inferredRole || "unknown",
      experience: inferredExperience || "unknown",
      projects: Array.isArray(projects) ? projects : [],
      skills: Array.isArray(skills) && skills.length ? skills : inferredSkills,
    },
  });
};

const hasResumeSignal = (resumeAnalysis) => {
  if (!resumeAnalysis || typeof resumeAnalysis !== "object") return false;
  const skillCount = Array.isArray(resumeAnalysis.skills) ? resumeAnalysis.skills.length : 0;
  const projectCount = Array.isArray(resumeAnalysis.projects) ? resumeAnalysis.projects.length : 0;
  const keywordCount = Array.isArray(resumeAnalysis.keywords) ? resumeAnalysis.keywords.length : 0;
  return skillCount + projectCount + keywordCount > 0;
};

const normalizeJdAnalysis = ({ parsed, sourceType, extractedTextPreview, ocrStatus = "enabled" }) => {
  const safeParsed = parsed && typeof parsed === "object" ? parsed : {};
  const mustHaveSkills = normalizeWeightedSkillList(
    safeParsed.mustHaveSkills ?? safeParsed.must_have_skills
  );
  const niceToHaveSkills = normalizeWeightedSkillList(
    safeParsed.niceToHaveSkills ?? safeParsed.nice_to_have_skills
  );
  const requiredSkills = toTitleList(normalizeTextList(
    safeParsed.required_skills ?? mustHaveSkills.map((item) => item.name)
  ));
  const preferredSkills = toTitleList(normalizeTextList(
    safeParsed.preferred_skills ?? niceToHaveSkills.map((item) => item.name)
  ));
  const keywordList = normalizeTextList(safeParsed.keywords).slice(0, 25);
  const responsibilities = Array.isArray(safeParsed.responsibilities)
    ? safeParsed.responsibilities.map((item) => normalizeText(item)).filter(Boolean).slice(0, 10)
    : [];
  const senioritySignals = Array.isArray(safeParsed.senioritySignals)
    ? safeParsed.senioritySignals.map((item) => normalizeText(item)).filter(Boolean).slice(0, 8)
    : [];
  const safeJdText = normalizeText(safeParsed.jdText || extractedTextPreview).replace(/\0/g, "").slice(0, 12000);

  return {
    sourceType: normalizeText(sourceType) || "unknown",
    extractedTextPreview: normalizeText(extractedTextPreview).slice(0, 300),
    jdText: safeJdText,
    roleTitle: normalizeText(safeParsed.roleTitle || safeParsed.target_role) || "unknown",
    senioritySignals,
    mustHaveSkills,
    niceToHaveSkills,
    responsibilities,
    required_skills: requiredSkills,
    preferred_skills: preferredSkills,
    keywords: keywordList,
    seniority: normalizeText(safeParsed.seniority).toLowerCase() || "unknown",
    target_role: normalizeText(safeParsed.target_role || safeParsed.roleTitle) || "unknown",
    ocrStatus,
    extractedAt: new Date().toISOString(),
    aiParseError: Boolean(safeParsed.aiParseError),
  };
};

const hasJdSignal = (jdAnalysis) => {
  if (!jdAnalysis || typeof jdAnalysis !== "object") return false;
  const requiredCount = Array.isArray(jdAnalysis.required_skills) ? jdAnalysis.required_skills.length : 0;
  const preferredCount = Array.isArray(jdAnalysis.preferred_skills) ? jdAnalysis.preferred_skills.length : 0;
  const keywordCount = Array.isArray(jdAnalysis.keywords) ? jdAnalysis.keywords.length : 0;
  return requiredCount + preferredCount + keywordCount > 0;
};

const normalizeGapAnalysis = (gapAnalysis) => {
  const safeGap = gapAnalysis && typeof gapAnalysis === "object" ? gapAnalysis : {};
  return {
    matchPercentage: Number.isFinite(Number(safeGap.matchPercentage))
      ? clampPercent(safeGap.matchPercentage)
      : 0,
    missingRequiredSkills: Array.isArray(safeGap.missingRequiredSkills) ? toTitleList(normalizeTextList(safeGap.missingRequiredSkills)) : [],
    missingPreferredSkills: Array.isArray(safeGap.missingPreferredSkills) ? toTitleList(normalizeTextList(safeGap.missingPreferredSkills)) : [],
    strongMatches: Array.isArray(safeGap.strongMatches) ? toTitleList(normalizeTextList(safeGap.strongMatches)) : [],
    weakMatches: Array.isArray(safeGap.weakMatches) ? toTitleList(normalizeTextList(safeGap.weakMatches)) : [],
    focusAreas: Array.isArray(safeGap.focusAreas) ? toTitleList(normalizeTextList(safeGap.focusAreas)) : [],
    atsSignals: {
      keywordMatchPercent: Number.isFinite(Number(safeGap?.atsSignals?.keywordMatchPercent))
        ? clampPercent(safeGap.atsSignals.keywordMatchPercent)
        : 0,
      suggestions: Array.isArray(safeGap?.atsSignals?.suggestions)
        ? safeGap.atsSignals.suggestions.map((item) => normalizeText(item)).filter(Boolean).slice(0, 5)
        : [],
    },
  };
};

const buildAtsMatch = ({ resumeAnalysis, jdAnalysis, gapAnalysis }) => {
  const normalizedGap = normalizeGapAnalysis(gapAnalysis);
  const safeResume = resumeAnalysis && typeof resumeAnalysis === "object" ? resumeAnalysis : {};
  const safeJd = jdAnalysis && typeof jdAnalysis === "object" ? jdAnalysis : {};
  const resumeKeywordSource = normalizeTextList([
    ...(Array.isArray(safeResume.keywords) ? safeResume.keywords : []),
    ...(Array.isArray(safeResume.skills) ? safeResume.skills : []),
    ...(Array.isArray(safeResume.projects) ? safeResume.projects : []),
  ]);
  const jdKeywordSource = normalizeTextList([
    ...(Array.isArray(safeJd.keywords) ? safeJd.keywords : []),
    ...(Array.isArray(safeJd.required_skills) ? safeJd.required_skills : []),
    ...(Array.isArray(safeJd.preferred_skills) ? safeJd.preferred_skills : []),
  ]);
  const resumeCorpus = new Set(resumeKeywordSource);
  const matchedKeywords = jdKeywordSource.filter((item) => resumeCorpus.has(item));

  const matchedMustHaves = Array.isArray(safeJd.required_skills)
    ? safeJd.required_skills.filter((item) => {
        const normalized = normalizeText(item).toLowerCase();
        return normalized && !normalizedGap.missingRequiredSkills.map((skill) => skill.toLowerCase()).includes(normalized);
      })
    : [];

  const weakEvidenceSkills = normalizedGap.weakMatches.slice(0, 5).map((skill) => ({
    skill,
    reason: "Mentioned in resume context but not strongly evidenced in interview preparation inputs.",
  }));

  return {
    matchPercent: clampPercent(normalizedGap.matchPercentage),
    matchedMustHaves: toTitleList(normalizeTextList(matchedMustHaves)),
    missingMustHaves: normalizedGap.missingRequiredSkills,
    weakEvidenceSkills,
    resumeKeywordCoverage: resumeKeywordSource.length
      ? clampPercent((matchedKeywords.length / resumeKeywordSource.length) * 100)
      : 0,
    jdKeywordCoverage: jdKeywordSource.length
      ? clampPercent((matchedKeywords.length / jdKeywordSource.length) * 100)
      : 0,
    notes: normalizedGap.atsSignals.suggestions,
    computedAt: new Date().toISOString(),
    aiParseError: false,
  };
};

const normalizeAtsMatch = (atsMatch, fallbackContext = {}) => {
  const safeMatch = atsMatch && typeof atsMatch === "object" ? atsMatch : {};

  const normalized = {
    matchPercent: Number.isFinite(Number(safeMatch.matchPercent))
      ? clampPercent(safeMatch.matchPercent)
      : 0,
    matchedMustHaves: Array.isArray(safeMatch.matchedMustHaves)
      ? toTitleList(normalizeTextList(safeMatch.matchedMustHaves))
      : [],
    missingMustHaves: Array.isArray(safeMatch.missingMustHaves)
      ? toTitleList(normalizeTextList(safeMatch.missingMustHaves))
      : [],
    weakEvidenceSkills: normalizeWeakEvidenceSkills(safeMatch.weakEvidenceSkills),
    resumeKeywordCoverage: Number.isFinite(Number(safeMatch.resumeKeywordCoverage))
      ? clampPercent(safeMatch.resumeKeywordCoverage)
      : 0,
    jdKeywordCoverage: Number.isFinite(Number(safeMatch.jdKeywordCoverage))
      ? clampPercent(safeMatch.jdKeywordCoverage)
      : 0,
    notes: Array.isArray(safeMatch.notes)
      ? safeMatch.notes.map((item) => normalizeText(item)).filter(Boolean).slice(0, 5)
      : [],
    computedAt: normalizeText(safeMatch.computedAt) || new Date().toISOString(),
    aiParseError: Boolean(safeMatch.aiParseError),
  };

  if (
    normalized.matchPercent ||
    normalized.matchedMustHaves.length ||
    normalized.missingMustHaves.length ||
    normalized.notes.length
  ) {
    return normalized;
  }

  if (fallbackContext.resumeAnalysis || fallbackContext.jdAnalysis || fallbackContext.gapAnalysis) {
    return buildAtsMatch(fallbackContext);
  }

  return normalized;
};

const normalizeInterviewPlan = (plan) => {
  const safePlan = plan && typeof plan === "object" ? plan : {};
  const normalizedFocus = Array.isArray(safePlan.focusAreas)
    ? safePlan.focusAreas.filter((item) => typeof item === "string" && item.trim())
    : Array.isArray(safePlan.interview_focus_areas)
      ? safePlan.interview_focus_areas.filter((item) => typeof item === "string" && item.trim())
      : [];
  const legacyRoundStructure = Array.isArray(safePlan.round_structure)
    ? safePlan.round_structure
    : [];
  const roundMix = normalizeRoundMix(
    safePlan.roundMix ?? legacyRoundStructure.map((roundType) => ({
      roundType: roundType === "behavioral" ? "behavioral" : roundType === "system_design" ? "situational" : "technical",
      count: 1,
    }))
  );
  const startingDifficulty = Number.isFinite(Number(safePlan.startingDifficulty))
    ? Math.max(1, Math.min(5, Math.round(Number(safePlan.startingDifficulty))))
    : Number.isFinite(Number(safePlan.start_difficulty))
      ? Math.max(1, Math.min(5, Math.round(Number(safePlan.start_difficulty))))
      : 2;
  const targetRole = normalizeText(safePlan.targetRole) || normalizeText(safePlan.target_role);
  const experienceLevel = normalizeText(safePlan.experienceLevel) || normalizeText(safePlan.experience);
  const tags = Array.isArray(safePlan.tags)
    ? toTitleList(normalizeTextList(safePlan.tags))
    : toTitleList(normalizeTextList(normalizedFocus)).slice(0, 6);

  return {
    targetRole: targetRole || "Target Role",
    experienceLevel: experienceLevel || "Unknown",
    focusAreas: normalizedFocus.slice(0, 5),
    roundMix,
    startingDifficulty,
    tags,
    round_structure: legacyRoundStructure.length
      ? legacyRoundStructure
      : ["behavioral", "technical_fundamentals", "applied", "edge_cases", "system_design"],
    start_difficulty: startingDifficulty,
    interview_focus_areas: normalizedFocus.slice(0, 5),
    rationale: Array.isArray(safePlan.rationale)
      ? safePlan.rationale.map((item) => normalizeText(item)).filter(Boolean).slice(0, 5)
      : [],
    aiParseError: Boolean(safePlan.aiParseError),
  };
};

const normalizeEvaluation = (parsed) => {
  const conceptual = clampScore(parsed?.conceptual_correctness);
  const implementation = clampScore(parsed?.implementation_depth);
  const tradeoff = clampScore(parsed?.tradeoff_awareness);
  const clarity = clampScore(parsed?.clarity);
  const structure = clampScore(parsed?.structure);
  const exampleUsage = clampScore(parsed?.example_usage);
  const confidence = clampScore(parsed?.confidence);

  const finalScore = Number(
    ((conceptual + implementation + tradeoff + clarity + structure + exampleUsage + confidence) / 7).toFixed(1)
  );

  return {
    conceptual_correctness: conceptual,
    implementation_depth: implementation,
    tradeoff_awareness: tradeoff,
    clarity,
    structure,
    example_usage: exampleUsage,
    confidence,
    vagueness_flag: Boolean(parsed?.vagueness_flag),
    buzzword_density: normalizeBuzzwordDensity(parsed?.buzzword_density),
    jd_alignment: normalizeJdAlignment(parsed?.jd_alignment),
    missing_elements: Array.isArray(parsed?.missing_elements)
      ? parsed.missing_elements.map((item) => normalizeText(item)).filter(Boolean).slice(0, 8)
      : [],
    coaching_tip: normalizeText(parsed?.coaching_tip)
      || "Add one concrete example, one measurable outcome, and one tradeoff in your next answer.",
    feedback:
      typeof parsed?.feedback === "string" && parsed.feedback.trim()
        ? parsed.feedback.trim()
        : "You showed effort. Improve depth and explain practical tradeoffs more clearly.",
    finalScore,
  };
};

const normalizeSessionState = (sessionState, questions) => {
  const safeState = sessionState && typeof sessionState === "object" ? sessionState : {};
  const difficultySource = safeState.current_difficulty ?? safeState.difficulty_level;
  const normalizedDifficulty = Number.isFinite(Number(difficultySource))
    ? Math.max(1, Math.min(5, Math.round(Number(difficultySource))))
    : 2;

  return {
    current_difficulty: normalizedDifficulty,
    difficulty_level: normalizedDifficulty,
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
    focus_areas: Array.isArray(safeState.focus_areas) ? safeState.focus_areas : [],
    last_strategy: typeof safeState.last_strategy === "string" ? safeState.last_strategy.trim() : "",
  };
};

const summarizeQuestionMetrics = (questions) => {
  const safeQuestions = Array.isArray(questions) ? questions : [];
  const totalQuestions = safeQuestions.length;

  const totals = safeQuestions.reduce((acc, item) => {
    acc.score += Number(item?.score) || 0;
    acc.confidence += Number(item?.confidence) || 0;
    acc.communication += Number(item?.communication) || 0;
    acc.correctness += Number(item?.correctness) || 0;
    acc.structure += Number(item?.evaluationRubric?.structure) || 0;
    acc.examples += Number(item?.evaluationRubric?.example_usage) || 0;
    acc.depth += Number(item?.evaluationRubric?.implementation_depth) || 0;
    acc.tradeoffs += Number(item?.evaluationRubric?.tradeoff_awareness) || 0;
    if (normalizeText(item?.answer)) {
      acc.answeredCount += 1;
    } else {
      acc.unanswered.push(item?.question || "");
    }
    return acc;
  }, {
    score: 0,
    confidence: 0,
    communication: 0,
    correctness: 0,
    structure: 0,
    examples: 0,
    depth: 0,
    tradeoffs: 0,
    answeredCount: 0,
    unanswered: [],
  });

  return {
    totalQuestions,
    finalScore: totalQuestions ? roundToSingleDecimal(totals.score / totalQuestions) : 0,
    confidence: totalQuestions ? roundToSingleDecimal(totals.confidence / totalQuestions) : 0,
    communication: totalQuestions ? roundToSingleDecimal(totals.communication / totalQuestions) : 0,
    correctness: totalQuestions ? roundToSingleDecimal(totals.correctness / totalQuestions) : 0,
    structure: totalQuestions ? roundToSingleDecimal(totals.structure / totalQuestions) : 0,
    examples: totalQuestions ? roundToSingleDecimal(totals.examples / totalQuestions) : 0,
    depth: totalQuestions ? roundToSingleDecimal(totals.depth / totalQuestions) : 0,
    tradeoffs: totalQuestions ? roundToSingleDecimal(totals.tradeoffs / totalQuestions) : 0,
    completionRatePercent: totalQuestions
      ? clampPercent((totals.answeredCount / totalQuestions) * 100)
      : 0,
    answeredCount: totals.answeredCount,
    unansweredQuestions: totals.unanswered.filter(Boolean),
  };
};

const buildSkillHeatmap = (interview) => {
  const safeInterview = interview || {};
  const resumeSkills = normalizeTextList([
    ...(Array.isArray(safeInterview?.resumeAnalysis?.skills) ? safeInterview.resumeAnalysis.skills : []),
    ...(Array.isArray(safeInterview?.resumeAnalysis?.keywords) ? safeInterview.resumeAnalysis.keywords : []),
  ]);
  const requiredSkills = normalizeTextList([
    ...(Array.isArray(safeInterview?.jdAnalysis?.required_skills) ? safeInterview.jdAnalysis.required_skills : []),
    ...(Array.isArray(safeInterview?.jdAnalysis?.mustHaveSkills)
      ? safeInterview.jdAnalysis.mustHaveSkills.map((item) => item?.name)
      : []),
  ]);
  const preferredSkills = normalizeTextList([
    ...(Array.isArray(safeInterview?.jdAnalysis?.preferred_skills) ? safeInterview.jdAnalysis.preferred_skills : []),
    ...(Array.isArray(safeInterview?.jdAnalysis?.niceToHaveSkills)
      ? safeInterview.jdAnalysis.niceToHaveSkills.map((item) => item?.name)
      : []),
  ]);
  const unionSkills = toTitleList([...new Set([...requiredSkills, ...preferredSkills, ...resumeSkills])]).slice(0, 20);

  const skills = unionSkills.map((skillLabel) => {
    const normalizedSkill = normalizeText(skillLabel).toLowerCase();
    const evidence = (Array.isArray(safeInterview?.questions) ? safeInterview.questions : [])
      .map((question, index) => {
        const taggedMatch = Array.isArray(question?.taggedSkills)
          ? normalizeTextList(question.taggedSkills).includes(normalizedSkill)
          : false;
        const alignment = Array.isArray(question?.evaluationRubric?.jd_alignment)
          ? question.evaluationRubric.jd_alignment.find(
              (item) => normalizeText(item?.skill).toLowerCase() === normalizedSkill
            )
          : null;

        if (!taggedMatch && !alignment) {
          return null;
        }

        const answer = normalizeText(question?.answer);
        return {
          questionIndex: index + 1,
          quote: answer ? answer.slice(0, 140) : "",
          score: roundToSingleDecimal(question?.score || 0),
          strength: alignment?.strength || null,
        };
      })
      .filter(Boolean);

    const numericEvidenceScores = evidence
      .map((item) => Number(item.score))
      .filter((value) => Number.isFinite(value));
    const averageEvidence = numericEvidenceScores.length
      ? numericEvidenceScores.reduce((sum, value) => sum + value, 0) / numericEvidenceScores.length
      : 0;

    let demonstrated = "none";
    if (averageEvidence >= 8 || evidence.some((item) => item.strength === "strong")) {
      demonstrated = "strong";
    } else if (averageEvidence >= 5 || evidence.some((item) => item.strength === "ok")) {
      demonstrated = "ok";
    } else if (averageEvidence > 0 || evidence.some((item) => item.strength === "weak")) {
      demonstrated = "weak";
    }

    const jdRequired = requiredSkills.includes(normalizedSkill);
    let gap = "none";
    if (jdRequired && demonstrated === "none") gap = "high";
    else if (jdRequired && demonstrated === "weak") gap = "medium";
    else if (!jdRequired && demonstrated === "weak") gap = "low";

    return {
      skill: skillLabel,
      jd_required: jdRequired,
      resume_claimed: resumeSkills.includes(normalizedSkill),
      demonstrated,
      gap,
      evidence: evidence.map(({ strength, ...item }) => item),
    };
  });

  const coveredRequired = skills.filter((item) => item.jd_required && item.demonstrated !== "none").length;
  const requiredCount = skills.filter((item) => item.jd_required).length;

  return {
    skills,
    completionRatePercent: requiredCount
      ? clampPercent((coveredRequired / requiredCount) * 100)
      : 0,
    computedAt: new Date().toISOString(),
  };
};

const buildImprovementBlueprint = (interview, heatmap) => {
  const safeInterview = interview || {};
  const focusPool = [
    ...(Array.isArray(safeInterview?.sessionState?.focus_areas) ? safeInterview.sessionState.focus_areas : []),
    ...(Array.isArray(safeInterview?.gapAnalysis?.missingRequiredSkills) ? safeInterview.gapAnalysis.missingRequiredSkills : []),
    ...(Array.isArray(safeInterview?.sessionState?.weakness_tags) ? safeInterview.sessionState.weakness_tags : []),
    ...(Array.isArray(heatmap?.skills)
      ? heatmap.skills.filter((item) => item.gap === "high" || item.gap === "medium").map((item) => item.skill)
      : []),
  ];

  const topFocus = toTitleList(normalizeTextList(focusPool)).slice(0, 3);
  const fallbackFocus = topFocus.length ? topFocus : ["Clarity", "Examples", "Tradeoffs"];

  const days = Array.from({ length: 7 }, (_, index) => {
    const focus = fallbackFocus[index % fallbackFocus.length];
    return {
      day: index + 1,
      title: `Day ${index + 1}: ${focus}`,
      tasks: [
        `Review one ${focus.toLowerCase()} concept and write a concise explanation.`,
        `Practice one interview answer focused on ${focus.toLowerCase()} with a measurable example.`,
        `Refine one resume or project bullet to better evidence ${focus.toLowerCase()}.`,
      ],
      expectedOutcome: `Stronger ${focus.toLowerCase()} articulation with clearer proof in live interview answers.`,
    };
  });

  return {
    days,
    topFocus: fallbackFocus,
    generatedAt: new Date().toISOString(),
  };
};

const buildReportPayload = (interview) => {
  const metrics = summarizeQuestionMetrics(interview?.questions);
  const heatmap = interview?.skillHeatmap?.skills?.length
    ? interview.skillHeatmap
    : buildSkillHeatmap(interview);
  const blueprint = interview?.improvementBlueprint?.days?.length
    ? interview.improvementBlueprint
    : buildImprovementBlueprint(interview, heatmap);
  const ats = interview?.atsMatch && (
    interview.atsMatch.matchPercent
    || interview.atsMatch.matchedMustHaves?.length
    || interview.atsMatch.missingMustHaves?.length
  )
    ? interview.atsMatch
    : null;
  const jd = interview?.jdAnalysis && hasJdSignal(interview.jdAnalysis)
    ? interview.jdAnalysis
    : null;
  const plan = interview?.interviewPlan && (
    interview.interviewPlan.focusAreas?.length
    || interview.interviewPlan.interview_focus_areas?.length
  )
    ? interview.interviewPlan
    : null;
  const strengths = Array.isArray(interview?.sessionState?.strengths)
    ? toTitleList(normalizeTextList(interview.sessionState.strengths)).slice(0, 5)
    : [];
  const weaknesses = Array.isArray(interview?.sessionState?.weakness_tags)
    ? toTitleList(normalizeTextList(interview.sessionState.weakness_tags)).slice(0, 5)
    : [];

  return {
    interviewId: String(interview?._id || ""),
    createdAt: interview?.createdAt || null,
    targetRole: normalizeText(interview?.jdAnalysis?.roleTitle)
      || normalizeText(interview?.jdAnalysis?.target_role)
      || normalizeText(interview?.role),
    ats,
    jd,
    plan,
    overall: {
      readinessScore10: roundToSingleDecimal(metrics.finalScore),
      roleFitPercent: ats?.matchPercent ?? 0,
      completionRatePercent: metrics.completionRatePercent,
      strengths,
      weaknesses,
    },
    cognitive: {
      structure: roundToSingleDecimal(metrics.structure),
      examples: roundToSingleDecimal(metrics.examples),
      depth: roundToSingleDecimal(metrics.depth),
      tradeoffs: roundToSingleDecimal(metrics.tradeoffs),
      clarity: roundToSingleDecimal(metrics.communication),
    },
    heatmap,
    questions: (Array.isArray(interview?.questions) ? interview.questions : []).map((item, index) => ({
      index: index + 1,
      text: item.question,
      taggedSkills: Array.isArray(item.taggedSkills) ? item.taggedSkills : [],
      answered: Boolean(normalizeText(item.answer)),
      evaluation: item.evaluationRubric || null,
      score10: normalizeText(item.answer) ? roundToSingleDecimal(item.score || 0) : null,
      feedback: item.feedback || "",
    })),
    blueprint,
    completionRatePercent: metrics.completionRatePercent,
    unansweredQuestions: metrics.unansweredQuestions,
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

const deriveResumeFocusAreas = (resumeText, weaknessTags, sessionFocusAreas = []) => {
  const safeResume = typeof resumeText === "string" ? resumeText.toLowerCase() : "";
  const fromWeakness = weaknessTags.slice(0, 3);
  const fromPlan = Array.isArray(sessionFocusAreas) ? sessionFocusAreas.slice(0, 3) : [];
  const fromResume = [];

  if (safeResume.includes("deployment")) fromResume.push("deployment");
  if (safeResume.includes("monitor")) fromResume.push("monitoring");
  if (safeResume.includes("scal")) fromResume.push("scalability");
  if (safeResume.includes("architecture")) fromResume.push("architecture");

  return dedupeList([...fromWeakness, ...fromPlan, ...fromResume]).slice(0, 3);
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
  if (strategy === "ask_tradeoff") {
    return `What tradeoffs did you evaluate in ${focusText}, and why was your final decision the most practical choice for ${safeRole}?`;
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
  const focusAreas = deriveResumeFocusAreas(
    interview?.resumeText,
    weaknessTags,
    interview?.sessionState?.focus_areas
  );
  const fallbackQuestion = buildFallbackQuestion(strategy, interview?.role, focusAreas);
  const fallbackTaggedSkills = toTitleList(normalizeTextList(focusAreas)).slice(0, 3);

  const messages = [
    {
      role: "system",
      content: `
You are an adaptive interviewer.
Return valid JSON only. No markdown.

Return this exact schema:
{
  "question": "string",
  "taggedSkills": ["string"]
}

Rules:
- 15 to 28 words
- no numbering
- no preface or explanation
- must follow strategy and focus areas
- difficulty should be ${difficultyLabel}
- taggedSkills must be 1 to 3 concise focus labels
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
    const parsed = await askAiForJson(messages, {
      question: fallbackQuestion,
      taggedSkills: fallbackTaggedSkills,
    });
    const aiQuestion = normalizeText(parsed?.question);
    const taggedSkills = toTitleList(normalizeTextList(parsed?.taggedSkills)).slice(0, 3);

    if (!aiQuestion) {
      return { question: fallbackQuestion, taggedSkills: fallbackTaggedSkills };
    }
    return {
      question: aiQuestion,
      taggedSkills: taggedSkills.length ? taggedSkills : fallbackTaggedSkills,
    };
  } catch {
    return { question: fallbackQuestion, taggedSkills: fallbackTaggedSkills };
  }
};

const extractJdTextFromRequest = async (req) => {
  const jdTextFromBody = normalizeText(req.body?.jdText).replace(/\0/g, "").slice(0, 12000);
  const uploadedFile = req.file;

  if (!uploadedFile && !jdTextFromBody) {
    return { error: "Provide jdText or upload jdFile." };
  }

  let sourceType = "text";
  let extractedText = jdTextFromBody;

  if (uploadedFile) {
    const fileName = normalizeText(uploadedFile.originalname).toLowerCase();
    const isPdfUpload =
      uploadedFile.mimetype === "application/pdf" || fileName.endsWith(".pdf");

    if (isPdfUpload) {
      sourceType = "pdf";
      extractedText = await extractPdfTextFromPath(uploadedFile.path);
    } else {
      sourceType = "image";
      return {
        sourceType,
        ocrUnsupported: true,
        uploadedFile,
      };
    }
  }

  if (!extractedText) {
    return {
      error: "Could not extract JD text. Upload a readable PDF or paste JD text.",
      uploadedFile,
    };
  }

  return {
    sourceType,
    extractedText,
    uploadedFile,
  };
};

const buildJdArtifacts = async ({
  sourceType,
  extractedText,
  resumeAnalysis,
  role,
  experience,
}) => {
  let aiParseError = false;
  const jdMessages = [
    {
      role: "system",
      content: `
You extract structured requirements from job descriptions.
Return valid JSON only. No markdown.

{
  "jdText": "string",
  "roleTitle": "string",
  "senioritySignals": ["string"],
  "mustHaveSkills": [{"name": "string", "weight": 1}],
  "niceToHaveSkills": [{"name": "string", "weight": 1}],
  "responsibilities": ["string"],
  "required_skills": ["string"],
  "preferred_skills": ["string"],
  "keywords": ["string"],
  "seniority": "intern|junior|mid|senior|unknown",
  "target_role": "string|unknown"
}
`,
    },
    {
      role: "user",
      content: extractedText.slice(0, 12000),
    },
  ];

  const jdFallback = () => {
    const keywords = extractKeywordsFromText(extractedText, 10);
    const mustHave = keywords.slice(0, 5).map((item) => ({ name: item, weight: 1 }));
    const niceToHave = keywords.slice(5, 8).map((item) => ({ name: item, weight: 1 }));
    return {
      jdText: extractedText,
      roleTitle: normalizeText(role) || "unknown",
      senioritySignals: [],
      mustHaveSkills: mustHave,
      niceToHaveSkills: niceToHave,
      responsibilities: [],
      required_skills: mustHave.map((item) => item.name),
      preferred_skills: niceToHave.map((item) => item.name),
      keywords,
      seniority: "unknown",
      target_role: normalizeText(role) || "unknown",
      aiParseError: true,
    };
  };

  const jdParsed = await askAiForJson(jdMessages, jdFallback, () => {
    aiParseError = true;
  });
  const jd = normalizeJdAnalysis({
    parsed: { ...jdParsed, aiParseError },
    sourceType,
    extractedTextPreview: extractedText,
    ocrStatus: sourceType === "image" ? "not_enabled" : "enabled",
  });

  const hasResumeContext = hasResumeSignal(resumeAnalysis);
  const gapAnalysis = hasResumeContext
    ? normalizeGapAnalysis(runGapEngine({ resumeAnalysis, jdAnalysis: jd }))
    : null;
  const atsMatch = hasResumeContext
    ? normalizeAtsMatch(null, { resumeAnalysis, jdAnalysis: jd, gapAnalysis })
    : null;
  const rawPlan = hasResumeContext
    ? buildInterviewPlan({
        role: role || jd.target_role,
        experience,
        resumeAnalysis,
        jdGapResult: gapAnalysis,
      })
    : null;
  const interviewPlan = rawPlan
    ? normalizeInterviewPlan({
        ...rawPlan,
        targetRole: role || jd.roleTitle || jd.target_role,
        experienceLevel: experience || resumeAnalysis?.experience || "Unknown",
        focusAreas: gapAnalysis?.focusAreas || rawPlan.interview_focus_areas || [],
        tags: [
          ...(gapAnalysis?.focusAreas || []).slice(0, 3),
          ...(gapAnalysis?.missingRequiredSkills || []).slice(0, 2),
        ],
      })
    : null;

  return {
    jd,
    gapAnalysis,
    atsMatch,
    interviewPlan,
  };
};

export const analyzeResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Resume required" });
    }

    const filepath = req.file.path;
    const resumeText = await extractPdfTextFromPath(filepath);

    const messages = [
      {
        role: "system",
        content: `
Extract structured data from resume.
Return valid JSON only. No markdown.

{
  "role": "string",
  "experience": "string",
  "projects": ["project1", "project2"],
  "skills": ["skill1", "skill2"]
}
`,
      },
      {
        role: "user",
        content: resumeText,
      },
    ];

    let resumeAnalysis;
    let usedFallback = false;

    try {
      const aiResponse = await askAi(messages);
      const parsed = parseStrictJson(aiResponse);
      resumeAnalysis = normalizeResumeAnalysis({
        role: parsed?.role,
        experience: parsed?.experience,
        resumeText,
        projects: parsed?.projects,
        skills: parsed?.skills,
        resumeAnalysis: parsed,
      });
    } catch (aiError) {
      usedFallback = true;
      console.warn("Resume AI parse failed, using fallback analysis:", aiError?.message || aiError);
      resumeAnalysis = buildResumeFallbackAnalysis({
        role: "",
        experience: "",
        resumeText,
        projects: [],
        skills: [],
      });
    }

    safeUnlinkFile(filepath);

    return res.json({
      role: resumeAnalysis.role,
      experience: resumeAnalysis.experience,
      projects: resumeAnalysis.projects,
      skills: resumeAnalysis.skills,
      resumeText,
      resumeAnalysis,
      aiFallback: usedFallback,
    });
  } catch (error) {
    console.error(error);
    safeUnlinkFile(req.file?.path);
    return res.status(500).json({ message: "Failed to analyze resume" });
  }
};

export const analyzeJd = async (req, res) => {
  try {
    const jdRequest = await extractJdTextFromRequest(req);

    if (jdRequest.error) {
      safeUnlinkFile(jdRequest.uploadedFile?.path);
      return res.status(400).json({ message: jdRequest.error });
    }

    if (jdRequest.ocrUnsupported) {
      safeUnlinkFile(jdRequest.uploadedFile?.path);
      return res.status(200).json({
        jd: {
          sourceType: jdRequest.sourceType,
          extractedTextPreview: "",
          jdText: "",
          roleTitle: "unknown",
          senioritySignals: [],
          mustHaveSkills: [],
          niceToHaveSkills: [],
          responsibilities: [],
          required_skills: [],
          preferred_skills: [],
          keywords: [],
          seniority: "unknown",
          target_role: "unknown",
          ocrStatus: "not_enabled",
          extractedAt: new Date().toISOString(),
          aiParseError: false,
        },
        atsMatch: null,
        interviewPlan: null,
        gapAnalysis: null,
        message: "OCR is not enabled in this build. Upload JD as PDF or paste JD text.",
      });
    }

    const bodyResumeAnalysis = parseMaybeJson(req.body?.resumeAnalysis);
    const resumeAnalysis = normalizeResumeAnalysis({
      role: req.body?.role,
      experience: req.body?.experience,
      resumeText: req.body?.resumeText,
      projects: getBodyList(req.body, "projects"),
      skills: getBodyList(req.body, "skills"),
      resumeAnalysis: bodyResumeAnalysis,
    });

    const artifacts = await buildJdArtifacts({
      sourceType: jdRequest.sourceType,
      extractedText: jdRequest.extractedText,
      resumeAnalysis,
      role: req.body?.role,
      experience: req.body?.experience,
    });

    safeUnlinkFile(jdRequest.uploadedFile?.path);

    return res.status(200).json({
      jd: artifacts.jd,
      atsMatch: artifacts.atsMatch,
      gapAnalysis: artifacts.gapAnalysis,
      interviewPlan: artifacts.interviewPlan,
    });
  } catch (error) {
    console.error("failed to analyze jd", error);
    safeUnlinkFile(req.file?.path);
    return res.status(500).json({ message: "Failed to analyze JD" });
  }
};

export const attachJdToInterview = async (req, res) => {
  try {
    const interviewId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!interviewId) {
      return res.status(400).json({ message: "Interview id is required." });
    }

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      safeUnlinkFile(req.file?.path);
      return res.status(404).json({ message: "Interview not found." });
    }
    if (!isOwnedInterview(interview, req.userId)) {
      safeUnlinkFile(req.file?.path);
      return res.status(403).json({ message: "Forbidden" });
    }

    let normalizedJd = null;
    if (hasJdSignal(req.body?.jdAnalysis ? parseMaybeJson(req.body.jdAnalysis) : req.body?.jdAnalysis)) {
      normalizedJd = normalizeJdAnalysis({
        parsed: parseMaybeJson(req.body?.jdAnalysis) || req.body?.jdAnalysis,
        sourceType: req.body?.sourceType || "text",
        extractedTextPreview: req.body?.extractedTextPreview || req.body?.jdText || "",
        ocrStatus: req.body?.ocrStatus || "enabled",
      });
    } else {
      const jdRequest = await extractJdTextFromRequest(req);
      if (jdRequest.error) {
        safeUnlinkFile(jdRequest.uploadedFile?.path);
        return res.status(400).json({ message: jdRequest.error });
      }
      if (jdRequest.ocrUnsupported) {
        safeUnlinkFile(jdRequest.uploadedFile?.path);
        return res.status(200).json({
          jd: {
            sourceType: jdRequest.sourceType,
            extractedTextPreview: "",
            jdText: "",
            roleTitle: "unknown",
            senioritySignals: [],
            mustHaveSkills: [],
            niceToHaveSkills: [],
            responsibilities: [],
            required_skills: [],
            preferred_skills: [],
            keywords: [],
            seniority: "unknown",
            target_role: "unknown",
            ocrStatus: "not_enabled",
            extractedAt: new Date().toISOString(),
            aiParseError: false,
          },
          message: "OCR is not enabled in this build. Upload JD as PDF or paste JD text.",
        });
      }
      const artifacts = await buildJdArtifacts({
        sourceType: jdRequest.sourceType,
        extractedText: jdRequest.extractedText,
        resumeAnalysis: interview.resumeAnalysis,
        role: interview.role,
        experience: interview.experience,
      });
      normalizedJd = artifacts.jd;
      safeUnlinkFile(jdRequest.uploadedFile?.path);
    }

    const gapAnalysis = normalizeGapAnalysis(
      runGapEngine({
        resumeAnalysis: interview.resumeAnalysis,
        jdAnalysis: normalizedJd,
      })
    );
    const atsMatch = normalizeAtsMatch(null, {
      resumeAnalysis: interview.resumeAnalysis,
      jdAnalysis: normalizedJd,
      gapAnalysis,
    });
    const interviewPlan = normalizeInterviewPlan({
      ...buildInterviewPlan({
        role: interview.role,
        experience: interview.experience,
        resumeAnalysis: interview.resumeAnalysis,
        jdGapResult: gapAnalysis,
      }),
      targetRole: normalizedJd.roleTitle || normalizedJd.target_role || interview.role,
      experienceLevel: interview.experience,
      focusAreas: gapAnalysis.focusAreas,
      tags: [
        ...gapAnalysis.focusAreas.slice(0, 3),
        ...gapAnalysis.missingRequiredSkills.slice(0, 2),
      ],
    });

    interview.jdAnalysis = normalizedJd;
    interview.gapAnalysis = gapAnalysis;
    interview.atsMatch = atsMatch;
    interview.interviewPlan = interviewPlan;
    interview.sessionState = {
      ...normalizeSessionState(interview.sessionState, interview.questions),
      focus_areas: interviewPlan.focusAreas,
    };

    await interview.save();

    return res.status(200).json({
      interviewId: String(interview._id),
      jd: interview.jdAnalysis,
      gapAnalysis: interview.gapAnalysis,
      atsMatch: interview.atsMatch,
      interviewPlan: interview.interviewPlan,
    });
  } catch (error) {
    console.error("failed to attach jd", error);
    safeUnlinkFile(req.file?.path);
    return res.status(500).json({ message: "Failed to attach JD to interview" });
  }
};


export const generateQuestion = async (req, res) => {
  try {
    let {
      role,
      experience,
      mode,
      resumeText,
      projects,
      skills,
      resumeAnalysis,
      jdAnalysis,
      gapAnalysis,
      interviewPlan,
      atsMatch,
    } = req.body

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

    const safeResume = normalizeText(resumeText) || "None";
    const normalizedResumeAnalysis = normalizeResumeAnalysis({
      role,
      experience,
      resumeText: safeResume,
      projects,
      skills,
      resumeAnalysis,
    });

    const normalizedJdAnalysis = hasJdSignal(jdAnalysis)
      ? normalizeJdAnalysis({
          parsed: jdAnalysis,
          sourceType: jdAnalysis?.sourceType || "text",
          extractedTextPreview: jdAnalysis?.jdText || jdAnalysis?.extractedTextPreview || "",
          ocrStatus: jdAnalysis?.ocrStatus || "enabled",
        })
      : null;

    const computedGapAnalysis = normalizedJdAnalysis
      ? runGapEngine({ resumeAnalysis: normalizedResumeAnalysis, jdAnalysis: normalizedJdAnalysis })
      : null;
    const normalizedGapAnalysis = computedGapAnalysis || normalizeGapAnalysis(gapAnalysis);
    const normalizedAtsMatch = normalizedJdAnalysis
      ? normalizeAtsMatch(atsMatch, {
          resumeAnalysis: normalizedResumeAnalysis,
          jdAnalysis: normalizedJdAnalysis,
          gapAnalysis: normalizedGapAnalysis,
        })
      : normalizeAtsMatch(atsMatch);

    const computedInterviewPlan = buildInterviewPlan({
      role,
      experience,
      resumeAnalysis: normalizedResumeAnalysis,
      jdGapResult: normalizedGapAnalysis,
    });
    const normalizedInterviewPlan = normalizeInterviewPlan(interviewPlan);
    const computedNormalizedInterviewPlan = normalizeInterviewPlan({
      ...computedInterviewPlan,
      targetRole: normalizedJdAnalysis?.roleTitle || normalizedJdAnalysis?.target_role || role,
      experienceLevel: experience,
      focusAreas: normalizedGapAnalysis.focusAreas,
      tags: [
        ...normalizedGapAnalysis.focusAreas.slice(0, 3),
        ...normalizedGapAnalysis.missingRequiredSkills.slice(0, 2),
      ],
    });
    const effectiveInterviewPlan = normalizedInterviewPlan.focusAreas.length
      ? normalizedInterviewPlan
      : computedNormalizedInterviewPlan;
    const focusAreas = effectiveInterviewPlan.focusAreas.slice(0, 5);
    const missingSkills = normalizedGapAnalysis.missingRequiredSkills.slice(0, 5);
    const targetRole = normalizedJdAnalysis?.roleTitle || normalizedJdAnalysis?.target_role || "unknown";

    const userPrompt = `
    Role:${role}
    Experience:${experience}
    InterviewMode:${mode}
    Projects:${projectText}
    Skills:${skillsText},
    Resume:${safeResume}
    TargetRoleFromJD:${targetRole}
    FocusAreas:${focusAreas.join(", ") || "None"}
    MissingRequiredSkills:${missingSkills.join(", ") || "None"}
    MatchPercentage:${normalizedGapAnalysis.matchPercentage || 0}
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

Make questions based on the candidate’s role, experience,interviewMode, projects, skills, resume details, focus areas, and missing required skills.
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
      resumeAnalysis: normalizedResumeAnalysis,
      ...(normalizedJdAnalysis ? { jdAnalysis: normalizedJdAnalysis } : {}),
      gapAnalysis: normalizedGapAnalysis,
      atsMatch: normalizedAtsMatch,
      interviewPlan: effectiveInterviewPlan,
      sessionState: {
        current_difficulty: effectiveInterviewPlan.startingDifficulty || effectiveInterviewPlan.start_difficulty || 2,
        difficulty_level: effectiveInterviewPlan.startingDifficulty || effectiveInterviewPlan.start_difficulty || 2,
        focus_areas: focusAreas,
      },
      questions: questionsArray.map((q, index) => ({
        question: q,
        difficulty: ["easy", "easy", "medium", "medium", "hard"][index],
        timeLimit: [60, 60, 90, 90, 120][index],
        taggedSkills: focusAreas.length
          ? [focusAreas[index % focusAreas.length]]
          : missingSkills.length
            ? [missingSkills[index % missingSkills.length]]
            : [],
      }))
    })

    res.json({
      interviewId: interview._id,
      creditsLeft: user.credits,
      userName: user.name,
      questions: interview.questions,
      atsMatch: interview.atsMatch,
      gapAnalysis: interview.gapAnalysis,
      interviewPlan: interview.interviewPlan,
      jdAnalysis: interview.jdAnalysis
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
  "structure": 1-10,
  "example_usage": 1-10,
  "confidence": 1-10,
  "vagueness_flag": boolean,
  "buzzword_density": "low" | "medium" | "high",
  "jd_alignment": [{"skill": "string", "strength": "weak" | "ok" | "strong"}],
  "missing_elements": ["string"],
  "coaching_tip": "string",
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
Focus Areas: ${sessionState.focus_areas.join(", ") || "none"}
Role: ${interview.role}
`
      }
    ];

    const parsed = await askAiForJson(messages, {
      conceptual_correctness: 4,
      implementation_depth: 4,
      tradeoff_awareness: 4,
      clarity: 5,
      structure: 4,
      example_usage: 4,
      confidence: 5,
      vagueness_flag: false,
      buzzword_density: "medium",
      jd_alignment: [],
      missing_elements: ["more detail", "concrete example"],
      coaching_tip: "Add a concrete example and explain the tradeoff you considered.",
      feedback: "Add a concrete example and explain implementation tradeoffs more clearly.",
    });
    const evaluation = normalizeEvaluation(parsed);

    question.answer = safeAnswer;
    question.confidence = evaluation.confidence;
    question.communication = evaluation.clarity;
    question.correctness = evaluation.conceptual_correctness;
    question.score = evaluation.finalScore;
    question.feedback = evaluation.feedback;
    question.evaluationRubric = {
      conceptual_correctness: evaluation.conceptual_correctness,
      implementation_depth: evaluation.implementation_depth,
      tradeoff_awareness: evaluation.tradeoff_awareness,
      clarity: evaluation.clarity,
      structure: evaluation.structure,
      example_usage: evaluation.example_usage,
      confidence: evaluation.confidence,
      vagueness_flag: evaluation.vagueness_flag,
      buzzword_density: evaluation.buzzword_density,
      jd_alignment: evaluation.jd_alignment,
      missing_elements: evaluation.missing_elements,
      coaching_tip: evaluation.coaching_tip,
      finalScore: evaluation.finalScore,
    };

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
        structure: evaluation.structure,
        example_usage: evaluation.example_usage,
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
        taggedSkills: adaptiveQuestion.taggedSkills,
      };

      const existingNextQuestion = interview.questions[nextQuestionIndex];
      if (!existingNextQuestion.answer) {
        existingNextQuestion.question = nextQuestionPayload.question;
        existingNextQuestion.difficulty = nextQuestionPayload.difficulty;
        existingNextQuestion.timeLimit = nextQuestionPayload.timeLimit;
        existingNextQuestion.taggedSkills = nextQuestionPayload.taggedSkills;
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
        structure: evaluation.structure,
        example_usage: evaluation.example_usage,
        confidence: evaluation.confidence,
        vagueness_flag: evaluation.vagueness_flag,
        buzzword_density: evaluation.buzzword_density,
        jd_alignment: evaluation.jd_alignment,
        missing_elements: evaluation.missing_elements,
        coaching_tip: evaluation.coaching_tip,
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

    const metrics = summarizeQuestionMetrics(interview.questions);
    const heatmap = buildSkillHeatmap(interview);
    const blueprint = buildImprovementBlueprint(interview, heatmap);

    interview.finalScore = metrics.finalScore;
    interview.skillHeatmap = heatmap;
    interview.improvementBlueprint = blueprint;
    interview.status = "completed";

    await interview.save();

    const reportPayload = buildReportPayload(interview);

    return res.status(200).json({
      finalScore: metrics.finalScore,
      confidence: metrics.confidence,
      communication: metrics.communication,
      correctness: metrics.correctness,
      questionWiseScore: interview.questions.map((q) => ({
        question: q.question,
        score: roundToSingleDecimal(q.score || 0),
        feedback: q.feedback || "",
        confidence: roundToSingleDecimal(q.confidence || 0),
        communication: roundToSingleDecimal(q.communication || 0),
        correctness: roundToSingleDecimal(q.correctness || 0),
      })),
      reportPayload,
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

export const getInterviewSession = async (req, res) => {
  try {
    const interviewId = typeof req.params?.id === "string" ? req.params.id.trim() : "";
    if (!interviewId) {
      return res.status(400).json({ message: "Interview id is required" });
    }

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({ message: "Interview not found" });
    }

    if (!isOwnedInterview(interview, req.userId)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const user = await User.findById(req.userId).select("name");
    const firstUnansweredIndex = interview.questions.findIndex(
      (question) => typeof question.answer !== "string" || !question.answer.trim()
    );
    const currentIndex = firstUnansweredIndex >= 0
      ? firstUnansweredIndex
      : Math.max(0, interview.questions.length - 1);

    return res.status(200).json({
      interviewId: String(interview._id),
      userName: user?.name || "",
      questions: interview.questions,
      currentIndex,
      status: interview.status,
      role: interview.role,
      experience: interview.experience,
      mode: interview.mode,
    });
  } catch (error) {
    console.error("failed to recover interview session", error);
    return res.status(500).json({ message: "Failed to recover interview session" });
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

    const metrics = summarizeQuestionMetrics(interview.questions);
    const reportPayload = buildReportPayload({
      ...interview.toObject(),
      finalScore: interview.finalScore || metrics.finalScore,
    });

    return res.json({
      finalScore: interview.finalScore ? roundToSingleDecimal(interview.finalScore) : metrics.finalScore,
      confidence: metrics.confidence,
      communication: metrics.communication,
      correctness: metrics.correctness,
      questionWiseScore: interview.questions.map((q) => ({
        ...q.toObject(),
        score: roundToSingleDecimal(q.score || 0),
        confidence: roundToSingleDecimal(q.confidence || 0),
        communication: roundToSingleDecimal(q.communication || 0),
        correctness: roundToSingleDecimal(q.correctness || 0),
      })),
      reportPayload,
      ats: reportPayload.ats,
      jd: reportPayload.jd,
      plan: reportPayload.plan,
      overall: reportPayload.overall,
      cognitive: reportPayload.cognitive,
      heatmap: reportPayload.heatmap,
      questions: reportPayload.questions,
      blueprint: reportPayload.blueprint,
      completionRatePercent: reportPayload.completionRatePercent,
      unansweredQuestions: reportPayload.unansweredQuestions,
    });

  } catch (error) {
    console.error("failed to find currentUser Interview report", error);
    return res.status(500).json({ message: "failed to find currentUser Interview report" })
  }
}




