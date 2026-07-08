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

import DefaultLayout from "../../themes/bifrost-terminal/layout";
import DefaultPost from "../../themes/bifrost-terminal/post";
import DefaultList from "../../themes/bifrost-terminal/list";
import DefaultPage from "../../themes/bifrost-terminal/page";

import ReadLayout from "../../themes/bifrost-read/layout";
import ReadPost from "../../themes/bifrost-read/post";
import ReadList from "../../themes/bifrost-read/list";
import ReadPage from "../../themes/bifrost-read/page";

import MagazineLayout from "../../themes/bifrost-magazine/layout";
import MagazinePost from "../../themes/bifrost-magazine/post";
import MagazineList from "../../themes/bifrost-magazine/list";
import MagazinePage from "../../themes/bifrost-magazine/page";

const THEMES_DIR = path.resolve("themes");

const STATIC_THEMES: Record<string, ThemeComponents> = {
  "bifrost-terminal": {
    layout: DefaultLayout,
    post: DefaultPost,
    list: DefaultList,
    page: DefaultPage,
  },
  "bifrost-read": {
    layout: ReadLayout,
    post: ReadPost,
    list: ReadList,
    page: ReadPage,
  },
  "bifrost-magazine": {
    layout: MagazineLayout,
    post: MagazinePost,
    list: MagazineList,
    page: MagazinePage,
  },
};

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

  const components = STATIC_THEMES[name] ?? {};

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
