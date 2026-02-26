const DEFAULT_ROUND_STRUCTURE = [
  "behavioral",
  "technical_fundamentals",
  "applied",
  "edge_cases",
  "system_design",
];

const clampDifficulty = (value) => {
  if (!Number.isFinite(value)) return 2;
  if (value < 1) return 1;
  if (value > 5) return 5;
  return Math.round(value);
};

const inferStartDifficulty = (experience) => {
  const text = typeof experience === "string" ? experience.toLowerCase() : "";
  const numericMatch = text.match(/(\d+)(\+)?/);
  const years = numericMatch ? Number(numericMatch[1]) : null;

  if (text.includes("intern") || text.includes("fresher") || text.includes("entry")) return 1;
  if (text.includes("junior")) return 2;
  if (text.includes("mid")) return 3;
  if (text.includes("senior") || text.includes("lead") || text.includes("staff")) return 4;

  if (years === null) return 2;
  if (years <= 1) return 1;
  if (years <= 3) return 2;
  if (years <= 6) return 3;
  return 4;
};

const normalizeList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean))];
};

export const buildInterviewPlan = ({ role, experience, resumeAnalysis, jdGapResult }) => {
  const safeRole = typeof role === "string" && role.trim() ? role.trim() : "Target Role";
  const startDifficulty = clampDifficulty(inferStartDifficulty(experience));

  const gapFocusAreas = normalizeList(jdGapResult?.focusAreas);
  const fallbackAreas = normalizeList([
    ...(Array.isArray(resumeAnalysis?.skills) ? resumeAnalysis.skills.slice(0, 2) : []),
    "problem solving",
    "communication clarity",
  ]);

  const interviewFocusAreas = (gapFocusAreas.length ? gapFocusAreas : fallbackAreas).slice(0, 5);

  const rationale = [
    `Prioritized ${interviewFocusAreas.length} focus areas for ${safeRole} based on JD-resume gap signals.`,
    `Start difficulty set to ${startDifficulty} from stated experience context.`,
    "Round structure keeps progression from fundamentals to applied and system-level thinking.",
  ];

  return {
    round_structure: DEFAULT_ROUND_STRUCTURE,
    start_difficulty: startDifficulty,
    interview_focus_areas: interviewFocusAreas,
    rationale,
  };
};

