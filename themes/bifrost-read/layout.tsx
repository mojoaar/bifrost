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

const WIDTH_MAP: Record<string, string> = {
  narrow: "max-w-2xl",
  wide: "max-w-5xl",
};

export default function ReadLayout({
  children,
  contentWidth,
  theme,
  font,
}: {
  children: React.ReactNode;
  contentWidth?: string;
  theme?: string;
  font?: string;
}) {
  const widthClass = WIDTH_MAP[contentWidth ?? ""] ?? "max-w-3xl";
  return (
    <ThemeProvider initialMode={theme === "light" ? "light" : "dark"}>
      <div
        className="flex min-h-screen flex-col bg-bg-0 text-text-1"
        style={font ? ({ "--font-body": font } as React.CSSProperties) : undefined}
      >
        <Header widthClass={widthClass} />
        <main className={`mx-auto w-full flex-1 ${widthClass}`}>{children}</main>
        <footer className="border-t border-border bg-bg-1 py-8">
          <div className={`mx-auto px-4 ${widthClass}`}>
            <p className="text-center font-mono text-xs text-text-muted">
              Powered by{" "}
              <a
                href="https://github.com/mojoaar/bifrost"
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent transition hover:text-accent-hover"
              >
                Bifröst
              </a>
            </p>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
