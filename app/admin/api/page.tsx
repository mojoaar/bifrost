/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Play, Copy, Check, Lock } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { useTheme } from "@/lib/themes/theme-context";
import { authFetch } from "@/lib/auth/client";
import {
  generateSamples,
  SAMPLE_LANGUAGES,
  type SampleLanguage,
} from "@/lib/api/samples";
import { highlightCode } from "@/lib/shiki-highlighter";

interface Param {
  name: string;
  in: "path" | "query";
  required?: boolean;
  schema?: { type?: string; default?: unknown };
}

interface Operation {
  key: string;
  method: string;
  path: string;
  summary: string;
  tag: string;
  secured: boolean;
  parameters: Param[];
  bodySchema?: Record<string, unknown>;
}

const METHOD_COLOR: Record<string, string> = {
  GET: "text-emerald-400 border-emerald-400/40",
  POST: "text-sky-400 border-sky-400/40",
  PUT: "text-amber-400 border-amber-400/40",
  DELETE: "text-red-400 border-red-400/40",
  PATCH: "text-violet-400 border-violet-400/40",
};

function methodBadge(method: string): string {
  return METHOD_COLOR[method] ?? "text-text-2 border-border";
}

function exampleFromSchema(schema: Record<string, unknown> | undefined): unknown {
  if (!schema) return undefined;
  const type = schema.type as string | undefined;
  if (Array.isArray(schema.enum) && schema.enum.length) return schema.enum[0];
  if (type === "object" || schema.properties) {
    const props = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;
    const out: Record<string, unknown> = {};
    for (const [name, sub] of Object.entries(props)) {
      out[name] = exampleFromSchema(sub);
    }
    return out;
  }
  if (type === "array") return [];
  if (type === "integer" || type === "number") return 0;
  if (type === "boolean") return false;
  return "";
}

function parseSpec(spec: Record<string, unknown>): Operation[] {
  const paths = (spec.paths ?? {}) as Record<string, Record<string, Record<string, unknown>>>;
  const ops: Operation[] = [];
  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, raw] of Object.entries(methods)) {
      const op = raw as Record<string, unknown>;
      const tags = (op.tags as string[]) ?? ["Other"];
      const body = op.requestBody as
        | { content?: Record<string, { schema?: Record<string, unknown> }> }
        | undefined;
      const bodySchema = body?.content?.["application/json"]?.schema;
      ops.push({
        key: `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        path,
        summary: (op.summary as string) ?? "",
        tag: tags[0] ?? "Other",
        secured: Array.isArray(op.security) && op.security.length > 0,
        parameters: ((op.parameters as Param[]) ?? []).filter(
          (p) => p.in === "path" || p.in === "query"
        ),
        bodySchema,
      });
    }
  }
  return ops;
}

export default function ApiExplorerPage() {
  const { mode } = useTheme();
  const [ops, setOps] = useState<Operation[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pathValues, setPathValues] = useState<Record<string, string>>({});
  const [queryValues, setQueryValues] = useState<Record<string, string>>({});
  const [bodyText, setBodyText] = useState("");
  const [authMode, setAuthMode] = useState<"session" | "apikey">("session");
  const [apiKey, setApiKey] = useState("");
  const [lang, setLang] = useState<SampleLanguage>("curl");
  const [highlighted, setHighlighted] = useState("");
  const [copied, setCopied] = useState(false);
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<{
    status: number;
    timeMs: number;
    body: string;
  } | null>(null);

  const selectOperation = useCallback((op: Operation) => {
    setSelectedKey(op.key);
    setPathValues({});
    setQueryValues({});
    setResponse(null);
    setBodyText(op.bodySchema ? JSON.stringify(exampleFromSchema(op.bodySchema), null, 2) : "");
  }, []);

  useEffect(() => {
    fetch("/api/v1/openapi.json")
      .then((r) => r.json())
      .then((spec) => {
        const parsed = parseSpec(spec);
        setOps(parsed);
        if (parsed[0]) selectOperation(parsed[0]);
      })
      .catch(() => setOps([]));
  }, [selectOperation]);

  const selected = useMemo(
    () => ops.find((o) => o.key === selectedKey) ?? null,
    [ops, selectedKey]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Operation[]>();
    for (const op of ops) {
      if (!map.has(op.tag)) map.set(op.tag, []);
      map.get(op.tag)!.push(op);
    }
    return [...map.entries()];
  }, [ops]);

  const buildRequest = useCallback(() => {
    if (!selected) return null;
    let path = selected.path;
    for (const p of selected.parameters.filter((x) => x.in === "path")) {
      path = path.replace(`{${p.name}}`, encodeURIComponent(pathValues[p.name] ?? `{${p.name}}`));
    }
    const qs = new URLSearchParams();
    for (const p of selected.parameters.filter((x) => x.in === "query")) {
      const v = queryValues[p.name];
      if (v) qs.set(p.name, v);
    }
    const query = qs.toString();
    const rel = `/api/v1${path}${query ? `?${query}` : ""}`;
    const headers: Record<string, string> = {};
    const hasBody = selected.method !== "GET" && bodyText.trim().length > 0;
    if (hasBody) headers["Content-Type"] = "application/json";
    if (selected.secured) {
      const token = authMode === "apikey" ? apiKey || "bfk_YOUR_API_KEY" : "YOUR_ACCESS_TOKEN";
      headers["Authorization"] = `Bearer ${token}`;
    }
    return { rel, headers, body: hasBody ? bodyText : undefined };
  }, [selected, pathValues, queryValues, bodyText, authMode, apiKey]);

  const samples = useMemo(() => {
    const req = buildRequest();
    if (!selected || !req) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return generateSamples({
      method: selected.method,
      url: `${origin}${req.rel}`,
      headers: req.headers,
      body: req.body,
    });
  }, [selected, buildRequest]);

  useEffect(() => {
    if (!samples) return;
    const shikiLang = SAMPLE_LANGUAGES.find((l) => l.id === lang)?.shiki ?? "bash";
    let cancelled = false;
    highlightCode(samples[lang], shikiLang, mode)
      .then((html) => {
        if (!cancelled) setHighlighted(html);
      })
      .catch(() => {
        if (!cancelled) setHighlighted(`<pre>${samples[lang]}</pre>`);
      });
    return () => {
      cancelled = true;
    };
  }, [samples, lang, mode]);

  const send = useCallback(async () => {
    if (!selected) return;
    const req = buildRequest();
    if (!req) return;
    setSending(true);
    setResponse(null);
    const started = performance.now();
    try {
      const init: RequestInit = { method: selected.method };
      const headers: Record<string, string> = {};
      if (req.body) headers["Content-Type"] = "application/json";
      if (selected.secured && authMode === "apikey") {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
      init.headers = headers;
      if (req.body) init.body = req.body;
      const doFetch =
        selected.secured && authMode === "session" ? authFetch : fetch;
      const res = await doFetch(req.rel, init);
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        /* keep raw */
      }
      setResponse({
        status: res.status,
        timeMs: Math.round(performance.now() - started),
        body: pretty,
      });
    } catch (err) {
      setResponse({
        status: 0,
        timeMs: Math.round(performance.now() - started),
        body: err instanceof Error ? err.message : "Request failed",
      });
    } finally {
      setSending(false);
    }
  }, [selected, buildRequest, authMode, apiKey]);

  const copySample = useCallback(() => {
    if (!samples) return;
    navigator.clipboard.writeText(samples[lang]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [samples, lang]);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h1 className="font-mono text-lg font-semibold text-text-1">API Explorer</h1>
        <p className="text-sm text-text-3">
          Interactive reference for the Bifröst REST API.{" "}
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Open Swagger ↗
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[16rem_1fr]">
        <Card padding="sm" className="h-fit md:sticky md:top-4">
          <nav className="flex flex-col gap-3">
            {grouped.map(([tag, list]) => (
              <div key={tag}>
                <div className="mb-1 px-1 font-mono text-xs uppercase tracking-wider text-text-muted">
                  {tag}
                </div>
                <div className="flex flex-col gap-0.5">
                  {list.map((op) => (
                    <button
                      key={op.key}
                      onClick={() => selectOperation(op)}
                      className={`flex items-center gap-2 rounded px-2 py-1 text-left text-xs transition hover:bg-bg-1 ${
                        op.key === selectedKey ? "bg-bg-2" : ""
                      }`}
                    >
                      <span
                        className={`w-12 shrink-0 rounded border px-1 text-center font-mono text-[10px] ${methodBadge(
                          op.method
                        )}`}
                      >
                        {op.method}
                      </span>
                      <span className="truncate text-text-2">{op.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {selected && (
            <>
              <Card padding="md">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded border px-2 py-0.5 font-mono text-xs ${methodBadge(
                      selected.method
                    )}`}
                  >
                    {selected.method}
                  </span>
                  <code className="font-mono text-sm text-text-1">/api/v1{selected.path}</code>
                  {selected.secured && (
                    <span className="ml-auto flex items-center gap-1 text-xs text-text-muted">
                      <Lock size={12} /> auth
                    </span>
                  )}
                </div>
                {selected.summary && (
                  <p className="mt-2 text-sm text-text-3">{selected.summary}</p>
                )}
              </Card>

              {selected.secured && (
                <Card padding="md">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Authorization">
                      <Select
                        value={authMode}
                        onChange={(e) =>
                          setAuthMode(e.target.value as "session" | "apikey")
                        }
                      >
                        <option value="session">Current session</option>
                        <option value="apikey">API key</option>
                      </Select>
                    </Field>
                    {authMode === "apikey" && (
                      <Field label="API key">
                        <Input
                          type="password"
                          placeholder="bfk_…"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                        />
                      </Field>
                    )}
                  </div>
                </Card>
              )}

              {selected.parameters.length > 0 && (
                <Card padding="md">
                  <div className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
                    Parameters
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selected.parameters.map((p) => (
                      <Field
                        key={`${p.in}-${p.name}`}
                        label={`${p.name}${p.required ? " *" : ""} (${p.in})`}
                      >
                        <Input
                          value={
                            p.in === "path"
                              ? pathValues[p.name] ?? ""
                              : queryValues[p.name] ?? ""
                          }
                          placeholder={p.schema?.default != null ? String(p.schema.default) : ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            if (p.in === "path")
                              setPathValues((s) => ({ ...s, [p.name]: v }));
                            else setQueryValues((s) => ({ ...s, [p.name]: v }));
                          }}
                        />
                      </Field>
                    ))}
                  </div>
                </Card>
              )}

              {selected.bodySchema && (
                <Card padding="md">
                  <div className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
                    Request body
                  </div>
                  <textarea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    spellCheck={false}
                    rows={Math.min(16, Math.max(4, bodyText.split("\n").length))}
                    className="w-full rounded-md border border-border bg-bg-1 p-3 font-mono text-xs text-text-1 outline-none focus:border-border-strong"
                  />
                </Card>
              )}

              <div className="flex items-center gap-3">
                <Button onClick={send} disabled={sending}>
                  <Play size={14} /> {sending ? "Sending…" : "Send"}
                </Button>
                {response && (
                  <span className="font-mono text-xs text-text-3">
                    <span
                      className={
                        response.status >= 200 && response.status < 300
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {response.status || "ERR"}
                    </span>{" "}
                    · {response.timeMs}ms
                  </span>
                )}
              </div>

              {response && (
                <Card padding="md">
                  <div className="mb-2 font-mono text-xs uppercase tracking-wider text-text-muted">
                    Response
                  </div>
                  <pre className="max-h-96 overflow-auto rounded-md border border-border bg-bg-1 p-3 font-mono text-xs text-text-1">
                    {response.body}
                  </pre>
                </Card>
              )}

              <Card padding="md">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-1">
                    {SAMPLE_LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => setLang(l.id)}
                        className={`rounded px-2 py-1 font-mono text-xs transition ${
                          l.id === lang
                            ? "bg-bg-2 text-text-1"
                            : "text-text-3 hover:text-text-1"
                        }`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={copySample}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-text-3 transition hover:text-text-1"
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div
                  className="api-sample max-h-96 overflow-auto rounded-md border border-border text-xs [&_pre]:m-0 [&_pre]:p-3"
                  dangerouslySetInnerHTML={{ __html: highlighted }}
                />
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
