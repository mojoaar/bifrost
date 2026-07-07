/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Search } from "lucide-react";
import { ThemeProvider, useTheme } from "@/lib/themes/theme-context";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { CommandPaletteProvider, useCommandPalette } from "@/components/CommandPaletteProvider";
import { CommandPalette } from "@/components/CommandPalette";

interface NavItem {
  href: string;
  label: string;
  external?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/git", label: "Git" },
  { href: "/admin/themes", label: "Themes" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/api/docs", label: "API Explorer", external: true },
];

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    !item.external && (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href)));

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-md px-3 py-1.5 text-sm text-text-2 transition hover:bg-bg-1 hover:text-text-1"
      >
        {item.label} <span className="text-text-muted">↗</span>
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition ${
        isActive ? "bg-bg-2 text-text-1" : "text-text-2 hover:bg-bg-1 hover:text-text-1"
      }`}
    >
      {isActive && <span className="size-1.5 rounded-full bg-accent" />}
      {item.label}
    </Link>
  );
}

function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="rounded-md border border-border bg-bg-1 p-1.5 text-text-2 transition hover:border-border-strong hover:text-text-1"
      aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
    >
      {mode === "light" ? <Moon size={14} /> : <Sun size={14} />}
    </button>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-border bg-bg-1 p-4">
      <Link href="/admin" className="mb-6 flex items-center gap-2">
        <span className="font-mono text-base font-semibold text-text-1">
          <span className="text-accent">$</span> bifröst
        </span>
        <span className="rounded border border-border bg-bg-0 px-1.5 font-mono text-xs uppercase tracking-wider text-text-3">
          admin
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
      <div className="border-t border-border pt-3 font-mono text-xs text-text-muted">v1.0.0</div>
    </aside>
  );
}

function TopBar() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { open: openPalette } = useCommandPalette();
  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-bg-0/80 px-6 backdrop-blur">
      <div className="flex items-center">
        <span className="font-mono text-sm text-text-3">~</span>
        {segments.map((seg, i) => (
          <span key={i} className="font-mono text-sm">
            <span className="text-text-muted">/</span>
            <span className={i === segments.length - 1 ? "text-text-1" : "text-text-2"}>{seg}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={openPalette}
          className="font-mono text-xs"
          aria-label="Open command palette"
        >
          <Search size={12} />
          <span>search</span>
          <kbd className="ml-1 hidden rounded border border-border bg-bg-0 px-1 font-mono text-[10px] text-text-3 sm:inline">
            ⌘K
          </kbd>
        </Button>
        <ThemeToggle />
        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            const { logout } = await import("@/lib/auth/logout");
            await logout();
          }}
          className="font-mono text-xs"
        >
          logout
        </Button>
      </div>
    </header>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const initialMode: "light" | "dark" =
    typeof document !== "undefined" && document.documentElement.getAttribute("data-theme") === "light"
      ? "light"
      : "dark";

  return (
    <ThemeProvider initialMode={initialMode}>
      <CommandPaletteProvider>
        <div className="flex min-h-screen bg-bg-0 text-text-1">
          <Sidebar />
          <div className="flex min-h-screen flex-1 flex-col">
            <TopBar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
        <CommandPalette />
      </CommandPaletteProvider>
    </ThemeProvider>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
