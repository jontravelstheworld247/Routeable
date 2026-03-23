import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import * as bcrypt from "bcryptjs";
import path from "path";

const db = new Database("database.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    dob TEXT,
    identifier TEXT UNIQUE,
    password TEXT,
    failed_attempts INTEGER DEFAULT 0,
    reset_otp TEXT,
    reset_otp_expiry INTEGER
  )
`);

// Migration: Add columns if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
const columns = tableInfo.map(c => c.name);

if (!columns.includes('failed_attempts')) {
  db.exec("ALTER TABLE users ADD COLUMN failed_attempts INTEGER DEFAULT 0");
}
if (!columns.includes('reset_otp')) {
  db.exec("ALTER TABLE users ADD COLUMN reset_otp TEXT");
}
if (!columns.includes('reset_otp_expiry')) {
  db.exec("ALTER TABLE users ADD COLUMN reset_otp_expiry INTEGER");
}

// Reset all failed attempts to 0 for a clean test state
db.exec("UPDATE users SET failed_attempts = 0");

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/google-auth", (req, res) => {
    try {
      const { name, identifier } = req.body;
      let user = db.prepare("SELECT * FROM users WHERE identifier = ?").get(identifier) as any;
      
      if (!user) {
        // Create a new user for Google login if they don't exist
        const stmt = db.prepare("INSERT INTO users (name, identifier, failed_attempts) VALUES (?, ?, 0)");
        stmt.run(name, identifier);
        user = db.prepare("SELECT * FROM users WHERE identifier = ?").get(identifier);
      }
      
      res.json({ success: true, user: { name: user.name, identifier: user.identifier } });
    } catch (error: any) {
      console.error("Google auth error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Auth Routes
  app.post("/api/signup", (req, res) => {
    try {
      const { name, dob, identifier, password } = req.body;
      const existing = db.prepare("SELECT * FROM users WHERE identifier = ?").get(identifier);
      if (existing) {
        return res.status(400).json({ error: "User already exists" });
      }
      const hashedPassword = bcrypt.hashSync(password, 10);
      const stmt = db.prepare("INSERT INTO users (name, dob, identifier, password, failed_attempts) VALUES (?, ?, ?, ?, 0)");
      stmt.run(name, dob, identifier, hashedPassword);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(400).json({ error: error.message || "Invalid data" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { identifier, password } = req.body;
    console.log(`Login attempt for: ${identifier}`);
    
    try {
      const user = db.prepare("SELECT * FROM users WHERE identifier = ?").get(identifier) as any;
      
      if (!user) {
        console.log(`User not found: ${identifier}`);
        return res.status(404).json({ error: "User not found. Please sign up." });
      }

      if (user.failed_attempts >= 3) {
        console.log(`Account locked for: ${identifier}`);
        return res.status(423).json({ error: "Account locked. Please reset your password." });
      }

      if (bcrypt.compareSync(password, user.password)) {
        console.log(`Login successful for: ${identifier}`);
        db.prepare("UPDATE users SET failed_attempts = 0 WHERE identifier = ?").run(identifier);
        res.json({ success: true, user: { name: user.name, identifier: user.identifier } });
      } else {
        const newAttempts = (user.failed_attempts || 0) + 1;
        console.log(`Invalid password for: ${identifier}. Attempt: ${newAttempts}`);
        db.prepare("UPDATE users SET failed_attempts = ? WHERE identifier = ?").run(newAttempts, identifier);
        
        if (newAttempts >= 3) {
          console.log(`Account locked after 3 attempts: ${identifier}`);
          return res.status(423).json({ error: "Account locked due to 3 failed attempts. Redirecting to reset..." });
        }
        
        res.status(401).json({ error: `Invalid password. ${3 - newAttempts} attempts remaining.` });
      }
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/forgot-password", (req, res) => {
    try {
      const { identifier } = req.body;
      console.log(`Forgot password request for: ${identifier}`);
      const user = db.prepare("SELECT * FROM users WHERE identifier = ?").get(identifier) as any;
      if (!user) {
        console.log(`User not found: ${identifier}`);
        return res.status(404).json({ error: "User not found" });
      }

      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes

      db.prepare("UPDATE users SET reset_otp = ?, reset_otp_expiry = ? WHERE identifier = ?").run(otp, expiry, identifier);
      
      console.log(`Generated OTP for ${identifier}: ${otp}`);
      res.json({ success: true, message: "OTP sent to your identifier", otp_debug: otp });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/verify-otp", (req, res) => {
    try {
      const { identifier, otp } = req.body;
      console.log(`Verifying OTP for ${identifier}: ${otp}`);
      const user = db.prepare("SELECT * FROM users WHERE identifier = ? AND reset_otp = ?").get(identifier, otp) as any;
      
      if (!user) {
        console.log(`Invalid OTP attempt for ${identifier}`);
        return res.status(400).json({ error: "Invalid OTP" });
      }

      if (Date.now() > user.reset_otp_expiry) {
        console.log(`Expired OTP for ${identifier}`);
        return res.status(400).json({ error: "OTP expired" });
      }

      console.log(`OTP verified for ${identifier}`);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Verify OTP error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/reset-password", (req, res) => {
    try {
      const { identifier, otp, password } = req.body;
      const user = db.prepare("SELECT * FROM users WHERE identifier = ? AND reset_otp = ?").get(identifier, otp) as any;
      
      if (!user || Date.now() > user.reset_otp_expiry) {
        return res.status(400).json({ error: "Invalid or expired session" });
      }

      const hashedPassword = bcrypt.hashSync(password, 10);
      db.prepare("UPDATE users SET password = ?, failed_attempts = 0, reset_otp = NULL, reset_otp_expiry = NULL WHERE identifier = ?")
        .run(hashedPassword, identifier);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });
}

startServer();
