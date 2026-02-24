import Interview from "../models/interview.model.js";
import axios from "axios";

export const chatWithOxbot = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const { message, context } = req.body;
        if (!message || !context) {
            return res.status(400).json({ error: "Missing message or context" });
        }

        // Fetch the 3 most recent interviews for context
        const recentInterviews = await Interview.find({ userId })
            .sort({ createdAt: -1 })
            .limit(3);

        const scores = recentInterviews.map((i) => i.score).join(", ");

        const systemPrompt = `
You are OXbot, the embedded AI assistant of HireOX.AI.

User context:
Route: ${context.route || "Unknown"}
Tier: ${context.tier || "Free"}
Recent Interview Scores: ${scores || "None yet"}

Your role:
- Explain features clearly and concisely.
- Advise performance improvements based on recent scores if available.
- Encourage users to take another interview to improve.
- Never hallucinate features not mentioned.
- Keep tone professional, calm, confident, and never over-excited.
- Do NOT use emojis.
`;

        const openRouterKey = process.env.OPENROUTER_API_KEY;
        if (!openRouterKey) {
            console.error("Missing OPENROUTER_API_KEY in environment");
            return res.status(500).json({ error: "AI service configuration error" });
        }

        const response = await axios.post(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                model: "openai/gpt-4o-mini",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: message },
                ],
            },
            {
                headers: {
                    Authorization: `Bearer ${openRouterKey}`,
                    "Content-Type": "application/json",
                },
            }
        );

        const reply = response.data?.choices?.[0]?.message?.content;
        if (!reply) {
            throw new Error("Invalid response from OpenRouter");
        }

        res.status(200).json({
            reply,
            suggested_actions: [],
        });
    } catch (err) {
        console.error("OXbot chat error", err.message || err);
        res.status(500).json({ error: "OXbot failed" });
    }
};
