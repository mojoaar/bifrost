/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import EditorToolbar from "@/lib/editor/EditorToolbar";
import type { EditorView } from "@codemirror/view";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });

interface Props {
  content: string;
  onChange: (value: string) => void;
  onViewReady: (view: EditorView) => void;
  getEditorView: () => EditorView | null;
  getSelection: () => string;
  children?: ReactNode;
}

export default function AdminEditorShell({
  content,
  onChange,
  onViewReady,
  getEditorView,
  getSelection,
  children,
}: Props) {
  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      {children}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border">
        <div className="flex w-1/2 flex-col border-r border-border">
          <EditorToolbar getEditorView={getEditorView} getSelection={getSelection} />
          <div className="min-h-0 flex-1 overflow-auto">
            <Editor value={content} onChange={onChange} onViewReady={onViewReady} />
          </div>
        </div>
        <div className="w-1/2 bg-bg-0">
          <Preview source={content} />
        </div>
      </div>
    </div>
  );
}
