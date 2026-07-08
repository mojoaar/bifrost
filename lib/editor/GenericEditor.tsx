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
import { defaultKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { bifrostTheme } from "./theme";

interface Props {
  value: string;
  onChange: (value: string) => void;
  fileName?: string;
}

function languageForFile(fileName: string) {
  if (/\.(tsx?|jsx?|mjs|cjs)$/i.test(fileName)) return javascript();
  if (/\.css$/i.test(fileName)) return css();
  return null;
}

export default function GenericEditor({ value, onChange, fileName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    });

    const lang = fileName ? languageForFile(fileName) : null;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        ...(lang ? [lang] : []),
        bifrostTheme,
        keymap.of(defaultKeymap as readonly KeyBinding[]),
        updateListener,
      ],
    });

    viewRef.current = new EditorView({
      state,
      parent: containerRef.current,
    });

    return () => {
      viewRef.current?.destroy();
    };
  }, []);

  useEffect(() => {
    if (!viewRef.current) return;
    const current = viewRef.current.state.doc.toString();
    if (current !== value) {
      viewRef.current.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return <div ref={containerRef} className="h-full" />;
}
