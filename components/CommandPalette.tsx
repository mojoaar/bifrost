/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CornerDownLeft } from "lucide-react";
import { getCommands, type Command } from "@/lib/commands";
import { filter } from "@/lib/commands/fuzzy";
import { useCommandPalette } from "./CommandPaletteProvider";

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac/i.test(navigator.platform);
}

function scrollActiveIntoView(el: HTMLButtonElement | null) {
  if (el) el.scrollIntoView({ block: "nearest" });
}

export function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<Command[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [prevOpen, setPrevOpen] = useState(false);
  const mac = useMemo(() => isMac(), []);

  // Reset state on open transition (React docs: "Storing information from previous renders")
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      if (commands.length === 0) {
        setLoading(true);
        getCommands()
          .then((c) => setCommands(c))
          .finally(() => setLoading(false));
      }
    }
  }

  const filtered = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      return commands;
    }
    return filter(trimmed, commands, (c) => [c.label, ...(c.keywords ?? []), c.section]);
  }, [query, commands]);

  const displayIndex = Math.min(activeIndex, Math.max(0, filtered.length - 1));

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[displayIndex];
        if (cmd) {
          void cmd.perform();
          close();
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, filtered, activeIndex, displayIndex, close]);

  if (!isOpen) return null;

  const grouped = groupBySection(filtered);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-20 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-bg-0 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-border bg-bg-1 px-3 py-2">
          <Search size={14} className="text-text-3" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent text-sm text-text-1 placeholder:text-text-3 focus:outline-none"
            aria-label="Command search"
          />
          <kbd className="rounded border border-border bg-bg-0 px-1.5 font-mono text-[10px] text-text-3">
            ESC
          </kbd>
        </div>

        <div className="scrollbar-themed max-h-80 overflow-y-auto" role="listbox">
          {loading && (
            <div className="px-4 py-6 text-center font-mono text-xs text-text-3">loading…</div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="px-4 py-6 text-center font-mono text-xs text-text-3">
              no matches
            </div>
          )}
          {!loading &&
            grouped.map(([section, items]) => (
              <div key={section} className="py-1">
                <div className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-text-3">
                  {section}
                </div>
                {items.map((cmd) => {
                  const flatIndex = filtered.indexOf(cmd);
                  const isActive = flatIndex === displayIndex;
                  return (
                    <button
                      key={cmd.id}
                      type="button"
                      ref={isActive ? scrollActiveIntoView : undefined}
                      onClick={() => {
                        void cmd.perform();
                        close();
                      }}
                      onMouseEnter={() => setActiveIndex(flatIndex)}
                      className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm transition ${
                        isActive ? "bg-bg-2 text-text-1" : "text-text-2 hover:bg-bg-1"
                      }`}
                      role="option"
                      aria-selected={isActive}
                    >
                      <span className="flex-1 truncate">{cmd.label}</span>
                      {cmd.hint && (
                        <span className="font-mono text-xs text-text-3">{cmd.hint}</span>
                      )}
                      {cmd.shortcut && (
                        <kbd className="rounded border border-border bg-bg-0 px-1.5 font-mono text-[10px] text-text-3">
                          {cmd.shortcut}
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
        </div>

        <div className="flex items-center justify-between border-t border-border bg-bg-1 px-3 py-1.5 font-mono text-[10px] text-text-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-bg-0 px-1">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft size={10} />
              open
            </span>
          </div>
          <span>{mac ? "⌘K" : "Ctrl+K"} to toggle</span>
        </div>
      </div>
    </div>
  );
}

function groupBySection(cmds: Command[]): [string, Command[]][] {
  const map = new Map<string, Command[]>();
  for (const cmd of cmds) {
    const list = map.get(cmd.section) ?? [];
    list.push(cmd);
    map.set(cmd.section, list);
  }
  const order = ["Navigation", "Posts", "Actions"];
  return order
    .filter((s) => map.has(s))
    .map((s) => [s, map.get(s) ?? []] as [string, Command[]]);
}
