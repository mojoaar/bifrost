/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  ListOrdered,
  Code2,
  Quote,
  Strikethrough,
  Minus,
  Table as TableIcon,
  Smile,
  Search,
  type LucideIcon,
} from "lucide-react";
import { DynamicIcon, iconNames, type IconName } from "lucide-react/dynamic";
import type { EditorView } from "@codemirror/view";

interface Props {
  getEditorView: () => EditorView | null;
  getSelection: () => string;
}

type ToolAction =
  | { kind: "wrap"; prefix: string; suffix: string }
  | { kind: "linePrefix"; prefix: string }
  | { kind: "insert"; text: string };

interface Tool {
  label: string;
  shortcut: string;
  icon: LucideIcon;
  action: ToolAction;
}

function wrap(prefix: string, suffix: string) {
  return { kind: "wrap" as const, prefix, suffix };
}

function linePrefix(prefix: string) {
  return { kind: "linePrefix" as const, prefix };
}

const TOOLS: Tool[] = [
  {
    label: "Bold",
    shortcut: "⌘B",
    icon: Bold,
    action: wrap("**", "**"),
  },
  {
    label: "Italic",
    shortcut: "⌘I",
    icon: Italic,
    action: wrap("_", "_"),
  },
  {
    label: "Strikethrough",
    shortcut: "⌘⇧X",
    icon: Strikethrough,
    action: wrap("~~", "~~"),
  },
  {
    label: "Heading 1",
    shortcut: "⌘⌥1",
    icon: Heading1,
    action: linePrefix("# "),
  },
  {
    label: "Heading 2",
    shortcut: "⌘⌥2",
    icon: Heading2,
    action: linePrefix("## "),
  },
  {
    label: "Heading 3",
    shortcut: "⌘⌥3",
    icon: Heading3,
    action: linePrefix("### "),
  },
  {
    label: "Link",
    shortcut: "⌘K",
    icon: LinkIcon,
    action: wrap("[", "](https://)"),
  },
  {
    label: "Image",
    shortcut: "⌘⇧I",
    icon: ImageIcon,
    action: wrap("![", "](https://)"),
  },
  {
    label: "Unordered List",
    shortcut: "⌘⇧U",
    icon: List,
    action: linePrefix("- "),
  },
  {
    label: "Ordered List",
    shortcut: "⌘⇧O",
    icon: ListOrdered,
    action: linePrefix("1. "),
  },
  {
    label: "Code",
    shortcut: "⌘E",
    icon: Code2,
    action: { kind: "insert" as const, text: "\n```\n\n```\n" },
  },
  {
    label: "Quote",
    shortcut: "⌘>",
    icon: Quote,
    action: linePrefix("> "),
  },
  {
    label: "Table",
    shortcut: "⌘⇧T",
    icon: TableIcon,
    action: {
      kind: "insert" as const,
      text:
        "\n| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n| Cell | Cell | Cell |\n| Cell | Cell | Cell |\n",
    },
  },
  {
    label: "Horizontal Rule",
    shortcut: "⌘⇧H",
    icon: Minus,
    action: { kind: "insert" as const, text: "\n---\n" },
  },
];

const HEADING_RE = /^(#{1,6}\s+)/;

export default function EditorToolbar({ getEditorView, getSelection }: Props) {
  const apply = useCallback(
    (tool: Tool) => {
      const view = getEditorView();
      if (!view) return;

      const { state } = view;
      const sel = state.selection.main;
      const selection = getSelection();
      const doc = state.doc.toString();

      if (tool.action.kind === "insert") {
        view.dispatch({
          changes: { from: sel.from, to: sel.to, insert: tool.action.text },
          selection:
            tool.action.text.includes("\n```\n\n```\n")
              ? {
                  anchor: sel.from + tool.action.text.indexOf("\n```\n") + 5,
                  head: sel.from + tool.action.text.lastIndexOf("\n```\n"),
                }
              : undefined,
        });
        view.focus();
        return;
      }

      if (tool.action.kind === "linePrefix") {
        const lineStart = doc.lastIndexOf("\n", sel.from - 1) + 1;
        const lineEndIdx = doc.indexOf("\n", sel.from);
        const lineEnd = lineEndIdx === -1 ? doc.length : lineEndIdx;
        const lineText = doc.slice(lineStart, lineEnd);
        const isAlreadyHeading = HEADING_RE.test(lineText);
        const isAlreadyThisHeading = lineText.startsWith(tool.action.prefix);

        if (isAlreadyThisHeading) {
          view.dispatch({
            changes: { from: lineStart, to: lineStart + tool.action.prefix.length, insert: "" },
            selection: { anchor: lineEnd - tool.action.prefix.length },
          });
        } else if (isAlreadyHeading) {
          const existing = lineText.match(HEADING_RE);
          const existingLen = existing ? existing[0].length : 0;
          view.dispatch({
            changes: { from: lineStart, to: lineStart + existingLen, insert: tool.action.prefix },
            selection: { anchor: lineEnd - existingLen + tool.action.prefix.length },
          });
        } else {
          view.dispatch({
            changes: { from: lineStart, to: lineStart, insert: tool.action.prefix },
            selection: { anchor: lineEnd + tool.action.prefix.length },
          });
        }
        view.focus();
        return;
      }

      const { prefix, suffix } = tool.action;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: prefix + selection + suffix },
        selection: {
          anchor: sel.from + prefix.length,
          head: sel.from + prefix.length + selection.length,
        },
      });
      view.focus();
    },
    [getEditorView, getSelection]
  );

  const insertText = useCallback(
    (text: string) => {
      const view = getEditorView();
      if (!view) return;
      const sel = view.state.selection.main;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: text },
        selection: { anchor: sel.from + text.length },
      });
      view.focus();
    },
    [getEditorView]
  );

  return (
    <div className="relative flex flex-wrap gap-0.5 border-b border-border bg-bg-1 px-2 py-1">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.label}
            onClick={() => apply(tool)}
            title={`${tool.label} (${tool.shortcut})`}
            aria-label={tool.label}
            className="rounded-md p-1.5 text-text-2 transition hover:bg-bg-2 hover:text-text-1"
          >
            <Icon size={14} />
          </button>
        );
      })}
      <IconPicker onInsert={(name) => insertText(`:icon[${name}]`)} />
    </div>
  );
}

const ALL_ICON_NAMES = iconNames as IconName[];
const MAX_RESULTS = 60;

function IconPicker({ onInsert }: { onInsert: (name: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = q ? ALL_ICON_NAMES.filter((n) => n.includes(q)) : ALL_ICON_NAMES;
    return source.slice(0, MAX_RESULTS);
  }, [query]);

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Insert icon"
        aria-label="Insert icon"
        aria-expanded={open}
        className="rounded-md p-1.5 text-text-2 transition hover:bg-bg-2 hover:text-text-1"
      >
        <Smile size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-border bg-bg-1 p-2 shadow-lg">
          <div className="relative mb-2">
            <Search
              size={14}
              className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-3"
            />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icons…"
              className="w-full rounded-md border border-border bg-bg-0 py-1.5 pl-7 pr-2 text-sm text-text-1 outline-none focus:border-accent"
            />
          </div>
          {results.length === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-text-3">No icons found</p>
          ) : (
            <div className="grid max-h-56 grid-cols-6 gap-1 overflow-y-auto">
              {results.map((name) => (
                <button
                  key={name}
                  onClick={() => {
                    onInsert(name);
                    setOpen(false);
                    setQuery("");
                  }}
                  title={name}
                  aria-label={name}
                  className="flex items-center justify-center rounded-md p-2 text-text-2 transition hover:bg-bg-2 hover:text-accent"
                >
                  <DynamicIcon name={name} size={16} />
                </button>
              ))}
            </div>
          )}
          <p className="mt-2 px-1 text-[10px] text-text-3">
            Inserts <code>:icon[name]</code>
          </p>
        </div>
      )}
    </div>
  );
}
