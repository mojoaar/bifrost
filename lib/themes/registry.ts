/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import fs from "fs";
import path from "path";
import type { LoadedTheme, ThemeManifest, ThemeComponents } from "./types";

const THEMES_DIR = path.resolve("themes");

export async function loadTheme(name: string): Promise<LoadedTheme> {
  const themePath = path.join(THEMES_DIR, name);

  if (!fs.existsSync(themePath)) {
    throw new Error(`Theme "${name}" not found at ${themePath}`);
  }

  const manifestPath = path.join(themePath, "theme.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`theme.json not found for theme "${name}"`);
  }

  const manifest = JSON.parse(
    fs.readFileSync(manifestPath, "utf-8")
  ) as ThemeManifest;

  const components: ThemeComponents = {};

  const layoutPath = path.join(themePath, "layout.tsx");
  const postPath = path.join(themePath, "post.tsx");
  const listPath = path.join(themePath, "list.tsx");

  if (fs.existsSync(layoutPath)) {
    components.layout = (await import(layoutPath)).default;
  }
  if (fs.existsSync(postPath)) {
    components.post = (await import(postPath)).default;
  }
  if (fs.existsSync(listPath)) {
    components.list = (await import(listPath)).default;
  }

  return { manifest, components, path: themePath };
}

export async function listThemes(): Promise<LoadedTheme[]> {
  const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true });
  const themes: LoadedTheme[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const themeJsonPath = path.join(THEMES_DIR, entry.name, "theme.json");
    if (!fs.existsSync(themeJsonPath)) continue;
    themes.push(await loadTheme(entry.name));
  }

  return themes;
}
