# Git Versioning

Bifröst treats content as source. Every post and page is a markdown file in a dedicated Git repository, and Bifröst commits changes for you automatically. This gives you a full, auditable history of every edit — and lets you push it anywhere.

## How it works

The `content/` directory is its own Git repository, separate from the application repo. Bifröst uses [`isomorphic-git`](https://isomorphic-git.org/) — a pure-JavaScript Git implementation — so versioning works without a system `git` binary and runs the same in Docker, serverless, and bare-metal environments.

```
content/            # its own git repo
  posts/
    hello.md
  pages/
    about.md
  .git/
```

## Auto-commit on create/update

When you save a post or page (via the editor, REST API, or MCP), Bifröst:

1. Writes the markdown file to the content repo.
2. Stages the change.
3. Creates a commit with a descriptive message, e.g.:

```
Update post: hello (draft → published)
```

Auto-commit can be toggled in **Settings → Git sync**. When disabled, changes are written to disk but not committed until you trigger a commit manually.

## Commit history per post

Each post has its own history — the sequence of commits that touched its file. From the editor you can open the **History** view to see:

- Commit messages and timestamps.
- The author of each change.
- Links to view or restore a prior version.

Because history is real Git, you can also inspect it with standard tooling:

```bash
cd content
git log --oneline -- posts/hello.md
```

## Diff view

The admin includes a **Diff** view that renders the changes between two versions of a post side by side, highlighting additions and deletions in the markdown. This is useful for reviewing edits before publishing or for understanding what changed between revisions.

## Push and pull to a remote

Bifröst can synchronize the content repo with a remote (GitHub, GitLab, a self-hosted server, etc.):

- **Push** — send local commits to the remote (e.g. for backup or CI-driven deploys).
- **Pull** — fetch and merge changes made elsewhere (e.g. edits committed directly to the repo).

Trigger sync from the admin or via the API:

```bash
curl -X POST -H "Authorization: Bearer $KEY" \
  -d '{"action":"push"}' \
  "http://localhost:3000/api/v1/git"
```

## Configuring the remote

Set the sync options under **Settings → Git sync**:

| Setting     | Description                                              |
| ----------- | ------------------------------------------------------- |
| Remote URL  | The Git remote, e.g. `git@github.com:you/blog-content.git` or an HTTPS URL. |
| Branch      | The branch to track, e.g. `main`.                       |
| Token       | A personal access token for authenticated HTTPS push/pull. |

The token is stored server-side and used by `isomorphic-git` as the HTTP auth credential. It is never sent to the browser.

### Example configuration

```
Remote URL: https://github.com/you/blog-content.git
Branch:     main
Token:      ghp_xxxxxxxxxxxxxxxxxxxx
```

## Best practices

- **Back up by pushing** — configure a remote so your content survives a lost server.
- **Use a dedicated content repo** — keep it separate from the app so deploys and content evolve independently.
- **Prefer the editor for edits** — it commits with meaningful messages; if you edit files directly, commit them yourself and pull into Bifröst.
- **Rotate tokens** — treat the sync token like any other secret and rotate it periodically.

## Troubleshooting

- **Push rejected** — pull first to merge remote changes, then push again.
- **Auth failed** — verify the token has repo write scope and the remote URL uses HTTPS.
- **Detached history** — ensure the configured branch exists on the remote and matches locally.
