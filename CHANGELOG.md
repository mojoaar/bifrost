# Changelog

All notable changes to Bifröst are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
