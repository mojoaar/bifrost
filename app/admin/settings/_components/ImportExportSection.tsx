/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Download, Upload } from "lucide-react";
import { Card } from "@/themes/bifrost-terminal/components/ui/Card";
import { Button } from "@/themes/bifrost-terminal/components/ui/Button";

interface Props {
  exporting: boolean;
  importMessage: string;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ImportExportSection({ exporting, importMessage, onExport, onImport }: Props) {
  return (
    <Card padding="md">
      <div className="mb-3 font-mono text-xs uppercase tracking-wider text-text-3">Export / Import</div>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={onExport} disabled={exporting}>
          <Download size={14} />
          <span>{exporting ? "Preparing…" : "Export ZIP"}</span>
        </Button>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-bg-1 px-3 py-1.5 text-sm font-medium text-text-1 transition hover:bg-bg-2 disabled:cursor-not-allowed disabled:opacity-50">
          <Upload size={14} />
          <span>Import ZIP</span>
          <input
            type="file"
            accept=".zip"
            onChange={onImport}
            className="hidden"
          />
        </label>
        {importMessage && (
          <span className={`font-mono text-xs ${importMessage.startsWith("Imported") ? "text-success" : "text-danger"}`}>
            {importMessage}
          </span>
        )}
      </div>
    </Card>
  );
}
