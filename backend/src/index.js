const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { makePool } = require("./db");
const { logger } = require("./logger");

const PORT = Number(process.env.PORT || 3001);

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getTokenFromHeaders(req) {
  const auth = req.header("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return req.header("X-Auth-Token") || null;
}

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.set("trust proxy", true);

  const pool = await makePool();

  app.get("/health", (_req, res) => res.json({ ok: true }));

  app.post("/bootstrap", async (_req, res) => {
    const email = process.env.DEFAULT_USER_EMAIL || "admin@test.com";
    const password = process.env.DEFAULT_USER_PASSWORD || "admin123";
    const hash = await bcrypt.hash(password, 10);

    await pool.execute(
      "INSERT IGNORE INTO users (email, password_hash) VALUES (?, ?)",
      [email, hash]
    );

    res.json({ ok: true, email, password });
  });

  app.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password required" });
  }

  const [rows] = await pool.execute(
    "SELECT id, password_hash FROM users WHERE email=? LIMIT 1",
    [email]
  );

  if (!rows.length) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const user = rows[0];

  if (password !== user.password_hash) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  const token = makeToken();
  await pool.execute(
    "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
    [user.id, token]
  );

  res.json({ token });
});

  async function requireAuth(req, res, next) {
    const token = getTokenFromHeaders(req);
    if (!token) return res.status(401).json({ error: "missing token" });

    const [rows] = await pool.execute(
      "SELECT user_id FROM tokens WHERE token=? LIMIT 1",
      [token]
    );
    if (!rows.length) return res.status(401).json({ error: "invalid token" });

    req.userId = rows[0].user_id;
    next();
  }

  app.get("/me", requireAuth, async (req, res) => {
    const userId = Number(req.userId);
    const [rows] = await pool.execute(
      "SELECT id, email, created_at FROM users WHERE id=? LIMIT 1",
      [req.userId]
    );
    res.json({ user: rows[0] || null });
  });

  app.listen(PORT, () => console.log(`API listening on ${PORT}`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

