/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { RefObject } from "react";
import { Upload, Trash2, User } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";

interface Props {
  avatarUrl: string | null;
  uploading: boolean;
  fileInput: RefObject<HTMLInputElement | null>;
  onAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAvatarRemove: () => void;
  displayName: string;
  setDisplayName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
}

export function ProfileSection({
  avatarUrl,
  uploading,
  fileInput,
  onAvatarChange,
  onAvatarRemove,
  displayName,
  setDisplayName,
  email,
  setEmail,
  bio,
  setBio,
  password,
  setPassword,
}: Props) {
  return (
    <>
      <Card padding="md">
        <div className="mb-4 font-mono text-xs uppercase tracking-wider text-text-3">Avatar</div>
        <div className="flex items-center gap-5">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-1">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar" className="size-full object-cover" />
            ) : (
              <User size={28} className="text-text-muted" />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={onAvatarChange}
              className="hidden"
            />
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={uploading}
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={14} />
                <span>{uploading ? "Uploading..." : "Upload image"}</span>
              </Button>
              {avatarUrl && (
                <Button type="button" variant="ghost" onClick={onAvatarRemove}>
                  <Trash2 size={14} />
                  <span>Remove</span>
                </Button>
              )}
            </div>
            <span className="font-mono text-xs text-text-muted">Displayed as a circle. PNG, JPG, GIF, or WebP.</span>
          </div>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Details</div>
        <div className="space-y-3">
          <Field label="Display Name">
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-mono" />
          </Field>
          <Field label="Bio" helper="A short description shown alongside your posts.">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell readers a little about yourself."
              className="w-full resize-y rounded-md border border-border bg-bg-1 px-3 py-2 text-sm text-text-1 transition placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            />
          </Field>
        </div>
      </Card>

      <Card padding="md">
        <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Security</div>
        <Field label="New Password" helper="Leave blank to keep your current password. Minimum 8 characters.">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="font-mono"
            autoComplete="new-password"
          />
        </Field>
      </Card>
    </>
  );
}
