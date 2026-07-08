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
import {
  Sparkles,
  Wand2,
  Replace,
  TextCursorInput,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Select } from "@/themes/bifrost-terminal/components/ui/Input";

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
  className?: string;
}

export default function AIAssistant({ content, onInsert, onReplace, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState("improve");
  const [provider, setProvider] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [providers, setProviders] = useState<Model[]>([]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const outputRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/v1/ai/models");
        if (!res.ok) return;
        const body = await res.json();
        if (cancelled) return;
        setEnabled(body.data?.enabled === true);
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
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  async function handleRun() {
    if (!content || loading) return;

    setOutput("");
    setError("");
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
        setError(`Error: ${res.status} ${res.statusText}`);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setError("No response stream");
        return;
      }

      const decoder = new TextDecoder();
      let fullOutput = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

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
            // skip unparseable chunks
          }
        }

        setOutput(fullOutput);
      }

      if (buffer.trim().startsWith("data: ")) {
        const data = buffer.trim().slice(6);
        if (data && data !== "[DONE]") {
          try {
            const parsed = JSON.parse(data) as { token?: string };
            if (parsed.token) fullOutput += parsed.token;
            setOutput(fullOutput);
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  if (!enabled) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant={open ? "primary" : "ghost"}
        size="md"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label="AI assist"
        className={className}
      >
        <Sparkles size={14} />
        <span>{open ? "Close AI" : "AI Assist"}</span>
      </Button>
      {open && (
        <div className="absolute right-0 top-10 z-20 w-96 rounded-md border border-border bg-bg-1 p-4 shadow-lg">
          <div className="mb-3 flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-text-3">
            <Sparkles size={12} className="text-accent" />
            <span>AI Assistant</span>
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2">
            <Select value={action} onChange={(e) => setAction(e.target.value)}>
              {actions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </Select>
            <Select value={provider} onChange={(e) => setProvider(e.target.value)}>
              {providers.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.provider}
                </option>
              ))}
            </Select>
          </div>

          {action === "custom" && (
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Custom instruction..."
              rows={2}
              className="mb-3 w-full rounded-md border border-border bg-bg-0 px-3 py-2 text-sm text-text-1 placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          )}

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleRun}
            disabled={loading || !content}
            className="mb-3 w-full"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
            <span>{loading ? "Running…" : "Run"}</span>
          </Button>

          {error && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {output && (
            <div className="space-y-2">
              <pre
                ref={outputRef}
                className="max-h-48 overflow-y-auto rounded-md border border-border bg-bg-0 p-3 font-mono text-xs text-text-1 whitespace-pre-wrap scrollbar-themed"
              >
                {output}
              </pre>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onInsert(output)}>
                  <TextCursorInput size={12} />
                  <span>Insert</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onReplace(output)}>
                  <Replace size={12} />
                  <span>Replace</span>
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOutput("")}>
                  <Trash2 size={12} />
                  <span>Discard</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
