/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { loadConfig } from "@/lib/config/loader";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

const CONFIG = loadConfig();

function getProviderConfig(name: string) {
  const provider = CONFIG.ai.providers[name];
  if (!provider) {
    throw new Error(`AI provider "${name}" not configured`);
  }
  return provider;
}

function getEndpoint(provider: string): string {
  if (provider === "opencode-zen") {
    return "https://opencode.ai/zen/v1/chat/completions";
  }
  if (provider === "opencode-go") {
    return "https://opencode.ai/zen/go/v1/chat/completions";
  }
  if (provider === "deepseek") {
    return "https://api.deepseek.com/v1/chat/completions";
  }
  throw new Error(`Unknown provider: ${provider}`);
}

export async function chatCompletion(
  providerName: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<Response> {
  const config = getProviderConfig(providerName);
  const endpoint = getEndpoint(providerName);
  const model = options.model ?? config.model;
  const apiKey = config.apiKey ?? process.env[`BIFROST_${providerName.toUpperCase().replace(/-/g, "_")}_KEY`] ?? "";

  return fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 2048,
      stream: true,
    }),
  });
}

export async function* streamChatCompletion(
  providerName: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): AsyncGenerator<string, void, undefined> {
  const response = await chatCompletion(providerName, messages, options);

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`AI provider error (${response.status}): ${body}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          yield content;
        }
      } catch {
        // skip unparseable chunks
      }
    }
  }
}

export function listModels(): { provider: string; model: string }[] {
  return Object.entries(CONFIG.ai.providers).map(([name, config]) => ({
    provider: name,
    model: config.model,
  }));
}
