/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface MediaVariant {
  path: string;
  width: number;
  height: number;
}

export interface MediaVariants {
  thumb?: MediaVariant;
  sizes: MediaVariant[];
}

function parseVariants(variants: string | null | undefined): MediaVariants | null {
  if (!variants) return null;
  try {
    const parsed = JSON.parse(variants) as MediaVariants;
    if (!parsed || !Array.isArray(parsed.sizes)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildSrcSet(variants: string | null | undefined): string | undefined {
  const parsed = parseVariants(variants);
  if (!parsed || parsed.sizes.length === 0) return undefined;
  return parsed.sizes.map((v) => `/${v.path} ${v.width}w`).join(", ");
}

export function thumbSrc(variants: string | null | undefined): string | undefined {
  const parsed = parseVariants(variants);
  if (!parsed) return undefined;
  return parsed.thumb ? `/${parsed.thumb.path}` : parsed.sizes[0] ? `/${parsed.sizes[0].path}` : undefined;
}
