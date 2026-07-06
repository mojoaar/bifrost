/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema/users";
import SetupForm from "./SetupForm";

export default async function SetupPage() {
  const admin = db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .get();

  if (admin) redirect("/admin");

  return <SetupForm />;
}
