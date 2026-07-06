/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import fs from "fs/promises";
import path from "path";
import YAML from "yaml";

const POSTS_DIR = path.resolve("content/posts");

export async function writePostToFilesystem(
  slug: string,
  content: string,
  frontmatter: Record<string, unknown> = {}
): Promise<void> {
  const dir = path.join(POSTS_DIR, slug);
  await fs.mkdir(dir, { recursive: true });

  const yamlBlock = YAML.stringify(frontmatter);
  const fileContent = `---\n${yamlBlock}---\n\n${content}`;

  await fs.writeFile(path.join(dir, "index.md"), fileContent);
}

export async function deletePostFromFilesystem(slug: string): Promise<void> {
  const dir = path.join(POSTS_DIR, slug);
  await fs.rm(dir, { recursive: true, force: true });
}
