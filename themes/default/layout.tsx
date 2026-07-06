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

export default function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        <Footer />
      </div>
    </ThemeProvider>
  );
}
