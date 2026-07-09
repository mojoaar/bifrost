/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { SOCIAL_PLATFORMS } from "@/lib/social";
import { SocialIcon } from "@/components/SocialIcon";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";

interface Props {
  socialLinks: Record<string, string>;
  setSocialLinks: (updater: (prev: Record<string, string>) => Record<string, string>) => void;
}

export function SocialLinksSection({ socialLinks, setSocialLinks }: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Social links</div>
      <p className="mb-4 font-mono text-xs text-text-muted">
        Full URLs to your profiles. Shown alongside your posts. Leave blank to hide.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SOCIAL_PLATFORMS.map((platform) => (
          <Field key={platform.key} label={platform.label}>
            <div className="flex items-center gap-2">
              <span className="text-text-3">
                <SocialIcon platform={platform.key} size={16} />
              </span>
              <Input
                type="url"
                value={socialLinks[platform.key] ?? ""}
                placeholder={platform.placeholder}
                onChange={(e) =>
                  setSocialLinks((prev) => ({ ...prev, [platform.key]: e.target.value }))
                }
                className="font-mono"
              />
            </div>
          </Field>
        ))}
      </div>
    </Card>
  );
}
