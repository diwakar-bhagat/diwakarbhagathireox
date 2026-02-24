import express from "express";
import { createOxbotController } from "./oxbot.controller.js";
import { createOxbotService } from "./oxbot.service.js";
import { createOxbotValidator } from "./oxbot.validator.js";
import { createOxbotLogger } from "./oxbot.logger.js";
import { createOxbotRateLimiter } from "./oxbot.rateLimiter.js";

export const createOxbotRouter = ({
  firebaseVerifyMiddleware,
  InterviewModel,
  UserModel,
  service,
  validator,
  logger,
  rateLimiter,
} = {}) => {
  if (typeof firebaseVerifyMiddleware !== "function") {
    throw new Error("firebaseVerifyMiddleware dependency is required for OXbot router.");
  }

  const scopedLogger = logger || createOxbotLogger();
  const scopedValidator = validator || createOxbotValidator();
  const scopedService = service || createOxbotService({ logger: scopedLogger });
  const scopedRateLimiter =
    rateLimiter || createOxbotRateLimiter({ logger: scopedLogger });
  const controller = createOxbotController({
    InterviewModel,
    UserModel,
    validator: scopedValidator,
    service: scopedService,
    logger: scopedLogger,
  });

  const router = express.Router();

  router.post(
    "/api/v1/oxbot/chat",
    firebaseVerifyMiddleware,
    scopedRateLimiter,
    controller.chat
  );

  return router;
};

export default createOxbotRouter;
