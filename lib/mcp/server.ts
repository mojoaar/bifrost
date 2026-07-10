/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { readFileSync } from "fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createToolDefinitions, SYSTEM_CONTEXT } from "./tools";
import type { McpContext } from "./tools";
import { createResourceDefinitions } from "./resources";
import type { ResourceDef } from "./resources";

const VERSION = readFileSync("VERSION", "utf-8").trim();
const SERVER_INFO = { name: "bifrost", version: VERSION } as const;
const SERVER_CAPS = { capabilities: { tools: {}, resources: {} } } as const;

export function matchResource(resources: ResourceDef[], uri: string): ResourceDef | undefined {
  const sorted = [...resources].sort((a, b) => b.uriPattern.length - a.uriPattern.length);
  return sorted.find((r) => {
    if (!r.uriPattern.includes("{slug}")) return uri === r.uriPattern;
    const [pre, post] = r.uriPattern.split("{slug}") as [string, string];
    return uri.startsWith(pre) && uri.endsWith(post) && uri.length > pre.length + post.length;
  });
}

function registerHandlers(server: Server, ctx: McpContext): void {
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
    return tool.handler(request.params.arguments ?? {}, ctx);
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
    const resource = matchResource(resources, uri);
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

export async function startStdioMcpServer(ctx: McpContext = SYSTEM_CONTEXT): Promise<void> {
  const server = new Server(SERVER_INFO, SERVER_CAPS);
  registerHandlers(server, ctx);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export function createMcpServer(ctx: McpContext = SYSTEM_CONTEXT): Server {
  const server = new Server(SERVER_INFO, SERVER_CAPS);
  registerHandlers(server, ctx);
  return server;
}
