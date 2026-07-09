/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "bifrost_install_dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY) === "1") return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      Promise.resolve().then(() => {
        setDeferred(e as BeforeInstallPromptEvent);
        setVisible(true);
      });
    };
    const onInstalled = () => {
      Promise.resolve().then(() => {
        setVisible(false);
        setDeferred(null);
      });
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;

  const install = async () => {
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      // ignore
    }
    setVisible(false);
    setDeferred(null);
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-md border border-border bg-bg-1 px-4 py-3 shadow-lg">
      <span className="font-mono text-xs text-text-2">Install this site as an app?</span>
      <button
        onClick={install}
        className="rounded border border-border px-2 py-1 font-mono text-xs text-accent transition hover:border-accent"
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="font-mono text-xs text-text-3 transition hover:text-text-1"
      >
        ✕
      </button>
    </div>
  );
}
