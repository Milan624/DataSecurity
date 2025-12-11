
// --- Imports ---
import express from "express";
import session from "express-session";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();


// importera middleware
import { authenticateToken } from "./middleware/auth.js";

// Routes
import loginRoutes from "./routes/login.js";
import usersRoutes from "./routes/users.js";
import threadsRoutes from "./routes/threads.js";


// DB-anslutning (återanvänd pool från db.js)
import pool from "./db.js";

// RBAC funktionen
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({
        error: "Forbidden",
        expected: role,
        actual: req.user.role,
      });
    }

    next();
  };
}


// --- Skapa Express-app ---
const app = express();
const port = 3000;

// --- Middleware ---
app.use(express.json());

app.use(
  session({
    secret: "min-hemlighet",
    resave: false,
    saveUninitialized: true,
  })
);

// --- Routes ---
app.use(loginRoutes);
app.use(usersRoutes);
app.use(threadsRoutes);


// Skyddad endpoint: kräver giltig JWT-token
app.get("/me", authenticateToken, (req, res) => {
  // req.user kommer från JWT-payloaden (satt i authenticateToken)
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
});

// admin-test route (för att testa att RBAC funkar)
app.get(
  "/admin-test",
  authenticateToken,
  requireRole("admin"),
  (req, res) => {
    res.json({
      message: "Välkommen admin",
      user: req.user
    });
  }
);


// --- Root-endpoint ---
app.get("/", (req, res) => {
  console.log("Root-endpoint anropad");
  res.json({ message: "Servern kör och du kan prata med den." });
});

// --- Endpoint för att testa databas-anslutning ---
app.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW() as now");
    return res.status(200).json({
      message: "Databasanslutning OK",
      time: result.rows[0].now,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Fel vid databasanslutning" });
  }
});

// --- Starta servern ---
app
  .listen(port, () => {
    console.log(`Server kör på http://localhost:${port}`);
  })
  .on("error", (err) => {
    console.error("SERVER FEL:", err);
  });
