/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import type { ComponentType, ReactNode } from "react";

export interface ThemeManifest {
  name: string;
  version: string;
  author: string;
  description: string;
  screenshots?: string[];
}

export interface PostData {
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string | null;
  frontmatter: Record<string, unknown>;
  status: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ThemeComponents {
  layout?: ComponentType<{ children: ReactNode }>;
  post?: ComponentType<{ post: PostData }>;
  list?: ComponentType<{ posts: PostData[] }>;
}

export interface LoadedTheme {
  manifest: ThemeManifest;
  components: ThemeComponents;
  path: string;
}
