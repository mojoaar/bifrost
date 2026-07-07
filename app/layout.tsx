/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { eq, inArray } from "drizzle-orm";
import { monoFontStack } from "@/lib/fonts/registry";
import "./globals.css";
import "@/themes/bifrost-terminal/styles/light.css";
import "@/themes/bifrost-terminal/styles/dark.css";

const THEME_COOKIE = "bifrost_theme";
const FONT_KEY = "appearance.font_mono";
const THEME_MODE_KEY = "appearance.theme_mode";
const SITE_TITLE_KEY = "site.title";
const SITE_DESCRIPTION_KEY = "site.description";

export async function generateMetadata(): Promise<Metadata> {
  let title = "Bifröst";
  let description = "A self-hosted blogging framework";

  try {
    const rows = db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(
        inArray(settings.key, [SITE_TITLE_KEY, SITE_DESCRIPTION_KEY])
      )
      .all();
    for (const row of rows) {
      if (row.key === SITE_TITLE_KEY && row.value) title = row.value;
      if (row.key === SITE_DESCRIPTION_KEY && row.value) description = row.value;
    }
  } catch {
    // use defaults
  }

  return {
    title,
    description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(THEME_COOKIE)?.value;
  const cookieTheme: "light" | "dark" = cookieValue === "light" ? "light" : "dark";

  let fontStack: string | undefined;
  let themeMode: "system" | "light" | "dark" = "dark";

  try {
    const fontRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, FONT_KEY))
      .get();
    if (fontRow) {
      fontStack = monoFontStack(fontRow.value);
    }
    const modeRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, THEME_MODE_KEY))
      .get();
    if (modeRow) {
      const m = modeRow.value;
      if (m === "light" || m === "dark" || m === "system") {
        themeMode = m;
      }
    }
  } catch {
    fontStack = undefined;
  }

  const activeTheme: "light" | "dark" = themeMode === "system" ? cookieTheme : themeMode;

  return (
    <html
      lang="en"
      data-theme={activeTheme}
      style={fontStack ? ({ "--font-mono": fontStack } as React.CSSProperties) : undefined}
    >
      <body className="bg-bg-0 text-text-1">{children}</body>
    </html>
  );
}
