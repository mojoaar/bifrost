/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerPlugin, listPlugins, runHook, getPlugins } from "@/lib/plugins/registry";
import type { BifrostPlugin, ParsedMarkdown } from "@/lib/plugins/types";

beforeEach(() => {
  const all = getPlugins();
  all.length = 0;
});

describe("registerPlugin", () => {
  it("registers a plugin", () => {
    const plugin: BifrostPlugin = { name: "test", hooks: {} };
    registerPlugin(plugin);
    expect(listPlugins()).toHaveLength(1);
    expect(listPlugins()[0]!.name).toBe("test");
  });

  it("throws on duplicate plugin name", () => {
    const plugin: BifrostPlugin = { name: "dup", hooks: {} };
    registerPlugin(plugin);
    expect(() => registerPlugin(plugin)).toThrow("already registered");
  });
});

describe("runHook", () => {
  const mockParsed: ParsedMarkdown = {
    frontmatter: {},
    body: "# hello",
    html: "<h1>hello</h1>",
    excerpt: "hello",
  };

  it("returns empty array when no plugins registered", async () => {
    const results = await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });
    expect(results).toEqual([]);
  });

  it("calls matching hook across all registered plugins", async () => {
    const calls: string[] = [];

    registerPlugin({
      name: "a",
      hooks: {
        onContentParse(parsed) {
          calls.push("a");
          return parsed;
        },
      },
    });

    registerPlugin({
      name: "b",
      hooks: {
        onContentParse(parsed) {
          calls.push("b");
          return parsed;
        },
      },
    });

    await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });

    expect(calls).toEqual(["a", "b"]);
  });

  it("skips plugins without the hook", async () => {
    registerPlugin({ name: "no-hook", hooks: {} });

    registerPlugin({
      name: "has-hook",
      hooks: {
        onContentParse(parsed) {
          return { ...parsed, excerpt: "modified" };
        },
      },
    });

    const results = await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.excerpt).toBe("modified");
  });

  it("collects return values from all plugins", async () => {
    registerPlugin({
      name: "a",
      hooks: { onContentParse(p) { return p; } },
    });
    registerPlugin({
      name: "b",
      hooks: { onContentParse(p) { return { ...p, body: "mod" }; } },
    });

    const results = await runHook("onContentParse", mockParsed, {
      db: {} as never,
      loadConfig: {} as never,
    });

    expect(results).toHaveLength(2);
  });
});
