const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const { makePool } = require("./db");
const { logger } = require("./logger");

const PORT = Number(process.env.PORT || 3001);

function makeToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getToken(req) {
  const auth = req.header("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  return null;
}

async function waitForDB() {
  while (true) {
    try {
      const pool = await makePool();
      await pool.query("SELECT 1");
      return pool;
    } catch (err) {
      console.log("Waiting for database...");
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function main() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.set("trust proxy", true);

  const pool = await waitForDB();

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return res.status(400).json({ error: "email and password required" });
      }

      const [users] = await pool.execute(
        "SELECT id, password FROM users WHERE email=? LIMIT 1",
        [email]
      );

      if (!users.length) {
        return res.status(401).json({ error: "invalid credentials" });
      }

      const user = users[0];

      if (password !== user.password) {
        return res.status(401).json({ error: "invalid credentials" });
      }

      const token = makeToken();
      await pool.execute(
        "INSERT INTO tokens (user_id, token) VALUES (?, ?)",
        [user.id, token]
      );

      logger.info({
        timestamp: new Date().toISOString(),
        userId: user.id,
        action: "login",
        ip: req.ip
      });

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "internal error" });
    }
  });

  app.get("/protected", async (req, res) => {
    try {
      const token = getToken(req);
      if (!token) {
        return res.status(401).json({ error: "missing token" });
      }

      const [rows] = await pool.execute(
        "SELECT user_id FROM tokens WHERE token=? LIMIT 1",
        [token]
      );

      if (!rows.length) {
        return res.status(401).json({ error: "invalid token" });
      }

      res.json({ ok: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "internal error" });
    }
  });

  app.listen(PORT, () => {
    console.log(`API listening on ${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

