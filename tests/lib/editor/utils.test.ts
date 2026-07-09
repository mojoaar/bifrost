/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { generateSlug, buildFrontmatter, mergeFrontmatter } from "@/lib/editor/utils";

describe("generateSlug", () => {
  it("lowercases and hyphenates", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("strips special characters and trims hyphens", () => {
    expect(generateSlug("  A B! C?  ")).toBe("a-b-c");
    expect(generateSlug("Foo -- Bar")).toBe("foo-bar");
  });
});

describe("buildFrontmatter", () => {
  it("builds post frontmatter with date and tags", () => {
    const fm = buildFrontmatter("My Post", "post", ["a", "b"]);
    expect(fm).toContain('title: "My Post"');
    expect(fm).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    expect(fm).toContain('  - "a"');
    expect(fm).toContain('  - "b"');
  });

  it("builds page frontmatter without date/tags", () => {
    const fm = buildFrontmatter("About", "page");
    expect(fm).toContain('title: "About"');
    expect(fm).not.toContain("date:");
    expect(fm).not.toContain("tags:");
  });

  it("escapes double quotes in the title", () => {
    const fm = buildFrontmatter('He said "hi"', "page");
    expect(fm).toContain('title: "He said \\"hi\\""');
  });

  it("includes SEO fields when provided", () => {
    const fm = buildFrontmatter("T", "page", undefined, {
      metaDescription: "desc",
      noindex: true,
    });
    expect(fm).toContain('metaDescription: "desc"');
    expect(fm).toContain("noindex: true");
  });
});

describe("mergeFrontmatter", () => {
  it("returns text unchanged when title is empty", () => {
    expect(mergeFrontmatter("body", "", "post")).toBe("body");
  });

  it("prepends frontmatter to body without existing frontmatter", () => {
    const out = mergeFrontmatter("Hello body", "T", "page");
    expect(out).toContain('title: "T"');
    expect(out).toContain("Hello body");
  });

  it("replaces an existing frontmatter block, preserving body", () => {
    const original = '---\ntitle: "Old"\n---\n\nBody text';
    const out = mergeFrontmatter(original, "New", "page");
    expect(out).toContain('title: "New"');
    expect(out).not.toContain('title: "Old"');
    expect(out).toContain("Body text");
  });
});
