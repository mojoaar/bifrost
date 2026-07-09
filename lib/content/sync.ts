/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { nowISO } from "@/lib/time";

import { fs } from "@/lib/fs";
import path from "path";
import YAML from "yaml";
import { postsDir, pagesDir, trashDir } from "@/lib/paths";

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;

function stripFrontmatter(content: string): string {
  let body = content.replace(/^\uFEFF/, "").replace(/^\s+/, "");
  while (FRONTMATTER_RE.test(body)) {
    body = body.replace(FRONTMATTER_RE, "").replace(/^\s+/, "");
  }
  return body;
}

async function writeToFilesystem(
  baseDir: string,
  slug: string,
  content: string,
  frontmatter: Record<string, unknown>
): Promise<void> {
  const dir = path.join(baseDir, slug);
  await fs.mkdir(dir, { recursive: true });

  const body = stripFrontmatter(content);
  const yamlBlock = YAML.stringify(frontmatter);
  const fileContent = `---\n${yamlBlock}---\n\n${body}`;

  await fs.writeFile(path.join(dir, "index.md"), fileContent);
}

async function deleteFromFilesystem(baseDir: string, slug: string): Promise<void> {
  const dir = path.join(baseDir, slug);
  try {
    await fs.access(dir);
  } catch {
    return;
  }

  const trash = trashDir();
  await fs.mkdir(trash, { recursive: true });
  const stamp = nowISO().replace(/[:.]/g, "-");
  const dest = path.join(trash, `${slug}-${stamp}`);

  try {
    await fs.rename(dir, dest);
  } catch {
    await fs.cp(dir, dest, { recursive: true });
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export function writePostToFilesystem(
  slug: string,
  content: string,
  frontmatter: Record<string, unknown> = {}
): Promise<void> {
  return writeToFilesystem(postsDir(), slug, content, frontmatter);
}

export function deletePostFromFilesystem(slug: string): Promise<void> {
  return deleteFromFilesystem(postsDir(), slug);
}

export function writePageToFilesystem(
  slug: string,
  content: string,
  frontmatter: Record<string, unknown> = {}
): Promise<void> {
  return writeToFilesystem(pagesDir(), slug, content, frontmatter);
}

export function deletePageFromFilesystem(slug: string): Promise<void> {
  return deleteFromFilesystem(pagesDir(), slug);
}
