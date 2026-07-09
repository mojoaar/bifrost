/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { type ReactNode, useState } from "react";
import dynamic from "next/dynamic";
import EditorToolbar from "@/lib/editor/EditorToolbar";
import type { EditorView } from "@codemirror/view";

const Editor = dynamic(() => import("@/lib/editor/Editor"), { ssr: false });
const Preview = dynamic(() => import("@/lib/editor/Preview"), { ssr: false });
const AIChatPanel = dynamic(() => import("@/components/AIChatPanel"), { ssr: false });

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
  const [rightPanel, setRightPanel] = useState<"preview" | "chat">("preview");

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4">
      {children}

      <div className="flex min-h-0 flex-1 overflow-hidden rounded-md border border-border">
        <div className="flex w-1/2 flex-col border-r border-border">
          <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
            <EditorToolbar getEditorView={getEditorView} getSelection={getSelection} />
            <div className="flex rounded-md border border-border bg-bg-1 p-0.5">
              <button
                onClick={() => setRightPanel("preview")}
                className={`rounded px-2.5 py-1 font-mono text-xs transition ${
                  rightPanel === "preview" ? "bg-bg-2 text-text-1" : "text-text-3 hover:text-text-1"
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setRightPanel("chat")}
                className={`rounded px-2.5 py-1 font-mono text-xs transition ${
                  rightPanel === "chat" ? "bg-bg-2 text-text-1" : "text-text-3 hover:text-text-1"
                }`}
              >
                AI Chat
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <Editor value={content} onChange={onChange} onViewReady={onViewReady} />
          </div>
        </div>
        <div className="w-1/2 bg-bg-0">
          {rightPanel === "preview" ? (
            <Preview source={content} />
          ) : (
            <AIChatPanel
              content={content}
              onInsert={(text) => {
                const view = getEditorView();
                if (view) {
                  const pos = view.state.selection.main.head;
                  view.dispatch({
                    changes: { from: pos, insert: text },
                  });
                } else {
                  onChange(content + text);
                }
              }}
              onReplace={onChange}
            />
          )}
        </div>
      </div>
    </div>
  );
}
