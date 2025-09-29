import express from "express"
import { WebSocketServer } from "ws"
import tmi from "tmi.js"
import http from "http"
import "dotenv/config"

const app = express()
const server = http.createServer(app)
const wss = new WebSocketServer({ server })

let sockets = []

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

client.on("message", (channel, tags, message, self) => {
  if (self) return
  const payload = {
    user: tags["display-name"] || tags.username,
    message,
    flags: {
      broadcaster: tags.badges?.broadcaster === "1",
      mod: tags.mod || false,
    },
  }
  sockets.forEach(ws => ws.send(JSON.stringify(payload)))
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Relay server running on port ${PORT}`))
