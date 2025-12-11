// routes/users.js
import express from "express";
import bcrypt from "bcryptjs";
import pool from "../db.js";

const router = express.Router();

// Registrera ny användare
router.post("/users", async (req, res) => {
  const { username, email, password } = req.body;

  // Enkel validering
  if (!username || !email || !password) {
    return res
      .status(400)
      .json({ error: "username, email och password krävs" });
  }

  try {
    // Kolla om username eller email redan används
    const exists = await pool.query(
      "SELECT 1 FROM users WHERE username = $1 OR email = $2",
      [username, email]
    );

    if (exists.rowCount > 0) {
      return res
        .status(409)
        .json({ error: "Username eller email är redan upptagen" });
    }

    // Hasha lösenordet
    const passwordHash = await bcrypt.hash(password, 10);

    // Spara användare
    await pool.query(
      `INSERT INTO users (username, email, password_hash, role, is_blocked, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [username, email, passwordHash, "user", false]
    );

    return res.status(201).json({ message: "You have registered." });
  } catch (err) {
    console.error("Fel vid registrering:", err);
    return res.status(500).json({ error: "Kunde inte registrera användare" });
  }
});

export default router;
