/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

import { db } from "@/lib/db";
import { posts } from "@/lib/db/schema/posts";
import { pages } from "@/lib/db/schema/pages";
import { users } from "@/lib/db/schema/users";
import { eq } from "drizzle-orm";
import { loadTheme } from "@/lib/themes/registry";
import { getSetting } from "@/lib/settings";
import { parseSocialLinks } from "@/lib/social";
import { parseShareNetworks } from "@/lib/sharing";
import type { PostData, PageData } from "@/lib/themes/types";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { verifyRefreshToken } from "@/lib/auth/token";

interface Props {
  params: Promise<{ slug: string }>;
}

async function isAdminRequest(): Promise<boolean> {
  const cookieStore = await cookies();
  const refreshCookie = cookieStore.get("bifrost_refresh")?.value;
  if (!refreshCookie) return false;
  try {
    const payload = await verifyRefreshToken(refreshCookie);
    return payload?.role === "admin";
  } catch {
    return false;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const pageRow = db
    .select({ title: pages.title, excerpt: pages.excerpt, status: pages.status, frontmatter: pages.frontmatter })
    .from(pages)
    .where(eq(pages.slug, slug))
    .get();

  if (pageRow) {
    if (pageRow.status !== "published" && !(await isAdminRequest())) {
      return { title: "Not Found" };
    }
    const fm = JSON.parse(pageRow.frontmatter) as Record<string, unknown>;
    const ogImage = fm.featuredImage ? [fm.featuredImage as string] : undefined;
    return {
      title: pageRow.title,
      description: pageRow.excerpt ?? undefined,
      openGraph: {
        title: pageRow.title,
        description: pageRow.excerpt ?? undefined,
        type: "article",
        images: ogImage,
      },
      twitter: { card: "summary", title: pageRow.title, description: pageRow.excerpt ?? undefined, images: ogImage },
    };
  }

  const row = db
    .select({ title: posts.title, excerpt: posts.excerpt, status: posts.status, frontmatter: posts.frontmatter })
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) return { title: "Not Found" };

  if (row.status !== "published" && !(await isAdminRequest())) {
    return { title: "Not Found" };
  }

  const postFm = JSON.parse(row.frontmatter) as Record<string, unknown>;
  const postOgImage = postFm.featuredImage ? [postFm.featuredImage as string] : undefined;

  return {
    title: row.title,
    description: row.excerpt ?? undefined,
    openGraph: {
      title: row.title,
      description: row.excerpt ?? undefined,
      type: "article",
      images: postOgImage,
    },
    twitter: { card: "summary", title: row.title, description: row.excerpt ?? undefined, images: postOgImage },
  };
}

export default async function PublicSlugPage({ params }: Props) {
  const { slug } = await params;

  const pageRow = db.select().from(pages).where(eq(pages.slug, slug)).get();

  if (pageRow) {
    const isAdmin = await isAdminRequest();
    if (pageRow.status !== "published" && !isAdmin) notFound();

    const theme = await loadTheme("bifrost-terminal");
    const PageComponent = theme.components.page;

    const showFeatured = getSetting("appearance.show_featured_images") !== "false";
    const showReadingTime = getSetting("appearance.show_reading_time") !== "false";
    const fm = JSON.parse(pageRow.frontmatter) as Record<string, unknown>;
    const pageFm = !showFeatured && fm.featuredImage
      ? (() => { const { featuredImage: _, ...rest } = fm; return rest; })()
      : fm;

    const pageData: PageData = {
      slug: pageRow.slug,
      title: pageRow.title,
      contentHtml: pageRow.contentHtml,
      excerpt: pageRow.excerpt,
      frontmatter: pageFm,
      status: pageRow.status,
      createdAt: pageRow.createdAt,
      updatedAt: pageRow.updatedAt,
      showReadingTime,
    };

    if (!PageComponent) {
      return (
        <article>
          <h1 className="text-3xl font-bold">{pageData.title}</h1>
          <div dangerouslySetInnerHTML={{ __html: pageData.contentHtml }} />
        </article>
      );
    }

    return <PageComponent page={pageData} isAdmin={isAdmin} />;
  }

  const row = db
    .select()
    .from(posts)
    .where(eq(posts.slug, slug))
    .get();

  if (!row) notFound();

  const isAdmin = await isAdminRequest();

  if (row.status !== "published" && !isAdmin) notFound();

  const theme = await loadTheme("bifrost-terminal");
  const PostComponent = theme.components.post;

  const showAuthor = getSetting("appearance.show_author") !== "false";
  const showFeatured = getSetting("appearance.show_featured_images") !== "false";
  const showReadingTime = getSetting("appearance.show_reading_time") !== "false";
  const showAuthorBio = getSetting("appearance.show_author_bio") !== "false";
  const author =
    showAuthor && row.authorId
      ? db
          .select({
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
            bio: users.bio,
            socialLinks: users.socialLinks,
          })
          .from(users)
          .where(eq(users.id, row.authorId))
          .get() ?? null
      : null;

  const authorData = author
    ? { ...author, socialLinks: parseSocialLinks(author.socialLinks) }
    : null;

  const postFm = JSON.parse(row.frontmatter) as Record<string, unknown>;
  const finalFm = !showFeatured && postFm.featuredImage
    ? (() => { const { featuredImage: _, ...rest } = postFm; return rest; })()
    : postFm;

  const postData: PostData = {
    slug: row.slug,
    title: row.title,
    contentHtml: row.contentHtml,
    excerpt: row.excerpt,
    frontmatter: finalFm,
    status: row.status,
    publishedAt: row.publishedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    author: authorData,
    showReadingTime,
    showAuthorBio,
  };

  if (!PostComponent) {
    return (
      <article>
        <h1 className="text-3xl font-bold">{postData.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: postData.contentHtml }} />
      </article>
    );
  }

  const sharingEnabled = getSetting("sharing.enabled") === "true";
  const sharing = sharingEnabled
    ? { networks: parseShareNetworks(getSetting("sharing.networks")) }
    : null;

  return <PostComponent post={postData} isAdmin={isAdmin} sharing={sharing} />;
}
