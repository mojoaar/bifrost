/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

export async function logout(): Promise<void> {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem("bifrost_token");
  }
  if (typeof document !== "undefined") {
    document.cookie = "bifrost_token=; path=/; max-age=0";
    document.cookie = "bifrost_refresh=; path=/; max-age=0";
  }
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
}
