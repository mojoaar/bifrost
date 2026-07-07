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

interface Props {
  getEditorView: () => import("@codemirror/view").EditorView | null;
  getSelection: () => string;
}

interface Tool {
  label: string;
  icon: string;
  wrap: (selection: string) => { prefix: string; suffix: string };
}

const TOOLS: Tool[] = [
  {
    label: "Bold",
    icon: "B",
    wrap: (s) => ({ prefix: "**" + s, suffix: "**" }),
  },
  {
    label: "Italic",
    icon: "I",
    wrap: (s) => ({ prefix: "_" + s, suffix: "_" }),
  },
  {
    label: "Heading",
    icon: "H",
    wrap: (s) => ({ prefix: "\n## " + s, suffix: "" }),
  },
  {
    label: "Link",
    icon: "L",
    wrap: (s) => ({ prefix: "[" + (s || "text") + "](", suffix: ")" }),
  },
  {
    label: "Image",
    icon: "IMG",
    wrap: (s) => ({ prefix: "![" + (s || "alt") + "](", suffix: ")" }),
  },
  {
    label: "List",
    icon: "•",
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
    icon: "</>",
    wrap: (s) => ({ prefix: s ? "\n```\n" + s + "\n```\n" : "\n```\n\n```\n", suffix: "" }),
  },
  {
    label: "Quote",
    icon: '>"',
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
    <div className="flex flex-wrap gap-0.5 border-b border-zinc-700 bg-zinc-900 px-2 py-1">
      {TOOLS.map((tool) => (
        <button
          key={tool.label}
          onClick={() => apply(tool)}
          title={tool.label}
          className="rounded px-2 py-1 text-xs font-medium text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
        >
          {tool.icon}
        </button>
      ))}
    </div>
  );
}
