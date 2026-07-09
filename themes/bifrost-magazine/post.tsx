/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import type { PostData } from "@/lib/themes/types";
import { useCodeCopyButtons } from "@/components/CodeCopyButton";
import { useDateTimeFormat } from "@/components/use-date-time-format";
import { SOCIAL_PLATFORMS } from "@/lib/social";
import { SocialIcon } from "@/components/SocialIcon";
import ShareBar from "@/components/ShareBar";
import { readingTime } from "@/lib/reading-time";
import Link from "next/link";

interface Props {
  post: PostData;
  isAdmin?: boolean;
  sharing?: { networks: string[] } | null;
}

export default function PostTemplate({ post, isAdmin = false, sharing = null }: Props) {
  const date = post.publishedAt ?? post.createdAt;
  const tags = (post.frontmatter?.tags as string[] | undefined) ?? [];
  const minutes = readingTime(post.contentHtml);
  const containerRef = useCodeCopyButtons(post.contentHtml);
  const { formatDateShort } = useDateTimeFormat();
  const author = post.author;
  const social = author?.socialLinks
    ? SOCIAL_PLATFORMS.filter((p) => author.socialLinks?.[p.key])
    : [];

  return (
    <article className="mx-auto max-w-3xl">
      <header className="mb-8">
        {tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Link
                key={t}
                href={`/tag/${t}`}
                className="rounded-sm bg-accent/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wider text-accent transition hover:bg-accent/20"
              >
                {t}
              </Link>
            ))}
          </div>
        )}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold leading-tight tracking-tight text-text-1 sm:text-display">
            {post.title}
          </h1>
          <div className="flex shrink-0 items-center gap-2">
            {isAdmin && post.status === "draft" && (
              <span className="rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-xs font-medium text-warning">
                draft
              </span>
            )}
            {isAdmin && (
              <a
                href={`/admin/posts/${post.slug}`}
                className="rounded-md border border-border bg-bg-1 px-2 py-1 text-xs text-text-2 transition hover:border-accent hover:text-accent"
              >
                edit
              </a>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-text-3">
          {author && <span className="font-medium text-text-2">{author.displayName}</span>}
          {author && <span className="text-text-muted">·</span>}
          <time dateTime={date}>
            {formatDateShort(date)}
          </time>
          {post.showReadingTime !== false && (
            <>
              <span className="text-text-muted">·</span>
              <span>{minutes} min read</span>
            </>
          )}
        </div>
      </header>
      {!!post.frontmatter?.featuredImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={String(post.frontmatter.featuredImage)}
          alt=""
          className="mb-6 w-full max-h-96 rounded-md object-cover"
        />
      )}
      <div
        ref={containerRef}
        className="text-text-1"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
      {sharing && sharing.networks.length > 0 && (
        <ShareBar title={post.title} networks={sharing.networks} />
      )}
      {author && post.showAuthorBio !== false && (author.bio || author.avatarUrl || social.length > 0) && (
        <footer className="mt-10 flex items-start gap-4 border-t border-border pt-6">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-bg-1">
            {author.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={author.avatarUrl} alt={author.displayName} className="size-full object-cover" />
            ) : (
              <span className="text-sm text-text-muted">
                {author.displayName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-medium text-text-1">{author.displayName}</div>
            {author.bio && <p className="mt-1 text-sm text-text-3">{author.bio}</p>}
            {social.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {social.map((p) => (
                  <a
                    key={p.key}
                    href={author.socialLinks![p.key]}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={p.label}
                    title={p.label}
                    className="text-text-muted transition hover:text-text-1"
                  >
                    <SocialIcon platform={p.key} size={18} />
                  </a>
                ))}
              </div>
            )}
          </div>
        </footer>
      )}
    </article>
  );
}
