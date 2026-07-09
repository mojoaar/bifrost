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

export function AnalyticsSection({ settings, setValue }: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Analytics</div>
      <Field label="Umami Website ID" helper="Optional. Leave blank to disable Umami tracking.">
        <Input
          value={settings["analytics.umami_website_id"] ?? ""}
          onChange={setValue("analytics.umami_website_id")}
          placeholder="a1b2c3d4-e5f6-..."
          className="font-mono"
        />
      </Field>
      <Field label="Umami Script URL" helper="Defaults to cloud.umami.is if left blank.">
        <Input
          value={settings["analytics.umami_script_url"] ?? ""}
          onChange={setValue("analytics.umami_script_url")}
          placeholder="https://cloud.umami.is/script.js"
          className="font-mono"
        />
      </Field>
      <Field label="Umami Domains" helper="Comma-separated. Optional — limits tracking to these domains.">
        <Input
          value={settings["analytics.umami_domains"] ?? ""}
          onChange={setValue("analytics.umami_domains")}
          placeholder="example.com,blog.example.com"
          className="font-mono"
        />
      </Field>
    </Card>
  );
}
