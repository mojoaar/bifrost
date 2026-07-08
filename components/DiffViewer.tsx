/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

interface DiffLine {
  type: "add" | "remove" | "header" | "meta" | "context";
  text: string;
}

function parseDiff(diff: string): DiffLine[] {
  return diff.split("\n").map((line) => {
    if (line.startsWith("diff --git")) return { type: "header", text: line };
    if (line.startsWith("--- a/") || line.startsWith("+++ b/")) return { type: "meta", text: line };
    if (line.startsWith("+ ")) return { type: "add", text: line };
    if (line.startsWith("- ")) return { type: "remove", text: line };
    return { type: "context", text: line };
  });
}

export default function DiffViewer({ diff }: { diff: string }) {
  const lines = parseDiff(diff);

  return (
    <pre className="overflow-auto rounded border border-border bg-bg-1 p-4 font-mono text-xs leading-relaxed">
      {lines.map((line, i) => (
        <div
          key={i}
          className={
            line.type === "add"
              ? "bg-green-950/40 text-green-300"
              : line.type === "remove"
                ? "bg-red-950/40 text-red-300"
                : line.type === "header"
                  ? "font-bold text-accent"
                  : line.type === "meta"
                    ? "text-text-3"
                    : "text-text-2"
          }
        >
          {line.text}
        </div>
      ))}
    </pre>
  );
}
