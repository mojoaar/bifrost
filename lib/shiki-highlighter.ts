/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

const LANGS = ["bash", "javascript", "powershell", "python", "json"];
const THEMES = ["github-dark", "github-light"];

export function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = import("shiki").then((shiki) =>
      shiki.createHighlighter({ themes: THEMES, langs: LANGS })
    );
  }
  return highlighterPromise;
}

export async function highlightCode(
  code: string,
  lang: string,
  mode: "light" | "dark"
): Promise<string> {
  const hl = await getHighlighter();
  return hl.codeToHtml(code, {
    lang,
    theme: mode === "dark" ? "github-dark" : "github-light",
  });
}
