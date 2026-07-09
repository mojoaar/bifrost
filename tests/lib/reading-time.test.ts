/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { wordCount, readingTime } from "@/lib/reading-time";

describe("wordCount", () => {
  it("counts words in plain text", () => {
    expect(wordCount("one two three")).toBe(3);
  });

  it("strips HTML tags before counting", () => {
    expect(wordCount("<p>hello <strong>world</strong></p>")).toBe(2);
  });

  it("returns 0 for empty content", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("<p></p>")).toBe(0);
  });

  it("collapses arbitrary whitespace", () => {
    expect(wordCount("a\n\n  b\t c")).toBe(3);
  });
});

describe("readingTime", () => {
  it("returns at least 1 minute for short content", () => {
    expect(readingTime("a few words")).toBe(1);
  });

  it("scales with word count (~220 wpm)", () => {
    const words = Array.from({ length: 660 }, () => "word").join(" ");
    expect(readingTime(words)).toBe(3);
  });
});
