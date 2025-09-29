import express from "express"
import { WebSocketServer } from "ws"
import tmi from "tmi.js"
import http from "http"
import "dotenv/config"

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

let sockets = []

// WebSocket connection from widget (OBS/Framer/etc.)
wss.on("connection", ws => {
  sockets.push(ws)
  console.log("Frontend connected")

  ws.on("close", () => {
    sockets = sockets.filter(s => s !== ws)
    console.log("Frontend disconnected")
  })
})

// Twitch client setup
const client = new tmi.Client({
  options: { debug: true },
  identity: {
    username: process.env.TWITCH_BOT_USERNAME,
    password: process.env.TWITCH_OAUTH_TOKEN,
  },
  channels: [process.env.TWITCH_CHANNEL],
})

client.connect()

// Debug log when connected to Twitch
client.on("connected", (addr, port) => {
  console.log(`Connected to Twitch chat at ${addr}:${port}`)
})

// Debug log for join event
client.on("join", (channel, username, self) => {
  if (self) {
    console.log(`Bot joined channel: ${channel}`)
  }
})

// Handle incoming Twitch chat messages
client.on("message", (channel, tags, message, self) => {
  if (self) return

  // Debug: log every message received from Twitch
  console.log("Message received from Twitch:", tags.username, message)

  const payload = {
    user: tags["display-name"] || tags.username,
    message,
    flags: {
      broadcaster: tags.badges?.broadcaster === "1",
      mod: tags.mod || false,
    },
  }

  // Debug: show payload being sent to frontend
  console.log("Forwarding payload to clients:", payload)

  sockets.forEach(ws => ws.send(JSON.stringify(payload)))
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Relay server running on port ${PORT}`))
