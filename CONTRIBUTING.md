# Contributing

Thanks for your interest in contributing to solidtime-mcp-server!

## Development Setup

```bash
git clone https://github.com/SwamiRama/solidtime-mcp-server.git
cd solidtime-mcp-server
npm install
```

## Development Workflow

```bash
# Run in dev mode (auto-recompile)
npm run dev

# Build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Testing with MCP Inspector

```bash
npm run inspector
```

This opens the MCP Inspector UI where you can test all tools interactively.

## Adding a New Tool

1. Find the appropriate file in `src/tools/` (or create one for a new resource)
2. Add the tool using `server.registerTool()` with:
   - A unique name prefixed with `solidtime_`
   - Title, description, and input schema using Zod
   - MCP annotations (readOnlyHint, destructiveHint, idempotentHint)
3. Register it in `src/server.ts`
4. Run `npm run build && npm run lint` to verify

## Code Style

- TypeScript strict mode
- Prettier for formatting (`npm run format`)
- ESLint for linting (`npm run lint`)
- No unnecessary comments — code should be self-explanatory

## Pull Requests

1. Fork the repo and create a feature branch
2. Make your changes
3. Ensure `npm run build`, `npm run lint`, and `npm run typecheck` all pass
4. Submit a PR with a clear description of what changed and why
