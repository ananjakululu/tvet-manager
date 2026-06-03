const express = require("express");
const { Pool } = require("pg");
const bcrypt = require("bcrypt"); // Needed for password hashing

const app = express();
app.use(express.json());

// Use DATABASE_URL (standard for Neon + Vercel)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Neon requires SSL
});

// --- Initialize DB ---
async function initDB() {
  try {
    // 1. Create the users table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        passwordHash TEXT,
        role VARCHAR(50)
      )
    `);

    // 2. Ensure default admin exists
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      ["admin@tvet.ac.ke"]
    );

    if (result.rows.length === 0) {
      const defaultPassword = "admin123";
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);

      await pool.query(
        "INSERT INTO users (email, passwordHash, role) VALUES ($1, $2, $3)",
        ["admin@tvet.ac.ke", hashedPassword, "admin"]
      );
      console.log("✅ Default admin user created.");
    }
  } catch (err) {
    console.error("❌ Error initializing DB:", err);
  }
}

// --- Load users ---
async function loadDB() {
  try {
    const result = await pool.query("SELECT * FROM users");
    return result.rows;
  } catch (err) {
    console.error("❌ Error loading DB:", err);
    return [];
  }
}

// --- Save user ---
async function saveUser(email, passwordHash, role) {
  try {
    const check = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (check.rows.length > 0) {
      // Update existing user
      await pool.query(
        "UPDATE users SET passwordHash = $1, role = $2 WHERE email = $3",
        [passwordHash, role, email]
      );
    } else {
      // Insert new user
      await pool.query(
        "INSERT INTO users (email, passwordHash, role) VALUES ($1, $2, $3)",
        [email, passwordHash, role]
      );
    }
  } catch (err) {
    console.error("❌ Error saving user:", err);
  }
}

// --- Example routes ---
app.get("/", (req, res) => {
  res.send("Hello from Express + Neon on Vercel!");
});

app.get("/users", async (req, res) => {
  const users = await loadDB();
  res.json(users);
});

// Export app for Vercel (no app.listen!)
module.exports = app;

// Run DB init once on startup
initDB();
