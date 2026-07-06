/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { loadConfig } from "@/lib/config/loader";

describe("config loader", () => {
  it("loads defaults when no config file exists", () => {
    const config = loadConfig();
    expect(config.site.title).toBe("My Blog");
    expect(config.content.postsPerPage).toBe(10);
    expect(config.mcp.mode).toBe("stdio");
  });

  it("returns deep merged config", () => {
    const config = loadConfig();
    expect(config.site.title).toBe("My Blog");
    expect(config.site.description).toBe("A blog powered by Bifröst");
    expect(config.site.language).toBe("en");
    expect(config.theme).toBe("default");
    expect(config.ai.defaultProvider).toBe("opencode-zen");
    expect(config.ai.providers["opencode-zen"]?.model).toBe("deepseek-v4-pro");
    expect(config.git.enabled).toBe(true);
    expect(config.mcp.port).toBe(3456);
    expect(config.plugins).toEqual([]);
  });
});
