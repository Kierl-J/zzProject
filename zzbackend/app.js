import express from "express";
import mysql from 'mysql2';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from "cookie-parser"; 

dotenv.config();

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:5173", credentials: true }))

const db = await mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
}).promise();

console.log("Connected to MySQL database");

const generateAccessToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "15m" });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user.id, username: user.username }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });
};

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.status(400).json({ message: "Username and password required" });

  try {
    const [existingUsers] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (existingUsers.length > 0) return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 12);
    await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) return res.status(400).json({ message: "Username and password required" });

  try {
    const [users] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (users.length === 0) return res.status(400).json({ message: "Invalid username or password" });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(400).json({ message: "Invalid username or password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: false, sameSite: "strict" });
    res.status(200).json({ accessToken });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "Access Denied" });

  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid or Expired Token" });
    req.user = user;
    next();
  });
};

app.get('/users', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, username, DATE_FORMAT(created_at, '%Y-%m-%d %H:%i:%s') FROM users");
    
    res.json(rows); // Send the result back to the client
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error' });
  }
});

app.post("/refresh", (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) return res.status(401).json({ message: "No refresh token provided" });

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid refresh token" });

    const newAccessToken = generateAccessToken({ id: user.id, username: user.username });
    res.status(200).json({ accessToken: newAccessToken });
  });
});

app.get("/dashboard", authenticateToken, (req, res) => {
  res.json({ message: `Welcome ${req.user.username} to your dashboard!` });
});

app.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logged out successfully" });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});