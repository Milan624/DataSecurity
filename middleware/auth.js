import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  let token = null;

  // 1. Försök ta token från Authorization: Bearer <token>
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }


  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role, iat, exp }
    next();
  } catch (err) {
    console.error("JWT verify error:", err.message);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
