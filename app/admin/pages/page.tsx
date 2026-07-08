/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { Check } from "lucide-react";
import AdminContentList from "@/components/AdminContentList";

export default function PagesPage() {
  return (
    <AdminContentList
      title="Pages"
      subtitle="ls content/pages/"
      apiPath="/api/v1/pages"
      adminPath="/admin/pages"
      emptyMessage="no pages found"
      deleteConfirm="Delete this page?"
      extraColumns={[
        {
          header: "Nav",
          cell: (page: any) =>
            page.showInNav ? (
              <span className="inline-flex items-center gap-1 font-mono text-xs text-text-2" title={`Nav order: ${page.navOrder}`}>
                <Check size={12} className="text-accent" /> {page.navOrder}
              </span>
            ) : (
              <span className="font-mono text-xs text-text-muted">—</span>
            ),
        },
      ]}
    />
  );
}
