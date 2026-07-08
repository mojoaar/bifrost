/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import Link from "next/link";
import { Pencil } from "lucide-react";
import AdminContentList from "@/components/AdminContentList";

export default function PostsPage() {
  return (
    <AdminContentList
      title="Posts"
      subtitle="ls content/posts/"
      apiPath="/api/v1/posts"
      adminPath="/admin/posts"
      emptyMessage="no posts found"
      deleteConfirm="Delete this post?"
      actions={
        <Link
          href="/admin/post-templates"
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-1 px-3 py-1.5 font-mono text-xs text-text-2 transition hover:border-accent hover:text-accent"
        >
          <Pencil size={14} />
          <span>Edit Templates</span>
        </Link>
      }
    />
  );
}
