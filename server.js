import express from "express";
import fs from "fs";
import cors from "cors";

const app = express();
app.get("/", (req, res) => {
  res.send("WinLiamOS server running!");
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

  users[username] = {
    password,
    friends: [],
    messages: {}
  };

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

app.post("/deleteAccount", (req, res) => {
  const { username } = req.body;

  const users = readUsers();

  if (!users[username]) {
    return res.status(400).json({ error: "User does not exist." });
  }

  // delete entire user
  delete users[username];

  saveUsers(users);

  res.json({ success: true, message: "Account deleted permanently." });
});

// --- Add Friend ---
app.post('/addFriend', (req, res) => {
  const { username, friend } = req.body;

  const users = readUsers();

  if (!users[friend]) {
    return res.json({ message: "User does not exist" });
  }

  if (!users[username].friends) users[username].friends = [];
  if (!users[friend].friends) users[friend].friends = [];

  if (!users[username].friends.includes(friend))
    users[username].friends.push(friend);

  if (!users[friend].friends.includes(username))
    users[friend].friends.push(username);

  saveUsers(users);
  res.json({ message: "Friend added!" });
});

// --- Send Message ---
app.post('/sendMessage', (req, res) => {
  const { from, to, text } = req.body;

  const users = readUsers();

  if (!users[from] || !users[to]) {
    return res.json({ message: "User does not exist" });
  }

  if (!users[from].messages) users[from].messages = {};
  if (!users[to].messages) users[to].messages = {};

  if (!users[from].messages[to]) users[from].messages[to] = [];
  if (!users[to].messages[from]) users[to].messages[from] = [];

  const msg = {
    from,
    text,
    time: Date.now()
  };

  users[from].messages[to].push(msg);
  users[to].messages[from].push(msg);

  saveUsers(users);
  res.json({ message: "sent", msg });
});

// --- Get Messages ---
app.post('/getMessages', (req, res) => {
  const { user, friend } = req.body;

  const users = readUsers();

  if (!users[user] || !users[friend]) {
    return res.json([]);
  }

  const msgs = users[user].messages?.[friend] || [];
  res.json(msgs);
});


// --- Get all users (testing only) ---
app.get("/users", (req, res) => {
  res.json(readUsers());
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
//FaceTime
let calls = {}; // temporary in-memory call sessions

app.post("/signal", (req, res) => {
  const { to, from, data } = req.body;

  if (!calls[to]) calls[to] = [];
  calls[to].push({ from, data });

  res.json({ success: true });
});

app.post("/getSignals", (req, res) => {
  const { user } = req.body;
  const msgs = calls[user] || [];
  calls[user] = [];
  res.json(msgs);
});

