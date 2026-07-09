/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { bearer, jsonBody } from "../shared";

export const mediaPaths = {
  "/media": {
    get: {
      summary: "List media",
      tags: ["Media"],
      responses: { "200": { description: "List of media records" } },
    },
  },
  "/media/upload": {
    post: {
      summary: "Upload media",
      tags: ["Media"],
      security: bearer,
      requestBody: {
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              properties: { file: { type: "string", format: "binary" } },
            },
          },
        },
      },
      responses: {
        "201": { description: "File uploaded" },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/media/{id}": {
    delete: {
      summary: "Delete media",
      tags: ["Media"],
      security: bearer,
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      responses: { "200": { description: "Media deleted" }, "401": { description: "Unauthorized" } },
    },
  },
  "/ai/chat": {
    post: {
      summary: "AI chat (streaming)",
      tags: ["AI"],
      security: bearer,
      requestBody: jsonBody({
        type: "object",
        required: ["content"],
        properties: {
          action: { type: "string" },
          content: { type: "string" },
          provider: { type: "string" },
          model: { type: "string" },
        },
      }),
      responses: {
        "200": { description: "SSE stream of tokens" },
        "403": { description: "AI assist is disabled" },
      },
    },
  },
  "/ai/models": {
    get: {
      summary: "List AI models",
      tags: ["AI"],
      responses: { "200": { description: "Available providers, actions, and enabled flag" } },
    },
  },
  "/ai/settings": {
    get: {
      summary: "Get AI settings",
      tags: ["AI"],
      security: bearer,
      responses: { "200": { description: "AI enable flag, default provider, providers (hasKey)" } },
    },
    put: {
      summary: "Update AI settings",
      tags: ["AI"],
      security: bearer,
      requestBody: jsonBody(
        {
          type: "object",
          properties: {
            enabled: { type: "boolean" },
            defaultProvider: { type: "string" },
            providers: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: { model: { type: "string" }, apiKey: { type: "string" } },
              },
            },
          },
        },
        false
      ),
      responses: { "200": { description: "AI settings updated" }, "401": { description: "Unauthorized" } },
    },
  },
  "/export": {
    get: {
      summary: "Export all content as a ZIP archive",
      tags: ["Export/Import"],
      security: bearer,
      responses: {
        "200": {
          description: "ZIP archive stream",
          content: { "application/zip": { schema: { type: "string", format: "binary" } } },
        },
        "401": { description: "Unauthorized" },
      },
    },
  },
  "/import": {
    post: {
      summary: "Import content from a ZIP archive",
      tags: ["Export/Import"],
      security: bearer,
      requestBody: {
        required: true,
        content: {
          "multipart/form-data": {
            schema: {
              type: "object",
              required: ["file"],
              properties: { file: { type: "string", format: "binary" } },
            },
          },
        },
      },
      responses: {
        "200": { description: "Content imported; returns a summary" },
        "400": { description: "A .zip file is required" },
        "401": { description: "Unauthorized" },
      },
    },
  },
};
