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

export interface PostAuthor {
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  socialLinks?: Record<string, string> | null;
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
  author?: PostAuthor | null;
  showReadingTime?: boolean;
  showAuthorBio?: boolean;
}

export interface PageData {
  slug: string;
  title: string;
  contentHtml: string;
  excerpt: string | null;
  frontmatter: Record<string, unknown>;
  status: string;
  createdAt: string;
  updatedAt: string;
  showReadingTime?: boolean;
}

export interface ThemeComponents {
  layout?: ComponentType<{ children: ReactNode; contentWidth?: string; theme?: string }>;
  post?: ComponentType<{ post: PostData; isAdmin?: boolean; sharing?: { networks: string[] } | null }>;
  list?: ComponentType<{ posts: PostData[] }>;
  page?: ComponentType<{ page: PageData; isAdmin?: boolean }>;
}

export interface LoadedTheme {
  manifest: ThemeManifest;
  components: ThemeComponents;
  path: string;
}
