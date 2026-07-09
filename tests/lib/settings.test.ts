/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { isSecretKey, redactSecrets, SECRET_PLACEHOLDER } from "@/lib/settings";

describe("isSecretKey", () => {
  it("flags git token and ai keys", () => {
    expect(isSecretKey("git.token")).toBe(true);
    expect(isSecretKey("ai.key.openai")).toBe(true);
    expect(isSecretKey("ai.key.anthropic")).toBe(true);
  });

  it("does not flag normal keys", () => {
    expect(isSecretKey("site.title")).toBe(false);
    expect(isSecretKey("ai.enabled")).toBe(false);
    expect(isSecretKey("appearance.theme_mode")).toBe(false);
  });
});

describe("redactSecrets", () => {
  it("replaces populated secret values with the placeholder", () => {
    const out = redactSecrets({ "git.token": "ghp_secret", "site.title": "Blog" });
    expect(out["git.token"]).toBe(SECRET_PLACEHOLDER);
    expect(out["site.title"]).toBe("Blog");
  });

  it("keeps empty secret values empty (not placeholder)", () => {
    const out = redactSecrets({ "ai.key.openai": "" });
    expect(out["ai.key.openai"]).toBe("");
  });

  it("passes non-secret values through unchanged", () => {
    const out = redactSecrets({ "site.description": "hello" });
    expect(out["site.description"]).toBe("hello");
  });
});
