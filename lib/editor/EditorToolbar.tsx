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
  Heading2,
  Link as LinkIcon,
  Image as ImageIcon,
  List,
  Code2,
  Quote,
  type LucideIcon,
} from "lucide-react";

interface Props {
  getEditorView: () => import("@codemirror/view").EditorView | null;
  getSelection: () => string;
}

interface Tool {
  label: string;
  shortcut: string;
  icon: LucideIcon;
  wrap: (selection: string) => { prefix: string; suffix: string };
}

const TOOLS: Tool[] = [
  {
    label: "Bold",
    shortcut: "⌘B",
    icon: Bold,
    wrap: (s) => ({ prefix: "**" + s, suffix: "**" }),
  },
  {
    label: "Italic",
    shortcut: "⌘I",
    icon: Italic,
    wrap: (s) => ({ prefix: "_" + s, suffix: "_" }),
  },
  {
    label: "Heading",
    shortcut: "⌘H",
    icon: Heading2,
    wrap: (s) => ({ prefix: "\n## " + s, suffix: "" }),
  },
  {
    label: "Link",
    shortcut: "⌘K",
    icon: LinkIcon,
    wrap: (s) => ({ prefix: "[" + (s || "text") + "](", suffix: ")" }),
  },
  {
    label: "Image",
    shortcut: "⌘⇧I",
    icon: ImageIcon,
    wrap: (s) => ({ prefix: "![" + (s || "alt") + "](", suffix: ")" }),
  },
  {
    label: "List",
    shortcut: "⌘⇧L",
    icon: List,
    wrap: (s) => {
      const lines = s
        .split("\n")
        .filter(Boolean)
        .map((l) => "- " + l)
        .join("\n");
      return { prefix: lines || "- ", suffix: "" };
    },
  },
  {
    label: "Code",
    shortcut: "⌘E",
    icon: Code2,
    wrap: (s) => ({ prefix: s ? "\n```\n" + s + "\n```\n" : "\n```\n\n```\n", suffix: "" }),
  },
  {
    label: "Quote",
    shortcut: "⌘>",
    icon: Quote,
    wrap: (s) => ({ prefix: "\n> " + s, suffix: "" }),
  },
];

export default function EditorToolbar({ getEditorView, getSelection }: Props) {
  const apply = useCallback(
    (tool: Tool) => {
      const view = getEditorView();
      if (!view) return;

      const selection = getSelection();
      const { prefix, suffix } = tool.wrap(selection);

      view.dispatch({
        changes: {
          from: view.state.selection.main.from,
          to: view.state.selection.main.to,
          insert: prefix + suffix,
        },
        selection: selection
          ? {
              anchor: view.state.selection.main.from + prefix.length,
              head:
                view.state.selection.main.from +
                prefix.length +
                selection.length,
            }
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
