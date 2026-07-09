/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { bearer, jsonBody } from "../shared";

export const systemPaths = {
  "/settings": {
    get: {
      summary: "Get settings",
      tags: ["Settings"],
      responses: { "200": { description: "Key/value settings map (secrets redacted)" } },
    },
    put: {
      summary: "Update settings",
      tags: ["Settings"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        additionalProperties: { type: "string" },
        description: "Key/value pairs. Values equal to '__SET__' are ignored (keep existing secret).",
      }),
      responses: { "200": { description: "Settings updated" } },
    },
  },
  "/themes": {
    get: {
      summary: "List themes",
      tags: ["Themes"],
      responses: { "200": { description: "Available themes" } },
    },
  },
  "/git/history": {
    get: {
      summary: "Commit history",
      tags: ["Git"],
      parameters: [
        { name: "slug", in: "query", schema: { type: "string" } },
        { name: "limit", in: "query", schema: { type: "integer" } },
      ],
      responses: { "200": { description: "List of commits" } },
    },
  },
  "/git/diff": {
    get: {
      summary: "Commit diff",
      tags: ["Git"],
      parameters: [{ name: "sha", in: "query", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Diff for a commit" } },
    },
  },
  "/git/push": {
    post: {
      summary: "Push to remote",
      tags: ["Git"],
      security: bearer,
      responses: { "200": { description: "Pushed" } },
    },
  },
  "/git/pull": {
    post: {
      summary: "Pull from remote",
      tags: ["Git"],
      security: bearer,
      responses: { "200": { description: "Pulled" } },
    },
  },
  "/mcp/status": {
    get: {
      summary: "MCP server status",
      tags: ["MCP"],
      security: bearer,
      responses: { "200": { description: "MCP enabled flag, mode, port" } },
    },
  },
  "/setup": {
    get: {
      summary: "Setup status",
      tags: ["Setup"],
      responses: { "200": { description: "Whether the first admin exists" } },
    },
    post: {
      summary: "Create first admin (initial setup)",
      tags: ["Setup"],
      requestBody: jsonBody({
        type: "object",
        required: ["email", "password", "name"],
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
          name: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
        },
      }),
      responses: {
        "201": { description: "Admin created" },
        "409": { description: "Setup already completed" },
      },
    },
  },
  "/admin/reset": {
    get: {
      summary: "Demo data count",
      tags: ["Admin"],
      security: bearer,
      responses: { "200": { description: "Number of remaining seed posts" } },
    },
    post: {
      summary: "Remove demo data",
      tags: ["Admin"],
      security: bearer,
      responses: { "200": { description: "Seed posts removed" } },
    },
  },
  "/admin/stats": {
    get: {
      summary: "Server and visitor statistics",
      tags: ["Admin"],
      security: bearer,
      responses: { "200": { description: "Server info, DB counts, and view analytics" } },
    },
  },
  "/analytics/view": {
    post: {
      summary: "Record a page view",
      tags: ["Analytics"],
      requestBody: jsonBody({
        type: "object",
        required: ["path"],
        properties: {
          path: { type: "string" },
          referrer: { type: "string" },
        },
      }),
      responses: { "200": { description: "View recorded" } },
    },
  },
  "/audit": {
    get: {
      summary: "List audit log entries",
      description:
        "Returns paginated audit log entries, newest first. Admin only. " +
        "Supports filtering by action, actor, status, and an ISO timestamp range.",
      tags: ["Audit"],
      security: bearer,
      parameters: [
        { name: "page", in: "query", schema: { type: "integer", default: 1 } },
        { name: "limit", in: "query", schema: { type: "integer", default: 50 } },
        { name: "action", in: "query", schema: { type: "string" } },
        { name: "actorId", in: "query", schema: { type: "string" } },
        {
          name: "status",
          in: "query",
          schema: { type: "string", enum: ["success", "failure"] },
        },
        { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
        { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
      ],
      responses: {
        "200": {
          description: "Paginated audit log entries",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
                  error: { type: "null" },
                  meta: {
                    type: "object",
                    properties: {
                      page: { type: "integer" },
                      limit: { type: "integer" },
                      total: { type: "integer" },
                    },
                  },
                },
              },
            },
          },
        },
        "401": { description: "Unauthorized" },
      },
    },
    delete: {
      summary: "Purge all audit log entries",
      tags: ["Audit"],
      security: bearer,
      responses: {
        "200": { description: "All entries purged; returns the number removed" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/themes/files": {
    get: {
      summary: "List or read theme files",
      description:
        "With `theme` only, returns the file list for that theme. " +
        "With `theme` and `file`, returns the file contents.",
      tags: ["Themes"],
      security: bearer,
      parameters: [
        { name: "theme", in: "query", required: true, schema: { type: "string" } },
        { name: "file", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": { description: "File list or file contents" },
        "400": { description: "Missing theme parameter" },
        "401": { description: "Unauthorized" },
        "404": { description: "Theme or file not found" },
      },
    },
    put: {
      summary: "Write a theme file",
      tags: ["Themes"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["theme", "file", "content"],
        properties: {
          theme: { type: "string" },
          file: { type: "string" },
          content: { type: "string" },
        },
      }),
      responses: {
        "200": { description: "File saved (or no changes detected)" },
        "400": { description: "Validation error or path traversal blocked" },
        "401": { description: "Unauthorized" },
        "404": { description: "Directory does not exist" },
      },
    },
  },
  "/docs": {
    get: {
      summary: "List or render documentation",
      description:
        "With `list=true`, returns the list of available docs. " +
        "With `file`, returns the rendered HTML for that doc. Admin only.",
      tags: ["Docs"],
      security: bearer,
      parameters: [
        { name: "list", in: "query", schema: { type: "string", enum: ["true"] } },
        { name: "file", in: "query", schema: { type: "string" } },
      ],
      responses: {
        "200": { description: "Doc list or rendered HTML" },
        "400": { description: "file parameter is required" },
        "401": { description: "Unauthorized" },
        "404": { description: "Document not found" },
      },
    },
  },
};
