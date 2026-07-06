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

const app = express();
app.use(express.json());

const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (_req, res) => {
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
  console.log(`Bifröst MCP HTTP server running on port ${port}`);
});
