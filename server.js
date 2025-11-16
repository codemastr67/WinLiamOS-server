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

// ---- Games backend (paste into server.js) ----
const GAMES_FILE = "./games.json";
function readGames() {
  if (!fs.existsSync(GAMES_FILE)) fs.writeFileSync(GAMES_FILE, "{}");
  return JSON.parse(fs.readFileSync(GAMES_FILE, "utf8"));
}
function saveGames(games) {
  fs.writeFileSync(GAMES_FILE, JSON.stringify(games, null, 2));
}

// Create game (player becomes X and waits for opponent)
app.post("/games/create", (req, res) => {
  const { player } = req.body;
  if (!player) return res.status(400).json({ error: "player required" });

  const games = readGames();
  const id = 'g_' + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
  games[id] = {
    id,
    players: { X: player, O: null },
    board: Array(9).fill(null),
    turn: "X",
    winner: null,
    lastUpdated: Date.now()
  };
  saveGames(games);
  res.json({ success: true, id, game: games[id] });
});

// Join game (becomes O if slot free)
app.post("/games/join", (req, res) => {
  const { id, player } = req.body;
  const games = readGames();
  const g = games[id];
  if (!g) return res.status(404).json({ error: "game not found" });
  if (g.players.O && g.players.O !== player) return res.status(400).json({ error: "game already has two players" });
  if (g.players.X === player) return res.json({ success:true, id, side: "X", game: g }); // rejoin
  g.players.O = player;
  g.lastUpdated = Date.now();
  saveGames(games);
  res.json({ success: true, id, side: "O", game: g });
});

// Get game state
app.post("/games/state", (req, res) => {
  const { id } = req.body;
  const games = readGames();
  const g = games[id];
  if (!g) return res.status(404).json({ error: "game not found" });
  res.json({ success: true, game: g });
});

// Play move
app.post("/games/move", (req, res) => {
  const { id, player, index } = req.body;
  const games = readGames();
  const g = games[id];
  if (!g) return res.status(404).json({ error: "game not found" });
  if (g.winner) return res.status(400).json({ error: "game finished" });

  // determine player's side
  const side = (g.players.X === player) ? "X" : (g.players.O === player ? "O" : null);
  if (!side) return res.status(403).json({ error: "not a player in this game" });
  if (g.turn !== side) return res.status(400).json({ error: "not your turn" });
  if (index < 0 || index > 8 || g.board[index]) return res.status(400).json({ error: "invalid move" });

  g.board[index] = side;
  // check win
  const wins = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  const isWin = wins.some(line => line.every(i => g.board[i] === side));
  if (isWin) g.winner = side;
  else if (g.board.every(v => v !== null)) g.winner = "T"; // tie
  else g.turn = (g.turn === "X") ? "O" : "X";

  g.lastUpdated = Date.now();
  saveGames(games);
  res.json({ success: true, game: g });
});

// Optional: remove old games (not required but useful)
app.post("/games/cleanup", (req, res) => {
  const games = readGames();
  const now = Date.now();
  for (const id in games) {
    if (now - (games[id].lastUpdated || 0) > 1000 * 60 * 60 * 24) delete games[id]; // 24h
  }
  saveGames(games);
  res.json({ success: true });
});
