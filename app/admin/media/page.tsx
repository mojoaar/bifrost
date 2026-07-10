/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { UploadCloud, FileText, Image as ImageIcon, Copy, Check, Trash2 } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { ACCESS_TOKEN_KEY } from "@/lib/auth/constants";
import { thumbSrc } from "@/lib/media/srcset";

interface MediaItem {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  variants?: string | null;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const initialFetchDone = useRef(false);

  const fetchMedia = useCallback(async () => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    try {
      const res = await fetch("/api/v1/media", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();
      if (res.ok) setItems(body.data ?? []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialFetchDone.current) return;
    initialFetchDone.current = true;
    fetchMedia();
  }, [fetchMedia]);

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    try {
      const res = await fetch("/api/v1/media/upload", {
        method: "POST",
        headers: token ? { authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      if (res.ok) fetchMedia();
      else setError("Upload failed");
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    for (const file of Array.from(e.dataTransfer.files)) uploadFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    for (const file of Array.from(e.target.files ?? [])) uploadFile(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    await fetch(`/api/v1/media/${id}`, {
      method: "DELETE",
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    fetchMedia();
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Media</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> ls content/media/
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mb-6 flex flex-col items-center gap-2 rounded-md border-2 border-dashed p-10 text-center transition ${
          dragOver ? "border-accent bg-accent/5" : "border-border bg-bg-1"
        }`}
      >
        <UploadCloud size={28} className={dragOver ? "text-accent" : "text-text-3"} />
        <p className="font-mono text-sm text-text-2">
          {uploading ? "uploading…" : "drag and drop files here, or"}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="font-mono text-sm text-accent underline-offset-4 hover:underline disabled:opacity-50"
        >
          browse files
        </button>
        <input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden" />
      </div>

      {loading ? (
        <Card padding="md">
          <p className="font-mono text-sm text-text-3">loading…</p>
        </Card>
      ) : items.length === 0 ? (
        <Card padding="lg">
          <p className="text-center font-mono text-sm text-text-3">
            <span className="text-text-muted">$</span> no media yet
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="rounded-md border border-border bg-bg-1 p-3">
              {item.mimeType.startsWith("image/") ? (
                <img
                  src={thumbSrc(item.variants) ?? `/${item.path}`}
                  alt={item.filename}
                  className="mb-3 h-32 w-full rounded border border-border object-cover"
                />
              ) : (
                <div className="mb-3 flex h-32 items-center justify-center rounded border border-border bg-bg-0 text-text-muted">
                  {item.mimeType.startsWith("image/") ? <ImageIcon size={32} /> : <FileText size={32} />}
                </div>
              )}
              <p className="truncate font-mono text-xs text-text-2">{item.filename}</p>
              <p className="mt-0.5 font-mono text-xs text-text-3">{formatSize(item.sizeBytes)}</p>
              <div className="mt-3 flex items-center gap-3 font-mono text-xs">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`/${item.path}`);
                    setCopied(item.id);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  className="flex items-center gap-1 text-text-2 transition hover:text-text-1"
                >
                  {copied === item.id ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copied === item.id ? "copied" : "copy path"}</span>
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex items-center gap-1 text-text-3 transition hover:text-danger"
                >
                  <Trash2 size={12} />
                  <span>delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
