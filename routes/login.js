import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../db.js";  
import rateLimit from "express-rate-limit";
import sanitizeHtml from "sanitize-html";


const router = express.Router();

// Rate limiter för /login – max 10 försök per 15 min per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuter
  max: 10,                  // max 10 requests i tidsfönstret
  message: {
    error: "För många inloggningsförsök. Försök igen senare."
  },
  standardHeaders: true,
  legacyHeaders: false
});


router.post("/login", loginLimiter, async (req, res) => {
  const { username, password } = req.body;

  console.log("LOGIN-FÖRSÖK:", { username, password });

  if (!username || !password) {
    return res.status(400).json({ error: "username och password krävs" });
  }

  try {
    const result = await pool.query(
      "SELECT id, username, password_hash, role FROM users WHERE username = $1",
      [username]
    );

    console.log("DB rowCount:", result.rowCount);

    if (result.rowCount === 0) {
      console.log("INGEN ANVÄNDARE HITTAD");
      return res.status(401).json({ error: "Fel användare eller lösenord" });
    }

    const user = result.rows[0];

    console.log("USER FRÅN DB:", {
      id: user.id,
      username: user.username,
      hashStart: user.password_hash?.slice(0, 15),
      role: user.role
    });

    const ok = await bcrypt.compare(password, user.password_hash);

    console.log("PASSWORD MATCH:", ok);

    if (!ok) {
      console.log("LÖSEN MATCHAR INTE");
      return res.status(401).json({ error: "Fel användare eller lösenord" });
    }

    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );

    res.json({
      message: `Welcome ${user.username}!`,
      token: token,
    });
  } catch (err) {
    console.error("Fel vid login:", err);
    res.status(500).json({ error: "Kunde inte logga in" });
  }
});


export default router;
