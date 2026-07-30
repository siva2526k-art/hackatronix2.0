import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { processGeminiTelemetryRequest } from "./api/gemini";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "25mb" }));

  // CORS middleware for local API
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", service: "BallVision AI Telemetry Server" });
  });

  // Gemini Proxy API endpoint
  app.post("/api/gemini", async (req, res) => {
    try {
      const text = await processGeminiTelemetryRequest(req.body);
      res.json({ text, success: true });
    } catch (err: any) {
      console.error("Express Gemini route error:", err);
      res.status(500).json({ error: err.message || "Gemini processing failed", success: false });
    }
  });

  // Vite development vs production static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BallVision AI Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
