/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";

describe("ThemeProvider", () => {
  it("is importable", async () => {
    const mod = await import("@/lib/themes/theme-context");
    expect(mod.ThemeProvider).toBeDefined();
    expect(mod.useTheme).toBeDefined();
  });
});
