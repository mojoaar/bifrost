/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { createToolDefinitions } from "@/lib/mcp/tools";

describe("mcp tools", () => {
  it("registers all 17 tools", () => {
    const tools = createToolDefinitions();
    expect(tools.length).toBe(17);

    const names = tools.map((t: { name: string }) => t.name);
    expect(names).toContain("list_posts");
    expect(names).toContain("get_post");
    expect(names).toContain("create_post");
    expect(names).toContain("update_post");
    expect(names).toContain("delete_post");
    expect(names).toContain("list_media");
    expect(names).toContain("upload_media");
    expect(names).toContain("get_settings");
    expect(names).toContain("update_settings");
    expect(names).toContain("search_posts");
    expect(names).toContain("list_tags");
    expect(names).toContain("ai_assist");
    expect(names).toContain("list_pages");
    expect(names).toContain("get_page");
    expect(names).toContain("create_page");
    expect(names).toContain("update_page");
    expect(names).toContain("delete_page");
  });

  it("every tool has a name, description, and inputSchema", () => {
    const tools = createToolDefinitions();
    for (const tool of tools) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.inputSchema).toBeDefined();
    }
  });

  it("ai_assist inputSchema requires action and content", () => {
    const tools = createToolDefinitions();
    const aiAssist = tools.find((t: { name: string }) => t.name === "ai_assist");
    expect(aiAssist?.inputSchema).toBeDefined();
    const props = (aiAssist?.inputSchema as Record<string, unknown>)?.properties as Record<string, unknown>;
    expect(Object.keys(props)).toContain("action");
    expect(Object.keys(props)).toContain("content");
  });
});
