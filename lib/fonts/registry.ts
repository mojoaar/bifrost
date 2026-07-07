/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export interface FontEntry {
  family: string;
  importPath: string;
}

const REGISTRY: Record<string, FontEntry> = {
  "JetBrains Mono": {
    family: "'JetBrains Mono Variable', 'JetBrains Mono'",
    importPath: "@fontsource-variable/jetbrains-mono",
  },
  "Fira Code": {
    family: "'Fira Code Variable', 'Fira Code'",
    importPath: "@fontsource-variable/fira-code",
  },
  "IBM Plex Mono": {
    family: "'IBM Plex Mono'",
    importPath: "@fontsource/ibm-plex-mono",
  },
  "Source Code Pro": {
    family: "'Source Code Pro Variable', 'Source Code Pro'",
    importPath: "@fontsource-variable/source-code-pro",
  },
  "Roboto Mono": {
    family: "'Roboto Mono'",
    importPath: "@fontsource/roboto-mono",
  },
  Inconsolata: {
    family: "'Inconsolata'",
    importPath: "@fontsource/inconsolata",
  },
};

export const FONT_NAMES: string[] = Object.keys(REGISTRY).sort();

export function getFontEntry(name: string): FontEntry | undefined {
  return REGISTRY[name];
}

export function monoFontStack(name: string): string | undefined {
  return REGISTRY[name]?.family;
}
