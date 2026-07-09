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
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";

interface Props {
  settings: Record<string, string>;
  setValue: (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
}

export function SiteSection({ settings, setValue }: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Site</div>
      <div className="space-y-3">
        <Field label="Title">
          <Input value={settings["site.title"] ?? ""} onChange={setValue("site.title")} />
        </Field>
        <Field label="Description">
          <Input value={settings["site.description"] ?? ""} onChange={setValue("site.description")} />
        </Field>
        <Field label="Footer Text">
          <Input
            value={settings["site.footer_text"] ?? ""}
            onChange={setValue("site.footer_text")}
            placeholder="Powered by Bifröst"
          />
        </Field>
        <Field label="Site URL" helper="Used for RSS, sitemap, and canonical URLs.">
          <Input
            value={settings["site.url"] ?? ""}
            onChange={setValue("site.url")}
            placeholder="https://example.com"
            className="font-mono"
          />
        </Field>
        <Field label="Language" helper="HTML lang attribute and RSS language.">
          <Input
            value={settings["site.language"] ?? "en"}
            onChange={setValue("site.language")}
            placeholder="en"
            className="font-mono w-24"
          />
        </Field>
      </div>
    </Card>
  );
}
