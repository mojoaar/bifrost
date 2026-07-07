/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { EditorView } from "@codemirror/view";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

const theme = EditorView.theme(
  {
    "&": {
      color: "var(--text-1)",
      backgroundColor: "var(--code-bg)",
      height: "100%",
      fontFamily: "var(--font-mono)",
    },
    ".cm-content": {
      caretColor: "var(--accent)",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "var(--accent)",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
      {
        backgroundColor: "var(--accent-subtle)",
      },
    ".cm-gutters": {
      backgroundColor: "var(--code-bg)",
      color: "var(--text-muted)",
      border: "none",
      borderRight: "1px solid var(--code-border)",
    },
    ".cm-activeLineGutter": {
      backgroundColor: "var(--bg-1)",
      color: "var(--text-2)",
    },
    ".cm-activeLine": {
      backgroundColor: "var(--bg-1)",
    },
    ".cm-scroller": {
      overflow: "auto",
      fontFamily: "var(--font-mono)",
    },
  },
  { dark: false }
);

const highlightStyle = HighlightStyle.define([
  { tag: t.heading1, color: "var(--text-1)", fontWeight: "700" },
  { tag: t.heading2, color: "var(--text-1)", fontWeight: "700" },
  { tag: t.heading3, color: "var(--text-1)", fontWeight: "600" },
  { tag: t.heading4, color: "var(--text-1)", fontWeight: "600" },
  { tag: t.heading5, color: "var(--text-1)", fontWeight: "600" },
  { tag: t.heading6, color: "var(--text-1)", fontWeight: "600" },
  { tag: t.strong, color: "var(--text-1)", fontWeight: "700" },
  { tag: t.emphasis, color: "var(--text-1)", fontStyle: "italic" },
  { tag: t.link, color: "var(--accent)", textDecoration: "underline" },
  { tag: t.url, color: "var(--accent)" },
  { tag: t.monospace, color: "var(--accent)" },
  { tag: t.quote, color: "var(--text-3)", fontStyle: "italic" },
  { tag: t.list, color: "var(--text-1)" },
  { tag: t.processingInstruction, color: "var(--text-muted)" },
  { tag: t.contentSeparator, color: "var(--text-muted)" },
  { tag: t.meta, color: "var(--text-3)" },
  { tag: t.comment, color: "var(--text-muted)", fontStyle: "italic" },
  { tag: t.keyword, color: "var(--accent)" },
  { tag: t.string, color: "var(--success)" },
  { tag: t.number, color: "var(--warning)" },
  { tag: t.bool, color: "var(--warning)" },
  { tag: t.null, color: "var(--warning)" },
  { tag: t.operator, color: "var(--text-2)" },
  { tag: t.punctuation, color: "var(--text-2)" },
  { tag: t.bracket, color: "var(--text-2)" },
  { tag: t.variableName, color: "var(--text-1)" },
  { tag: t.typeName, color: "var(--accent)" },
  { tag: t.function(t.variableName), color: "var(--accent)" },
  { tag: t.tagName, color: "var(--danger)" },
  { tag: t.attributeName, color: "var(--warning)" },
  { tag: t.attributeValue, color: "var(--success)" },
  { tag: t.atom, color: "var(--warning)" },
  { tag: t.invalid, color: "var(--danger)" },
]);

export const bifrostTheme = [theme, syntaxHighlighting(highlightStyle)];
