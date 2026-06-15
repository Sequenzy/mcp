# Sequenzy MCP Server

Official MCP server for [Sequenzy](https://sequenzy.com), the AI-powered email marketing platform.

Connect Sequenzy to Claude Desktop, Claude Code, Codex, Cursor, Windsurf, VS Code Copilot, OpenClaw, and other MCP clients so your AI assistant can manage email operations with structured tools instead of hand-written API calls.

## What You Can Do

- Manage subscribers, tags, lists, and dynamic segments.
- Sync segments to Meta custom audiences for Facebook and Instagram retargeting.
- Manage products and attach digital delivery files for purchase automations.
- Draft, update, schedule, and inspect campaigns.
- Create and edit email sequences, including event-triggered and segment-entry automations.
- Cancel, pause, resume, duplicate, or delete campaigns and enroll contacts into sequences.
- Manage transactional email templates and send single transactional emails.
- Create, edit, publish, unpublish, and delete landing pages.
- Connect and verify custom domains for published landing pages.
- Manage team invitations, inbox conversations, and outbound webhook endpoints.
- Generate email copy, subject lines, and multi-step sequences.
- Inspect analytics, subscriber activity, deliverability health, and dashboard URLs.
- Configure sender websites and pull integration examples for common frameworks.

Every published MCP tool includes explicit `readOnlyHint`, `destructiveHint`, and `openWorldHint` annotations so compatible clients can display accurate tool-use affordances.

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

This server currently exposes 113 MCP tools.

### Account, Companies, Setup

| Tool                    | Description                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| `get_account`           | Get account info, available companies, and the current company.                                   |
| `select_company`        | Set the active company for future tool calls.                                                     |
| `get_app_urls`          | Build dashboard URLs for campaigns, landing pages, sequences, emails, settings, domains, and sent email details. |
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
| `search_subscribers` | Search by query, tags, list, status, segment, or pagination.                        |

### Products & Digital Delivery

| Tool                  | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `list_products`       | List synced products from Stripe, Shopify, WooCommerce, manual, or Commerce API data. |
| `upsert_products`     | Create or update up to 100 Commerce API products keyed by your product ID.            |
| `delete_product`      | Delete a product previously pushed through the Commerce API.                          |
| `attach_product_file` | Attach a hosted or locally uploaded delivery file to a product.                       |
| `remove_product_file` | Remove an attached product delivery file.                                             |
| `sync_products`       | Queue a Stripe product catalog sync.                                                  |

After a product delivery file is attached, matching purchase events include `download.url` and `download.name`, so purchase-triggered emails can use merge tags like `{{event.download.url}}`.

### Lists, Tags, Segments

| Tool                           | Description                                                 |
| ------------------------------ | ----------------------------------------------------------- |
| `list_tags`                    | List all tags.                                              |
| `create_tag`                   | Create a tag definition with an optional color.             |
| `update_tag`                   | Update a tag color.                                         |
| `delete_tag`                   | Delete a tag and remove it from subscribers.                |
| `list_lists`                   | List subscriber lists.                                      |
| `create_list`                  | Create a subscriber list.                                   |
| `update_list`                  | Rename or describe a subscriber list.                       |
| `delete_list`                  | Delete a subscriber list.                                   |
| `add_subscribers_to_list`      | Add up to 500 subscribers to a list from an email array.    |
| `remove_subscribers_from_list` | Remove up to 500 subscribers from a list.                   |
| `list_segments`                | List saved segments and counts.                             |
| `create_segment`               | Create saved segments from filters or nested AND/OR groups. |
| `update_segment`               | Update segment name, filters, root group, or join operator. |
| `delete_segment`               | Delete a saved segment.                                     |
| `get_segment_count`            | Preview the active subscriber count for a segment.          |

For subscriber exports, `search_subscribers` accepts `listId`, exact `listName`, or `list` (ID first, then exact name). If `limit` is omitted, the tool fetches all matching subscribers using 100-row API pages.

For bulk list population, use `add_subscribers_to_list`; the backing API endpoint is `POST /api/v1/lists/{listId}/subscribers` with no `/bulk` suffix:

```json
{
  "emails": ["ada@example.com", "grace@example.com"],
  "duplicateStrategy": "skip",
  "enrollInSequences": false,
  "optInMode": "default"
}
```

Send at most 500 emails per request. Standard API rate limits still apply: 100 requests per minute per API key and 20 requests per second burst. For CSV-driven CLI imports, accepted email headers include `email`, `e-mail`, `email address`, and `mail`; if no recognized header exists, the CLI reads the first column.

Segment filters support attributes, events, saved segment membership, engagement events, Stripe product purchase rules, and commerce product purchase rules. Use `filterJoinOperator: "or"` for match-any segments, or pass a v2 `root` group for nested logic.

Each segment filter field validates its own operators:

- `status`, `segment`: `is`, `is_not`
- `tag`: `contains`, `not_contains`, `is_empty`, `is_not_empty`
- `email`: `contains`, `not_contains`
- `emailProvider`, `list`: `is`, `is_not`, `is_empty`, `is_not_empty`
- `firstName`, `lastName`: `contains`, `not_contains`, `is_empty`, `is_not_empty`
- `added`: `less_than`, `more_than`
- `attribute`: `is`, `is_not`, `is_empty`, `is_not_empty`, `gte`, `lte`, `gt`, `lt`, `contains`, `not_contains`
- `event`, email engagement fields: `is`, `is_not`, `at_least`, `less_than_count`
- `emailBounced`: also supports `is_temporary_bounce`, `is_permanent_bounce`
- `stripeProduct`: `is`, `is_not`, `at_least`, `less_than_count`
- `stripeCurrentProduct`, `stripeTrialProduct`: `is`, `is_not`, `gte`, `lte`, `gt`, `lt`
- `commerceProduct`: `is`, `is_not`, `at_least`, `less_than_count`

Stripe product filter examples:

```json
{ "field": "stripeProduct", "operator": "is", "value": "prod_pro" }
{ "field": "stripeProduct", "operator": "is_not", "value": "prod_pro" }
{ "field": "stripeProduct", "operator": "at_least", "value": "prod_pro:3" }
{ "field": "stripeProduct", "operator": "less_than_count", "value": "prod_pro:3" }
```

Commerce product filters match products purchased through commerce orders. Values can be `provider:productId` for provider-scoped IDs (`shopify`, `woocommerce`, or `api`), a bare product ID to match any provider, or `provider:productId:count` for threshold operators:

```json
{ "field": "commerceProduct", "operator": "is", "value": "api:starter-kit" }
{ "field": "commerceProduct", "operator": "at_least", "value": "shopify:42:2" }
```

Engagement fields such as `emailSent`, `emailDelivered`, `emailOpened`, `emailClicked`, `emailBounced`, and `emailComplained` accept rolling windows like `7d`, `30d`, `90d`, `180d`, `all`, threshold values like `5:30d`, or a campaign scope like `campaign:cmp_123`.

### Audience Syncs (Meta Ads)

| Tool                   | Description                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `list_audience_syncs`  | List segment-to-audience syncs with schedule and last sync status.   |
| `list_ad_accounts`     | List the Meta ad accounts available for syncing.                     |
| `create_audience_sync` | Push a segment to a Meta custom audience on a schedule.              |
| `update_audience_sync` | Change sync frequency (`hourly`, `daily`, `weekly`) or pause/resume. |
| `delete_audience_sync` | Remove a sync mapping; the Meta audience itself is kept.             |
| `sync_audience_now`    | Trigger an immediate upload outside the regular schedule.            |

Requires the Meta Ads integration to be connected in the Sequenzy dashboard (Settings -> Integrations). `create_audience_sync` accepts an existing segment (`segmentId`) or a ready-made template (`predefinedSegmentId`, for example `zero-ltv`, `no-purchase-1y`, `recent-buyers`, `high-spenders-ecom`, `non-buyers`, `engaged`) - the template segment is created automatically on first use, and the first upload runs immediately.

Audiences are add-only: subscribers who later leave the segment stay in the Meta audience. Meta requires 100+ matched people before an audience can be used for ad delivery.

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
| `restart_ab_test`        | Restart a stopped or completed A/B test.                       |
| `update_ab_test_variant` | Update a draft variant subject, preview text, HTML, or blocks. |
| `create_ab_test`         | Create a campaign or sequence A/B test.                        |
| `add_ab_test_variant`    | Add a variant to an existing A/B test.                         |
| `delete_ab_test_variant` | Delete a draft A/B test variant.                               |
| `delete_ab_test`         | Delete an A/B test.                                            |

Use `get_ab_test` to discover variant IDs before editing. Variant updates accept either `html` or `blocks`, not both.

### Campaigns

| Tool                 | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| `list_campaigns`     | List campaigns, optionally filtered by status.                           |
| `get_campaign`       | Get campaign details and stats.                                          |
| `get_email_send`     | Inspect a sent email detail record.                                      |
| `create_campaign`    | Create a draft campaign from HTML, blocks, a template, or campaign data. |
| `update_campaign`    | Update a draft campaign, including campaign data and computed lists.     |
| `schedule_campaign`  | Schedule a draft or reschedule an existing scheduled campaign.           |
| `send_test_email`    | Send a test email to one address.                                        |
| `cancel_campaign`    | Cancel a scheduled or sending campaign.                                  |
| `pause_campaign`     | Pause a sending campaign.                                                |
| `resume_campaign`    | Resume a paused campaign, optionally spreading delivery over time.       |
| `delete_campaign`    | Delete a campaign.                                                       |
| `duplicate_campaign` | Duplicate a campaign into a new draft.                                   |

### Landing Pages

| Tool                                  | Description                                                              |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `list_landing_pages`                  | List landing pages with status, metrics, content, and URLs.              |
| `get_landing_page`                    | Get landing page details, builder content, metrics, and public URLs.     |
| `create_landing_page`                 | Create a draft landing page from default template content or JSON.       |
| `update_landing_page`                 | Edit a landing page name, slug, or full editor-compatible content.       |
| `publish_landing_page`                | Publish a landing page, optionally saving edits first.                   |
| `unpublish_landing_page`              | Return a landing page to draft status, optionally saving edits first.    |
| `delete_landing_page`                 | Delete an unpublished landing page.                                      |
| `connect_landing_page_domain`         | Connect a custom landing page domain and return DNS setup details.       |
| `update_landing_page_domain_settings` | Replace or verify landing page custom domain settings.                   |

Landing page content uses Sequenzy's editor-compatible JSON schema with `version`, `template`, `seo`, `theme`, and `blocks`. Custom landing page domains require a CNAME record pointing to `pages.sequenzydns.com`; call `update_landing_page_domain_settings` with `verify: true` after DNS changes propagate.

### Sequences

| Tool                             | Description                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `list_sequences`                 | List email sequences and automation status.                                                         |
| `get_sequence`                   | Get sequence details, including step `nodeId`, linked `emailId`, subject, preview text, and blocks. |
| `create_sequence`                | Create AI-generated or explicit-step sequences.                                                     |
| `update_sequence`                | Update sequence settings, trigger, enrollment behavior, or specific steps.                          |
| `enable_sequence`                | Activate a sequence.                                                                                |
| `disable_sequence`               | Pause a sequence.                                                                                   |
| `enroll_subscribers_in_sequence` | Enroll up to 500 subscribers into a sequence, optionally at a target node.                          |
| `cancel_sequence_enrollments`    | Stop active or waiting enrollments by subscriber or entry-event field values.                       |
| `delete_sequence`                | Delete a sequence.                                                                                  |

Sequence creation supports:

- `trigger: "segment_entered"` plus `segmentId` for saved-segment entry automations.
- `trigger: "event_received"` plus `{{event.*}}` merge tags in subjects or body content.
- `trigger: "inactivity"` plus `eventName`, `inactiveDays`, and optional `inactivityBaseline` (`sequence_created_at` or `subscriber_created_at`).
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
    "backgroundOpacity": 85,
    "borderColor": "#cbd5e1",
    "borderWidth": 1,
    "borderRadius": 12
  }
}
```

For compatibility with older agent prompts, top-level style keys such as `backgroundColor`, `backgroundOpacity`, `borderColor`, `borderWidth`, and `borderRadius` are also accepted and saved under `styles`.

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

### Team, Inbox, Webhooks

| Tool                         | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `list_team_members`          | List team members and pending invitations.                          |
| `invite_team_member`         | Invite a teammate as admin or viewer, with optional billing access. |
| `cancel_team_invitation`     | Cancel a pending team invitation.                                   |
| `list_conversations`         | List subscriber reply conversations with status and unread filters. |
| `get_conversation`           | Read a conversation and its message history.                        |
| `reply_to_conversation`      | Send an outbound reply or add an internal note.                     |
| `update_conversation_status` | Open or close a conversation.                                       |
| `mark_conversation_read`     | Mark all messages in a conversation as read.                        |
| `list_webhooks`              | List outbound webhook endpoints.                                    |
| `create_webhook`             | Create an outbound webhook and return its one-time signing secret.  |
| `update_webhook`             | Update webhook name, URL, events, or status.                        |
| `delete_webhook`             | Permanently delete a webhook endpoint and delivery history.         |
| `test_webhook`               | Send a test event to a webhook endpoint.                            |
| `list_webhook_deliveries`    | List recent delivery attempts for a webhook.                        |
| `replay_webhook_delivery`    | Replay a webhook delivery.                                          |

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
