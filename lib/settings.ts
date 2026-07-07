/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";

const CACHE_MS = 5_000;
let cache: { at: number; data: Record<string, string> } | null = null;

export function getAllSettings(): Record<string, string> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;
  try {
    const rows = db.select().from(settings).all();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;
    cache = { at: Date.now(), data: map };
    return map;
  } catch {
    return {};
  }
}

export function getSetting(key: string): string | undefined {
  return getAllSettings()[key];
}

export function invalidateSettingsCache() {
  cache = null;
}
