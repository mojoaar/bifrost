/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { loadTheme } from "@/lib/themes/registry";

export default async function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  const theme = await loadTheme("default");
  const ThemeLayout = theme.components.layout;

  if (!ThemeLayout) {
    return <>{children}</>;
  }

  return <ThemeLayout>{children}</ThemeLayout>;
}
