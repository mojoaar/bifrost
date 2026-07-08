/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import {
  SHARE_NETWORKS,
  buildShareUrl,
  cleanShareNetworks,
  parseShareNetworks,
} from "@/lib/sharing";

const target = { url: "https://example.com/posts/hello", title: "Hello World" };
const eurl = encodeURIComponent(target.url);
const etitle = encodeURIComponent(target.title);

describe("buildShareUrl", () => {
  it("builds a Bluesky compose intent with title and url", () => {
    const result = buildShareUrl("bluesky", target);
    expect(result).toContain("https://bsky.app/intent/compose?text=");
    expect(result).toContain(encodeURIComponent(`${target.title} ${target.url}`));
  });

  it("builds a Facebook sharer link", () => {
    const result = buildShareUrl("facebook", target);
    expect(result).toBe(`https://www.facebook.com/sharer/sharer.php?u=${eurl}`);
  });

  it("builds a Reddit submit link with url and title", () => {
    const result = buildShareUrl("reddit", target);
    expect(result).toBe(`https://www.reddit.com/submit?url=${eurl}&title=${etitle}`);
  });

  it("builds a LinkedIn share-offsite link", () => {
    const result = buildShareUrl("linkedin", target);
    expect(result).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${eurl}`);
  });

  it("builds a mailto link with subject and body", () => {
    const result = buildShareUrl("email", target);
    expect(result).toBe(`mailto:?subject=${etitle}&body=${eurl}`);
  });

  it("returns the raw url for an unknown network", () => {
    expect(buildShareUrl("bogus", target)).toBe(target.url);
  });
});

describe("cleanShareNetworks", () => {
  it("keeps known keys and drops unknown, non-string, and duplicates", () => {
    const input = ["bluesky", "bogus", 42, "reddit", "bluesky"];
    expect(cleanShareNetworks(input)).toEqual(["bluesky", "reddit"]);
  });

  it("returns an empty array for non-array input", () => {
    expect(cleanShareNetworks("bluesky")).toEqual([]);
    expect(cleanShareNetworks(null)).toEqual([]);
  });
});

describe("parseShareNetworks", () => {
  it("returns all networks when the value is empty/null/undefined", () => {
    const all = SHARE_NETWORKS.map((n) => n.key);
    expect(parseShareNetworks(null)).toEqual(all);
    expect(parseShareNetworks(undefined)).toEqual(all);
    expect(parseShareNetworks("")).toEqual(all);
  });

  it("parses a JSON array and filters unknown keys", () => {
    expect(parseShareNetworks(JSON.stringify(["bluesky", "bogus"]))).toEqual(["bluesky"]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseShareNetworks("not json")).toEqual([]);
  });
});
