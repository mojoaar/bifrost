# REST API

Bifröst exposes a versioned REST API under `/api/v1/`. It powers the admin UI and is available for your own integrations, scripts, and headless front ends.

## Overview

- **Base path:** `/api/v1/`
- **Format:** JSON request and response bodies.
- **Versioning:** the `v1` prefix guarantees backward compatibility within the major version.

All routes return a consistent envelope (see below) and appropriate HTTP status codes.

## Authentication

Two credential types are accepted, both via the `Authorization` header:

1. **Session JWT** — issued at login (via `jose`), used by the admin UI.
2. **API key** — long-lived tokens prefixed with `bfk_`, created under **Admin → API Keys**.

```http
Authorization: Bearer bfk_xxxxxxxxxxxxxxxxxxxxxxxx
```

Requests without valid credentials to protected routes receive `401 Unauthorized`. Public read routes (e.g. published posts) may be accessed anonymously depending on settings.

## Response envelope

Every response uses the same shape:

```json
{
  "data": {},
  "error": null,
  "meta": {}
}
```

- `data` — the payload (object or array) on success, `null` on error.
- `error` — `null` on success, or `{ "code": "...", "message": "..." }` on failure.
- `meta` — pagination and contextual info (e.g. `total`, `page`, `perPage`).

Example success:

```json
{
  "data": [{ "slug": "hello", "title": "Hello" }],
  "error": null,
  "meta": { "total": 1, "page": 1, "perPage": 20 }
}
```

Example error:

```json
{
  "data": null,
  "error": { "code": "not_found", "message": "Post not found" },
  "meta": {}
}
```

## Endpoints

| Resource   | Base path            | Methods                       |
| ---------- | -------------------- | ----------------------------- |
| Posts      | `/api/v1/posts`      | GET, POST, PATCH, DELETE      |
| Pages      | `/api/v1/pages`      | GET, POST, PATCH, DELETE      |
| Media      | `/api/v1/media`      | GET, POST, DELETE             |
| Tags       | `/api/v1/tags`       | GET, PATCH, DELETE            |
| Users      | `/api/v1/users`      | GET, POST, PATCH, DELETE      |
| Settings   | `/api/v1/settings`   | GET, PATCH                    |
| Themes     | `/api/v1/themes`     | GET, PATCH                    |
| Git        | `/api/v1/git`        | GET (status/log), POST (sync) |
| AI         | `/api/v1/ai`         | POST (assist/generate)        |
| Analytics  | `/api/v1/analytics`  | GET                           |

### Examples

List posts:

```bash
curl -H "Authorization: Bearer $KEY" \
  "http://localhost:3000/api/v1/posts?page=1&perPage=20"
```

Create a post:

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"Hello","body":"# Hi","tags":["meta"],"draft":true}' \
  "http://localhost:3000/api/v1/posts"
```

Update a post:

```bash
curl -X PATCH -H "Authorization: Bearer $KEY" \
  -H "Content-Type: application/json" \
  -d '{"draft":false}' \
  "http://localhost:3000/api/v1/posts/hello"
```

## OpenAPI spec and explorer

An interactive OpenAPI explorer (Swagger UI, via `swagger-ui-react`) is served at:

```
http://localhost:3000/api/docs
```

The raw OpenAPI JSON is available for code generation and tooling. Use the explorer to try requests with your API key directly in the browser.

## Rate limiting

API requests are rate limited per credential. When you exceed the limit you receive `429 Too Many Requests` with headers describing the window:

```
X-RateLimit-Limit: 120
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1720444800
```

Back off and retry after the `X-RateLimit-Reset` timestamp. For bulk operations, prefer batching and pagination over rapid individual calls.
