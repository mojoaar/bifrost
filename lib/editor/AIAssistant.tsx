/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useState, useRef, useEffect } from "react";

interface Action {
  id: string;
  label: string;
}

interface Model {
  provider: string;
  model: string;
}

interface Props {
  content: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
}

export default function AIAssistant({ content, onInsert, onReplace }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("improve");
  const [provider, setProvider] = useState("");
  const [actions, setActions] = useState<Action[]>([]);
  const [providers, setProviders] = useState<Model[]>([]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/ai/models");
        if (!res.ok) return;
        const body = await res.json();
        setActions(body.data?.actions ?? []);
        setProviders(body.data?.providers ?? []);
        if (body.data?.providers?.length > 0) {
          setProvider(body.data.providers[0].provider);
        }
      } catch {
        // silently fail
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleRun() {
    if (!content || loading) return;

    setOutput("");
    setLoading(true);

    try {
      const token = localStorage.getItem("bifrost_token");
      const res = await fetch("/api/v1/ai/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action,
          content,
          provider: provider || undefined,
          customPrompt: action === "custom" ? customPrompt : undefined,
        }),
      });

      if (!res.ok) {
        setOutput("Error: " + res.statusText);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullOutput = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as { token?: string; error?: string };
            if (parsed.error) {
              fullOutput += `\nError: ${parsed.error}`;
            } else if (parsed.token) {
              fullOutput += parsed.token;
            }
          } catch {
            // skip
          }
        }

        setOutput(fullOutput);
      }
    } catch (err) {
      setOutput("Error: " + (err instanceof Error ? err.message : "Unknown"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
      >
        {open ? "Close AI" : "AI Assist"}
      </button>

      {open && (
        <div className="absolute right-0 top-8 z-10 w-80 rounded border border-zinc-700 bg-zinc-900 p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2">
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="flex-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
            >
              {actions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>

            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-32 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
            >
              {providers.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.provider}
                </option>
              ))}
            </select>
          </div>

          {action === "custom" && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Custom instruction..."
              className="mb-3 w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs"
              rows={2}
            />
          )}

          <button
            onClick={handleRun}
            disabled={loading}
            className="mb-3 w-full rounded bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
          >
            {loading ? "Running..." : "Run"}
          </button>

          {output && (
            <div className="space-y-2">
              <pre
                ref={outputRef}
                className="max-h-48 overflow-y-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300 whitespace-pre-wrap"
              >
                {output}
              </pre>

              <div className="flex gap-2">
                <button
                  onClick={() => onInsert(output)}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  Insert at cursor
                </button>
                <button
                  onClick={() => onReplace(output)}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  Replace all
                </button>
                <button
                  onClick={() => setOutput("")}
                  className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
