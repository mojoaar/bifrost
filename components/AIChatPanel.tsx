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
import { Send, Loader2, Copy, Check, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { authFetch } from "@/lib/auth/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Provider {
  provider: string;
  model: string;
}

interface Props {
  content: string;
  onInsert: (text: string) => void;
  onReplace: (text: string) => void;
}

export default function AIChatPanel({ content, onInsert, onReplace }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState("");
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await authFetch("/api/v1/ai/settings");
        const body = await res.json();
        const data = body.data ?? body;
        if (!data.enabled) return;
        const provs = Array.isArray(data.providers)
          ? data.providers.map((p: { name: string; model: string }) => ({
              provider: p.name,
              model: p.model,
            }))
          : [];
        setProviders(provs);
        if (data.defaultProvider) {
          setProvider(data.defaultProvider);
        } else if (provs.length > 0) {
          setProvider(provs[0].provider);
        }
      } catch {
        // silent
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !provider) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
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
          messages: [
            {
              role: "system",
              content: `You are an AI writing assistant helping the user edit their blog post. Here is the current post content:\n\n\`\`\`markdown\n${content}\n\`\`\`\n\nProvide helpful, concise advice about the post. When asked to write or edit, output clean markdown.`,
            },
            ...messages,
            userMsg,
          ],
          provider,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      let assistantContent = "";
      const assistantIdx = messages.length + 1;
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
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
            if (parsed.token) {
              assistantContent += parsed.token;
              setMessages((m) => {
                const next = [...m];
                next[assistantIdx] = { role: "assistant" as const, content: assistantContent };
                return next;
              });
            } else if (parsed.error) {
              assistantContent += `\nError: ${parsed.error}`;
            }
          } catch {
            // ignore malformed SSE
          }
        }
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err instanceof Error ? err.message : "Failed"}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function reset() {
    setMessages([]);
  }

  if (providers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-center text-sm text-text-muted">
          AI is not configured. Enable it in{" "}
          <Link href="/admin/plugins" className="text-accent hover:underline">Plugins</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <Select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-auto font-mono text-xs"
        >
          {providers.map((p) => (
            <option key={p.provider} value={p.provider}>
              {p.provider} ({p.model})
            </option>
          ))}
        </Select>
        <button
          onClick={reset}
          className="rounded p-1 text-text-muted transition hover:text-text-1"
          title="Clear chat"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-text-muted py-8">
            Ask questions about your post or request edits. The assistant has your full content as context.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
            <div
              className={`max-w-[85%] rounded-md px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-accent/15 text-text-1"
                  : "bg-bg-2 text-text-1"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
            {msg.role === "assistant" && msg.content && !loading && (
              <div className="mt-1 flex gap-1">
                <button
                  onClick={() => onInsert(msg.content)}
                  className="rounded px-1.5 py-0.5 font-mono text-xs text-text-3 transition hover:bg-bg-2 hover:text-text-1"
                  title="Insert at cursor"
                >
                  Insert
                </button>
                <button
                  onClick={() => onReplace(msg.content)}
                  className="rounded px-1.5 py-0.5 font-mono text-xs text-text-3 transition hover:bg-bg-2 hover:text-text-1"
                  title="Replace all content"
                >
                  Replace
                </button>
                <button
                  onClick={() => handleCopy(i, msg.content)}
                  className="rounded px-1.5 py-0.5 font-mono text-xs text-text-3 transition hover:bg-bg-2 hover:text-text-1"
                  title="Copy to clipboard"
                >
                  {copiedIdx === i ? <Check size={12} /> : <Copy size={12} />}
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-text-muted text-xs">
            <Loader2 size={14} className="animate-spin" />
            <span>Thinking…</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask about your post…"
            rows={2}
            className="flex-1 resize-none rounded-md border border-border bg-bg-1 px-3 py-2 font-mono text-sm text-text-1 placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
          <Button variant="primary" size="sm" onClick={handleSend} disabled={loading || !input.trim()} className="h-auto">
            <Send size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
