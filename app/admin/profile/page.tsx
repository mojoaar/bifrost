/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { Save, Upload, Trash2, User, Plus, X, Check, Copy, KeyRound } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { SOCIAL_PLATFORMS } from "@/lib/social";
import { SocialIcon } from "@/components/SocialIcon";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Field, Input } from "@/themes/bifrost-terminal/components/ui/Input";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { Table, THead, TR, TH, TD } from "@/themes/bifrost-terminal/components/ui/Table";
import { useDateTimeFormat } from "@/lib/format-date";

interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: Record<string, string> | null;
  role: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export default function ProfilePage() {
  const { formatDateShort } = useDateTimeFormat();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({});
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [creatingKey, setCreatingKey] = useState(false);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSetup, setMfaSetup] = useState<{ otpauthUrl: string; recoveryCodes: string[] } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaMessage, setMfaMessage] = useState("");

  async function handleMfaSetup() {
    setMfaLoading(true);
    try {
      const res = await authFetch("/api/v1/profile/mfa/setup", { method: "POST" });
      const body = await res.json();
      if (body.data) setMfaSetup(body.data);
    } catch { setMfaMessage("Failed to setup MFA"); }
    finally { setMfaLoading(false); }
  }

  async function handleMfaVerify() {
    if (!mfaSetup || mfaCode.length !== 6) return;
    setMfaLoading(true);
    try {
      const res = await authFetch("/api/v1/profile/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ secret: (mfaSetup as unknown as Record<string, unknown>).secret, code: mfaCode, recoveryCodes: mfaSetup.recoveryCodes }),
      });
      if (res.ok) { setMfaEnabled(true); setMfaSetup(null); setMfaMessage("MFA enabled"); }
      else { const b = await res.json(); setMfaMessage(b.error?.message ?? "Verification failed"); }
    } catch { setMfaMessage("Failed to verify"); }
    finally { setMfaLoading(false); setMfaCode(""); }
  }

  async function handleMfaDisable() {
    const pw = prompt("Enter your password to disable MFA:");
    if (!pw) return;
    setMfaLoading(true);
    try {
      const res = await authFetch("/api/v1/profile/mfa/disable", {
        method: "POST",
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) { setMfaEnabled(false); setMfaMessage("MFA disabled"); }
      else { const b = await res.json(); setMfaMessage(b.error?.message ?? "Failed to disable"); }
    } catch { setMfaMessage("Failed"); }
    finally { setMfaLoading(false); }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await authFetch("/api/v1/profile");
        const body = await res.json();
        if (cancelled) return;
        if (res.ok && body.data) {
          const p = body.data as Profile;
          setProfile(p);
          setDisplayName(p.displayName);
          setEmail(p.email);
          setBio(p.bio ?? "");
          setAvatarUrl(p.avatarUrl);
          setSocialLinks(p.socialLinks ?? {});
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Avatar must be an image");
      return;
    }
    setUploading(true);
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await authFetch("/api/v1/media/upload", {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (res.ok && body.data?.path) {
        setAvatarUrl(`/${body.data.path}`);
      } else {
        setMessage(body.error?.message ?? "Upload failed");
      }
    } catch {
      setMessage("Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload: Record<string, unknown> = {
        displayName,
        email,
        bio,
        avatarUrl: avatarUrl ?? "",
        socialLinks,
      };
      if (password) payload.password = password;
      const res = await authFetch("/api/v1/profile", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (res.ok) {
        setProfile(body.data as Profile);
        setPassword("");
        setMessage("Saved");
      } else {
        setMessage(body.error?.message ?? "Error saving");
      }
    } catch {
      setMessage("Error saving");
    } finally {
      setSaving(false);
    }
  }

  async function loadKeys() {
    const res = await authFetch("/api/v1/api-keys");
    const body = await res.json();
    if (res.ok) setKeys(body.data ?? []);
  }

  useEffect(() => {
    let cancelled = false;
    authFetch("/api/v1/api-keys")
      .then(async (res) => {
        const body = await res.json();
        if (cancelled) return;
        if (res.ok) setKeys(body.data ?? []);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateKey() {
    if (!newKeyName.trim()) {
      setMessage("A key name is required");
      return;
    }
    setMessage("");
    setCreatingKey(true);
    try {
      const res = await authFetch("/api/v1/api-keys", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error?.message ?? "Failed to create API key");
        return;
      }
      setFreshKey(body.data.key);
      setCopied(false);
      setCreateOpen(false);
      setNewKeyName("");
      await loadKeys();
    } finally {
      setCreatingKey(false);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm("Revoke this API key? Requests using it will stop working immediately.")) return;
    setMessage("");
    const res = await authFetch(`/api/v1/api-keys/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const b = await res.json();
      setMessage(b.error?.message ?? "Failed to revoke API key");
      return;
    }
    await loadKeys();
  }

  async function copyFreshKey() {
    if (!freshKey) return;
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  if (loading) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-text-3">loading…</p>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card padding="md">
        <p className="font-mono text-sm text-danger">Could not load your profile.</p>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="mt-1 font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> whoami
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
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
                onChange={handleAvatarChange}
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
                  <Button type="button" variant="ghost" onClick={() => setAvatarUrl(null)}>
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

        <Card padding="md">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-mono text-xs uppercase tracking-wider text-text-3">API Keys</div>
            {!createOpen && (
              <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                <span>New Key</span>
              </Button>
            )}
          </div>
          <p className="mb-4 font-mono text-xs text-text-muted">
            Bearer tokens for the REST API. Keys belong to your account only.
          </p>

          {freshKey && (
            <div className="mb-4 rounded-md border border-success/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-sm text-success">
                  <KeyRound size={14} className="mr-1 inline-block" /> New API key created
                </p>
                <button onClick={() => setFreshKey(null)} className="text-text-3 hover:text-text-1">
                  <X size={14} />
                </button>
              </div>
              <p className="mb-2 text-sm text-text-3">
                Copy this key now — it won&apos;t be shown again. Use as a{" "}
                <code className="font-mono text-text-2">Bearer</code> token.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 overflow-x-auto rounded-md border border-border bg-bg-0 px-3 py-2 font-mono text-sm text-text-1">
                  {freshKey}
                </code>
                <Button variant="ghost" size="sm" onClick={copyFreshKey}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </Button>
              </div>
            </div>
          )}

          {createOpen && (
            <div className="mb-4 rounded-md border border-border bg-bg-0 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-sm text-text-2">
                  <span className="text-text-muted">$</span> create key
                </p>
                <button onClick={() => setCreateOpen(false)} className="text-text-3 hover:text-text-1">
                  <X size={14} />
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <Field label="Name">
                  <Input
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. CI deploy token"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateKey();
                    }}
                  />
                </Field>
                <Button variant="primary" size="md" className="h-[2.375rem]" onClick={handleCreateKey} disabled={creatingKey}>
                  <Check size={14} />
                  <span>{creatingKey ? "Creating…" : "Create"}</span>
                </Button>
              </div>
            </div>
          )}

          {keys.length === 0 && !createOpen ? (
            <p className="font-mono text-sm text-text-3">
              No API keys yet. Create one to authenticate REST API requests without logging in.
            </p>
          ) : keys.length > 0 ? (
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Key</TH>
                  <TH>Created</TH>
                  <TH>Last used</TH>
                  <TH className="w-16">Actions</TH>
                </TR>
              </THead>
              <tbody>
                {keys.map((k) => (
                  <TR key={k.id}>
                    <TD className="text-text-1">{k.name}</TD>
                    <TD className="font-mono text-text-2">{k.keyPrefix}…</TD>
                    <TD className="font-mono text-xs text-text-3">{formatDateShort(k.createdAt)}</TD>
                    <TD className="font-mono text-xs text-text-3">
                      {k.lastUsedAt ? formatDateShort(k.lastUsedAt) : "never"}
                    </TD>
                    <TD>
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="rounded p-1 text-text-3 transition hover:bg-bg-2 hover:text-danger"
                        title="Revoke"
                      >
                        <Trash2 size={14} />
                      </button>
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          ) : null}
        </Card>

        <Card padding="md">
          <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Two-Factor Authentication</div>
          {mfaEnabled ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-success">MFA is enabled</span>
              <Button variant="ghost" size="sm" onClick={handleMfaDisable} disabled={mfaLoading}>
                {mfaLoading ? "Disabling…" : "Disable"}
              </Button>
            </div>
          ) : mfaSetup ? (
            <div className="space-y-4">
              <p className="text-sm text-text-2">Scan this QR code with your authenticator app:</p>
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaSetup.otpauthUrl)}`} alt="QR code" className="rounded-md border border-border" />
              <div className="space-y-1">
                <p className="font-mono text-xs text-text-3">Recovery codes — save these in a safe place:</p>
                <pre className="rounded-md border border-border bg-bg-2 p-3 font-mono text-xs text-text-1">{mfaSetup.recoveryCodes.join("\n")}</pre>
              </div>
              <Field label="Verification code">
                <div className="flex items-center gap-2">
                  <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="000000" maxLength={6} className="w-28 font-mono" />
                  <Button variant="primary" size="sm" onClick={handleMfaVerify} disabled={mfaLoading || mfaCode.length !== 6}>
                    {mfaLoading ? "Verifying…" : "Verify"}
                  </Button>
                </div>
              </Field>
            </div>
          ) : (
            <div>
              <Button variant="ghost" onClick={handleMfaSetup} disabled={mfaLoading}>
                {mfaLoading ? "Loading…" : "Enable two-factor authentication"}
              </Button>
            </div>
          )}
          {mfaMessage && (
            <p className={`mt-2 font-mono text-xs ${mfaMessage.startsWith("MFA") || mfaMessage.startsWith("Two") ? "text-success" : "text-danger"}`}>
              {mfaMessage}
            </p>
          )}
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" variant="primary" disabled={saving}>
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save Profile"}</span>
          </Button>
          {message && (
            <span className={`font-mono text-xs ${message === "Saved" ? "text-success" : "text-danger"}`}>
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
