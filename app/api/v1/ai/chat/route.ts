/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { NextRequest } from "next/server";
import { streamChatCompletion } from "@/lib/ai/providers";
import { buildMessages } from "@/lib/ai/actions";
import { loadConfig } from "@/lib/config/loader";

export async function POST(request: NextRequest) {
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
    return new Response(
      JSON.stringify({
        data: null,
        error: { message: "Invalid JSON body" },
        meta: null,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const { action = "improve", content = "", provider, model, customPrompt } = body;

  if (!content) {
    return new Response(
      JSON.stringify({
        data: null,
        error: { message: "content is required" },
        meta: null,
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  }

  const config = loadConfig();
  const providerName = provider ?? config.ai.defaultProvider;

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
