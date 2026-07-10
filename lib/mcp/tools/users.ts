/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import type { McpTool } from "./shared";
import { safeJson } from "./shared";

export const userTools: McpTool[] = [
  {
    name: "list_users",
    description: "List users (id, email, display name, role)",
    inputSchema: { type: "object", properties: {} },
    handler: async () => {
      const rows = db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
          role: users.role,
        })
        .from(users)
        .all();
      return { content: [{ type: "text", text: safeJson(rows) }] };
    },
  },
];
