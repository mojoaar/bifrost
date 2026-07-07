/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useCallback } from "react";
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
  type LucideIcon,
} from "lucide-react";
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
          });
        } else if (isAlreadyHeading) {
          const existing = lineText.match(HEADING_RE);
          const existingLen = existing ? existing[0].length : 0;
          view.dispatch({
            changes: { from: lineStart, to: lineStart + existingLen, insert: tool.action.prefix },
          });
        } else {
          view.dispatch({
            changes: { from: lineStart, to: lineStart, insert: tool.action.prefix },
          });
        }
        view.focus();
        return;
      }

      const { prefix, suffix } = tool.action;
      view.dispatch({
        changes: { from: sel.from, to: sel.to, insert: prefix + suffix },
        selection: selection
          ? { anchor: sel.from + prefix.length, head: sel.from + prefix.length + selection.length }
          : undefined,
      });
      view.focus();
    },
    [getEditorView, getSelection]
  );

  return (
    <div className="flex flex-wrap gap-0.5 border-b border-border bg-bg-1 px-2 py-1">
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
    </div>
  );
}
