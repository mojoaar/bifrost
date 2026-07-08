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
import "@/themes/bifrost-terminal/styles/palettes.css";

const THEME_COOKIE = "bifrost_theme";
const FONT_KEY = "appearance.font_mono";
const THEME_MODE_KEY = "appearance.theme_mode";
const COLOR_SCHEME_KEY = "appearance.color_scheme";
const CUSTOM_CSS_KEY = "appearance.custom_css";
const SITE_TITLE_KEY = "site.title";
const SITE_DESCRIPTION_KEY = "site.description";

const SHOW_DESC_KEY = "appearance.show_desc_in_title";

export async function generateMetadata(): Promise<Metadata> {
  let title = "Bifröst";
  let description = "A self-hosted blogging framework";

  try {
    const rows = db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(
        inArray(settings.key, [SITE_TITLE_KEY, SITE_DESCRIPTION_KEY, SHOW_DESC_KEY])
      )
      .all();
    let showDesc = true;
    for (const row of rows) {
      if (row.key === SITE_TITLE_KEY && row.value) title = row.value;
      if (row.key === SITE_DESCRIPTION_KEY && row.value) description = row.value;
      if (row.key === SHOW_DESC_KEY && row.value === "false") showDesc = false;
    }
    if (showDesc) {
      return { title: `${title} | ${description}`, description };
    }
  } catch {
    // use defaults
  }

  return {
    title,
    description,
    metadataBase: new URL(
      process.env.BIFROST_SITE_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    ),
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Bifröst",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    icons: {
      icon: "/icon.svg",
    },
    alternates: {
      types: {
        "application/rss+xml": "/rss.xml",
      },
    },
    robots: {
      index: true,
      follow: true,
    },
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
  let colorScheme = "default";
  let customCss = "";

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
    const schemeRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, COLOR_SCHEME_KEY))
      .get();
    if (schemeRow?.value) {
      colorScheme = schemeRow.value;
    }
    const cssRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, CUSTOM_CSS_KEY))
      .get();
    if (cssRow?.value) {
      customCss = cssRow.value;
    }
  } catch {
    fontStack = undefined;
  }

  const activeTheme: "light" | "dark" = themeMode === "system" ? cookieTheme : themeMode;

  return (
    <html
      lang="en"
      data-theme={activeTheme}
      data-palette={colorScheme}
      style={fontStack ? ({ "--font-mono": fontStack } as React.CSSProperties) : undefined}
    >
      <body className="bg-bg-0 text-text-1">
        {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
        {children}
      </body>
    </html>
  );
}
