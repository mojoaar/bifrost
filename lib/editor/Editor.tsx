/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useRef } from "react";
import { EditorView, keymap, lineNumbers, type KeyBinding } from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { defaultKeymap } from "@codemirror/commands";
import { bifrostTheme } from "./theme";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onViewReady?: (view: EditorView) => void;
}

const boldBinding: KeyBinding = {
  key: "Mod-b",
  run: ({ state, dispatch }) => {
    const { from, to } = state.selection.main;
    const text = state.sliceDoc(from, to);
    dispatch(
      state.update({
        changes: { from, to, insert: `**${text}**` },
        selection: { anchor: from + 2, head: from + 2 + text.length },
      })
    );
    return true;
  },
};

const italicBinding: KeyBinding = {
  key: "Mod-i",
  run: ({ state, dispatch }) => {
    const { from, to } = state.selection.main;
    const text = state.sliceDoc(from, to);
    dispatch(
      state.update({
        changes: { from, to, insert: `_${text}_` },
        selection: { anchor: from + 1, head: from + 1 + text.length },
      })
    );
    return true;
  },
};

export default function CodeMirrorEditor({ value, onChange, onViewReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        markdown({ base: markdownLanguage }),
        bifrostTheme,
        keymap.of([...defaultKeymap, boldBinding, italicBinding]),
        updateListener,
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;
    if (onViewReady) onViewReady(view);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once; value is synced by a separate effect
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentContent = view.state.doc.toString();
    if (value !== currentContent) {
      view.dispatch({
        changes: { from: 0, to: currentContent.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full" />;
}
