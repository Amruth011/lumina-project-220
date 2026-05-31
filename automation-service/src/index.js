import http from "node:http";
import { WebSocketServer } from "ws";
import { runAutomation } from "./automator.js";
import "dotenv/config";

const PORT = parseInt(process.env.PORT || "3001", 10);

const server = http.createServer((req, res) => {
  if (req.url === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "lumina-automation", uptime: process.uptime() }));
    return;
  }
  res.writeHead(404);
  res.end("Not found");
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("[WS] Client connected");

  ws.on("message", async (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
      return;
    }

    if (msg.type !== "start") {
      ws.send(JSON.stringify({ type: "error", message: "Unknown message type" }));
      return;
    }

    const { portalUrl, resume } = msg;
    if (!portalUrl || !resume) {
      ws.send(JSON.stringify({ type: "error", message: "Missing portalUrl or resume" }));
      return;
    }

    const send = (entry) => {
      try { ws.send(JSON.stringify(entry)); } catch {}
    };

    send({ type: "info", message: `Lumina Agent v3.0 initialized — targeting ${new URL(portalUrl).hostname}` });
    send({ type: "info", message: `Resume profile loaded: "${resume.jdTitle}" (${(resume.resume?.skills_section || []).length} skills)` });

    try {
      const result = await runAutomation(portalUrl, resume, send);
      send({ type: "result", ...result });
    } catch (err) {
      send({ type: "error", message: `Automation failed: ${err.message}` });
      console.error("[Automation Error]", err);
    } finally {
      ws.close();
    }
  });

  ws.on("close", () => console.log("[WS] Client disconnected"));
  ws.on("error", (err) => console.error("[WS] Error:", err.message));
});

server.listen(PORT, () => {
  console.log(`\n  Lumina Automation Service running on ws://localhost:${PORT}`);
  console.log(`  Health check: http://localhost:${PORT}/health\n`);
});
