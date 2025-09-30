import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import tmi from "tmi.js";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let sockets = [];

// 🔹 WebSocket connection
wss.on("connection", (ws) => {
  console.log("🟢 WebSocket client connected");
  sockets.push(ws);

  ws.on("close", () => {
    console.log("🔴 WebSocket client disconnected");
    sockets = sockets.filter((s) => s !== ws);
  });
});

// 🔹 Broadcast function
function broadcast(data) {
  sockets.forEach((ws) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  });
}

// 🔹 Twitch Chat Client
const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH, // ⚠️ Must include "oauth:" prefix
  },
  channels: [process.env.TWITCH_CHANNEL],
});

// 🔹 Handle Twitch messages
client.on("message", (channel, tags, message, self) => {
  if (self) return;

  const user = tags["display-name"] || tags.username;
  console.log({ user, message });

  if (message.startsWith("!add ")) {
    const task = message.replace("!add ", "").trim();
    broadcast({ type: "addTask", user, color: tags.color, task });
  }

  if (message.startsWith("!done ")) {
    const task = message.replace("!done ", "").trim();
    broadcast({ type: "markTaskDone", user, task });
  }

  if (message === "!clearall") {
    broadcast({ type: "clearAllTasks" });
  }
});

// 🔹 Error-safe connection
client.connect().catch((err) => {
  console.error("❌ Failed to connect to Twitch:", err.message);
});

// 🔹 Start server
const PORT = process.env.PORT || 10000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on 0.0.0.0:${PORT}`);
});
