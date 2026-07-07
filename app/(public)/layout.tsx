/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { eq } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";

const WIDTH_MAP: Record<string, string> = {
  narrow: "max-w-2xl",
  wide: "max-w-4xl",
};

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  let contentWidth: string | undefined;

  try {
    const row = db
      .select()
      .from(settings)
      .where(eq(settings.key, "appearance.content_width"))
      .get();
    if (row) {
      contentWidth = WIDTH_MAP[row.value] ?? "max-w-3xl";
    }
  } catch {
    contentWidth = undefined;
  }

  const theme = await loadTheme("bifrost-terminal");
  const ThemeLayout = theme.components.layout;

  if (!ThemeLayout) {
    return <>{children}</>;
  }

  return <ThemeLayout contentWidth={contentWidth}>{children}</ThemeLayout>;
}
