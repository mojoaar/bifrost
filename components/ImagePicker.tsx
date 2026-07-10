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
import { Image as ImageIcon, X, UploadCloud } from "lucide-react";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { authFetch } from "@/lib/auth/client";
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

interface Props {
  value: string;
  onChange: (path: string) => void;
}

export default function ImagePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/v1/media", {
          headers: { authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY) ?? ""}` },
        });
        const body = await res.json();
        if (!cancelled) setItems(body.data ?? []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [open]);

  async function handleUpload(file: File) {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await authFetch("/api/v1/media/upload", { method: "POST", body: form });
      const body = await res.json();
      if (body.data) {
        setItems((prev) => [body.data, ...prev]);
        onChange(`/${body.data.path}`);
      }
    } catch {
      // silent
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  }

  function selectImage(path: string) {
    onChange(`/${path}`);
    setOpen(false);
  }

  function clearImage() {
    onChange("");
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {value ? (
          <div className="relative group">
            <img
              src={value}
              alt="Featured"
              className="h-[2.375rem] w-[2.375rem] rounded border border-border object-cover"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute -top-1.5 -right-1.5 rounded-full bg-danger p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
            >
              <X size={10} />
            </button>
          </div>
        ) : (
          <Button variant="ghost" size="md" type="button" onClick={() => setOpen(true)} className="h-[2.375rem]">
            <ImageIcon size={14} />
            <span>Featured image</span>
          </Button>
        )}
        {value && (
          <Button variant="ghost" size="md" type="button" onClick={() => setOpen(true)} className="h-[2.375rem]">
            Change
          </Button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-lg border border-border bg-bg-0 p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-sm font-semibold text-text-1">Featured Image</h3>
              <button type="button" onClick={() => setOpen(false)} className="text-text-3 hover:text-text-1">
                <X size={16} />
              </button>
            </div>

            <div
              className={`mb-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
                dragOver ? "border-accent bg-accent/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <UploadCloud size={24} className="text-text-3" />
              <p className="mt-2 text-xs text-text-3">Drop an image or click to upload</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-2"
              >
                {uploading ? "Uploading..." : "Choose file"}
              </Button>
            </div>

            {loading ? (
              <p className="font-mono text-xs text-text-3">loading…</p>
            ) : items.length === 0 ? (
              <p className="font-mono text-xs text-text-3">no media yet</p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {items.filter((i) => i.mimeType.startsWith("image/")).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectImage(item.path)}
                    className={`relative aspect-square overflow-hidden rounded-md border-2 transition ${
                      value === `/${item.path}` ? "border-accent" : "border-border hover:border-border-strong"
                    }`}
                  >
                    <img
                      src={thumbSrc(item.variants) ?? `/${item.path}`}
                      alt={item.filename}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
