import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/connectDb.js"
import cookieParser from "cookie-parser"
import mongoose from "mongoose"
dotenv.config()
import cors from "cors"
import authRouter from "./routes/auth.route.js"
import userRouter from "./routes/user.route.js"
import interviewRouter from "./routes/interview.route.js"
import paymentRouter from "./routes/payment.route.js"
import oxbotRouter from "./routes/oxbot.route.js"
const app = express()
const isProduction = process.env.NODE_ENV === "production";

const normalizeOrigin = (value) => value.replace(/\/+$/, "");
const defaultOrigins = [
    "https://hireox.in",
    "https://www.hireox.in",
    "https://ox-client.onrender.com",
    "https://diwakarbhagathireox.onrender.com",
    "https://diwakarbhagatbuildx-client.onrender.com",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];
const configuredOrigins = (process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
const allowedOrigins = [...new Set([...defaultOrigins, ...configuredOrigins])]
    .map((origin) => normalizeOrigin(origin));
const allowedOriginSet = new Set(allowedOrigins);

app.set("trust proxy", 1);

app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
        res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
    }
    next();
});

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOriginSet.has(normalizeOrigin(origin))) {
            callback(null, true);
            return;
        }
        callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}))

app.use("/api/payment/webhook", express.raw({ type: "application/json", limit: "1mb" }))
app.use(express.json({ limit: "1mb" }))
app.use(cookieParser())

app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/interview", interviewRouter)
app.use("/api/payment", paymentRouter)
app.use("/api/oxbot", oxbotRouter)

const dbReadyStateLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
};

app.get("/health", (req, res) => {
    const dbState = dbReadyStateLabels[mongoose.connection.readyState] || "unknown";
    const degraded = dbState !== "connected";
    const statusCode = isProduction && degraded ? 503 : 200;
    return res.status(statusCode).json({
        status: degraded ? "degraded" : "ok",
        db: dbState,
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

app.use((err, req, res, next) => {
    if (!err) {
        next();
        return;
    }

    if (typeof err?.message === "string" && err.message.startsWith("Not allowed by CORS")) {
        return res.status(403).json({ message: "Not allowed by CORS" });
    }

    if (err?.name === "MulterError") {
        return res.status(400).json({ message: err.message });
    }
    if (
        err?.message === "Only PDF files are allowed."
        || err?.message === "Only PDF or image files are allowed for JD upload."
    ) {
        return res.status(400).json({ message: err.message });
    }

    console.error("Unhandled server error", err);
    return res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 6000

const startServer = async () => {
    if (isProduction) {
        await connectDb();
    } else {
        try {
            await connectDb();
        } catch (error) {
            console.error(`[db] Development mode: starting without DB connection (${error.message})`);
        }
    }
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`)
    });
};

startServer().catch((error) => {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
});
