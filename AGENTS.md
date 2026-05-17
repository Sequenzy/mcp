# Sequenzy MCP - AI Agent Instructions

## Source of Truth

This repository is the standalone public package for `@sequenzy/mcp`.

The implementation is mirrored from the main Sequenzy monorepo package:

- Monorepo path: `packages/mcp`
- Public repo: `https://github.com/Sequenzy/mcp`
- Package name: `@sequenzy/mcp`

When both repositories are available locally, treat the monorepo `packages/mcp` package as the source of truth for implementation files and sync this standalone repository from it.

## Sync Rules

When MCP implementation changes in the monorepo, update this standalone repo in the same change set:

- `src/**`
- `package.json`
- `server.json`
- `tsconfig.json`
- tests under `src/**/*.test.ts`
- `README.md` when tools, resources, setup, environment variables, or user-facing behavior changes

Keep standalone repository metadata pointed at `https://github.com/Sequenzy/mcp`, even when syncing files from the monorepo. In practice, `package.json.repository`, `package.json.bugs`, and `server.json.repository` should reference this standalone repo.

## MCP Tool Schema Compatibility

MCP clients are not equally permissive. Keep published tool schemas conservative:

- Tool `inputSchema` roots must stay plain `type: "object"` schemas with `properties` and optional `required`.
- Do not publish `anyOf` anywhere in a tool `inputSchema`.
- Do not put `oneOf`, `allOf`, `enum`, or `not` at the root of a tool `inputSchema`.
- If a tool needs "provide either A or B", mutual exclusion, or conditional requirements, describe the rule in property descriptions and validate it inside the handler.
- Add or update tests that assert unsupported schema keywords are not published.

## Development

Use Bun for local work:

```bash
bun install
bun test
bun run type-check
bun run build
```

Do not require a real Sequenzy API key for unit tests. Tests must mock API calls and must not hit production systems.

## Documentation

When adding or changing tools or resources:

- Update the tool/resource list in `README.md`.
- Update setup instructions if environment variables or package entry points change.
- Include practical usage notes for non-obvious behavior, such as `html` vs `blocks`, nested segment filters, event merge tags, or dry-run flows.

Keep docs concise and accurate. Do not claim a tool exists unless it is present in `src/tools/index.ts`.
