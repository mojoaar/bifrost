/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState, useRef } from "react";

interface MediaItem {
  id: string;
  filename: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export default function MediaPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const mounted = useRef(false);

  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    (async () => {
      const token = localStorage.getItem("bifrost_token");
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
    })();
  }, []);

  async function fetchMedia() {
    const token = localStorage.getItem("bifrost_token");
    try {
      const res = await fetch("/api/v1/media", {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const body = await res.json();
      if (res.ok) setItems(body.data ?? []);
    } catch {
      // silent
    }
  }

  async function uploadFile(file: File) {
    setUploading(true);
    setError("");
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(",")[1];
      const token = localStorage.getItem("bifrost_token");
      try {
        const res = await fetch("/api/v1/media/upload", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ filename: file.name, mimeType: file.type, base64Content: base64 }),
        });
        if (res.ok) fetchMedia();
        else setError("Upload failed");
      } catch {
        setError("Network error");
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    for (const file of files) uploadFile(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    for (const file of files) uploadFile(file);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this file?")) return;
    const token = localStorage.getItem("bifrost_token");
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
      <h2 className="mb-4 text-2xl font-semibold">Media</h2>
      {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`mb-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-zinc-400 bg-zinc-800" : "border-zinc-700"
        }`}
      >
        <p className="text-sm text-zinc-400">
          {uploading ? "Uploading..." : "Drag and drop files here, or"}
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-2 text-sm text-zinc-300 underline hover:text-zinc-100 disabled:opacity-50"
        >
          browse files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {loading ? (
        <p className="text-zinc-400">Loading...</p>
      ) : items.length === 0 ? (
        <p className="text-zinc-400">No media uploaded yet.</p>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="rounded border border-zinc-800 bg-zinc-900 p-3">
              {item.mimeType.startsWith("image/") ? (
                <img src={`/${item.path}`} alt={item.filename} className="mb-2 h-32 w-full rounded object-cover" />
              ) : (
                <div className="mb-2 flex h-32 items-center justify-center rounded bg-zinc-800 text-zinc-500 text-2xl">&#x1F4C4;</div>
              )}
              <p className="truncate text-xs text-zinc-400">{item.filename}</p>
              <p className="text-xs text-zinc-600">{formatSize(item.sizeBytes)}</p>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`/${item.path}`);
                    setCopied(item.id);
                    setTimeout(() => setCopied(null), 2000);
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-200"
                >
                  {copied === item.id ? "Copied!" : "Copy path"}
                </button>
                <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
