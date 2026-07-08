/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import path from "path";

export function contentDir(): string {
  return path.resolve(process.env.BIFROST_CONTENT_DIR ?? "content");
}

export function postsDir(): string {
  return path.join(contentDir(), "posts");
}

export function pagesDir(): string {
  return path.join(contentDir(), "pages");
}

export function mediaDir(): string {
  return path.join(contentDir(), "media");
}

export function trashDir(): string {
  return path.join(contentDir(), ".trash");
}

export function postTemplatesDir(): string {
  return path.join(contentDir(), "post-templates");
}
