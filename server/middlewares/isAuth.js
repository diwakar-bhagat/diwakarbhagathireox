import jwt from "jsonwebtoken"


const isAuth = async (req, res, next) => {
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({ message: "JWT secret is not configured" });
    }

    const { token } = req.cookies;
    if (!token) {
      return res.status(401).json({ message: "user does not have a token" });
    }

    let verifyToken;
    try {
      verifyToken = jwt.verify(token, jwtSecret);
    } catch (err) {
      return res.status(401).json({ message: "invalid or expired token" });
    }

    if (!verifyToken?.userId) {
      return res.status(401).json({ message: "user does not have a valid token" });
    }

    req.userId = verifyToken.userId;
    next();
  } catch (error) {
    console.error("isAuth error", error);
    return res.status(500).json({ message: "isAuth error" });
  }
}

export default isAuth
