/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createToolDefinitions } from "./tools";
import { createResourceDefinitions } from "./resources";

const SERVER_INFO = { name: "bifrost", version: "0.6.0" } as const;
const SERVER_CAPS = { capabilities: { tools: {}, resources: {} } } as const;

function registerHandlers(server: Server): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const tools = createToolDefinitions();
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tools = createToolDefinitions();
    const tool = tools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Unknown tool: ${request.params.name}`);
    }
    return tool.handler(request.params.arguments ?? {});
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const resources = createResourceDefinitions();
    return {
      resources: resources.map((r) => ({
        uri: r.uriPattern,
        name: r.uriPattern,
      })),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const resources = createResourceDefinitions();
    const uri = request.params.uri;
    const resource = resources.find((r) => uri.startsWith(r.uriPattern.replace("{slug}", "")));
    if (!resource) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    const result = await resource.handler(uri);
    if (!result) {
      throw new Error(`Resource not found: ${uri}`);
    }
    return result;
  });
}

export async function startStdioMcpServer(): Promise<void> {
  const server = new Server(SERVER_INFO, SERVER_CAPS);
  registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function createMcpServer(): Server {
  const server = new Server(SERVER_INFO, SERVER_CAPS);
  registerHandlers(server);
  return server;
}
