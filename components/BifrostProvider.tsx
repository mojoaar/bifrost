/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { createContext, type ReactNode } from "react";

export interface BifrostNavItem {
  slug: string;
  title: string;
}

export interface BifrostContextValue {
  site: {
    title: string;
    footerText: string | null;
  };
  settings: Record<string, string>;
  nav: BifrostNavItem[];
}

export const BifrostContext = createContext<BifrostContextValue | null>(null);

export function BifrostProvider({
  value,
  children,
}: {
  value: BifrostContextValue;
  children: ReactNode;
}) {
  return <BifrostContext.Provider value={value}>{children}</BifrostContext.Provider>;
}
