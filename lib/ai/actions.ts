/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ChatMessage } from "./providers";

interface Action {
  systemPrompt: string;
  label: string;
}

const ACTIONS: Record<string, Action> = {
  continue: {
    label: "Continue writing",
    systemPrompt:
      "Continue writing from where the user left off. Maintain the same tone, style, and voice. Do not repeat what has already been written. Output only the continuation.",
  },
  improve: {
    label: "Improve tone",
    systemPrompt:
      "Improve the tone and readability of the following text. Make it more engaging and professional while preserving the original meaning. Output only the improved version.",
  },
  grammar: {
    label: "Fix grammar",
    systemPrompt:
      "Fix grammar, spelling, and punctuation errors in the following text. Do not change the meaning or style. Output only the corrected version.",
  },
  outline: {
    label: "Generate outline",
    systemPrompt:
      "Generate a markdown outline for a blog post on the following topic. Include headings and brief descriptions for each section. Output only the outline.",
  },
  title: {
    label: "Suggest title",
    systemPrompt:
      "Suggest 5 compelling titles for the following blog post. Consider SEO, readability, and engagement. Output a numbered list of titles.",
  },
  summarize: {
    label: "Summarize",
    systemPrompt:
      "Summarize the following text into 2-3 concise paragraphs. Capture the key points and main takeaways. Output only the summary.",
  },
  custom: {
    label: "Custom prompt",
    systemPrompt: "",
  },
};

export function buildMessages(
  action: string,
  content: string,
  customPrompt?: string
): ChatMessage[] {
  const actionConfig = ACTIONS[action];
  if (!actionConfig) {
    throw new Error(`Unknown AI action: ${action}`);
  }

  const systemPrompt =
    action === "custom" && customPrompt ? customPrompt : actionConfig.systemPrompt;

  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content });

  return messages;
}

export function listActions(): { id: string; label: string }[] {
  return Object.entries(ACTIONS).map(([id, { label }]) => ({ id, label }));
}
