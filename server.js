// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import tmi from "tmi.js";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// 🔹 Task state shared across all clients
let tasks = {}; // { username: { todos: [{ text, done }], userColor } }

// 🔹 Broadcast helper
function broadcast(action, payload = {}) {
  const message = JSON.stringify({ action, ...payload });
  console.log("📢 Broadcasting:", message);

  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(message);
    }
  });
}

// 🔹 Express endpoint for manual updates (from frontend fetch)
app.post("/task-update", (req, res) => {
  const { action, username, taskText, userColor } = req.body;
  console.log("📥 Received update:", req.body);

  if (action === "addTask") {
    if (!tasks[username]) {
      tasks[username] = { todos: [], userColor: userColor || "#000" };
    }
    tasks[username].todos.push({ text: taskText, done: false });
    broadcast("addTask", { username, taskText, userColor });
  }

  if (action === "markTaskDone") {
    let t = tasks[username]?.todos.find((t) => t.text === taskText);
    if (t) t.done = true;
    broadcast("markTaskDone", { username, taskText });
  }

  if (action === "clearAllTasks") {
    tasks = {};
    broadcast("clearAllTasks", {});
  }

  res.json({ status: "ok" });
});

// 🔹 Twitch Chat Bot
const client = new tmi.Client({
  options: { debug: true },
  connection: { reconnect: true, secure: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH,
  },
  channels: [process.env.TWITCH_CHANNEL],
});

client.connect().catch(console.error);

client.on("message", (channel, tags, message, self) => {
  if (self) return;
  const user = tags["display-name"] || tags.username;

  console.log(`💬 ${user}: ${message}`);
  const parts = message.trim().split(" ");
  const command = parts[0].toLowerCase();
  const args = parts.slice(1).join(" ");

  if (command === "!add") {
    if (!tasks[user]) tasks[user] = { todos: [], userColor: "#000" };
    tasks[user].todos.push({ text: args, done: false });
    broadcast("addTask", { username: user, taskText: args, userColor: "#000" });
  }

  if (command === "!done") {
    let t = tasks[user]?.todos.find((t) => t.text === args);
    if (t) t.done = true;
    broadcast("markTaskDone", { username: user, taskText: args });
  }

  if (command === "!clear" && (tags.mod || tags.badges?.broadcaster)) {
    tasks = {};
    broadcast("clearAllTasks", {});
  }
});

// 🔹 WebSocket Connection
wss.on("connection", (ws) => {
  console.log("🔌 Frontend connected");

  // Send current task state to new client
  ws.send(JSON.stringify({ action: "init", tasks }));
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`)
);
