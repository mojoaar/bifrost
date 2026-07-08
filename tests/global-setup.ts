/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import fs from "fs";

export default function globalSetup(): () => void {
  return () => {
    const root = process.env.BIFROST_TEST_ROOT;
    if (root) {
      fs.rmSync(root, { recursive: true, force: true });
    }
  };
}
