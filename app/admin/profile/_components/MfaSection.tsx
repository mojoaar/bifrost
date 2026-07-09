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
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";

interface Props {
  mfaEnabled: boolean;
  mfaLoading: boolean;
  mfaSetup: { otpauthUrl: string; recoveryCodes: string[] } | null;
  mfaCode: string;
  setMfaCode: (v: string) => void;
  mfaMessage: string;
  onSetup: () => void;
  onVerify: () => void;
  onDisable: () => void;
}

export function MfaSection({
  mfaEnabled,
  mfaLoading,
  mfaSetup,
  mfaCode,
  setMfaCode,
  mfaMessage,
  onSetup,
  onVerify,
  onDisable,
}: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Two-Factor Authentication</div>
      {mfaEnabled ? (
        <div className="flex items-center gap-3">
          <span className="text-sm text-success">MFA is enabled</span>
          <Button variant="ghost" size="sm" onClick={onDisable} disabled={mfaLoading}>
            {mfaLoading ? "Disabling…" : "Disable"}
          </Button>
        </div>
      ) : mfaSetup ? (
        <div className="space-y-4">
          <p className="text-sm text-text-2">Scan this QR code with your authenticator app:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mfaSetup.otpauthUrl)}`} alt="QR code" className="rounded-md border border-border" />
          <div className="space-y-1">
            <p className="font-mono text-xs text-text-3">Recovery codes — save these in a safe place:</p>
            <pre className="rounded-md border border-border bg-bg-2 p-3 font-mono text-xs text-text-1">{mfaSetup.recoveryCodes.join("\n")}</pre>
          </div>
          <Field label="Verification code">
            <div className="flex items-center gap-2">
              <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value)} placeholder="000000" maxLength={6} className="w-28 font-mono" />
              <Button variant="primary" size="sm" onClick={onVerify} disabled={mfaLoading || mfaCode.length !== 6}>
                {mfaLoading ? "Verifying…" : "Verify"}
              </Button>
            </div>
          </Field>
        </div>
      ) : (
        <div>
          <Button variant="ghost" onClick={onSetup} disabled={mfaLoading}>
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
  );
}
