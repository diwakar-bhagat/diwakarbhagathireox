const REDACTED = "[REDACTED]";

const redactMeta = (value) => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactMeta(item));
  }

  if (typeof value !== "object") {
    return value;
  }

  const output = {};
  for (const [key, val] of Object.entries(value)) {
    const lower = key.toLowerCase();
    const isSensitive =
      lower.includes("token") ||
      lower.includes("secret") ||
      lower.includes("authorization") ||
      lower.includes("password") ||
      lower.includes("api_key") ||
      lower === "key";

    output[key] = isSensitive ? REDACTED : redactMeta(val);
  }

  return output;
};

const writeLog = (level, namespace, message, meta = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    namespace,
    message,
    meta: redactMeta(meta),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const createOxbotLogger = ({ namespace = "oxbot" } = {}) => {
  const isProd = process.env.NODE_ENV === "production";

  return {
    info: (message, meta) => writeLog("info", namespace, message, meta),
    warn: (message, meta) => writeLog("warn", namespace, message, meta),
    error: (message, meta) => writeLog("error", namespace, message, meta),
    debug: (message, meta) => {
      if (!isProd) {
        writeLog("debug", namespace, message, meta);
      }
    },
  };
};

export default createOxbotLogger;
