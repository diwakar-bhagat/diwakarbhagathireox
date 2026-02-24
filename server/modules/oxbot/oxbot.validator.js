const MAX_MESSAGE_LENGTH = 2000;

const createError = (statusCode, code, message, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

const stripControlChars = (value) =>
  value.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ");

const normalizeWhitespace = (value) => value.replace(/\s+/g, " ").trim();

const stripPromptInjection = (value) => {
  const patterns = [
    /ignore\s+(all|any|previous)\s+instructions/gi,
    /\b(disregard|override)\b.{0,120}\b(system|developer|assistant)\b/gi,
    /\b(system prompt|developer message|internal instructions)\b/gi,
    /(^|\n)\s*(system|assistant|developer)\s*:/gi,
    /<\s*system\s*>|<\s*\/\s*system\s*>/gi,
    /you are now\s+/gi,
    /act as\s+/gi,
  ];

  let next = value;
  for (const pattern of patterns) {
    next = next.replace(pattern, " ");
  }
  return next;
};

const sanitizePlainText = (value) => {
  if (typeof value !== "string") return "";
  return normalizeWhitespace(stripControlChars(value));
};

const sanitizeTier = (value) => {
  const normalized = sanitizePlainText(String(value ?? "free")).toLowerCase();
  const allowed = new Set(["free", "basic", "pro", "enterprise"]);
  if (allowed.has(normalized)) {
    return normalized;
  }
  return "free";
};

const sanitizePaymentStatus = (value) => {
  const normalized = sanitizePlainText(String(value ?? "unknown")).toLowerCase();
  const allowed = new Set([
    "idle",
    "pending",
    "processing",
    "success",
    "failed",
    "error",
    "completed",
    "unknown",
  ]);

  if (allowed.has(normalized)) {
    return normalized;
  }
  return "unknown";
};

const sanitizeRoute = (value) => {
  const normalized = sanitizePlainText(String(value ?? "/"));
  const safe = normalized.replace(/[^a-zA-Z0-9\-_/]/g, "");
  if (!safe) return "/";
  return safe.slice(0, 120);
};

const sanitizeInterviewProgress = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {
      step: 0,
      currentQuestion: 0,
      totalQuestions: 0,
      answeredQuestions: 0,
    };
  }

  const toSafeNumber = (input, min = 0, max = 999) => {
    const parsed = Number(input);
    if (!Number.isFinite(parsed)) return min;
    return Math.max(min, Math.min(max, Math.floor(parsed)));
  };

  return {
    step: toSafeNumber(value.step, 0, 10),
    currentQuestion: toSafeNumber(value.currentQuestion, 0, 200),
    totalQuestions: toSafeNumber(value.totalQuestions, 0, 200),
    answeredQuestions: toSafeNumber(value.answeredQuestions, 0, 200),
  };
};

const sanitizeLastScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.min(10, Number(parsed.toFixed(1))));
};

export const createOxbotValidator = () => {
  return {
    validateChatPayload: (payload) => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        throw createError(400, "VALIDATION_ERROR", "Request payload must be an object.");
      }

      const rawMessage = sanitizePlainText(String(payload.message ?? ""));
      const sanitizedMessage = normalizeWhitespace(
        stripPromptInjection(rawMessage)
      );

      if (!sanitizedMessage) {
        throw createError(400, "VALIDATION_ERROR", "message is required.");
      }

      if (sanitizedMessage.length > MAX_MESSAGE_LENGTH) {
        throw createError(
          400,
          "VALIDATION_ERROR",
          `message must be less than ${MAX_MESSAGE_LENGTH} characters.`
        );
      }

      const rawContext = payload.context;
      const context =
        rawContext && typeof rawContext === "object" && !Array.isArray(rawContext)
          ? rawContext
          : {};

      return {
        message: sanitizedMessage,
        context: {
          route: sanitizeRoute(context.route),
          tier: sanitizeTier(context.tier),
          interviewProgress: sanitizeInterviewProgress(context.interviewProgress),
          resumeStatus: Boolean(context.resumeStatus),
          paymentStatus: sanitizePaymentStatus(context.paymentStatus),
          lastScore: sanitizeLastScore(context.lastScore),
        },
      };
    },
  };
};

export default createOxbotValidator;
