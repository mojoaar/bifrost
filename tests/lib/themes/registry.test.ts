/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { loadTheme, listThemes } from "@/lib/themes/registry";

describe("loadTheme", () => {
  it("loads the default theme manifest", async () => {
    const theme = await loadTheme("default");
    expect(theme.manifest).toBeDefined();
    expect(theme.manifest.name).toBe("default");
  });

  it("throws for non-existent theme", async () => {
    await expect(loadTheme("nonexistent")).rejects.toThrow(/not found/);
  });
});

describe("listThemes", () => {
  it("includes default theme", async () => {
    const themes = await listThemes();
    expect(themes.length).toBeGreaterThanOrEqual(1);
    expect(themes.find((t) => t.manifest.name === "default")).toBeDefined();
  });
});
