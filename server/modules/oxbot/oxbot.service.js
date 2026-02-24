import axios from "axios";
import { buildOxbotSystemPrompt } from "./oxbot.prompt.js";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "openai/gpt-4o-mini";
const REQUEST_TIMEOUT_MS = 8000;

const createError = (statusCode, code, message, extra = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  Object.assign(error, extra);
  return error;
};

const fallbackReply =
  "I cannot process that right now. Please continue your interview flow and try again in a moment.";
const fallbackActions = ["Continue current step", "Retry OXbot in a minute"];

const sanitizeAction = (value) => {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, 80);
};

const extractJsonObject = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
};

const parseAssistantPayload = (rawContent) => {
  if (typeof rawContent !== "string" || !rawContent.trim()) {
    return null;
  }

  const direct = rawContent.trim();
  const candidate = extractJsonObject(direct) || direct;

  try {
    const parsed = JSON.parse(candidate);
    if (!parsed || typeof parsed !== "object") return null;

    const reply =
      typeof parsed.reply === "string"
        ? parsed.reply.replace(/\s+/g, " ").trim().slice(0, 500)
        : "";
    const suggestedActions = Array.isArray(parsed.suggested_actions)
      ? parsed.suggested_actions
          .map((item) => sanitizeAction(item))
          .filter(Boolean)
          .slice(0, 3)
      : [];

    if (!reply) return null;

    return {
      reply,
      suggested_actions:
        suggestedActions.length > 0
          ? suggestedActions
          : ["View interview history", "Continue interview preparation"],
    };
  } catch (error) {
    return null;
  }
};

export const createOxbotService = ({
  httpClient = axios,
  logger,
  model = process.env.OXBOT_OPENROUTER_MODEL || DEFAULT_MODEL,
  timeoutMs = REQUEST_TIMEOUT_MS,
  apiKey = process.env.OPENROUTER_API_KEY,
} = {}) => {
  const requestOpenRouter = async (payload) => {
    if (!apiKey) {
      throw createError(502, "AI_SERVICE_FAILURE", "AI service is unavailable.", {
        clientMessage: fallbackReply,
        fallbackActions,
      });
    }

    try {
      const response = await httpClient.post(OPENROUTER_ENDPOINT, payload, {
        timeout: timeoutMs,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return response;
    } catch (error) {
      if (logger?.error) {
        logger.error("OpenRouter request failed", {
          status: error?.response?.status,
          message: error?.message,
        });
      }

      throw createError(502, "AI_SERVICE_FAILURE", "AI service request failed.", {
        clientMessage: fallbackReply,
        fallbackActions,
      });
    }
  };

  return {
    generateReply: async ({ message, context, performanceStats, recentInterviews }) => {
      const systemPrompt = buildOxbotSystemPrompt({
        context,
        performanceStats,
        recentInterviews,
      });

      const payload = {
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: message,
          },
        ],
      };

      const response = await requestOpenRouter(payload);
      const content = response?.data?.choices?.[0]?.message?.content ?? "";
      const parsed = parseAssistantPayload(content);

      if (!parsed) {
        throw createError(502, "AI_SERVICE_FAILURE", "AI response parsing failed.", {
          clientMessage: fallbackReply,
          fallbackActions,
        });
      }

      return parsed;
    },
  };
};

export default createOxbotService;
