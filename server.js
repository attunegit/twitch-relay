const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(cors());

// In-memory DB (wiped if Render restarts).
// Later you could replace this with a real DB like Redis or MongoDB.
let tasksDB = {
  tasks: {},
  counts: { users: {} },
  taskmaster: {
    users: {},
    startDate: new Date(),
    taskMasterCompleteCount: 0,
  },
};

// Fetch all tasks
app.get("/tasks", (req, res) => {
  res.json(tasksDB);
});

// Replace entire DB
app.post("/tasks", (req, res) => {
  tasksDB = req.body;
  console.log("✅ Updated tasks:", JSON.stringify(tasksDB, null, 2));
  res.json({ status: "ok" });
});

// Health check
app.get("/", (req, res) => res.send("Relay server running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Relay server running on port ${PORT}`);
});
