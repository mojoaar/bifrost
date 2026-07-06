/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import YAML from "yaml";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeSanitize from "rehype-sanitize";
import type { ParsedMarkdown } from "./types";
import { runHook } from "@/lib/plugins/registry";

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const rawYaml = match[1]!;
  const body = content.slice(match[0].length);

  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = YAML.parse(rawYaml);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    frontmatter = {};
  }

  return { frontmatter, body };
}

const processor = remark()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype, { allowDangerousHtml: false })
  .use(rehypeSanitize)
  .use(rehypeStringify);

export async function renderMarkdown(
  markdown: string
): Promise<{ html: string; excerpt: string }> {
  const result = await processor.process(markdown);
  let html = String(result);

  try {
    const { db } = await import("@/lib/db");
    const { loadConfig } = await import("@/lib/config/loader");
    const rendered = await runHook("onContentRender", html, { db, loadConfig });
    if (rendered.length > 0) {
      html = rendered[rendered.length - 1]!;
    }
  } catch {
    // hooks are optional; continue without them if db isn't available
  }

  const plainText = html
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const excerpt = plainText.length > 200 ? plainText.slice(0, 200) + "\u2026" : plainText;

  return { html, excerpt };
}

export async function parseMarkdown(content: string): Promise<ParsedMarkdown> {
  const { frontmatter, body } = parseFrontmatter(content);
  const { html, excerpt } = await renderMarkdown(body);

  const parsed: ParsedMarkdown = { frontmatter, body, html, excerpt };

  try {
    const { db } = await import("@/lib/db");
    const { loadConfig } = await import("@/lib/config/loader");
    const modified = await runHook("onContentParse", parsed, { db, loadConfig });
    if (modified.length > 0) {
      return modified[modified.length - 1]!;
    }
  } catch {
    // hooks are optional
  }

  return parsed;
}
