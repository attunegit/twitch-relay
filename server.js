import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import tmi from "tmi.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔎 Debug: log env variables on startup
console.log("🔎 DEBUG ENV", {
  TWITCH_BOT_USERNAME: process.env.TWITCH_BOT_USERNAME,
  TWITCH_OAUTH: process.env.TWITCH_OAUTH,
  TWITCH_CHANNEL: process.env.TWITCH_CHANNEL,
  PORT: process.env.PORT,
});

// Twitch client setup
const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH,
  },
  channels: [process.env.TWITCH_CHANNEL],
});

// Connect to Twitch
client.connect().catch((err) => {
  console.error("❌ Error connecting to Twitch:", err);
});

// Example endpoint
app.get("/", (req, res) => {
  res.send("✅ Twitch Relay is running");
});

// Broadcast messages to all connected clients
let sockets = [];
client.on("message", (channel, tags, message, self) => {
  if (self) return;
  const payload = {
    user: tags["display-name"] || tags.username,
    message,
    flags: {
      broadcaster: tags.badges?.broadcaster === "1",
      mod: tags.mod,
    },
  };
  console.log("💬 New chat message:", payload);
  sockets.forEach((ws) => ws.send(JSON.stringify(payload)));
});

// WebSocket server
import { WebSocketServer } from "ws";
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  sockets.push(ws);
  console.log("🔗 New WebSocket connection");

  ws.on("close", () => {
    sockets = sockets.filter((s) => s !== ws);
    console.log("❌ WebSocket disconnected");
  });
});

const server = app.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log(`✅ Server listening on 0.0.0.0:${process.env.PORT || 10000}`);
});

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});
