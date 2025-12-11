// routes/threads.js

import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";
import sanitizeHtml from "sanitize-html";


const router = express.Router();

// Skapa en ny tråd (kräver inloggning)
router.post("/threads", authenticateToken, async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: "title och content krävs" });
    }

    // SANERING – XSS-skydd
    const cleanTitle = sanitizeHtml(title, {
      allowedTags: [],
      allowedAttributes: {}
    });

    const cleanContent = sanitizeHtml(content, {
      allowedTags: [],
      allowedAttributes: {}
    });

    const authorId = req.user.id;

    const result = await pool.query(
      `INSERT INTO threads (title, content, author_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, content, author_id, created_at`,
      [cleanTitle, cleanContent, authorId]
    );

    return res.status(201).json({
      ok: true,
      thread: result.rows[0],
    });

  } catch (err) {
    console.error("Fel vid POST /threads:", err);
    return res.status(500).json({ ok: false, error: "Kunde inte skapa tråd" });
  }
});


// Hämta alla trådar (öppen endpoint)
router.get("/threads", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
         t.id,
         t.title,
         t.content,
         t.author_id,
         t.created_at
       FROM threads t
       ORDER BY t.created_at DESC`
    );

    return res.json({
      ok: true,
      threads: result.rows,
    });

  } catch (err) {
    console.error("Fel vid GET /threads:", err);
    return res.status(500).json({ ok: false, error: "Kunde inte hämta trådar" });
  }
});


// Ta bort en tråd: bara ägare eller admin
router.delete("/threads/:id", authenticateToken, async (req, res) => {
  try {
    const threadId = Number(req.params.id);

    // Enkel koll att id är ett heltal
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ error: "Ogiltigt thread-id" });
    }

    // 1. Hämta tråden
    const result = await pool.query(
      "SELECT id, author_id FROM threads WHERE id = $1",
      [threadId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Thread not found" });
    }

    const thread = result.rows[0];

    // 2. Behörighetskontroll
    const isOwner = thread.author_id === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        error: "Forbidden",
        reason: "Not owner or admin",
        threadAuthorId: thread.author_id,
        yourUserId: req.user.id,
        yourRole: req.user.role,
      });
    }

    // 3. Tillåtet att ta bort → kör DELETE
    await pool.query("DELETE FROM threads WHERE id = $1", [threadId]);

    return res.json({ ok: true, message: "Thread deleted" });
  } catch (err) {
    console.error("Fel vid DELETE /threads/:id:", err);
    return res.status(500).json({ ok: false, error: "Kunde inte radera tråd" });
  }
});


export default router;
