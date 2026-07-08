# Admin

The admin area lives under `/admin` and is the control center for your site. It is a set of React (App Router) screens protected by authentication.

## Dashboard

The landing screen at `/admin` gives you an at-a-glance overview:

- **Stats** — total posts, pages, drafts, and tags.
- **Recent posts** — your latest entries with quick links to edit.
- **Quick actions** — shortcuts for New Post, New Page, Media, and Settings.

## Sidebar navigation

A persistent sidebar links to the main sections:

```
Dashboard   /admin
Posts       /admin/posts
Pages       /admin/pages
Media       /admin/media
Tags        /admin/tags
Users       /admin/users
API Keys    /admin/api-keys
Settings    /admin/settings
```

The sidebar collapses on small screens and remembers your dark/light preference.

## Post editor

The editor at `/admin/posts/<id>` combines a CodeMirror 6 markdown pane with a live preview:

- **Editing** — write markdown on the left; the right pane renders it with the same remark/rehype/Shiki pipeline used on the public site.
- **Frontmatter** — a sidebar exposes `title`, `date`, `tags`, `featuredImage`, `scheduledAt`, and `draft`.
- **Save** — press `Cmd+S` (macOS) or `Ctrl+S` (Windows/Linux), or click **Save**. Saving commits the change to Git (see [git.md](./git.md)).

The same editor is used for pages under `/admin/pages/<id>`.

## Bulk actions

The **Posts** and **Pages** list views support multi-select. Tick the checkboxes and choose a bulk action — currently **Delete** — to remove several entries at once. Deletions are versioned in Git, so history is preserved even after removal.

## Media upload

The **Media** screen handles image uploads. Drag and drop files or use the file picker; uploads are stored under the media directory and organized by date. Each item exposes a copyable path you can drop into `featuredImage` or inline markdown:

```markdown
![Alt text](/media/2026/07/screenshot.png)
```

## User management

Under **Users**, admins can:

- Invite or create additional users.
- Assign roles (e.g. `admin`, `author`).
- Reset passwords and deactivate accounts.

Passwords are hashed with bcrypt; sessions are JWTs signed with `BIFROST_JWT_SECRET`.

## API keys

The **API Keys** screen issues long-lived tokens for programmatic access. Keys are prefixed with `bfk_` and shown only once at creation — copy and store them securely. Use them as Bearer tokens against the REST API (see [api.md](./api.md)):

```
Authorization: Bearer bfk_xxxxxxxxxxxxxxxxxxxxxxxx
```

Revoke a key from the same screen to immediately invalidate it.

## Command palette

Press `Cmd+K` (or `Ctrl+K`) anywhere in the admin to open the command palette. It provides fuzzy search over navigation and actions:

- Jump to any section.
- Create a new post or page.
- Toggle the theme.
- Open Settings.

The palette is the fastest way to move around without touching the mouse.

## Dark / light toggle

A theme toggle in the top bar switches the admin between dark and light modes. The choice is persisted per browser and is independent of the public site's theme palette.
