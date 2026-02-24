import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { chatWithOxbot } from "../controllers/oxbot.controller.js";

const router = express.Router();

router.post("/chat", isAuth, chatWithOxbot);

export default router;
