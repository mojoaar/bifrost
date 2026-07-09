/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input, Select } from "@/themes/bifrost-terminal/components/ui/Input";
import { FONT_NAMES } from "@/lib/fonts/registry";
import { PALETTES } from "@/lib/themes/palettes";

interface Props {
  settings: Record<string, string>;
  setValue: (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  setSettings: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  applyPalette: (scheme: string | undefined) => void;
}

export function AppearanceSection({ settings, setValue, setSettings, applyPalette }: Props) {
  const toggle = (key: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setSettings((s) => ({ ...s, [key]: e.target.checked ? "true" : "false" }));

  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Appearance</div>
      <div className="space-y-3">
        <Field label="Default Theme Mode" helper="What first-time visitors see before they choose their own. The toggle in the header always overrides this.">
          <Select
            value={settings["appearance.theme_mode"] ?? "dark"}
            onChange={setValue("appearance.theme_mode")}
          >
            <option value="system">system</option>
            <option value="light">light</option>
            <option value="dark">dark</option>
          </Select>
        </Field>
        <Field
          label="Monospace Font"
          helper="JetBrains Mono, Fira Code, and Source Code Pro are bundled. Others fall back to system mono."
        >
          <Select
            value={settings["appearance.font_mono"] ?? FONT_NAMES[0]}
            onChange={setValue("appearance.font_mono")}
          >
            {FONT_NAMES.map((font) => (
              <option key={font} value={font}>{font}</option>
            ))}
          </Select>
        </Field>
        <Field label="Content Width" helper="Narrow 672px · Default 768px · Wide 896px">
          <Select
            value={settings["appearance.content_width"] ?? "default"}
            onChange={setValue("appearance.content_width")}
          >
            <option value="narrow">Narrow</option>
            <option value="default">Default</option>
            <option value="wide">Wide</option>
          </Select>
        </Field>
        <Field label="Posts per Page" helper="Number of posts on the homepage (1–100)">
          <Input
            type="number"
            min={1}
            max={100}
            value={settings["appearance.posts_per_page"] ?? "10"}
            onChange={setValue("appearance.posts_per_page")}
          />
        </Field>
        <Field label="Date Format" helper="US 12/31 · EU 31/12 · ISO 2026-12-31">
          <Select
            value={settings["appearance.date_format"] ?? "US"}
            onChange={setValue("appearance.date_format")}
          >
            <option value="US">US (M/D/Y)</option>
            <option value="EU">EU (D/M/Y)</option>
            <option value="ISO">ISO (Y-M-D)</option>
          </Select>
        </Field>
        <Field label="Time Format">
          <Select
            value={settings["appearance.time_format"] ?? "12h"}
            onChange={setValue("appearance.time_format")}
          >
            <option value="12h">12h (1:00 PM)</option>
            <option value="24h">24h (13:00)</option>
          </Select>
        </Field>
        <Field label="Color Scheme" helper="Choose a palette for both light and dark mode.">
          <Select
            value={settings["appearance.color_scheme"] ?? "default"}
            onChange={(e) => {
              setSettings((s) => ({ ...s, "appearance.color_scheme": e.target.value }));
              applyPalette(e.target.value);
            }}
          >
            {PALETTES.map((p) => (
              <option key={p.slug} value={p.slug}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_desc_in_title"] !== "false"}
            onChange={toggle("appearance.show_desc_in_title")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>Show description in page title</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_author"] !== "false"}
            onChange={toggle("appearance.show_author")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>Show author information on posts</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_author_bio"] !== "false"}
            onChange={toggle("appearance.show_author_bio")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>
            Show author bio on post pages
            <span className="ml-2 text-text-muted">(gated by &ldquo;Show author information&rdquo; above)</span>
          </span>
        </label>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_featured_images"] !== "false"}
            onChange={toggle("appearance.show_featured_images")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>Show featured images on posts</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_reading_time"] !== "false"}
            onChange={toggle("appearance.show_reading_time")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>Show reading time</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_reading_progress"] !== "false"}
            onChange={toggle("appearance.show_reading_progress")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>Show reading progress bar</span>
        </label>
        <label className="flex items-center gap-2 font-mono text-sm text-text-2">
          <input
            type="checkbox"
            checked={settings["appearance.show_related_posts"] !== "false"}
            onChange={toggle("appearance.show_related_posts")}
            className="size-4 rounded border-border bg-bg-1 text-accent focus:ring-2 focus:ring-accent/30"
          />
          <span>Show related posts</span>
        </label>
      </div>
    </Card>
  );
}
