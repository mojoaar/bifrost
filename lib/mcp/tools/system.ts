/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { media } from "@/lib/db/schema/media";
import { settings } from "@/lib/db/schema/settings";
import { buildMessages } from "@/lib/ai/actions";
import {
  redactSecrets,
  isSecretKey,
  invalidateSettingsCache,
  SECRET_PLACEHOLDER,
} from "@/lib/settings";
import { saveMediaFile } from "@/lib/media/store";
import { recordAudit } from "@/lib/audit";
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
    handler: async (args, ctx) => {
      const filename = args.filename as string;
      const mimeType = args.mimeType as string;
      const base64Content = args.base64Content as string;

      const buffer = Buffer.from(base64Content, "base64");
      const file = new File([buffer], filename, { type: mimeType });

      let record;
      try {
        record = await saveMediaFile(file);
      } catch (err) {
        return { content: [{ type: "text", text: `Upload failed: ${String(err)}` }] };
      }

      recordAudit({
        action: "media.upload",
        status: "success",
        targetType: "media",
        targetId: record.id,
        actorId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        actorType: ctx.actorType,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { filename, mimeType },
      });

      return { content: [{ type: "text", text: safeJson({ id: record.id, path: record.path }) }] };
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
    handler: async (args, ctx) => {
      const key = args.key as string;
      const value = args.value;

      if (!/^[a-z0-9_.-]+$/i.test(key)) {
        return { content: [{ type: "text", text: `Invalid settings key: ${key}` }] };
      }

      if (isSecretKey(key) && value === SECRET_PLACEHOLDER) {
        return { content: [{ type: "text", text: "Skipped: placeholder value for secret key" }] };
      }

      const serialized = typeof value === "string" ? value : JSON.stringify(value);
      db.insert(settings)
        .values({ key, value: serialized })
        .onConflictDoUpdate({ target: settings.key, set: { value: serialized } })
        .run();
      invalidateSettingsCache();

      recordAudit({
        action: "settings.update",
        status: "success",
        targetType: "settings",
        targetId: key,
        actorId: ctx.actorId,
        actorLabel: ctx.actorLabel,
        actorType: ctx.actorType,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        metadata: { keys: [key] },
      });

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
