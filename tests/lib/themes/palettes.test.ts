/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { describe, it, expect } from "vitest";
import { PALETTES, PALETTE_MAP, cssForPalette, CSS_VARIABLE_TOKENS } from "@/lib/themes/palettes";

const REQUIRED_TOKENS = [
  "--bg-0", "--bg-1", "--bg-2", "--bg-3",
  "--surface", "--surface-raised", "--surface-sunken",
  "--text-1", "--text-2", "--text-3", "--text-muted",
  "--border", "--border-strong",
  "--accent", "--accent-hover", "--accent-fg", "--accent-subtle",
  "--success", "--success-subtle", "--warning", "--warning-subtle",
  "--danger", "--danger-subtle",
  "--code-bg", "--code-border",
];

const REQUIRED_SHIKI_TOKENS = [
  "--shiki-background", "--shiki-foreground",
  "--shiki-token-comment", "--shiki-token-keyword",
  "--shiki-token-string", "--shiki-token-function",
  "--shiki-token-constant", "--shiki-token-parameter",
  "--shiki-token-operator", "--shiki-token-punctuation",
  "--shiki-token-number", "--shiki-token-property",
];

describe("PALETTES", () => {
  it("has 6 palettes", () => {
    expect(PALETTES).toHaveLength(6);
  });

  it("is sorted alphabetically by name", () => {
    const names = PALETTES.map((p) => p.name);
    expect([...names].sort()).toEqual(names);
  });

  it("has unique slugs", () => {
    const slugs = PALETTES.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every palette has valid light and dark token blocks", () => {
    for (const p of PALETTES) {
      expect(typeof p.light).toBe("object");
      expect(typeof p.dark).toBe("object");
      for (const tok of REQUIRED_TOKENS) {
        expect(p.light[tok], `${p.slug} light missing ${tok}`).toBeDefined();
        expect(p.light[tok], `${p.slug} light ${tok} should be a string`).toSatisfy(
          (v: string) => typeof v === "string" && v.startsWith("#"),
        );
        expect(p.dark[tok], `${p.slug} dark missing ${tok}`).toBeDefined();
        expect(p.dark[tok], `${p.slug} dark ${tok} should be a string`).toSatisfy(
          (v: string) => typeof v === "string" && v.startsWith("#"),
        );
      }
      for (const tok of REQUIRED_SHIKI_TOKENS) {
        expect(p.light[tok], `${p.slug} light missing ${tok}`).toBeDefined();
        expect(p.dark[tok], `${p.slug} dark missing ${tok}`).toBeDefined();
      }
    }
  });
});

describe("PALETTE_MAP", () => {
  it("has an entry for every palette slug", () => {
    for (const p of PALETTES) {
      expect(PALETTE_MAP.get(p.slug)).toBe(p);
    }
  });

  it("returns undefined for unknown slugs", () => {
    expect(PALETTE_MAP.get("nonexistent")).toBeUndefined();
  });
});

describe("cssForPalette", () => {
  it("produces a string with both light and dark blocks", () => {
    const css = cssForPalette(PALETTES[0]!);
    expect(css).toContain('data-palette="catppuccin"');
    expect(css).toContain('data-theme="light"');
    expect(css).toContain('data-theme="dark"');
    expect(css).toContain("--bg-0:");
    expect(css).toContain("--shiki-background:");
  });

  it("produces different output for different palettes", () => {
    const a = cssForPalette(PALETTES[0]!);
    const b = cssForPalette(PALETTES[1]!);
    expect(a).not.toBe(b);
  });
});

describe("CSS_VARIABLE_TOKENS", () => {
  it("includes all required tokens", () => {
    for (const tok of [...REQUIRED_TOKENS, ...REQUIRED_SHIKI_TOKENS]) {
      expect(CSS_VARIABLE_TOKENS).toContain(tok);
    }
  });

  it("is sorted", () => {
    expect([...CSS_VARIABLE_TOKENS].sort()).toEqual(CSS_VARIABLE_TOKENS);
  });
});
