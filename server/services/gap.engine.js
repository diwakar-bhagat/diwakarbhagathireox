const normalizeText = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const normalizeList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(normalizeText).filter(Boolean))];
};

const toTitleCase = (value) =>
  value
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ")
    .trim();

const toPrettyList = (items) => items.map(toTitleCase);

const scorePercent = (matched, total) => {
  if (!total) return 0;
  return Math.round((matched / total) * 100);
};

const clampPercent = (value) => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
};

export const runGapEngine = ({ resumeAnalysis, jdAnalysis }) => {
  const resumeSkills = normalizeList(resumeAnalysis?.skills);
  const resumeKeywords = normalizeList([
    ...(Array.isArray(resumeAnalysis?.keywords) ? resumeAnalysis.keywords : []),
    ...(Array.isArray(resumeAnalysis?.projects) ? resumeAnalysis.projects : []),
  ]);

  const jdRequired = normalizeList(jdAnalysis?.required_skills);
  const jdPreferred = normalizeList(jdAnalysis?.preferred_skills);
  const jdKeywords = normalizeList(jdAnalysis?.keywords);

  const resumeCorpus = new Set([...resumeSkills, ...resumeKeywords]);

  const requiredMatched = jdRequired.filter((item) => resumeCorpus.has(item));
  const preferredMatched = jdPreferred.filter((item) => resumeCorpus.has(item));
  const keywordMatched = jdKeywords.filter((item) => resumeCorpus.has(item));

  const missingRequiredSkills = jdRequired.filter((item) => !resumeCorpus.has(item));
  const missingPreferredSkills = jdPreferred.filter((item) => !resumeCorpus.has(item));

  const strongMatches = [...new Set([...requiredMatched, ...preferredMatched])];
  const weakMatches = jdKeywords.filter(
    (item) => resumeCorpus.has(item) && !strongMatches.includes(item)
  );

  const topKeywordGaps = jdKeywords.filter((item) => !resumeCorpus.has(item)).slice(0, 2);

  const focusAreas = [
    ...missingRequiredSkills,
    ...missingPreferredSkills.slice(0, 2),
    ...topKeywordGaps,
  ].filter((item, index, arr) => arr.indexOf(item) === index).slice(0, 5);

  const requiredScore = scorePercent(requiredMatched.length, jdRequired.length);
  const preferredScore = scorePercent(preferredMatched.length, jdPreferred.length);
  const keywordScore = scorePercent(keywordMatched.length, jdKeywords.length);

  const weightedMatch = clampPercent(
    requiredScore * 0.6 + preferredScore * 0.25 + keywordScore * 0.15
  );

  const atsSuggestions = [];
  if (missingRequiredSkills.length) {
    atsSuggestions.push(
      `Add evidence for required skills: ${toPrettyList(missingRequiredSkills.slice(0, 3)).join(", ")}.`
    );
  }
  if (missingPreferredSkills.length) {
    atsSuggestions.push(
      `Strengthen preferred skills: ${toPrettyList(missingPreferredSkills.slice(0, 2)).join(", ")}.`
    );
  }
  if (!atsSuggestions.length) {
    atsSuggestions.push("Resume has strong keyword alignment; keep impact metrics explicit for ATS readability.");
  }

  return {
    matchPercentage: weightedMatch,
    missingRequiredSkills: toPrettyList(missingRequiredSkills),
    missingPreferredSkills: toPrettyList(missingPreferredSkills),
    strongMatches: toPrettyList(strongMatches),
    weakMatches: toPrettyList(weakMatches),
    focusAreas: toPrettyList(focusAreas),
    atsSignals: {
      keywordMatchPercent: keywordScore,
      suggestions: atsSuggestions.slice(0, 3),
    },
  };
};

