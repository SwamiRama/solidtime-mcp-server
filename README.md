# solidtime-mcp-server

[![CI](https://github.com/SwamiRama/solidtime-mcp-server/actions/workflows/ci.yml/badge.svg)](https://github.com/SwamiRama/solidtime-mcp-server/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm](https://img.shields.io/npm/v/solidtime-mcp-server)](https://www.npmjs.com/package/solidtime-mcp-server)

MCP server for [SolidTime](https://www.solidtime.io/) — the open-source time tracking app. Start/stop timers, manage time entries, projects, clients, tags, and tasks directly from Claude, Cursor, or any MCP-compatible client.

## Features

- **22 tools** covering time entries, projects, clients, tags, tasks, and user info
- **Start/stop timers** with automatic active-timer detection
- **Aggregated reports** grouped by day, week, project, client, and more
- **Auto member_id resolution** — no manual configuration needed
- **Actionable error messages** — every error tells you what to do next
- **Zero external dependencies** beyond the MCP SDK (uses native `fetch`)
- Works with self-hosted SolidTime instances and the hosted version

## Quick Start

### Using npx (no install)

```bash
npx solidtime-mcp-server
```

### Install globally

```bash
npm install -g solidtime-mcp-server
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOLIDTIME_API_TOKEN` | Yes | — | Your SolidTime API token |
| `SOLIDTIME_ORGANIZATION_ID` | Yes | — | Your organization UUID |
| `SOLIDTIME_API_URL` | No | `https://app.solidtime.io` | Base URL for self-hosted instances |

Get your API token from **SolidTime > Settings > API**.

## Claude Desktop Configuration

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "solidtime": {
      "command": "npx",
      "args": ["-y", "solidtime-mcp-server"],
      "env": {
        "SOLIDTIME_API_TOKEN": "your-token-here",
        "SOLIDTIME_ORGANIZATION_ID": "your-org-uuid-here",
        "SOLIDTIME_API_URL": "https://your-instance.example.com"
      }
    }
  }
}
```

## Claude Code Configuration

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "solidtime": {
      "command": "npx",
      "args": ["-y", "solidtime-mcp-server"],
      "env": {
        "SOLIDTIME_API_TOKEN": "your-token-here",
        "SOLIDTIME_ORGANIZATION_ID": "your-org-uuid-here",
        "SOLIDTIME_API_URL": "https://your-instance.example.com"
      }
    }
  }
}
```

## Tools

### Time Entries (8 tools)

| Tool | Description |
|------|-------------|
| `solidtime_start_timer` | Start a running timer (checks for existing active timer first) |
| `solidtime_stop_timer` | Stop the active timer |
| `solidtime_get_active_timer` | Get the currently running timer |
| `solidtime_list_time_entries` | List entries with filters (date range, project, client, tags, billable) |
| `solidtime_create_time_entry` | Create a completed entry with start and end times |
| `solidtime_update_time_entry` | Update any field on an existing entry |
| `solidtime_delete_time_entry` | Permanently delete an entry |
| `solidtime_get_time_entry_report` | Aggregated report by day/week/month/project/client/etc. |

### Projects (4 tools)

| Tool | Description |
|------|-------------|
| `solidtime_list_projects` | List all projects (filter by archived status) |
| `solidtime_create_project` | Create a project with name, color, billable rate |
| `solidtime_update_project` | Update project fields |
| `solidtime_delete_project` | Permanently delete a project |

### Clients (3 tools)

| Tool | Description |
|------|-------------|
| `solidtime_list_clients` | List all clients (filter by archived status) |
| `solidtime_create_client` | Create a client |
| `solidtime_update_client` | Update a client's name |

### Tags (3 tools)

| Tool | Description |
|------|-------------|
| `solidtime_list_tags` | List all tags |
| `solidtime_create_tag` | Create a tag |
| `solidtime_update_tag` | Update a tag's name |

### Tasks (3 tools)

| Tool | Description |
|------|-------------|
| `solidtime_list_tasks` | List tasks (filter by project, done status) |
| `solidtime_create_task` | Create a task within a project |
| `solidtime_update_task` | Update task name, done status, or estimated time |

### Users (1 tool)

| Tool | Description |
|------|-------------|
| `solidtime_get_current_user` | Get your user profile and resolved member ID |

## Usage Examples

**Start tracking time:**
> "Start a timer for the website redesign project"

**Log completed work:**
> "Create a time entry for today 9:00-11:30 on the API project, tagged as development"

**Get a weekly report:**
> "Show me a report of this week's hours grouped by project"

**Check what's running:**
> "Is there a timer running?"

## Troubleshooting

### "Authentication failed"
Your `SOLIDTIME_API_TOKEN` is invalid or expired. Generate a new one in SolidTime under Settings > API.

### "Permission denied"
Your token doesn't have access to the specified organization. Verify `SOLIDTIME_ORGANIZATION_ID`.

### "Cannot reach SolidTime"
Check that `SOLIDTIME_API_URL` is correct and the instance is accessible. For self-hosted: ensure the URL includes the protocol (e.g., `https://solidtime.example.com`).

### "Could not find member for user"
The authenticated user is not a member of the specified organization. Check `SOLIDTIME_ORGANIZATION_ID`.

## Development

```bash
git clone https://github.com/SwamiRama/solidtime-mcp-server.git
cd solidtime-mcp-server
npm install
npm run dev          # Run with tsx (dev mode)
npm run build        # Compile TypeScript
npm run lint         # ESLint
npm run typecheck    # Type checking
npm run inspector    # Test with MCP Inspector
```

## License

MIT
