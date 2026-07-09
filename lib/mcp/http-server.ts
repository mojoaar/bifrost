/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from "./server";
import { loadConfig } from "@/lib/config/loader";
import { getSetting } from "@/lib/settings";
import { verifyAccessToken } from "@/lib/auth/token";
import { verifyApiKey } from "@/lib/auth/api-key";
import { createLogger } from "@/lib/logger";

const log = createLogger("mcp");

const app = express();
app.use(express.json());

async function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authorization required" });
    return;
  }
  const token = header.slice(7);
  if (token.startsWith("bfk_")) {
    const key = await verifyApiKey(token);
    if (!key) {
      res.status(401).json({ error: "Invalid or expired API key" });
      return;
    }
  } else {
    const payload = await verifyAccessToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }
  }
  next();
}

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", authMiddleware, async (_req, res) => {
  if (getSetting("mcp.enabled") === "false") {
    res.status(503).json({ error: "MCP server is disabled" });
    return;
  }
  const mcpServer = createMcpServer();
  const transport = new SSEServerTransport("/messages", res);
  transports.set(transport.sessionId, transport);
  transport.onclose = () => transports.delete(transport.sessionId);
  await mcpServer.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(400).json({ error: "No active SSE session" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

const config = loadConfig();
const port = config.mcp.port;

app.listen(port, () => {
  log.info(`Bifröst MCP HTTP server running on port ${port}`);
});
