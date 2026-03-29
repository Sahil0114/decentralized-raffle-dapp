require("dotenv").config();
const express = require("express");
const cors = require("cors");

const raffleRoutes = require("./src/routes/raffle");

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "raffle-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/raffle", raffleRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: `No route found for ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message: err?.message || "Unexpected server error",
  });
});

app.listen(PORT, () => {
  console.log(`Raffle backend listening on port ${PORT}`);
});
