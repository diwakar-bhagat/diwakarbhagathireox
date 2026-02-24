import jwt from "jsonwebtoken"

const genToken = (userId) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not configured.");
  }

  return jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });
}

export default genToken
