/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import fs from "fs";
import path from "path";
import { contentDir } from "@/lib/paths";

const archiver = require("archiver") as (
  format: string,
  opts?: Record<string, unknown>
) => {
  pipe: (writable: unknown) => void;
  directory: (dir: string, prefix: string | false) => void;
  on: (event: string, cb: (...args: unknown[]) => void) => void;
  finalize: () => void;
};

export function contentSummary(): { posts: number; pages: number; media: number; templates: number } {
  const postsDir = path.join(contentDir(), "posts");
  const pagesDir = path.join(contentDir(), "pages");
  const mediaDir = path.join(contentDir(), "media");
  const templatesDir = path.join(contentDir(), "post-templates");

  return {
    posts: countDirs(postsDir),
    pages: countDirs(pagesDir),
    media: countDirs(mediaDir),
    templates: countFiles(templatesDir, ".md"),
  };
}

function countDirs(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).length;
}

function countFiles(dir: string, ext: string): number {
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).length;
}

export function createExportZip() {
  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.directory(contentDir(), false);
  archive.finalize();
  return archive;
}

export function extractZip(filePath: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const unzipper = require("unzipper");
    const rs = fs.createReadStream(filePath);
    rs.pipe(unzipper.Extract({ path: targetDir }))
      .on("close", resolve)
      .on("error", reject);
  });
}
