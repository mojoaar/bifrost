/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { X } from "lucide-react";
import { Field } from "@/themes/bifrost-terminal/components/ui/Input";

export interface TagItem {
  id: string;
  name: string;
}

export function TagInput({
  selected,
  onChange,
}: {
  selected: TagItem[];
  onChange: (tags: TagItem[]) => void;
}) {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/tags")
      .then((r) => r.json())
      .then((body) => {
        if (!cancelled && body.data) setAllTags(body.data as TagItem[]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((t) => t.id)), [selected]);

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allTags
      .filter((t) => !selectedIds.has(t.id) && (!q || t.name.toLowerCase().includes(q)))
      .slice(0, 20);
  }, [allTags, query, selectedIds]);

  function addTag(tag: TagItem) {
    onChange([...selected, tag]);
    setQuery("");
    setOpen(false);
  }

  function removeTag(id: string) {
    onChange(selected.filter((t) => t.id !== id));
  }

  return (
    <Field label="Tags">
      <div ref={wrapperRef} className="relative">
        <div className="flex min-h-[2.375rem] flex-wrap items-center gap-1 rounded-md border border-border bg-bg-1 px-2 py-1 transition focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
          {selected.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-xs text-accent"
            >
              {tag.name}
              <button
                type="button"
                onClick={() => removeTag(tag.id)}
                className="text-text-muted hover:text-danger"
              >
                <X size={12} />
              </button>
            </span>
          ))}
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={selected.length === 0 ? "Add tags..." : ""}
            className="min-w-[8rem] flex-1 bg-transparent px-1 py-0.5 text-sm text-text-1 outline-none placeholder:text-text-muted"
          />
        </div>
        {open && suggestions.length > 0 && (
          <div className="absolute left-0 top-full z-30 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-border bg-bg-1 shadow-lg">
            {suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => addTag(tag)}
                className="w-full px-3 py-1.5 text-left text-sm text-text-1 hover:bg-bg-2"
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </Field>
  );
}
