// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

app.use(cors());
app.use(express.json());

// Store connected WebSocket clients
let clients = [];

// WebSocket connection handling
wss.on("connection", (ws) => {
  console.log("🔌 Client connected via WebSocket");
  clients.push(ws);

  ws.on("close", () => {
    console.log("❌ Client disconnected");
    clients = clients.filter((client) => client !== ws);
  });
});

// Broadcast helper
function broadcast(message) {
  console.log("📢 Broadcasting update:", message);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(message));
    }
  });
}

// REST endpoint: called by OBS/Framer widget via fetch()
app.post("/task-update", (req, res) => {
  const { action, username, taskText, userColor } = req.body;
  console.log("📩 Received task-update:", req.body);

  // Broadcast to all clients
  broadcast({ action, username, taskText, userColor });

  res.json({ status: "ok", received: req.body });
});

// Root test
app.get("/", (req, res) => {
  res.send("✅ Twitch Relay Server is running");
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
