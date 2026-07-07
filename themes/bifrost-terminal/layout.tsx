/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { ThemeProvider } from "@/lib/themes/theme-context";
import Header from "./components/Header";
import Footer from "./components/Footer";

const WIDTH_MAP: Record<string, string> = {
  narrow: "max-w-2xl",
  wide: "max-w-4xl",
};

export default function DefaultLayout({
  children,
  contentWidth,
}: {
  children: React.ReactNode;
  contentWidth?: string;
}) {
  const widthClass = WIDTH_MAP[contentWidth ?? ""] ?? "max-w-3xl";
  return (
    <ThemeProvider>
      <div className="flex min-h-screen flex-col bg-bg-0 text-text-1">
        <Header widthClass={widthClass} />
        <main className={`mx-auto w-full flex-1 px-4 py-8 ${widthClass}`}>{children}</main>
        <Footer widthClass={widthClass} />
      </div>
    </ThemeProvider>
  );
}
