/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

function wordCount(html: string): number {
  const text = html.replace(/<[^>]+>/g, "");
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingTime(html: string): number {
  return Math.max(1, Math.round(wordCount(html) / 220));
}
