/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { listModels } from "@/lib/ai/providers";
import { listActions, buildMessages } from "@/lib/ai/actions";

describe("listModels", () => {
  it("returns configured providers with models", () => {
    const models = listModels();
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty("provider");
    expect(models[0]).toHaveProperty("model");
  });

  it("includes the default provider", () => {
    const models = listModels();
    const providers = models.map((m) => m.provider);
    expect(providers).toContain("opencode-zen");
    expect(providers).toContain("opencode-go");
    expect(providers).toContain("deepseek");
  });
});

describe("listActions", () => {
  it("returns all available actions", () => {
    const actions = listActions();
    expect(actions.length).toBe(7);

    const ids = actions.map((a) => a.id);
    expect(ids).toContain("continue");
    expect(ids).toContain("improve");
    expect(ids).toContain("grammar");
    expect(ids).toContain("outline");
    expect(ids).toContain("title");
    expect(ids).toContain("summarize");
    expect(ids).toContain("custom");
  });

  it("each action has id and label", () => {
    const actions = listActions();
    for (const action of actions) {
      expect(action).toHaveProperty("id");
      expect(action).toHaveProperty("label");
      expect(typeof action.label).toBe("string");
      expect(action.label.length).toBeGreaterThan(0);
    }
  });
});

describe("buildMessages", () => {
  it("builds messages with system prompt and user content", () => {
    const messages = buildMessages("improve", "Hello world");
    expect(messages.length).toBe(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[1]!.role).toBe("user");
    expect(messages[1]!.content).toBe("Hello world");
  });

  it("uses custom prompt for custom action", () => {
    const messages = buildMessages("custom", "some text", "Custom instruction");
    expect(messages.length).toBe(2);
    expect(messages[0]!.role).toBe("system");
    expect(messages[0]!.content).toBe("Custom instruction");
  });

  it("throws for unknown action", () => {
    expect(() => buildMessages("nonexistent", "text")).toThrow(
      "Unknown AI action: nonexistent"
    );
  });

  it("returns no system message for custom action without customPrompt", () => {
    const messages = buildMessages("custom", "text");
    expect(messages.length).toBe(1);
    expect(messages[0]!.role).toBe("user");
    expect(messages[0]!.content).toBe("text");
  });
});
