/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";
import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { settings } from "@/lib/db/schema/settings";
import { buildMessages } from "@/lib/ai/actions";
import { generateId } from "@/lib/id";
import { mediaDir } from "@/lib/paths";
import { redactSecrets } from "@/lib/settings";
import path from "path";
import type { McpTool } from "./shared";
import { safeJson } from "./shared";

export const systemTools: McpTool[] = [
  {
    name: "list_media",
    description: "List uploaded media",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const rows = db.select().from(media).all();
      return { content: [{ type: "text", text: safeJson(rows) }] };
    },
  },

  {
    name: "upload_media",
    description: "Upload a file (accepts base64-encoded content)",
    inputSchema: {
      type: "object",
      properties: {
        filename: { type: "string" },
        mimeType: { type: "string" },
        base64Content: { type: "string" },
      },
      required: ["filename", "mimeType", "base64Content"],
    },
    handler: async (args) => {
      const id = generateId();
      const filename = args.filename as string;
      const mimeType = args.mimeType as string;
      const base64Content = args.base64Content as string;

      const buffer = Buffer.from(base64Content, "base64");
      const { mkdir, writeFile } = await import("fs/promises");
      const dir = mediaDir();
      await mkdir(dir, { recursive: true });
      const filePath = path.join(dir, `${id}-${filename}`);
      await writeFile(filePath, buffer);

      db.insert(media)
        .values({
          id,
          filename,
          path: filePath,
          mimeType,
          sizeBytes: buffer.length,
          createdAt: nowISO(),
        })
        .run();

      return { content: [{ type: "text", text: safeJson({ id, path: filePath }) }] };
    },
  },

  {
    name: "get_settings",
    description: "Read blog settings",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const rows = db.select().from(settings).all();
      const raw: Record<string, string> = {};
      for (const row of rows) raw[row.key] = row.value;
      return { content: [{ type: "text", text: safeJson(redactSecrets(raw)) }] };
    },
  },

  {
    name: "update_settings",
    description: "Update blog settings",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        value: {},
      },
      required: ["key", "value"],
    },
    handler: async (args) => {
      const key = args.key as string;
      const value = args.value;
      db.insert(settings)
        .values({ key, value: JSON.stringify(value) })
        .onConflictDoUpdate({ target: settings.key, set: { value: JSON.stringify(value) } })
        .run();
      return { content: [{ type: "text", text: "Updated" }] };
    },
  },

  {
    name: "ai_assist",
    description: "Invoke AI on post content",
    inputSchema: {
      type: "object",
      properties: {
        action: { type: "string" },
        content: { type: "string" },
        provider: { type: "string" },
      },
      required: ["action", "content"],
    },
    handler: async (args) => {
      try {
        const { streamChatCompletion } = await import("@/lib/ai/providers");
        const messages = buildMessages(args.action as string, args.content as string);
        const provider = (args.provider as string) ?? "opencode-zen";
        const gen = streamChatCompletion(provider, messages);
        let text = "";
        for await (const chunk of gen) {
          text += chunk;
        }
        return { content: [{ type: "text", text }] };
      } catch (err) {
        return { content: [{ type: "text", text: `AI error: ${String(err)}` }] };
      }
    },
  },
];
