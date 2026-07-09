/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { parseFrontmatter, renderMarkdown, parseMarkdown } from "@/lib/md/parser";
import fs from "fs";
import path from "path";

const fixture = fs.readFileSync(
  path.join(import.meta.dirname, "__fixtures__", "simple.md"),
  "utf-8"
);

describe("parseFrontmatter", () => {
  it("extracts frontmatter and body from YAML-delimited content", () => {
    const { frontmatter, body } = parseFrontmatter(fixture);
    expect(frontmatter).toMatchObject({ title: "Hello World", draft: false });
    expect(frontmatter.tags).toEqual(["blog", "test"]);
    expect(body).toContain("# Hello World");
    expect(body).toContain("| Col A | Col B |");
  });

  it("returns empty frontmatter for content without delimiters", () => {
    const { frontmatter, body } = parseFrontmatter("Just markdown");
    expect(frontmatter).toEqual({});
    expect(body).toBe("Just markdown");
  });
});

describe("renderMarkdown", () => {
  it("renders markdown to HTML", async () => {
    const { html, excerpt } = await renderMarkdown("# Hello **World**");
    expect(html).toContain('<h1 id="hello-world">');
    expect(html).toContain("<strong>World</strong>");
    expect(excerpt).toBe("Hello World");
  });

  it("renders GFM tables", async () => {
    const { html } = await renderMarkdown("| A | B |\n| - | - |\n| 1 | 2 |");
    expect(html).toContain("<table>");
    expect(html).toContain("<td>1</td>");
  });

  it("sanitizes dangerous HTML", async () => {
    const { html } = await renderMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
  });

  it("truncates long excerpt to 200 characters with ellipsis", async () => {
    const long = "A".repeat(300);
    const { excerpt } = await renderMarkdown(long);
    expect(excerpt.length).toBe(201); // 200 + "…"
    expect(excerpt.endsWith("…")).toBe(true);
  });
});

describe("parseMarkdown", () => {
  it("parses full markdown document with frontmatter + body", async () => {
    const result = await parseMarkdown(fixture);
    expect(result.frontmatter).toMatchObject({ title: "Hello World" });
    expect(result.html).toContain('<h1 id="hello-world">');
    expect(result.body).toContain("# Hello World");
    expect(result.excerpt).toBeTruthy();
  });
});
