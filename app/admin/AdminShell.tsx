/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, Moon, Search, Menu, X } from "lucide-react";
import { ThemeProvider, useTheme } from "@/lib/themes/theme-context";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { CommandPaletteProvider, useCommandPalette } from "@/components/CommandPaletteProvider";
import { CommandPalette } from "@/components/CommandPalette";
import { authFetch } from "@/lib/auth/client";
import { version } from "@/package.json";

interface NavItem {
  href: string;
  label: string;
  external?: boolean;
}

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/profile", label: "Profile" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/plugins", label: "Plugins" },
  { href: "/admin/themes", label: "Themes" },
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/git", label: "Git" },
  { href: "/admin/api", label: "API Explorer" },
];

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive =
    !item.external && (pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/")));

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
      onClick={onClick}
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

function Sidebar({
  navItems,
  mobileOpen,
  onClose,
}: {
  navItems: NavItem[];
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const aside = (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-border bg-bg-1 p-4">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-2" onClick={onClose}>
          <span className="font-mono text-base font-semibold text-text-1">
            <span className="text-accent">$</span> bifröst
          </span>
          <span className="rounded border border-border bg-bg-0 px-1.5 font-mono text-xs uppercase tracking-wider text-text-3">
            admin
          </span>
        </Link>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-text-2 transition hover:bg-bg-2 hover:text-text-1 md:hidden"
          aria-label="Close sidebar"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onClose} />
        ))}
      </nav>
      <div className="border-t border-border pt-3 font-mono text-xs text-text-muted">
        v{version}
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden md:block">{aside}</div>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed inset-y-0 left-0 z-50 w-60 transition-transform duration-200 md:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {aside}
      </div>
    </>
  );
}

function TopBar({ onMenuToggle }: { onMenuToggle: () => void }) {
  const { open } = useCommandPalette();
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-border bg-bg-0/80 px-4 md:px-6 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="rounded-md p-1 text-text-2 transition hover:bg-bg-2 hover:text-text-1 md:hidden"
          aria-label="Open sidebar"
        >
          <Menu size={18} />
        </button>
        <span className="font-mono text-sm text-text-3">~</span>
        {segments.map((seg, i) => (
          <span key={i} className="font-mono text-sm">
            <span className="text-text-muted">/</span>
            <span className={i === segments.length - 1 ? "text-text-1" : "text-text-2"}>{seg}</span>
          </span>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={open}
          className="rounded-md border border-border bg-bg-1 px-2 py-1 font-mono text-xs text-text-2 transition hover:border-border-strong hover:text-text-1"
        >
          <Search size={12} className="inline-block" /> Cmd+K
        </button>
        <ThemeToggle />
        <Button
          variant="ghost"
          onClick={() => {
            localStorage.removeItem("bifrost_token");
            window.location.href = "/login";
          }}
          className="font-mono text-xs"
        >
          logout
        </Button>
      </div>
    </header>
  );
}

export default function AdminShell({
  initialMode,
  children,
}: {
  initialMode: "light" | "dark";
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [navItems, setNavItems] = useState(NAV);
  const close = useCallback(() => setMobileOpen(false), []);
  const toggle = useCallback(() => setMobileOpen((p) => !p), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/v1/settings");
        const body = await res.json();
        const settings = body.data as Record<string, string> | undefined;
        if (settings && settings["git.enabled"] !== "true") {
          setNavItems(NAV.filter((item) => item.href !== "/admin/git"));
        }
      } catch {
        setNavItems(NAV.filter((item) => item.href !== "/admin/git"));
      }
    })();
  }, []);

  return (
    <ThemeProvider initialMode={initialMode}>
      <CommandPaletteProvider>
        <div className="flex min-h-screen bg-bg-0 text-text-1">
          <Sidebar navItems={navItems} mobileOpen={mobileOpen} onClose={close} />
          <div className="flex min-h-screen min-w-0 flex-1 flex-col">
            <TopBar onMenuToggle={toggle} />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
        <CommandPalette />
      </CommandPaletteProvider>
    </ThemeProvider>
  );
}
