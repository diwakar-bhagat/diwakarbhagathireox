const clampScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 10) return 10;
  return parsed;
};

const normalizeTextList = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
  )];
};

const normalizeDensity = (value) => {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
};

const normalizeSessionState = (sessionState) => {
  const safeState = sessionState && typeof sessionState === "object" ? sessionState : {};
  const rawDifficulty = safeState.current_difficulty ?? safeState.difficulty_level;
  const difficulty = Number(rawDifficulty);

  return {
    current_difficulty: Number.isFinite(difficulty)
      ? Math.min(5, Math.max(1, Math.round(difficulty)))
      : 2,
    difficulty_level: Number.isFinite(difficulty)
      ? Math.min(5, Math.max(1, Math.round(difficulty)))
      : 2,
    weakness_tags: normalizeTextList(safeState.weakness_tags),
    strengths: normalizeTextList(safeState.strengths),
    confidence_score: Number.isFinite(Number(safeState.confidence_score))
      ? Math.min(10, Math.max(0, Number(safeState.confidence_score)))
      : 5,
    strategy_history: normalizeTextList(safeState.strategy_history),
    question_history: normalizeTextList(safeState.question_history),
    focus_areas: normalizeTextList(safeState.focus_areas),
    last_strategy: typeof safeState.last_strategy === "string" ? safeState.last_strategy.trim() : "",
  };
};

const buildWeaknessTags = (evaluation) => {
  const tags = [];
  if (evaluation.conceptual_correctness < 6) tags.push("conceptual_correctness");
  if (evaluation.implementation_depth < 6) tags.push("implementation_depth");
  if (evaluation.tradeoff_awareness < 6) tags.push("tradeoff_awareness");
  if (evaluation.clarity < 6) tags.push("clarity");
  if (evaluation.structure < 6) tags.push("structure");
  if (evaluation.example_usage < 6) tags.push("example_usage");
  if (evaluation.confidence < 6) tags.push("confidence");
  if (evaluation.vagueness_flag) tags.push("vagueness");
  if (evaluation.buzzword_density === "high") tags.push("buzzword_overuse");
  return tags;
};

const buildStrengthTags = (evaluation) => {
  const tags = [];
  if (evaluation.conceptual_correctness >= 8) tags.push("conceptual_correctness");
  if (evaluation.implementation_depth >= 8) tags.push("implementation_depth");
  if (evaluation.tradeoff_awareness >= 8) tags.push("tradeoff_awareness");
  if (evaluation.clarity >= 8) tags.push("clarity");
  if (evaluation.structure >= 8) tags.push("structure");
  if (evaluation.example_usage >= 8) tags.push("example_usage");
  if (evaluation.confidence >= 8) tags.push("confidence");
  return tags;
};

const chooseStrategy = (evaluation) => {
  const metrics = [
    { key: "conceptual_correctness", value: evaluation.conceptual_correctness },
    { key: "implementation_depth", value: evaluation.implementation_depth },
    { key: "tradeoff_awareness", value: evaluation.tradeoff_awareness },
  ].sort((a, b) => a.value - b.value);

  const lowest = metrics[0];

  const strongAllCore =
    evaluation.conceptual_correctness > 7 &&
    evaluation.implementation_depth > 7 &&
    evaluation.tradeoff_awareness > 7 &&
    evaluation.clarity > 7 &&
    evaluation.structure > 7 &&
    evaluation.example_usage > 7;

  if (strongAllCore) {
    return "increase_difficulty";
  }

  if (lowest.value < 5) {
    if (lowest.key === "conceptual_correctness") return "clarify";
    if (lowest.key === "tradeoff_awareness") return "ask_tradeoff";
    return "probe_deeper";
  }

  if (evaluation.example_usage < 5) {
    return "ask_example";
  }

  if (evaluation.buzzword_density === "high") {
    return "ask_example";
  }

  if (evaluation.vagueness_flag || evaluation.clarity < 5 || evaluation.structure < 5) {
    return "clarify";
  }

  if (evaluation.confidence < 4) {
    return "switch_topic";
  }

  return "ask_example";
};

export const runDecisionEngine = ({ evaluation, sessionState }) => {
  const normalizedEvaluation = {
    conceptual_correctness: clampScore(evaluation?.conceptual_correctness),
    implementation_depth: clampScore(evaluation?.implementation_depth),
    tradeoff_awareness: clampScore(evaluation?.tradeoff_awareness),
    clarity: clampScore(evaluation?.clarity),
    structure: clampScore(evaluation?.structure),
    example_usage: clampScore(evaluation?.example_usage),
    confidence: clampScore(evaluation?.confidence),
    vagueness_flag: Boolean(evaluation?.vagueness_flag),
    buzzword_density: normalizeDensity(evaluation?.buzzword_density),
  };

  const currentState = normalizeSessionState(sessionState);
  let nextStrategy = chooseStrategy(normalizedEvaluation);

  const lastTwoStrategies = currentState.strategy_history.slice(-2);
  const repetitiveStrategy =
    lastTwoStrategies.length === 2 &&
    lastTwoStrategies.every((strategy) => strategy === nextStrategy);

  if (repetitiveStrategy && normalizedEvaluation.confidence < 5) {
    nextStrategy = "switch_topic";
  }

  let nextDifficulty = currentState.current_difficulty;
  if (nextStrategy === "increase_difficulty") {
    nextDifficulty = Math.min(5, nextDifficulty + 1);
  } else if (
    (nextStrategy === "clarify" || nextStrategy === "probe_deeper") &&
    normalizedEvaluation.confidence < 5
  ) {
    nextDifficulty = Math.max(1, nextDifficulty - 1);
  }

  const weaknessTags = normalizeTextList([
    ...currentState.weakness_tags,
    ...buildWeaknessTags(normalizedEvaluation),
  ]);

  const strengths = normalizeTextList([
    ...currentState.strengths,
    ...buildStrengthTags(normalizedEvaluation),
  ]);

  const updatedConfidenceScore = Number(
    (currentState.confidence_score * 0.7 + normalizedEvaluation.confidence * 0.3).toFixed(1)
  );

  const strategyHistory = [...currentState.strategy_history, nextStrategy].slice(-30);

  return {
    next_strategy: nextStrategy,
    updated_session_state: {
      ...currentState,
      current_difficulty: nextDifficulty,
      difficulty_level: nextDifficulty,
      weakness_tags: weaknessTags,
      strengths,
      confidence_score: updatedConfidenceScore,
      strategy_history: strategyHistory,
      last_strategy: nextStrategy,
    },
  };
};
