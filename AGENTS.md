# AGENTS.md

Instructions for AI agents working on Bifröst.

## Project context

Bifröst is a self-hosted blogging framework with markdown-native authoring, built on Next.js 16 (App Router), TypeScript, Tailwind CSS v4, and Drizzle ORM.

Full design spec: [docs/superpowers/specs/2026-07-06-bifrost-design.md](docs/superpowers/specs/2026-07-06-bifrost-design.md)

## Key files

| File                                          | Purpose                           |
| --------------------------------------------- | --------------------------------- |
| `docs/superpowers/specs/2026-07-06-bifrost-design.md` | Design spec and phased plan       |
| `CHANGELOG.md`                                | Release changelog (Keep a Changelog) |
| `README.md`                                   | Project overview and quick start  |
| `bifrost.config.ts`                           | Site configuration                |
| `VERSION`                                     | Current semver version            |

## Conventions

### Technology stack

- Next.js 16 (App Router)
- TypeScript (strict mode)
- Tailwind CSS v4
- Drizzle ORM (SQLite default, Postgres optional)
- remark + rehype for markdown
- Shiki for syntax highlighting
- CodeMirror 6 for the editor
- chokidar for file watching
- @modelcontextprotocol/sdk for MCP server
- @ai-sdk/openai-compatible for AI providers
- jose + bcrypt for auth
- swagger-ui-react for API explorer

### Code style

- No comments unless the logic is genuinely non-obvious
- TypeScript strict mode — no `any` without explicit reason
- Server components by default in App Router, `"use client"` only when needed
- Use Drizzle's query builder (not raw SQL)
- API routes return `{ data, error, meta }` envelopes
- Environment variables prefixed with `BIFROST_` if Bifröst-specific

### Testing

- Vitest for unit/integration tests
- Playwright for E2E tests (when applicable)
- Run `npm run typecheck && npm run lint && npm test` before marking work complete

### Versioning

- Semantic versioning (MAJOR.MINOR.PATCH)
- Version in `VERSION` file and `package.json` (keep them in sync)
- Update `CHANGELOG.md` on every version bump
- Agent manages version bumps based on change type

### Git

- Write meaningful commit messages
- The content directory has its own Git repo (for post versioning)
- Never commit `.env` files or secrets
- Remote: `git@github.com:mojoaar/bifrost.git`

### License

AGPL-3.0 — all new source files must carry the license header.

## Development workflow

1. Load the spec at `docs/superpowers/specs/2026-07-06-bifrost-design.md`
2. Work through phases in order
3. Update `CHANGELOG.md` as features are added
4. Bump `VERSION` and `package.json` version at the end of each phase
5. Verify: `npm run typecheck && npm run lint && npm test`
