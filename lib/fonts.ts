/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

const MONO_FONTS: Record<string, string> = {
  "Anonymous Pro": "'Anonymous Pro', monospace",
  "Cascadia Code": "'Cascadia Code', monospace",
  "Fira Code": "'Fira Code', monospace",
  "IBM Plex Mono": "'IBM Plex Mono', monospace",
  Inconsolata: "'Inconsolata', monospace",
  "JetBrains Mono": "'JetBrains Mono', monospace",
  "Roboto Mono": "'Roboto Mono', monospace",
  "Source Code Pro": "'Source Code Pro', monospace",
  "Space Mono": "'Space Mono', monospace",
  "Victor Mono": "'Victor Mono', monospace",
};

export function monoFontStack(name: string): string | undefined {
  return MONO_FONTS[name];
}
