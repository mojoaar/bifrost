/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

export function generateSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n*/;

interface SeoFields {
  metaDescription?: string;
  ogTitle?: string;
  ogDescription?: string;
  noindex?: boolean;
}

function yamlEsc(v: string): string {
  return v.replace(/"/g, '\\"');
}

function writeSeoFields(seo?: SeoFields): string {
  if (!seo) return "";
  let out = "";
  if (seo.metaDescription) out += `metaDescription: "${yamlEsc(seo.metaDescription)}"\n`;
  if (seo.ogTitle) out += `ogTitle: "${yamlEsc(seo.ogTitle)}"\n`;
  if (seo.ogDescription) out += `ogDescription: "${yamlEsc(seo.ogDescription)}"\n`;
  if (seo.noindex) out += "noindex: true\n";
  return out;
}

export function buildFrontmatter(
  title: string,
  type: "post" | "page",
  tags?: string[],
  seo?: SeoFields
): string {
  const escaped = yamlEsc(title);
  if (type === "post") {
    const today = nowISO().slice(0, 10);
    const tagLine =
      tags && tags.length > 0
        ? "tags:\n" + tags.map((t) => `  - "${yamlEsc(t)}"`).join("\n") + "\n"
        : "tags:\n";
    return `---\ntitle: "${escaped}"\ndate: ${today}\n${tagLine}${writeSeoFields(seo)}---\n\n`;
  }
  return `---\ntitle: "${escaped}"\n${writeSeoFields(seo)}---\n\n`;
}

export function mergeFrontmatter(
  text: string,
  title: string,
  type: "post" | "page",
  tags?: string[],
  seo?: SeoFields
): string {
  if (!title) return text;
  const newFm = buildFrontmatter(title, type, tags, seo);
  if (!text || text.trim() === "") return newFm;
  const match = text.match(FRONTMATTER_RE);
  if (!match) return newFm + text.replace(/^\n+/, "");
  const after = text.slice(match[0].length);
  return newFm + after.replace(/^\n+/, "");
}
