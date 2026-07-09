/**
 * Copyright (C) 2026 Bifröst Contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * See the LICENSE file for details.
 */

"use client";

import Link from "next/link";
import type { PostData } from "@/lib/themes/types";
import { useDateTimeFormat } from "@/components/use-date-time-format";
import { readingTime } from "@/lib/reading-time";
import { SHARE_NETWORKS, buildShareUrl } from "@/lib/sharing";
import { SocialIcon } from "@/components/SocialIcon";

interface Props {
  posts: PostData[];
  siteTitle?: string;
  siteDescription?: string;
  heroHtml?: string;
  contentWidth?: string;
  sharing?: string[];
}

const WIDTH_MAP: Record<string, string> = {
  narrow: "max-w-2xl",
  wide: "max-w-5xl",
};

export default function ListTemplate({ posts, siteTitle, siteDescription, heroHtml, contentWidth, sharing }: Props) {
  const widthClass = WIDTH_MAP[contentWidth ?? ""] ?? "max-w-3xl";
  const { formatDateShort } = useDateTimeFormat();

  if (posts.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-surface-sunken py-16 text-center">
        <p className="font-mono text-sm text-text-3">
          <span className="text-text-muted">$</span> ls content/posts/<span className="text-text-muted"># empty</span>
        </p>
      </div>
    );
  }

  return (
    <div>
      {(siteTitle || heroHtml) && (
        <section className="mb-12 border-b border-border pb-10 text-center">
          {siteTitle && (
            <h1 className="mb-3 font-bold text-3xl tracking-tight text-text-1 sm:text-display">
              {siteTitle}
            </h1>
          )}
          {siteDescription && (
            <p className={`mx-auto ${widthClass} text-text-2`}>
              {siteDescription}
            </p>
          )}
          {heroHtml && (
            <div
              className={`prose-sm mx-auto mt-6 ${widthClass} text-left text-text-3`}
              dangerouslySetInnerHTML={{ __html: heroHtml }}
            />
          )}
        </section>
      )}

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => {
          const tags = (post.frontmatter?.tags as string[]) ?? [];

          return (
            <article
              key={post.slug}
              className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-surface transition hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md"
            >
              {!!post.frontmatter?.featuredImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={String(post.frontmatter.featuredImage)}
                  alt=""
                  className="h-44 w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <Link
                  href={`/${post.slug}`}
                  aria-label={post.title}
                  className="absolute inset-0 z-10 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                />
                <h2 className="relative z-0 text-lg font-semibold leading-snug tracking-tight text-text-1 transition group-hover:text-accent">
                  {post.title}
                </h2>
                {post.excerpt && (
                  <p className="relative z-0 mt-2 flex-1 text-sm leading-relaxed text-text-3">
                    {post.excerpt}
                  </p>
                )}
                <div className="relative z-0 mt-3 flex items-center gap-3 font-mono text-xs text-text-muted">
                  <time dateTime={post.createdAt}>
                    {formatDateShort(post.createdAt)}
                  </time>
                  {post.showReadingTime !== false && (
                    <>
                      <span className="text-border-strong">·</span>
                      <span>{readingTime(post.contentHtml)} min read</span>
                    </>
                  )}
                </div>
                {tags.length > 0 && (
                  <div className="relative z-0 mt-3 flex flex-wrap gap-1.5">
                    {tags.map((tag: string) => (
                      <Link
                        key={tag}
                        href={`/tag/${tag}`}
                        className="pointer-events-auto relative z-20 rounded border border-border bg-bg-1 px-1.5 py-0.5 font-mono text-xs text-text-3 transition hover:border-accent hover:text-accent"
                      >
                        #{tag}
                      </Link>
                    ))}
                  </div>
                )}
                {sharing && sharing.length > 0 && (
                  <div className="relative mt-auto flex items-center gap-2 pt-4">
                    {SHARE_NETWORKS.filter((n) => sharing.includes(n.key)).map((n) => (
                      <a
                        key={n.key}
                        href={buildShareUrl(n.key, { url: `/${post.slug}`, title: post.title })}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Share on ${n.label}`}
                        title={n.label}
                        className="pointer-events-auto relative z-20 text-text-muted transition hover:text-text-1"
                      >
                        <SocialIcon platform={n.key} size={14} />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
