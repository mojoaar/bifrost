# Content

Bifröst is markdown-native. Everything you publish is a markdown file with YAML frontmatter, stored in the content repository and mirrored to the database for fast querying.

## Posts vs pages

Bifröst has two content types:

| Type   | Purpose                          | URL pattern        | Ordering            |
| ------ | -------------------------------- | ------------------ | ------------------- |
| Post   | Time-based entries (blog posts)  | `/posts/<slug>`    | Reverse chronological |
| Page   | Static content (About, Contact)  | `/<slug>`          | Manual / navigation |

Posts appear in feeds, archives, and tag listings. Pages are standalone and typically linked from the site navigation.

## Markdown and frontmatter

Every post and page begins with a YAML frontmatter block delimited by `---`:

```markdown
---
title: "Hello Bifröst"
date: 2026-07-08
tags: [announcements, meta]
featuredImage: /media/2026/hello.jpg
scheduledAt: 2026-07-10T09:00:00Z
draft: false
---

Your **markdown** body goes here.
```

### Frontmatter fields

| Field           | Type        | Description                                                        |
| --------------- | ----------- | ------------------------------------------------------------------ |
| `title`         | string      | Required. Display title; also drives the default slug.             |
| `date`          | date        | Publication date used for ordering and display.                    |
| `tags`          | string[]    | Zero or more tags for grouping and filtering.                      |
| `featuredImage` | string      | Path or URL to the hero image shown in listings and the header.    |
| `scheduledAt`   | ISO 8601    | Future timestamp for scheduled publishing.                         |
| `draft`         | boolean     | When `true`, the post is hidden from the public site.              |

Unknown fields are preserved so custom themes and plugins can read them.

## The CodeMirror 6 editor

The admin editor is built on CodeMirror 6 and provides:

- Markdown syntax highlighting and soft-wrapping.
- A split live preview rendered with the same remark/rehype pipeline as the public site.
- `Cmd+S` (or `Ctrl+S`) to save without leaving the keyboard.
- A frontmatter sidebar for editing structured fields without touching YAML by hand.

Content flows through remark for parsing and rehype for HTML rendering, with Shiki providing syntax highlighting in fenced code blocks.

## Tags

Tags are declared in frontmatter and indexed automatically. Each tag gets an archive page:

```
/tags/<tag>
```

Manage tags from the admin **Tags** screen, where you can rename or merge them. Renaming a tag rewrites it across all posts on the next save/commit.

## Post templates

To keep authoring consistent, Bifröst supports templates — pre-filled frontmatter and body scaffolds. When creating a post you can pick a template; its frontmatter and starter content are copied into the new file. Templates are ordinary markdown files kept alongside your content and are useful for recurring formats like release notes or link posts.

## Featured images

Set `featuredImage` in frontmatter to a media path (uploaded via the admin **Media** screen) or an absolute URL. Themes decide how to render it — typically as a hero at the top of the post and a thumbnail in listings. Whether featured images appear at all is controlled by a display toggle in **Settings**.

## Scheduled posts

Set `scheduledAt` to a future ISO 8601 timestamp and leave `draft: false`. The post stays hidden until that time passes, then becomes publicly visible automatically. This lets you queue content in advance:

```markdown
---
title: "Launch Day"
scheduledAt: 2026-08-01T08:00:00Z
draft: false
---
```

If `scheduledAt` is in the past, the post behaves like a normal published post.

## Drafts

New posts are created as drafts (`draft: true`). Drafts:

- Are visible in the admin but excluded from the public site, feeds, and tag pages.
- Can be previewed by signed-in admins.
- Are published by setting `draft: false` and saving.

Use drafts freely for work in progress; they are still versioned in Git so you never lose history.

## Sharing a draft

You can share a private preview of an unpublished post (draft or scheduled) with someone who is not signed in — for example, an external reviewer.

In the post editor, click **Copy preview link** on any non-published post. Bifröst generates a secret token and copies a URL like `https://your-site/my-post?preview=<token>` to your clipboard. Anyone with that link can view the post without logging in.

Preview links:

- Expire automatically after 7 days.
- Are marked `noindex` so search engines never index the preview.
- Are cleared automatically when the post is published.
- Can be revoked at any time with the **Revoke** button, which invalidates the current link immediately.

Generating a new link replaces any previous one for that post.

