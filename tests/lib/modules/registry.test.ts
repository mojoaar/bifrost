/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { MODULES, moduleEnabled, type FeatureModule } from "@/lib/modules/registry";

describe("modules registry", () => {
  it("exposes git-sync, ai-assist, mcp, and social-sharing modules", () => {
    const ids = MODULES.map((m) => m.id).sort();
    expect(ids).toEqual(["ai-assist", "git-sync", "mcp", "social-sharing"]);
  });

  it("maps each module to an existing settings key", () => {
    const keys = Object.fromEntries(MODULES.map((m) => [m.id, m.enabledKey]));
    expect(keys["git-sync"]).toBe("git.enabled");
    expect(keys["ai-assist"]).toBe("ai.enabled");
    expect(keys["mcp"]).toBe("mcp.enabled");
    expect(keys["social-sharing"]).toBe("sharing.enabled");
  });

  it("ai-assist and social-sharing disabled by default, git-sync and mcp enabled", () => {
    const get = (id: string) => MODULES.find((m) => m.id === id)!;
    expect(get("ai-assist").enabledDefault).toBe(false);
    expect(get("social-sharing").enabledDefault).toBe(false);
    expect(get("git-sync").enabledDefault).toBe(true);
    expect(get("mcp").enabledDefault).toBe(true);
  });

  it("moduleEnabled falls back to the default when unset", () => {
    const off: FeatureModule = {
      id: "ai-assist",
      name: "x",
      description: "y",
      enabledKey: "ai.enabled",
      enabledDefault: false,
    };
    const on: FeatureModule = { ...off, id: "git-sync", enabledKey: "git.enabled", enabledDefault: true };
    expect(moduleEnabled(off, undefined)).toBe(false);
    expect(moduleEnabled(on, undefined)).toBe(true);
    expect(moduleEnabled(on, "false")).toBe(false);
    expect(moduleEnabled(off, "true")).toBe(true);
  });
});
