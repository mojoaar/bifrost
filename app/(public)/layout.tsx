/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema/settings";
import { eq } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import { PageViewBeacon } from "@/components/PageViewBeacon";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("bifrost_theme")?.value === "light" ? "light" : "dark";

  let contentWidth: string | undefined;
  let themeName = "bifrost-terminal";

  try {
    const cwRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, "appearance.content_width"))
      .get();
    if (cwRow) {
      contentWidth = cwRow.value;
    }

    const themeRow = db
      .select()
      .from(settings)
      .where(eq(settings.key, "theme"))
      .get();
    if (themeRow?.value) {
      themeName = themeRow.value;
    }
  } catch {
    contentWidth = undefined;
  }

  const themeMod = await loadTheme(themeName);
  const ThemeLayout = themeMod.components.layout;

  if (!ThemeLayout) {
    return <>{children}</>;
  }

  return (
    <ThemeLayout contentWidth={contentWidth} theme={theme} font={themeMod.manifest.font}>
      <PageViewBeacon />
      {children}
    </ThemeLayout>
  );
}
