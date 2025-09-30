import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import tmi from "tmi.js";

const app = express();
app.use(cors());

const server = app.listen(process.env.PORT || 10000, "0.0.0.0", () => {
  console.log(`✅ Server listening on 0.0.0.0:${process.env.PORT || 10000}`);
});

const wss = new WebSocketServer({ server });

// Store all WebSocket clients
let clients = [];

wss.on("connection", (ws) => {
  console.log("🔌 Frontend connected");
  clients.push(ws);

  ws.on("close", () => {
    console.log("❌ Frontend disconnected");
    clients = clients.filter((c) => c !== ws);
  });
});

// Broadcast helper
function broadcast(data) {
  clients.forEach((c) => {
    if (c.readyState === 1) {
      c.send(JSON.stringify(data));
    }
  });
}

// ---- Twitch Chat ----
const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH,
  },
  channels: [process.env.TWITCH_CHANNEL],
});

client.connect();

client.on("message", (channel, userstate, message, self) => {
  if (self) return;

  console.log("📩 Chat:", { user: userstate.username, message });

  if (message.startsWith("!add ")) {
    const task = message.slice(5);
    broadcast({
      type: "add",
      username: userstate.username,
      color: userstate.color || "#fff",
      task,
    });
  }
});
