/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface SocialPlatform {
  key: string;
  label: string;
  placeholder: string;
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  { key: "bluesky", label: "Bluesky", placeholder: "https://bsky.app/profile/you.bsky.social" },
  { key: "facebook", label: "Facebook", placeholder: "https://facebook.com/you" },
  { key: "mastodon", label: "Mastodon", placeholder: "https://mastodon.social/@you" },
  { key: "lemmy", label: "Lemmy", placeholder: "https://lemmy.world/u/you" },
  { key: "reddit", label: "Reddit", placeholder: "https://reddit.com/user/you" },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/you" },
  { key: "github", label: "GitHub", placeholder: "https://github.com/you" },
  { key: "gitlab", label: "GitLab", placeholder: "https://gitlab.com/you" },
  { key: "codeberg", label: "Codeberg", placeholder: "https://codeberg.org/you" },
  { key: "website", label: "Website", placeholder: "https://example.com" },
];

const PLATFORM_KEYS = new Set(SOCIAL_PLATFORMS.map((p) => p.key));

export function cleanSocialLinks(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object") return {};
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!PLATFORM_KEYS.has(key)) continue;
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (trimmed) result[key] = trimmed;
  }
  return result;
}

export function parseSocialLinks(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return cleanSocialLinks(JSON.parse(raw));
  } catch {
    return {};
  }
}
