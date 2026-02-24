const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 15;

const createErrorResponse = (message) => ({
  success: false,
  data: {
    reply: "",
    suggested_actions: [],
  },
  error: {
    code: "RATE_LIMIT_EXCEEDED",
    message,
  },
});

const resolveUserKey = (req) =>
  req.userId ||
  req.user?.uid ||
  req.user?.id ||
  req.auth?.uid ||
  req.firebase?.uid ||
  req.ip ||
  "anonymous";

export const createOxbotRateLimiter = ({
  limit = MAX_REQUESTS,
  windowMs = WINDOW_MS,
  logger,
} = {}) => {
  const requestMap = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const userKey = String(resolveUserKey(req));
    const records = requestMap.get(userKey) || [];
    const active = records.filter((timestamp) => now - timestamp < windowMs);

    if (active.length >= limit) {
      if (logger?.warn) {
        logger.warn("OXbot rate limit exceeded", {
          userKey,
          limit,
          windowMs,
        });
      }

      return res.status(429).json(
        createErrorResponse("Too many requests. Please try again in a minute.")
      );
    }

    active.push(now);
    requestMap.set(userKey, active);

    if (requestMap.size > 10000) {
      for (const [key, timestamps] of requestMap.entries()) {
        const fresh = timestamps.filter((time) => now - time < windowMs);
        if (fresh.length === 0) {
          requestMap.delete(key);
        } else {
          requestMap.set(key, fresh);
        }
      }
    }

    next();
  };
};

export default createOxbotRateLimiter;
