/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { SOCIAL_PLATFORMS, cleanSocialLinks, parseSocialLinks } from "@/lib/social";

describe("social platforms", () => {
  it("defines the ten expected platforms in order", () => {
    expect(SOCIAL_PLATFORMS.map((p) => p.key)).toEqual([
      "bluesky",
      "facebook",
      "mastodon",
      "lemmy",
      "reddit",
      "linkedin",
      "github",
      "gitlab",
      "codeberg",
      "website",
    ]);
  });

  it("every platform has a label and placeholder", () => {
    for (const p of SOCIAL_PLATFORMS) {
      expect(p.label).toBeTruthy();
      expect(p.placeholder).toBeTruthy();
    }
  });
});

describe("cleanSocialLinks", () => {
  it("keeps known keys and trims values", () => {
    expect(cleanSocialLinks({ github: "  https://github.com/me  " })).toEqual({
      github: "https://github.com/me",
    });
  });

  it("drops unknown keys", () => {
    expect(cleanSocialLinks({ twitter: "https://x.com/me", github: "https://github.com/me" })).toEqual({
      github: "https://github.com/me",
    });
  });

  it("drops empty and non-string values", () => {
    expect(cleanSocialLinks({ github: "   ", gitlab: 42, website: "https://x.com" })).toEqual({
      website: "https://x.com",
    });
  });

  it("returns empty object for non-objects", () => {
    expect(cleanSocialLinks(null)).toEqual({});
    expect(cleanSocialLinks("string")).toEqual({});
    expect(cleanSocialLinks(undefined)).toEqual({});
  });
});

describe("parseSocialLinks", () => {
  it("parses a JSON string of links", () => {
    expect(parseSocialLinks('{"github":"https://github.com/me","x":"y"}')).toEqual({
      github: "https://github.com/me",
    });
  });

  it("returns empty object for null or invalid JSON", () => {
    expect(parseSocialLinks(null)).toEqual({});
    expect(parseSocialLinks("not json")).toEqual({});
  });
});
