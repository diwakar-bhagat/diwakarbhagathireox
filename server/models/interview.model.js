import mongoose from "mongoose";

const weightedSkillSchema = new mongoose.Schema({
  name: { type: String, default: "" },
  weight: { type: Number, default: 1 },
}, { _id: false });

const weakEvidenceSkillSchema = new mongoose.Schema({
  skill: { type: String, default: "" },
  reason: { type: String, default: "" },
}, { _id: false });

const jdAlignmentSchema = new mongoose.Schema({
  skill: { type: String, default: "" },
  strength: {
    type: String,
    enum: ["weak", "ok", "strong"],
    default: "weak",
  },
}, { _id: false });

const questionEvidenceSchema = new mongoose.Schema({
  questionIndex: { type: Number, default: 0 },
  quote: { type: String, default: "" },
  score: { type: Number, default: 0 },
}, { _id: false });

const roundMixSchema = new mongoose.Schema({
  roundType: {
    type: String,
    enum: ["behavioral", "technical", "situational"],
    default: "technical",
  },
  count: { type: Number, default: 1 },
}, { _id: false });

const dayPlanSchema = new mongoose.Schema({
  day: { type: Number, default: 1 },
  title: { type: String, default: "" },
  tasks: { type: [String], default: [] },
  expectedOutcome: { type: String, default: "" },
}, { _id: false });

const questionsSchema = new mongoose.Schema({
  question: String,
  difficulty: String,
  timeLimit: Number,
  answer: String,
  feedback: String,
  score: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  communication: { type: Number, default: 0 },
  correctness: { type: Number, default: 0 },
  taggedSkills: { type: [String], default: [] },
  evaluationRubric: {
    conceptual_correctness: { type: Number, default: 0 },
    implementation_depth: { type: Number, default: 0 },
    tradeoff_awareness: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    structure: { type: Number, default: 0 },
    example_usage: { type: Number, default: 0 },
    confidence: { type: Number, default: 0 },
    vagueness_flag: { type: Boolean, default: false },
    buzzword_density: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    jd_alignment: { type: [jdAlignmentSchema], default: [] },
    missing_elements: { type: [String], default: [] },
    coaching_tip: { type: String, default: "" },
    finalScore: { type: Number, default: 0 },
  },
})


const interviewSchema = new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    role:{
        type:String,
        required:true
    },
    experience:{
        type:String,
        required:true
    },
    mode:{
        type:String,
        enum:["HR" ,"Technical"],
        required:true
    },
    resumeText:{
     type:String
    },
    resumeAnalysis: {
      role: { type: String, default: "" },
      experience: { type: String, default: "" },
      projects: { type: [String], default: [] },
      skills: { type: [String], default: [] },
      keywords: { type: [String], default: [] },
    },
    jdAnalysis: {
      sourceType: { type: String, default: "unknown" },
      extractedTextPreview: { type: String, default: "" },
      jdText: { type: String, default: "" },
      roleTitle: { type: String, default: "unknown" },
      senioritySignals: { type: [String], default: [] },
      mustHaveSkills: { type: [weightedSkillSchema], default: [] },
      niceToHaveSkills: { type: [weightedSkillSchema], default: [] },
      responsibilities: { type: [String], default: [] },
      required_skills: { type: [String], default: [] },
      preferred_skills: { type: [String], default: [] },
      keywords: { type: [String], default: [] },
      seniority: { type: String, default: "unknown" },
      target_role: { type: String, default: "unknown" },
      ocrStatus: { type: String, default: "not_requested" },
      extractedAt: { type: String, default: "" },
      aiParseError: { type: Boolean, default: false },
    },
    gapAnalysis: {
      matchPercentage: { type: Number, default: 0 },
      missingRequiredSkills: { type: [String], default: [] },
      missingPreferredSkills: { type: [String], default: [] },
      strongMatches: { type: [String], default: [] },
      weakMatches: { type: [String], default: [] },
      focusAreas: { type: [String], default: [] },
      atsSignals: {
        keywordMatchPercent: { type: Number, default: 0 },
        suggestions: { type: [String], default: [] },
      },
    },
    atsMatch: {
      matchPercent: { type: Number, default: 0 },
      matchedMustHaves: { type: [String], default: [] },
      missingMustHaves: { type: [String], default: [] },
      weakEvidenceSkills: { type: [weakEvidenceSkillSchema], default: [] },
      resumeKeywordCoverage: { type: Number, default: 0 },
      jdKeywordCoverage: { type: Number, default: 0 },
      notes: { type: [String], default: [] },
      computedAt: { type: String, default: "" },
      aiParseError: { type: Boolean, default: false },
    },
    interviewPlan: {
      targetRole: { type: String, default: "" },
      experienceLevel: { type: String, default: "" },
      focusAreas: { type: [String], default: [] },
      roundMix: { type: [roundMixSchema], default: [] },
      startingDifficulty: { type: Number, default: 2 },
      tags: { type: [String], default: [] },
      round_structure: { type: [String], default: [] },
      start_difficulty: { type: Number, default: 2 },
      interview_focus_areas: { type: [String], default: [] },
      rationale: { type: [String], default: [] },
      aiParseError: { type: Boolean, default: false },
    },
    questions:[questionsSchema],

    sessionState: {
      current_difficulty: { type: Number, default: 2 },
      difficulty_level: { type: Number, default: 2 },
      weakness_tags: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      confidence_score: { type: Number, default: 5 },
      strategy_history: { type: [String], default: [] },
      question_history: { type: [String], default: [] },
      focus_areas: { type: [String], default: [] },
      last_strategy: { type: String, default: "" },
    },

    skillHeatmap: {
      skills: {
        type: [{
          skill: { type: String, default: "" },
          jd_required: { type: Boolean, default: false },
          resume_claimed: { type: Boolean, default: false },
          demonstrated: {
            type: String,
            enum: ["none", "weak", "ok", "strong"],
            default: "none",
          },
          gap: {
            type: String,
            enum: ["none", "low", "medium", "high"],
            default: "high",
          },
          evidence: { type: [questionEvidenceSchema], default: [] },
        }],
        default: [],
      },
      completionRatePercent: { type: Number, default: 0 },
      computedAt: { type: String, default: "" },
    },

    improvementBlueprint: {
      days: { type: [dayPlanSchema], default: [] },
      topFocus: { type: [String], default: [] },
      generatedAt: { type: String, default: "" },
    },

    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
    creditsCharged: { type: Number, default: 0 },
    chargedAt: { type: Date, default: null },
    lastActiveAt: { type: Date, default: null },
    finalScore: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Incompleted", "in_progress", "completed", "abandoned"],
      default: "Incompleted",
    }
},{timestamps:true})

const Interview = mongoose.model("Interview" , interviewSchema)


export default Interview
