# Audit Log

Bifröst maintains an append-only audit log of administrative and content-management actions for security and accountability.

## What is logged

The audit log records who performed what action, when, and from where:

| Field | Description |
|---|---|
| Timestamp | ISO 8601, when the event occurred |
| Actor (ID / label) | The user or API key that triggered the action |
| Actor type | `user`, `api_key`, `system`, or `anonymous` |
| Action | A machine-readable event name (e.g. `post.create`) |
| Target (type / ID) | What was affected (e.g. `post: my-post-slug`) |
| Status | `success` or `failure` |
| IP address | Client IP (from `x-forwarded-for` or `x-real-ip`) |
| User agent | Browser or client user-agent string |

## Tracked events

- **Auth**: login (success + failure), MFA verification, token refresh failures
- **MFA management**: MFA setup, disable, admin reset
- **Users**: create, update, delete
- **Content**: post and page create, update, delete
- **Settings**: any change (keys recorded, secret values never logged)
- **API keys**: create, revoke
- **Admin**: demo content reset
- **Content transfer**: export, import
- **Media**: upload, delete
- **Audit**: manual purge

## Browsing the audit log

Navigate to **Admin → Audit Log** in the sidebar. The page shows events in reverse chronological order with filters for action type and status (success/failure). Pagination splits results into pages of 50 entries.

## Retention

Audit log entries are automatically pruned after **90 days**. The pruning happens opportunistically whenever a new entry is written — no scheduled job required.

## Purging

The **Purge All** button in the audit log page permanently deletes all entries. The purge action itself is recorded as `audit.purge` before the delete, so the last surviving entry documents the purge.

## API

### List entries

```
GET /api/v1/audit
```

Query parameters:

| Parameter | Description |
|---|---|
| `page` | Page number (default 1) |
| `limit` | Entries per page (default 50, max 100) |
| `action` | Filter by action (e.g. `post.create`) |
| `actorId` | Filter by actor user id |
| `status` | `success` or `failure` |
| `from` | ISO 8601 timestamp, inclusive start |
| `to` | ISO 8601 timestamp, inclusive end |

### Purge all entries

```
DELETE /api/v1/audit
```

Requires admin authentication. Deletes all audit log entries and records an `audit.purge` event.
