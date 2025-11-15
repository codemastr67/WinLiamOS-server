import express from "express";
import fs from "fs";
import cors from "cors";

const app = express();
app.get('/', (req, res) => {
  res.send('WinLiamOS server running!');
});
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

const USERS_FILE = "./users.json";

// Helper: read users file
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, "{}");
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

// Helper: save users file
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// --- Signup ---
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password required." });

  const users = readUsers();
  if (users[username])
    return res.status(400).json({ error: "User already exists." });

  users[username] = { password };
  saveUsers(users);
  res.json({ success: true, message: "Account created." });
});

// --- Login ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();

  if (users[username] && users[username].password === password) {
    return res.json({ success: true, message: "Login successful." });
  } else {
    return res.status(401).json({ error: "Invalid username or password." });
  }
});

// --- Get all users (for testing only) ---
app.get("/users", (req, res) => {
  res.json(readUsers());
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
