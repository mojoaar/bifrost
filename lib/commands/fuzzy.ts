/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface RankedItem<T> {
  item: T;
  score: number;
}

function isWordBoundary(s: string, i: number): boolean {
  if (i === 0) return true;
  const prev = s[i - 1] ?? "";
  const cur = s[i] ?? "";
  return /\s|_|-|\//.test(prev) && /[a-zA-Z0-9]/.test(cur);
}

export function score(query: string, target: string): number {
  if (!query) return 1;
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  if (t === q) return 2;
  if (t.startsWith(q)) return 1.5;
  if (isWordBoundaryMatch(q, t)) return 1.2;
  const idx = t.indexOf(q);
  if (idx === 0) return 1.0;
  if (idx > 0 && isWordBoundary(t, idx)) return 0.85;
  if (idx > 0) return 0.6;
  return 0;
}

function isWordBoundaryMatch(q: string, t: string): boolean {
  const idx = t.indexOf(q);
  return idx >= 0 && isWordBoundary(t, idx);
}

export function filter<T>(
  query: string,
  items: T[],
  getHaystack: (item: T) => string | string[],
): T[] {
  if (!query.trim()) return items;
  const haystacks = items.map((item) => {
    const raw = getHaystack(item);
    return Array.isArray(raw) ? raw : [raw];
  });
  const ranked: RankedItem<T>[] = items
    .map((item, i) => {
      const fields = haystacks[i] ?? [];
      const max = fields.reduce((acc, h) => Math.max(acc, score(query, h)), 0);
      return { item, score: max };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
  return ranked.map((r) => r.item);
}
