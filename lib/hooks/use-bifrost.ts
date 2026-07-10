/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import { useContext } from "react";
import { BifrostContext, type BifrostContextValue } from "@/components/BifrostProvider";

export function useBifrost(): BifrostContextValue {
  const value = useContext(BifrostContext);
  if (!value) {
    throw new Error("useBifrost must be used within a BifrostProvider");
  }
  return value;
}
