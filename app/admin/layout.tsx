/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { cookies } from "next/headers";
import AdminShell from "./AdminShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const theme = cookieStore.get("bifrost_theme")?.value === "light" ? "light" : "dark";

  return <AdminShell initialMode={theme}>{children}</AdminShell>;
}
