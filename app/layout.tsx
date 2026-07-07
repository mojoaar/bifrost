/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { Metadata } from "next";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { eq } from "drizzle-orm";
import { monoFontStack } from "@/lib/fonts/registry";
import "./globals.css";
import "@/themes/default/styles/light.css";
import "@/themes/default/styles/dark.css";

export const metadata: Metadata = {
  title: "Bifröst",
  description: "A self-hosted blogging framework",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let fontStack: string | undefined;

  try {
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, "appearance.font_mono"))
      .get();
    if (row) {
      fontStack = monoFontStack(row.value);
    }
  } catch {
    fontStack = undefined;
  }

  return (
    <html lang="en" data-theme="dark" style={fontStack ? ({ "--font-mono": fontStack } as React.CSSProperties) : undefined}>
      <body className="bg-bg-0 text-text-1">{children}</body>
    </html>
  );
}
