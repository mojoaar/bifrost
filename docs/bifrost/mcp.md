# MCP Server

Bifröst ships a Model Context Protocol (MCP) server so AI agents can read and manage your content directly. It is built on `@modelcontextprotocol/sdk` and exposes both tools (actions) and resources (readable data).

## What is MCP?

MCP is a standard protocol that lets AI agents discover and call tools, and read structured resources, from a server. Bifröst's MCP server gives agents a safe, typed interface to your blog instead of scraping HTML or hitting raw endpoints.

## Starting the server

The MCP server is a standalone process, separate from the web app. Compile it once, then run it:

```bash
npm run build:mcp   # bundles to dist/mcp/http-server.cjs
npm run mcp:start   # runs the compiled server
```

This launches the server with an HTTP/SSE transport. Agents connect over Server-Sent Events at:

```
http://localhost:3456/sse
```

The port is `mcp.port` in `bifrost.config.ts` (default `3456`). It runs the HTTP/SSE transport regardless of the `mcp.mode` setting.

The server authenticates using the same API keys (`bfk_`) as the REST API. Provide the key to your agent's MCP client configuration.

## Available tools

Tools are callable actions. Bifröst exposes:

| Tool              | Description                                         |
| ----------------- | --------------------------------------------------- |
| `list_posts`      | List posts with optional filters and pagination.    |
| `get_post`        | Fetch a single post by slug.                        |
| `create_post`     | Create a new post from title, body, and frontmatter.|
| `update_post`     | Update an existing post's content or frontmatter.   |
| `delete_post`     | Delete a post by slug.                              |
| `search_posts`    | Full-text search across posts.                      |
| `ai_assist`       | Run an AI completion (draft, summarize, rewrite).   |
| `list_tags`       | List all tags with counts.                          |
| `get_settings`    | Read current site settings.                         |
| `update_settings` | Update site settings.                               |

Each tool has a typed input schema so agents can call it correctly and validate arguments.

## Resources

Resources are readable, addressable data exposed via `bifrost://` URIs:

| URI                        | Contents                          |
| -------------------------- | --------------------------------- |
| `bifrost://posts`          | Collection of all posts.          |
| `bifrost://posts/{slug}`   | A single post by slug.            |
| `bifrost://pages`          | Collection of all pages.          |
| `bifrost://tags`           | All tags.                         |
| `bifrost://settings`       | Current site settings.            |

Agents can subscribe to or read these resources to build context before acting.

## Connecting AI agents

Point any MCP-capable client at the SSE endpoint with your API key. Examples below use a generic MCP client config; adapt to your tool.

### opencode

Add an MCP server entry to your opencode config referencing the SSE URL and key:

```json
{
  "mcp": {
    "bifrost": {
      "type": "sse",
      "url": "http://localhost:3456/sse",
      "headers": { "Authorization": "Bearer bfk_..." }
    }
  }
}
```

### Claude Code

Register the server in your MCP settings with the same SSE URL and Authorization header. Claude Code will discover the tools and resources automatically once connected.

### Kilo Code

Add a remote MCP server pointing to `http://localhost:3456/sse` and supply the `bfk_` key as a bearer token. The Bifröst tools then appear in the agent's tool list.

## Typical agent workflow

1. Read `bifrost://settings` and `bifrost://tags` for context.
2. Call `search_posts` or `list_posts` to find relevant content.
3. Use `ai_assist` to draft or edit.
4. Persist with `create_post` or `update_post`.

Because every write goes through the same pipeline as the admin UI, agent changes are validated and versioned in Git (see [git.md](./git.md)).

## Security

- Scope access with dedicated API keys and revoke them when no longer needed.
- The MCP server respects the same authorization rules as the REST API.
- Run it behind your reverse proxy with TLS in production. See [Running the MCP server as a service](./deployment.md#running-the-mcp-server-as-a-service) for Docker Compose, systemd, and reverse-proxy examples.
