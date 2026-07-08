# Getting Started

This guide walks you through installing Bifröst, running the setup wizard, creating your admin account, publishing your first post, and clearing out the demo content.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- Git (used for content versioning)

## Installation

Clone the repository and install dependencies:

```bash
git clone git@github.com:mojoaar/bifrost.git
cd bifrost
npm install
```

Start the development server:

```bash
npm run dev
```

By default the app runs on [http://localhost:3000](http://localhost:3000). The dev server uses Turbopack and hot-reloads on file changes.

## The setup wizard

On first launch, Bifröst detects that no admin account exists and redirects you to the setup wizard at:

```
http://localhost:3000/setup
```

The wizard runs once and walks through three steps:

1. **Site info** — title and description used across the theme and metadata.
2. **Admin account** — email and password for the first user (see below).
3. **Starter content** — optionally seed demo posts and pages so you can see a populated site immediately.

Once the wizard completes, `/setup` becomes inaccessible and you are redirected to the admin dashboard.

## Creating the admin account

During the wizard you create the first user, which is granted the `admin` role automatically. Passwords are hashed with bcrypt before being stored, and sessions are issued as signed JWTs (via `jose`).

```
Email:    you@example.com
Password: ••••••••••••
```

After setup you can sign in at:

```
http://localhost:3000/admin/login
```

## Configuration

Site-wide configuration lives in `bifrost.config.ts` at the project root. Most values can also be edited from the admin **Settings** screen, which persists to the database. The config file provides sensible defaults:

```ts
// bifrost.config.ts
export default {
  site: {
    title: "My Bifröst Blog",
    description: "A self-hosted blog",
  },
  theme: "terminal",
  database: {
    url: process.env.DATABASE_URL ?? "file:./bifrost.db",
  },
};
```

The default database is SQLite, stored at `./bifrost.db`. Drizzle ORM runs migrations automatically on first boot.

## Writing your first post

1. Open the admin dashboard at `/admin`.
2. Click **New Post** (or use the command palette with `Cmd+K` → "New Post").
3. Give the post a title; the slug is generated automatically.
4. Write your content in the CodeMirror 6 markdown editor. A live preview renders alongside.
5. Save with `Cmd+S` or the **Save** button. New posts start as drafts.
6. Toggle **draft** off in the frontmatter (or the editor sidebar) and save again to publish.

Your published post is immediately available at:

```
http://localhost:3000/posts/<slug>
```

## Removing demo data

If you seeded starter content during setup, you can remove it once you are comfortable:

- **From the admin UI:** go to **Posts**, select the demo entries, and use the bulk **Delete** action. Repeat under **Pages**.
- **Fresh start:** stop the dev server, delete the SQLite database file, and re-run setup:

```bash
rm bifrost.db
npm run dev
```

Deleting the database wipes all content and users, so only do this before you have real posts.

## Next steps

- [Content](./content.md) — learn the authoring model and markdown frontmatter.
- [Themes](./themes.md) — customize the look and feel.
- [Admin](./admin.md) — tour the dashboard and editor.
