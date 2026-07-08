/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { streamChatCompletion, getDefaultProvider } from "@/lib/ai/providers";
import { buildMessages } from "@/lib/ai/actions";
import { getSetting } from "@/lib/settings";
import { requireUser } from "@/lib/auth/require";
import { apiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "ai:chat", 20, 60_000);
  if (limited) return limited;

  const auth = await requireUser(request);
  if (!auth) {
    return apiError("Authentication required", 401);
  }

  let body: {
    action?: string;
    content?: string;
    provider?: string;
    model?: string;
    customPrompt?: string;
  };

  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const { action = "improve", content = "", provider, model, customPrompt } = body;

  if (getSetting("ai.enabled") !== "true") {
    return apiError("AI assist is disabled", 403);
  }

  if (!content) {
    return apiError("content is required", 400);
  }

  const providerName = provider ?? getDefaultProvider();

  const messages = buildMessages(action, content, customPrompt);

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const token of streamChatCompletion(providerName, messages, {
          model,
        })) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    },
  });
}
