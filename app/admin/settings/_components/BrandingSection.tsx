/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Trash2, Image as ImageIcon } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";

interface Props {
  settings: Record<string, string>;
  faviconUploading: boolean;
  faviconMessage: string;
  faviconVersion: number;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReset: () => void;
}

export function BrandingSection({
  settings,
  faviconUploading,
  faviconMessage,
  faviconVersion,
  onUpload,
  onReset,
}: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Branding</div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex size-16 items-center justify-center overflow-hidden rounded-md border border-border bg-bg-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={faviconVersion}
            src={`/icon?v=${faviconVersion}`}
            alt="Favicon preview"
            className="size-12 object-contain"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-bg-1 px-3 py-1.5 text-sm font-medium text-text-1 transition hover:bg-bg-2">
            <ImageIcon size={14} />
            <span>{faviconUploading ? "Uploading…" : "Upload favicon"}</span>
            <input
              type="file"
              accept=".svg,.png,.ico,.jpg,.jpeg,image/svg+xml,image/png,image/x-icon,image/vnd.microsoft.icon,image/jpeg"
              onChange={onUpload}
              disabled={faviconUploading}
              className="hidden"
            />
          </label>
          {settings["site.favicon_media_id"] && (
            <Button variant="ghost" type="button" onClick={onReset} disabled={faviconUploading}>
              <Trash2 size={14} />
              <span>Reset to default</span>
            </Button>
          )}
          {faviconMessage && (
            <span className={`font-mono text-xs ${faviconMessage.includes("fail") || faviconMessage.includes("Fail") ? "text-danger" : "text-success"}`}>
              {faviconMessage}
            </span>
          )}
        </div>
      </div>
      <p className="mt-3 font-mono text-xs text-text-3">
        SVG, PNG, ICO, or JPG. Used for browser tabs, bookmarks, and the installable app icon.
      </p>
    </Card>
  );
}
