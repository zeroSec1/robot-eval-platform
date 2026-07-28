# Robot Eval MCP server

An [MCP](https://modelcontextprotocol.io) server that exposes the Robot Eval
platform's data as tools an AI agent can call directly: browse episodes,
inspect one in full detail, pull aggregate stats, and run a policy-vs-policy
regression comparison, all without the agent needing to read the app's UI or
parse `src/data/*.json` itself.

It reads the same two files the Next.js app reads
(`../src/data/real-episodes.json` and `real-datasets.json`), fresh from disk
on every call, no separate database or sync step, no backend to run. Point
it at a repo with different data (e.g. the `develop` branch after running
your own adapter) and it just reflects whatever's actually there, including
an empty result if `src/data/` is empty.

## Tools

| Tool | What it does |
|---|---|
| `list_datasets` | Every ingested dataset: source format, episode count, avg. coverage |
| `list_episodes` | Filter by dataset, source format, policy version, outcome, failure category, or a task-text search; capped, compact summaries |
| `get_episode` | Full canonical record for one episode by id |
| `get_overview_stats` | Success rate, avg. duration, collision rate, failure breakdown, optionally scoped |
| `compare_policies` | Baseline vs. candidate policy version regression report, per task |
| `list_policy_versions` | Every distinct policy version with episode counts (discovery helper) |
| `list_failure_categories` | The fixed failure-category enum with display labels |

## Setup

```bash
cd mcp-server
npm install
npm run build
```

This produces `dist/index.js`, a standalone stdio MCP server (no dev server
or `npm run dev` needs to be running in the parent app; it reads the JSON
files directly from disk).

### Claude Desktop / Claude Code

Add to your MCP config (Claude Desktop: `claude_desktop_config.json`; Claude
Code: `.mcp.json` or `claude mcp add`):

```json
{
  "mcpServers": {
    "robot-eval": {
      "command": "node",
      "args": ["/absolute/path/to/robot-eval-platform/mcp-server/dist/index.js"]
    }
  }
}
```

Use an absolute path — MCP clients spawn the process from their own working
directory, not this repo's.

### Any other MCP client

It's a standard stdio server; point any MCP-compatible client at
`node dist/index.js` (or `npm run dev` during development, via `tsx`, no
build step needed).

## Development

```bash
npm run dev    # runs src/index.ts directly via tsx, no build step
```

`src/types.ts` and the stats/filter logic in `src/data.ts` are intentionally
self-contained copies of the shapes in `../src/lib/types.ts` and
`../src/lib/mock-data.ts`, not cross-package imports, so this server builds
and runs independently of the Next.js app's tsconfig/bundler. Keep them in
sync if the app's schema changes.
