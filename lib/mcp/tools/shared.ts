/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpContext {
  actorId: string | null;
  actorLabel: string | null;
  actorType: "user" | "api_key" | "system";
  ip: string | null;
  userAgent: string | null;
}

export const SYSTEM_CONTEXT: McpContext = {
  actorId: null,
  actorLabel: null,
  actorType: "system",
  ip: null,
  userAgent: null,
};

export interface ToolHandler {
  (args: Record<string, unknown>, ctx: McpContext): Promise<{ content: { type: "text"; text: string }[] }>;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: ToolDef["inputSchema"];
  handler: ToolHandler;
}

export function safeJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
