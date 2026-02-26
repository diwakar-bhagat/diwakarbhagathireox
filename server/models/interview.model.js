import mongoose from "mongoose";

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
      required_skills: { type: [String], default: [] },
      preferred_skills: { type: [String], default: [] },
      keywords: { type: [String], default: [] },
      seniority: { type: String, default: "unknown" },
      target_role: { type: String, default: "unknown" },
      ocrStatus: { type: String, default: "not_requested" },
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
    interviewPlan: {
      round_structure: { type: [String], default: [] },
      start_difficulty: { type: Number, default: 2 },
      interview_focus_areas: { type: [String], default: [] },
      rationale: { type: [String], default: [] },
    },
    questions:[questionsSchema],

    sessionState: {
      current_difficulty: { type: Number, default: 2 },
      weakness_tags: { type: [String], default: [] },
      strengths: { type: [String], default: [] },
      confidence_score: { type: Number, default: 5 },
      strategy_history: { type: [String], default: [] },
      question_history: { type: [String], default: [] },
      focus_areas: { type: [String], default: [] },
    },

    finalScore: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["Incompleted", "completed"],
      default: "Incompleted",
    }
},{timestamps:true})

const Interview = mongoose.model("Interview" , interviewSchema)


export default Interview
