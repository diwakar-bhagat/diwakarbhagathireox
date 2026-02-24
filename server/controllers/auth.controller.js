import genToken from "../config/token.js"
import User from "../models/user.model.js"
import { getClearCookieOptions, getCookieOptions } from "../config/cookie.js";
import { verifyFirebaseIdToken } from "../config/firebaseAdmin.js";


export const googleAuth = async (req, res) => {
  try {
    const { idToken } = req.body ?? {};
    if (!idToken || typeof idToken !== "string") {
      return res.status(400).json({ message: "idToken is required" });
    }

    const decoded = await verifyFirebaseIdToken(idToken);
    const email = decoded.email?.trim().toLowerCase();
    const name =
      decoded.name?.trim() ||
      req.body?.name?.trim() ||
      (email ? email.split("@")[0] : "");

    if (!email) {
      return res.status(400).json({ message: "Unable to resolve user email from token" });
    }

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || "User",
        email,
      });
    }

    const token = genToken(user._id);
    res.cookie("token", token, getCookieOptions());

    return res.status(200).json(user);
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({
        message: error.statusCode === 500 ? "Google auth failed" : "Invalid Firebase token",
      });
    }
    return res.status(500).json({ message: "Google auth failed" });
  }
}

export const logOut = async (req, res) => {
  try {
    res.clearCookie("token", getClearCookieOptions());
    return res.status(200).json({ message: "LogOut Successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Logout failed" });
  }
}
