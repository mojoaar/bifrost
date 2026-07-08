/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n*/;

export function buildFrontmatter(title: string, type: "post" | "page", tags?: string[]): string {
  const escaped = title.replace(/"/g, '\\"');
  if (type === "post") {
    const today = new Date().toISOString().slice(0, 10);
    const tagLine = tags && tags.length > 0
      ? "tags:\n" + tags.map((t) => `  - "${t.replace(/"/g, '\\"')}"`).join("\n") + "\n"
      : "tags:\n";
    return `---\ntitle: "${escaped}"\ndate: ${today}\n${tagLine}---\n\n`;
  }
  return `---\ntitle: "${escaped}"\n---\n\n`;
}

export function mergeFrontmatter(text: string, title: string, type: "post" | "page", tags?: string[]): string {
  if (!title) return text;
  const newFm = buildFrontmatter(title, type, tags);
  if (!text || text.trim() === "") return newFm;
  const match = text.match(FRONTMATTER_RE);
  if (!match) return newFm + text.replace(/^\n+/, "");
  const after = text.slice(match[0].length);
  return newFm + after.replace(/^\n+/, "");
}
