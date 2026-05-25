# Sequenzy MCP Server

Official MCP server for [Sequenzy](https://sequenzy.com), the AI-powered email marketing platform.

Connect Sequenzy to Claude Desktop, Claude Code, Codex, Cursor, Windsurf, VS Code Copilot, OpenClaw, and other MCP clients so your AI assistant can manage email operations with structured tools instead of hand-written API calls.

## What You Can Do

- Manage subscribers, tags, lists, and dynamic segments.
- Draft, update, schedule, and inspect campaigns.
- Create and edit email sequences, including event-triggered and segment-entry automations.
- Manage transactional email templates and send single transactional emails.
- Generate email copy, subject lines, and multi-step sequences.
- Inspect analytics, subscriber activity, deliverability health, and dashboard URLs.
- Configure sender websites and pull integration examples for common frameworks.

## Quick Setup

The easiest setup path is the Sequenzy wizard:

```bash
npx @sequenzy/setup
```

The wizard opens the browser login flow, creates a personal API key, detects supported AI clients, and configures them automatically when possible.

## Manual Setup

All stdio MCP clients use the same command:

- Command: `npx`
- Args: `-y @sequenzy/mcp`
- Required env: `SEQUENZY_API_KEY=seq_user_your_key_here`

Optional environment variables:

- `SEQUENZY_API_URL` - Sequenzy API base URL. Defaults to `https://api.sequenzy.com`.
- `SEQUENZY_APP_URL` - Sequenzy dashboard base URL used by app URL helpers. Defaults to `https://sequenzy.com`.

### Claude Desktop

Add this to your Claude Desktop config:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "sequenzy": {
      "command": "npx",
      "args": ["-y", "@sequenzy/mcp"],
      "env": {
        "SEQUENZY_API_KEY": "seq_user_your_key_here"
      }
    }
  }
}
```

Restart Claude Desktop after editing the config.

### Claude Code

```bash
claude mcp add --scope user --env=SEQUENZY_API_KEY=seq_user_your_key_here sequenzy -- npx -y @sequenzy/mcp
```

On native Windows, wrap `npx` with `cmd /c`:

```bash
claude mcp add --scope user --env=SEQUENZY_API_KEY=seq_user_your_key_here sequenzy -- cmd /c npx -y @sequenzy/mcp
```

For a shared project config, use `.mcp.json`:

```json
{
  "mcpServers": {
    "sequenzy": {
      "command": "npx",
      "args": ["-y", "@sequenzy/mcp"],
      "env": {
        "SEQUENZY_API_KEY": "seq_user_your_key_here"
      }
    }
  }
}
```

### Codex

```bash
codex mcp add sequenzy --env SEQUENZY_API_KEY=seq_user_your_key_here -- npx -y @sequenzy/mcp
codex mcp list
```

Manual Codex config in `~/.codex/config.toml`:

```toml
[mcp_servers.sequenzy]
command = "npx"
args = ["-y", "@sequenzy/mcp"]

[mcp_servers.sequenzy.env]
SEQUENZY_API_KEY = "seq_user_your_key_here"
```

### Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "sequenzy": {
      "command": "npx",
      "args": ["-y", "@sequenzy/mcp"],
      "env": {
        "SEQUENZY_API_KEY": "seq_user_your_key_here"
      }
    }
  }
}
```

### Windsurf

Use the same JSON shape as Cursor.

- macOS: `~/Library/Application Support/Windsurf/mcp.json`
- Windows: `%APPDATA%\Windsurf\mcp.json`

### VS Code Copilot

VS Code uses a `servers` object:

```json
{
  "servers": {
    "sequenzy": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@sequenzy/mcp"],
      "env": {
        "SEQUENZY_API_KEY": "seq_user_your_key_here"
      }
    }
  }
}
```

### Other MCP Clients

For OpenClaw, Hermes, and other MCP-compatible clients, point the client at `npx -y @sequenzy/mcp` and set `SEQUENZY_API_KEY`.

## Getting an API Key

1. Open [the Sequenzy dashboard](https://sequenzy.com/dashboard).
2. Go to Settings -> API Keys.
3. Create a personal key.
4. Add the key to your MCP client config.

Personal keys start with `seq_user_`. You can revoke them any time in the dashboard.

## Tools

This server currently exposes 57 MCP tools.

### Account, Companies, Setup

| Tool                    | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `get_account`           | Get account info, available companies, and the current company.                                   |
| `select_company`        | Set the active company for future tool calls.                                                     |
| `get_app_urls`          | Build dashboard URLs for campaigns, sequences, emails, settings, domains, and sent email details. |
| `create_company`        | Create a new company or brand.                                                                    |
| `get_company`           | Read company details and localization settings.                                                   |
| `create_api_key`        | Create an API key for a company.                                                                  |
| `list_websites`         | List configured sender websites and domains.                                                      |
| `add_website`           | Add a sender website. Processing can take around 30 seconds.                                      |
| `check_website`         | Check whether a website is processed and ready.                                                   |
| `get_integration_guide` | Get framework-specific integration examples.                                                      |

### Subscribers

| Tool                 | Description                                                                         |
| -------------------- | ----------------------------------------------------------------------------------- |
| `add_subscriber`     | Add a subscriber with attributes, tags, status, opt-in mode, and optional list IDs. |
| `update_subscriber`  | Update attributes, add tags, or remove tags.                                        |
| `remove_subscriber`  | Unsubscribe a subscriber or hard-delete them.                                       |
| `get_subscriber`     | Fetch subscriber details by email or external ID.                                   |
| `search_subscribers` | Search by query, tags, status, segment, or pagination.                              |

### Lists, Tags, Segments

| Tool                | Description                                                 |
| ------------------- | ----------------------------------------------------------- |
| `list_tags`         | List all tags.                                              |
| `list_lists`        | List subscriber lists.                                      |
| `create_list`       | Create a subscriber list.                                   |
| `list_segments`     | List saved segments and counts.                             |
| `create_segment`    | Create saved segments from filters or nested AND/OR groups. |
| `get_segment_count` | Preview the active subscriber count for a segment.          |

Segment filters support attributes, events, saved segment membership, engagement events, and Stripe product purchase rules. Use `filterJoinOperator: "or"` for match-any segments, or pass a v2 `root` group for nested logic.

Stripe product filter examples:

```json
{ "field": "stripeProduct", "operator": "is", "value": "prod_pro" }
{ "field": "stripeProduct", "operator": "is_not", "value": "prod_pro" }
{ "field": "stripeProduct", "operator": "at_least", "value": "prod_pro:3" }
{ "field": "stripeProduct", "operator": "less_than_count", "value": "prod_pro:3" }
```

Engagement fields such as `emailSent`, `emailOpened`, `emailClicked`, `emailBounced`, and `emailComplained` accept rolling windows like `7d`, `30d`, `90d`, `180d`, `all`, or a campaign scope like `campaign:cmp_123`.

### Templates

| Tool              | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `list_templates`  | List templates with localization status.                |
| `get_template`    | Read template details, content, and localized variants. |
| `create_template` | Create templates from HTML or Sequenzy blocks.          |
| `update_template` | Update template metadata, labels, HTML, or blocks.      |
| `delete_template` | Delete a template.                                      |

### A/B Tests

| Tool                     | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `list_ab_tests`          | List A/B tests and variants, optionally scoped by sequence.    |
| `get_ab_test`            | Get variants, content, and localization status.                |
| `get_ab_test_stats`      | Get aggregate and per-variant stats.                           |
| `update_ab_test_variant` | Update a draft variant subject, preview text, HTML, or blocks. |

Use `get_ab_test` to discover variant IDs before editing. Variant updates accept either `html` or `blocks`, not both.

### Campaigns

| Tool                | Description                                                              |
| ------------------- | ------------------------------------------------------------------------ |
| `list_campaigns`    | List campaigns, optionally filtered by status.                           |
| `get_campaign`      | Get campaign details and stats.                                          |
| `get_email_send`    | Inspect a sent email detail record.                                      |
| `create_campaign`   | Create a draft campaign from HTML, blocks, a template, or campaign data. |
| `update_campaign`   | Update a draft campaign, including campaign data and computed lists.     |
| `schedule_campaign` | Schedule a draft or reschedule an existing scheduled campaign.           |
| `send_test_email`   | Send a test email to one address.                                        |

### Sequences

| Tool                          | Description                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| `list_sequences`              | List email sequences and automation status.                                                         |
| `get_sequence`                | Get sequence details, including step `nodeId`, linked `emailId`, subject, preview text, and blocks. |
| `create_sequence`             | Create AI-generated or explicit-step sequences.                                                     |
| `update_sequence`             | Update sequence settings, trigger, enrollment behavior, or specific steps.                          |
| `enable_sequence`             | Activate a sequence.                                                                                |
| `disable_sequence`            | Pause a sequence.                                                                                   |
| `cancel_sequence_enrollments` | Stop active or waiting enrollments by subscriber or entry-event field values.                       |
| `delete_sequence`             | Delete a sequence.                                                                                  |

Sequence creation supports:

- `trigger: "segment_entered"` plus `segmentId` for saved-segment entry automations.
- `trigger: "event_received"` plus `{{event.*}}` merge tags in subjects or body content.
- `goal` for AI-generated email content.
- Explicit `steps` with Sequenzy `blocks`.
- Explicit `steps` with HTML, which Sequenzy converts into editable blocks.
- Discount action steps that expose merge tags like `{{discount.code}}` and `{{discount.percentOff}}`.
- `enrollmentMode: "matching_field"` and `enrollmentFieldPath` for product-, variant-, order-, or subscription-specific event automations.

Run `cancel_sequence_enrollments` with `dryRun: true` before applying bulk cancellation.

### Email Block Styling

Tools that accept `blocks` persist per-block visual styling under a block's `styles` object:

```json
{
  "type": "card",
  "title": "Your update",
  "content": "Everything is ready.",
  "variant": "default",
  "styles": {
    "backgroundColor": "#f8fafc",
    "borderColor": "#cbd5e1",
    "borderWidth": 1,
    "borderRadius": 12
  }
}
```

For compatibility with older agent prompts, top-level style keys such as `backgroundColor`, `borderColor`, `borderWidth`, and `borderRadius` are also accepted and saved under `styles`.

### Transactional Email

| Tool                         | Description                                            |
| ---------------------------- | ------------------------------------------------------ |
| `list_transactional_emails`  | List transactional templates and API slugs.            |
| `get_transactional_email`    | Read a transactional email by ID or slug.              |
| `create_transactional_email` | Create a transactional email template.                 |
| `update_transactional_email` | Update transactional metadata or body content.         |
| `send_email`                 | Send a single transactional email by template or HTML. |

`send_email` variables support nested arrays for repeat blocks, such as `{ "event": { "items": [...] } }`.

### Analytics

| Tool                      | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `get_stats`               | Get overview stats for `7d`, `30d`, or `90d`.          |
| `get_campaign_stats`      | Get detailed campaign performance.                     |
| `get_sequence_stats`      | Get sequence performance.                              |
| `get_subscriber_activity` | Get subscriber email stats, activity, and enrollments. |

### AI Generation

| Tool                     | Description                                  |
| ------------------------ | -------------------------------------------- |
| `generate_email`         | Generate email blocks from a prompt.         |
| `generate_sequence`      | Generate a multi-email sequence from a goal. |
| `generate_subject_lines` | Generate A/B subject line variants.          |

Generated content is returned as draft content for review.

## Resources

The server also exposes read-only MCP resources.

| Resource                         | Description                                    |
| -------------------------------- | ---------------------------------------------- |
| `sequenzy://dashboard`           | Live overview stats for the last 7 days.       |
| `sequenzy://company`             | Current company and localization settings.     |
| `sequenzy://campaigns/recent`    | Last 10 campaigns with status and basic stats. |
| `sequenzy://subscribers/recent`  | Most recently added subscribers.               |
| `sequenzy://subscribers/engaged` | Most active or engaged subscribers.            |
| `sequenzy://sequences`           | All sequences with status.                     |
| `sequenzy://templates`           | Templates with localization status.            |
| `sequenzy://segments`            | Saved segments with subscriber counts.         |
| `sequenzy://tags`                | Tags with usage counts.                        |
| `sequenzy://health`              | Deliverability metrics and health status.      |
| `sequenzy://app-routes`          | Dashboard route templates and settings tabs.   |

## Example Prompts

```text
Add john@example.com with tags "vip" and "developer", then put them on the beta list.
```

```text
Create a 4-email churn prevention sequence for users whose subscription expires soon. Leave it in draft mode.
```

```text
Create a segment for subscribers who bought Stripe product prod_pro at least 3 times.
```

```text
Draft a campaign about our new analytics dashboard, target the Pro users segment, and send a test to me.
```

```text
How did the last campaign perform compared with the one before it?
```

## Security

- Use personal API keys, not shared team secrets.
- Keys only access companies your Sequenzy user can access.
- Revoke keys from Settings -> API Keys when access is no longer needed.
- Keep client approval prompts enabled for sends, scheduling, deletes, and bulk changes.
- Prefer draft workflows for campaigns and sequences, then review in Sequenzy before launch.

## Troubleshooting

### `SEQUENZY_API_KEY environment variable is required`

Set `SEQUENZY_API_KEY` in the MCP client config, or run:

```bash
npx @sequenzy/setup
```

### Invalid API Key

Create a new personal key in Settings -> API Keys, update your MCP config, and restart the client.

### Duplicate Resources

If a tool call would create a duplicate segment name or sending domain, the server returns a stable `code`, an agent-friendly `description`, a concrete `resolution`, and a `docsUrl`. For segments, call `list_segments` and reuse the existing segment ID or choose a different name. For websites, call `list_websites`; if the domain is not listed for the selected company, it belongs to another company or account and must be removed, reassigned, or replaced with a different sending domain.

### Tools Do Not Appear

- Confirm `npx` is available in the environment the client uses.
- Restart the MCP client after editing config.
- Check that the config is in the correct client-specific location.

### Network or API URL Issues

The server uses `https://api.sequenzy.com` by default. If you override it, verify `SEQUENZY_API_URL` points at a reachable Sequenzy API base URL.

## Development

```bash
bun install
bun test
bun run type-check
bun run build
```

MCP tool schemas must remain compatible with strict clients:

- Tool `inputSchema` roots must be plain `type: "object"` schemas.
- Do not publish `anyOf` anywhere in tool schemas.
- Do not put `oneOf`, `allOf`, `enum`, or `not` at the root of a tool schema.
- Enforce conditional requirements in handlers and cover them with tests.

This standalone repository mirrors the MCP package maintained in the main Sequenzy monorepo. See `AGENTS.md` for sync rules.

## License

MIT
