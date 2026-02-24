import jwt from "jsonwebtoken"
import User from "../models/user.model.js";
import { verifyFirebaseIdToken } from "../config/firebaseAdmin.js";

const extractBearerToken = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string") return "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const resolveUserIdFromFirebaseToken = async (firebaseToken) => {
  if (!firebaseToken) return "";
  const decoded = await verifyFirebaseIdToken(firebaseToken);
  const email = decoded?.email?.trim().toLowerCase();
  if (!email) return "";

  let user = await User.findOne({ email }).select("_id name email").lean();
  if (!user) {
    const created = await User.create({
      name: decoded?.name?.trim() || email.split("@")[0] || "User",
      email,
    });
    return String(created._id);
  }

  return String(user._id);
};

const isAuth = async (req, res, next) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const { token } = req.cookies;
    if (token) {
      let verifyToken;
      try {
        verifyToken = jwt.verify(token, jwtSecret);
      } catch {
        verifyToken = null;
      }

      if (verifyToken?.userId) {
        req.userId = verifyToken.userId;
        next();
        return;
      }
    }

    const firebaseToken = extractBearerToken(req);
    if (firebaseToken) {
      try {
        const resolvedUserId = await resolveUserIdFromFirebaseToken(firebaseToken);
        if (!resolvedUserId) {
          return res.status(401).json({ message: "invalid firebase token" });
        }
        req.userId = resolvedUserId;
        next();
        return;
      } catch {
        return res.status(401).json({ message: "invalid firebase token" });
      }
    }

    return res.status(401).json({ message: "user does not have a token" });
  } catch (error) {
    console.error("isAuth error", error);
    return res.status(500).json({ message: "isAuth error" });
  }
}

export default isAuth
