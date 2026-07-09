/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { eq, inArray } from "drizzle-orm";
import { monoFontStack } from "@/lib/fonts/registry";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import "./globals.css";
import "@/themes/bifrost-terminal/styles/palettes.css";

const THEME_COOKIE = "bifrost_theme";
const FONT_KEY = "appearance.font_mono";
const THEME_MODE_KEY = "appearance.theme_mode";
const COLOR_SCHEME_KEY = "appearance.color_scheme";
const CUSTOM_CSS_KEY = "appearance.custom_css";
const SITE_TITLE_KEY = "site.title";
const SITE_DESCRIPTION_KEY = "site.description";
const SITE_LANG_KEY = "site.language";

const SHOW_DESC_KEY = "appearance.show_desc_in_title";

export async function generateMetadata(): Promise<Metadata> {
  let title = "Bifröst";
  let description = "A self-hosted blogging framework";
  let showDesc = true;

  try {
    const rows = db
      .select({ key: settings.key, value: settings.value })
      .from(settings)
      .where(
        inArray(settings.key, [SITE_TITLE_KEY, SITE_DESCRIPTION_KEY, SHOW_DESC_KEY])
      )
      .all();
    for (const row of rows) {
      if (row.key === SITE_TITLE_KEY && row.value) title = row.value;
      if (row.key === SITE_DESCRIPTION_KEY && row.value) description = row.value;
      if (row.key === SHOW_DESC_KEY && row.value === "false") showDesc = false;
    }
  } catch {
    // use defaults
  }

  return {
    title: showDesc ? `${title} | ${description}` : title,
    description,
    applicationName: title,
    manifest: "/manifest.webmanifest",
    metadataBase: new URL(
      process.env.BIFROST_SITE_URL ??
      `http://localhost:${process.env.PORT ?? 3000}`
    ),
    openGraph: {
      title,
      description,
      type: "website",
      siteName: title,
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
    icons: {
      icon: [
        { url: "/icon", type: "image/svg+xml" },
        { url: "/icon-192.png", type: "image/png", sizes: "192x192" },
      ],
      shortcut: "/favicon.ico",
      apple: "/apple-icon",
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title,
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

export async function generateViewport(): Promise<Viewport> {
  return {
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: "#eff1f5" },
      { media: "(prefers-color-scheme: dark)", color: "#1e1e2e" },
    ],
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
  let siteLang = "en";

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
    const langRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, SITE_LANG_KEY))
      .get();
    if (langRow?.value) {
      siteLang = langRow.value;
    }
  } catch {
    fontStack = undefined;
  }

  const activeTheme: "light" | "dark" = themeMode === "system" ? cookieTheme : themeMode;

  return (
    <html
      lang={siteLang}
      data-theme={activeTheme}
      data-palette={colorScheme}
      style={fontStack ? ({ "--font-mono": fontStack } as React.CSSProperties) : undefined}
    >
      <body className="bg-bg-0 text-text-1">
        {customCss && <style dangerouslySetInnerHTML={{ __html: customCss }} />}
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
