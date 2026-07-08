/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { loadConfig } from "@/lib/config/loader";
import { getSetting } from "@/lib/settings";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

function getProviderConfig(name: string) {
  const provider = loadConfig().ai.providers[name];
  if (!provider) {
    throw new Error(`AI provider "${name}" not configured`);
  }
  return provider;
}

export function getDefaultProvider(): string {
  return getSetting("ai.default_provider") ?? loadConfig().ai.defaultProvider;
}

function resolveModel(name: string): string {
  return getSetting(`ai.model.${name}`) ?? getProviderConfig(name).model;
}

function resolveApiKey(name: string): string {
  const envKey = process.env[`BIFROST_${name.toUpperCase().replace(/-/g, "_")}_KEY`];
  return getSetting(`ai.key.${name}`) ?? loadConfig().ai.providers[name]?.apiKey ?? envKey ?? "";
}

function getBaseUrl(name: string): string {
  const baseUrl = getProviderConfig(name).baseUrl;
  if (!baseUrl) throw new Error(`No baseUrl configured for provider "${name}"`);
  return baseUrl;
}

function getEndpoint(provider: string): string {
  return `${getBaseUrl(provider)}/chat/completions`;
}

const modelsCache = new Map<string, { models: string[]; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000;

export async function fetchModels(providerName: string): Promise<string[]> {
  getProviderConfig(providerName);

  const cached = modelsCache.get(providerName);
  if (cached && cached.expires > Date.now()) {
    return cached.models;
  }

  const baseUrl = getBaseUrl(providerName);
  const apiKey = resolveApiKey(providerName);

  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { authorization: `Bearer ${apiKey}` } : {},
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = (await res.json()) as { data?: { id: string }[] };
    const models = (body.data ?? []).map((m) => m.id).sort();
    modelsCache.set(providerName, { models, expires: Date.now() + CACHE_TTL });
    return models;
  } catch {
    const configModel = resolveModel(providerName);
    return configModel ? [configModel] : [];
  }
}

export async function chatCompletion(
  providerName: string,
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<Response> {
  getProviderConfig(providerName);
  const endpoint = getEndpoint(providerName);
  const model = options.model ?? resolveModel(providerName);
  const apiKey = resolveApiKey(providerName);

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
  return Object.entries(loadConfig().ai.providers).map(([name]) => ({
    provider: name,
    model: resolveModel(name),
  }));
}
