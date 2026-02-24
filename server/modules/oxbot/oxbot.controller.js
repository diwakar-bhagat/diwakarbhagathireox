import { createOxbotService } from "./oxbot.service.js";
import { createOxbotValidator } from "./oxbot.validator.js";

const createError = (statusCode, code, message, details) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
};

const getUserId = (req) =>
  req.userId ||
  req.user?.uid ||
  req.user?.id ||
  req.auth?.uid ||
  req.firebase?.uid ||
  null;

const asScore = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(10, parsed));
};

const calculatePerformanceStats = (interviews) => {
  const safeList = Array.isArray(interviews) ? interviews : [];
  const completed = safeList.filter((item) => item.status === "completed");
  const scores = completed.map((item) => asScore(item.finalScore)).filter((score) => score > 0);

  if (scores.length === 0) {
    return {
      totalInterviews: safeList.length,
      completedInterviews: completed.length,
      averageScore: 0,
      bestScore: 0,
      trend: "steady",
    };
  }

  const total = scores.reduce((acc, value) => acc + value, 0);
  const averageScore = Number((total / scores.length).toFixed(1));
  const bestScore = Number(Math.max(...scores).toFixed(1));
  const last = scores[scores.length - 1];
  const prev = scores.length > 1 ? scores[scores.length - 2] : last;
  const trend = last > prev ? "up" : last < prev ? "down" : "steady";

  return {
    totalInterviews: safeList.length,
    completedInterviews: completed.length,
    averageScore,
    bestScore,
    trend,
  };
};

const buildSuccessResponse = (data) => ({
  success: true,
  data,
  error: null,
});

const buildErrorResponse = ({ code, message, fallbackReply, fallbackActions }) => ({
  success: false,
  data: {
    reply: fallbackReply || "",
    suggested_actions: fallbackActions || [],
  },
  error: {
    code: code || "INTERNAL_ERROR",
    message: message || "Internal server error.",
  },
});

export const createOxbotController = ({
  InterviewModel,
  UserModel,
  validator = createOxbotValidator(),
  service = createOxbotService(),
  logger,
} = {}) => {
  if (!InterviewModel || typeof InterviewModel.find !== "function") {
    throw new Error("InterviewModel dependency is required for OXbot controller.");
  }

  const chat = async (req, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        throw createError(401, "AUTH_ERROR", "Authentication required.");
      }

      const { message, context } = validator.validateChatPayload(req.body);

      const [recentInterviews, allInterviews, user] = await Promise.all([
        InterviewModel.find({ userId })
          .sort({ createdAt: -1 })
          .limit(3)
          .select("role mode finalScore status createdAt")
          .lean(),
        InterviewModel.find({ userId })
          .select("finalScore status createdAt")
          .lean(),
        UserModel?.findOne
          ? UserModel.findById(userId).select("credits").lean()
          : Promise.resolve(null),
      ]);

      const performanceStats = calculatePerformanceStats(allInterviews);
      const tier = context.tier || (Number(user?.credits) > 500 ? "pro" : "free");

      const aiResult = await service.generateReply({
        message,
        context: { ...context, tier },
        performanceStats,
        recentInterviews,
      });

      return res.status(200).json(
        buildSuccessResponse({
          reply: aiResult.reply,
          suggested_actions: aiResult.suggested_actions,
        })
      );
    } catch (error) {
      const statusCode = Number(error?.statusCode) || 500;
      const code =
        error?.code ||
        (statusCode === 400
          ? "VALIDATION_ERROR"
          : statusCode === 401
            ? "AUTH_ERROR"
            : statusCode === 429
              ? "RATE_LIMIT_EXCEEDED"
              : statusCode === 502
                ? "AI_SERVICE_FAILURE"
                : "INTERNAL_ERROR");
      const message =
        statusCode === 500 ? "Internal server error." : error?.message || "Request failed.";

      if (logger?.error) {
        logger.error("OXbot controller error", {
          statusCode,
          code,
          message: error?.message,
          route: req.originalUrl,
          userId: getUserId(req),
        });
      }

      return res.status(statusCode).json(
        buildErrorResponse({
          code,
          message,
          fallbackReply: error?.clientMessage,
          fallbackActions: error?.fallbackActions,
        })
      );
    }
  };

  return {
    chat,
  };
};

export default createOxbotController;
