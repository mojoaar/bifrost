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
import { apiSuccess } from "@/lib/api/response";

export async function GET() {
  const rows = db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    createdAt: users.createdAt,
  }).from(users).all();

  return apiSuccess(rows);
}
