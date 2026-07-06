# Changelog

All notable changes to Bifröst are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-07-06

### Added

- JWT authentication with access (15min) and refresh (7d httpOnly cookie) tokens.
- Password hashing with bcrypt (12 salt rounds).
- Auth API routes: POST /api/v1/auth/login, POST /api/v1/auth/refresh.
- Next.js middleware protecting /admin/* and write API routes.
- Admin layout with sidebar navigation.
- Admin login page with email/password form.
- Admin posts list page with status badges.
- CodeMirror 6 split-pane editor with one-dark theme.
- Live markdown preview via server-side rendering endpoint.
- Admin post creation and editing pages.

## [0.4.0] — 2026-07-06

### Added
- Theme registry with types, loader, and validation.
- Default theme with light/dark CSS variables, layout, post template, and list template.
- ThemeProvider context and useTheme hook (localStorage + prefers-color-scheme).
- Light/dark mode toggle in default theme header.
- Public blog homepage showing published posts.
- Single post route at /[slug] with server-rendered metadata.
- Tag-filtered post list at /tag/[tag].
- RSS 2.0 feed at /rss.xml.

## [0.2.0] - 2026-07-06

### Added

- Markdown parser with frontmatter (YAML) support and GFM rendering via remark/rehype.
- Content file watcher (chokidar) with two-way filesystem to database sync.
- Posts CRUD API (`GET/POST /api/v1/posts`, `GET/PUT/DELETE /api/v1/posts/:slug`).
- Tags CRUD API (`GET/POST /api/v1/tags`, `GET/PUT/DELETE /api/v1/tags/:id`).
- Media upload endpoint (`POST /api/v1/media/upload`).
- API response helpers with `{ data, error, meta }` envelope format.
- Zod validation schemas for posts and tags.
- App startup instrumentation (content ingestion + file watcher).

## [0.1.0] - 2026-07-06

### Added

- Initial design spec for Bifröst blogging framework.
- Project scaffolding: README, CHANGELOG, LICENSE.
- Next.js 16 project initialization with TypeScript strict mode.
- Tailwind CSS v4 integration with PostCSS.
- Drizzle ORM with SQLite adapter and complete schema (users, posts, tags, post_tags, media, settings).
- Config loading system with defaults and deep merge.
- Typed environment variable helper.
- Directory structure for all planned modules.
- Vitest, ESLint, and Prettier configuration.
