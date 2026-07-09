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
import { Save } from "lucide-react";
import { authFetch } from "@/lib/auth/client";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";
import { useDateTimeFormat } from "@/components/use-date-time-format";
import { ProfileSection } from "./_components/ProfileSection";
import { SocialLinksSection } from "./_components/SocialLinksSection";
import { ApiKeysSection, type ApiKey } from "./_components/ApiKeysSection";
import { MfaSection } from "./_components/MfaSection";

interface Profile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks: Record<string, string> | null;
  role: string;
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
        <ProfileSection
          avatarUrl={avatarUrl}
          uploading={uploading}
          fileInput={fileInput}
          onAvatarChange={handleAvatarChange}
          onAvatarRemove={() => setAvatarUrl(null)}
          displayName={displayName}
          setDisplayName={setDisplayName}
          email={email}
          setEmail={setEmail}
          bio={bio}
          setBio={setBio}
          password={password}
          setPassword={setPassword}
        />

        <SocialLinksSection socialLinks={socialLinks} setSocialLinks={setSocialLinks} />

        <ApiKeysSection
          keys={keys}
          createOpen={createOpen}
          setCreateOpen={setCreateOpen}
          newKeyName={newKeyName}
          setNewKeyName={setNewKeyName}
          creatingKey={creatingKey}
          freshKey={freshKey}
          setFreshKey={setFreshKey}
          copied={copied}
          onCreateKey={handleCreateKey}
          onRevokeKey={handleRevokeKey}
          onCopyFreshKey={copyFreshKey}
          formatDateShort={formatDateShort}
        />

        <MfaSection
          mfaEnabled={mfaEnabled}
          mfaLoading={mfaLoading}
          mfaSetup={mfaSetup}
          mfaCode={mfaCode}
          setMfaCode={setMfaCode}
          mfaMessage={mfaMessage}
          onSetup={handleMfaSetup}
          onVerify={handleMfaVerify}
          onDisable={handleMfaDisable}
        />

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
