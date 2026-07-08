/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface ShareNetwork {
  key: string;
  label: string;
}

export const SHARE_NETWORKS: ShareNetwork[] = [
  { key: "bluesky", label: "Bluesky" },
  { key: "facebook", label: "Facebook" },
  { key: "reddit", label: "Reddit" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "email", label: "Email" },
];

export const SHARE_NETWORK_KEYS = new Set(SHARE_NETWORKS.map((n) => n.key));

export interface ShareTarget {
  url: string;
  title: string;
}

export function buildShareUrl(key: string, target: ShareTarget): string {
  const url = target.url;
  const title = target.title;
  const eurl = encodeURIComponent(url);
  const etitle = encodeURIComponent(title);

  switch (key) {
    case "bluesky":
      return `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${eurl}`;
    case "reddit":
      return `https://www.reddit.com/submit?url=${eurl}&title=${etitle}`;
    case "linkedin":
      return `https://www.linkedin.com/sharing/share-offsite/?url=${eurl}`;
    case "email":
      return `mailto:?subject=${etitle}&body=${eurl}`;
    default:
      return url;
  }
}

export function cleanShareNetworks(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of input) {
    if (typeof item !== "string") continue;
    const key = item.trim();
    if (!SHARE_NETWORK_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    result.push(key);
  }
  return result;
}

export function parseShareNetworks(raw: string | null | undefined): string[] {
  if (raw === null || raw === undefined || raw === "") {
    return SHARE_NETWORKS.map((n) => n.key);
  }
  try {
    return cleanShareNetworks(JSON.parse(raw));
  } catch {
    return [];
  }
}
