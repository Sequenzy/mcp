# Sequenzy MCP Server

Official MCP server for [Sequenzy](https://sequenzy.com), the AI-powered email marketing platform.

Connect Sequenzy to Claude Desktop, Claude Code, Codex, Cursor, Windsurf, VS Code Copilot, OpenClaw, and other MCP clients so your AI assistant can manage email operations with structured tools instead of hand-written API calls.

## What You Can Do

- Manage subscribers, tags, lists, and dynamic segments.
- Sync segments to Meta custom audiences for Facebook and Instagram retargeting.
- Manage products and attach digital delivery files for purchase automations.
- Upload hosted email images with alt text and reusable responsive crop settings.
- Draft, update, schedule, and inspect campaigns, including From and Reply-To identities.
- Add one-click Poll and NPS survey blocks to emails and inspect campaign response summaries.
- Create and edit email sequences, including event-triggered and segment-entry automations, sending identity overrides, and existing graph restructuring.
- Cancel, pause, resume, duplicate, or delete campaigns and enroll contacts into sequences.
- Manage transactional email templates and send single transactional emails.
- Supply localized template variants or queue AI translation for enabled locales.
- Create, edit, publish, unpublish, and delete landing pages.
- Create list-scoped saved signup forms and return client-safe static-site embeds.
- Connect and verify custom domains for published landing pages.
- Manage team invitations, inbox conversations, and outbound webhook endpoints.
- Generate email copy, subject lines, and multi-step sequences.
- Inspect analytics, subscriber activity, deliverability health, and dashboard URLs.
- Configure company product info, account-wide sending identity defaults, sender domains, and integration examples for common frameworks.

Every published MCP tool includes explicit `readOnlyHint`, `destructiveHint`, and `openWorldHint` annotations so compatible clients can display accurate tool-use affordances. Tools also publish `outputSchema` definitions and return `structuredContent`, giving clients and models machine-readable result shapes for follow-up calls.

## Quick Setup

The easiest setup path is the Sequenzy wizard:

```bash
npx @sequenzy/setup
```

The wizard opens the browser login flow, creates a personal API key, detects supported AI clients, and configures them automatically when possible.

## Hosted Remote MCP

For clients that support Streamable HTTP MCP, use Sequenzy's hosted endpoint instead of running a local stdio process:

```text
https://api.sequenzy.com/v1/mcp
```

Remote clients should authenticate with the Sequenzy OAuth flow when supported. Local and automation clients can still use the stdio package below with `SEQUENZY_API_KEY`.

Machine-readable discovery files:

- MCP server manifest: [`server.json`](server.json)
- Agent card: [`.well-known/agent-card.json`](.well-known/agent-card.json)
- Agent capability manifest: [`agent-capability.json`](agent-capability.json)
- OpenClaw skill metadata: [`openclaw/skill.json`](openclaw/skill.json)

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
2. Use the **MCP** setup flow to create a personal key, or open **Settings ->
   API Keys** to create a company key.
3. Choose a permission preset or the exact custom scopes the integration needs.
4. Add the key to your MCP client config.

Personal keys start with `seq_user_`. You can revoke them any time in the dashboard.

### Recover from missing API key permissions

If a tool reports a missing scope such as `campaigns:read` or
`templates:write`, call `get_account`. Its `apiKeyPermissions` field lists the
current scopes, common missing marketing read scopes, and a direct `manageUrl`
for API Keys settings. If the key does not include `account:read`, open the
[Sequenzy dashboard](https://sequenzy.com/dashboard) directly and use the MCP
setup or **Settings → API Keys** instead.

Permissions cannot be changed on an existing key. For a local API-key
connection, open `manageUrl`, create a replacement key with **Read-only**,
**Safer agent access**, or the exact custom scopes named in the error, update
`SEQUENZY_API_KEY`, and restart the client. For hosted OAuth MCP, disconnect and
reauthorize the Sequenzy connection with a preset or custom permissions that
include the missing scopes.

## Tools

This server currently exposes 139 MCP tools.

### Account, Companies, Setup

| Tool                    | Description                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `get_account`           | Get account info, available companies, current key permissions, and the API Keys management URL.                 |
| `select_company`        | Set the active company for future tool calls.                                                                    |
| `get_app_urls`          | Build dashboard URLs for campaigns, landing pages, sequences, emails, settings, domains, and sent email details. |
| `create_company`        | Create a new company or brand.                                                                                   |
| `get_company`           | Read company details, product info, brand context, localization, and current From/Reply-To defaults.             |
| `update_company`        | Edit product info, brand context, and account-wide From/Reply-To defaults.                                       |
| `create_api_key`        | Create an API key for a company, with optional permission preset or explicit scopes.                             |
| `list_websites`         | List sending domains with stored aggregate, SPF, DKIM, and MAIL FROM status.                                     |
| `add_sending_domain`    | Add a sending domain and return its SPF, DKIM, MAIL FROM, and inbound DNS setup records.                         |
| `add_website`           | Compatibility alias for `add_sending_domain`.                                                                    |
| `check_website`         | Read a sending domain's stored SPF, DKIM, MAIL FROM, and aggregate verification details.                         |
| `verify_sending_domain` | Run a fresh sending-domain DNS/provider verification and return current status and diagnostics.                  |
| `get_integration_guide` | Get framework-specific integration examples.                                                                     |

For a new sending domain, call `add_sending_domain`, publish the DNS records in
the returned `website.dnsRecords`, wait for DNS propagation, and then call
`verify_sending_domain`. If verification is attempted before creation, the
error points back to `add_sending_domain` with the requested domain.

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

### Image Assets

| Tool                 | Description                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------- |
| `upload_image_asset` | Upload an email image and return its hosted media record plus a ready-to-insert image block. |

The tool accepts PNG, JPEG, GIF, and WebP images up to 5MB. Local stdio clients
can pass `filePath`. Hosted/remote clients that can access attachment bytes can
pass `imageBase64` with `filename`. Provide `altText` for accessibility, then
use `displayWidthPercent`, `cropHeight`, `objectFit` (`cover` or `contain`), and
`align` to standardize screenshot presentation. The returned `imageBlock` can
be copied directly into the block array accepted by campaign, sequence,
template, and transactional-email tools.

```json
{
  "filePath": "/Users/me/Desktop/product-results.png",
  "altText": "Product results dashboard",
  "displayWidthPercent": 100,
  "cropHeight": 320,
  "objectFit": "cover",
  "align": "center"
}
```

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

Engagement fields such as `emailSent`, `emailDelivered`, `emailOpened`, `emailClicked`, `emailBounced`, and `emailComplained` accept rolling windows like `7d`, `30d`, `90d`, `180d`, or `all`. With `at_least` and `less_than_count`, use `count:timeRange`, such as `10:30d` or `10:all`. Presence operators can instead use a campaign scope like `campaign:cmp_123`; campaign scopes cannot be combined with count operators.

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

| Tool                          | Description                                                           |
| ----------------------------- | --------------------------------------------------------------------- |
| `list_templates`              | List templates with localization status.                              |
| `get_template`                | Read template details, content, and localized variants.               |
| `create_template`             | Create templates from a prompt, HTML, or Sequenzy blocks.             |
| `update_template`             | Update template metadata, labels, HTML, or blocks.                    |
| `set_template_localization`   | Create or replace a caller-supplied localized variant.                |
| `sync_template_localizations` | Queue AI translation for selected or all enabled non-primary locales. |
| `delete_template`             | Delete a template.                                                    |

For net-new content requested in natural language, pass `prompt` so Sequenzy
generates branded native blocks server-side. Use `blocks` only for finished
caller-supplied Sequenzy content, and use `html` only when preserving supplied
or explicitly requested markup. `prompt`, `blocks`, and `html` are mutually
exclusive; `style` and `tone` are valid only with `prompt`.

Use `set_template_localization` when translated copy comes from your own
localization workflow. It requires an enabled non-primary `locale`, a localized
`subject`, and exactly one of `html` or `blocks`. Use
`sync_template_localizations` to ask Sequenzy to translate selected locales;
omit `locales` to sync every enabled non-primary locale. Explicit sync works
even when automatic on-save localization is disabled.

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

| Tool                             | Description                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `list_campaigns`                 | List campaigns, optionally filtered by status.                                            |
| `get_campaign`                   | Get campaign details and stats.                                                           |
| `get_email_send`                 | Inspect a sent email detail record.                                                       |
| `create_campaign`                | Create a campaign with content, data, and optional From/Reply-To identity overrides.      |
| `update_campaign`                | Update a draft campaign, including content, data, From, and Reply-To.                     |
| `schedule_campaign`              | Schedule a draft or reschedule an existing scheduled campaign.                            |
| `send_test_email`                | Send a test email to one address.                                                         |
| `cancel_campaign`                | Cancel a scheduled or sending campaign.                                                   |
| `pause_campaign`                 | Pause a sending campaign.                                                                 |
| `resume_campaign`                | Resume a paused campaign, optionally spreading delivery over time.                        |
| `delete_campaign`                | Delete a campaign.                                                                        |
| `duplicate_campaign`             | Duplicate a campaign into a new draft.                                                    |
| `resend_campaign_to_non_openers` | Create a draft resend for the original audience members who did not open a sent campaign. |

Prompt-created campaigns are generated and persisted in one API request and
remain drafts. Use `templateId`, `blocks`, or `html` only when copying or
preserving existing content rather than asking the agent to author it. Omit all
content fields to create an empty draft for later editing.

Use `update_company` with `fromEmail` and/or `replyTo` to set account-wide
defaults. `fromEmail` must use a configured, verified sending domain; `replyTo`
may be any valid mailbox. `create_campaign`, `update_campaign`,
`create_sequence`, and `update_sequence` accept the same direct-address fields
for resource-specific overrides and create the backing profile when needed.

Polls and NPS surveys are native email blocks, so they work anywhere an email
tool accepts `blocks`, including campaigns, templates, A/B variants,
transactional templates, and sequence email steps. Transactional poll sends
must resolve to exactly one effective recipient after suppression filtering and
recipient deduplication, and that recipient must already exist as a subscriber;
otherwise Sequenzy rejects the send because the answer link cannot be safely
attributed. Use an answer-button poll:

```json
{
  "type": "poll",
  "variant": "options",
  "question": "What did you think of this email?",
  "options": [
    { "label": "Loved it", "value": "loved" },
    { "label": "Not for me", "value": "not_for_me" }
  ],
  "attributeKey": "email_feedback"
}
```

For NPS, use `"variant": "nps"`, an empty `options` array, and an attribute
such as `nps_score`. The scale is always 0-10; optional `npsLowLabel` and
`npsHighLabel` customize its captions. Each answer updates the subscriber
attribute and fires `poll.answered` for automations and outbound webhooks.

### Saved Forms

| Tool             | Description                                                                                               |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `list_forms`     | List saved forms with their server-managed audience settings and public action URLs.                      |
| `create_form`    | Create and publish a saved form scoped to one or more lists, with optional tags and success behavior.     |
| `get_form_embed` | Return the public action URL, hosted JavaScript, minimal native form, and fetch example for a saved form. |

For Astro, Hugo, Jekyll, Cloudflare Pages, Netlify, GitHub Pages, or any other
static site, call `list_forms`, use `create_form` if a suitable form does not
exist, then call `get_form_embed`. The returned opaque `formId` is the public
capability: lists, tags, duplicate behavior, and success handling remain
server-side, so the deployed browser code never contains a Sequenzy API key.

### Landing Pages

| Tool                                  | Description                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| `list_landing_pages`                  | List landing pages with status, metrics, content, and URLs.           |
| `get_landing_page`                    | Get landing page details, builder content, metrics, and public URLs.  |
| `create_landing_page`                 | Create a draft landing page from default template content or JSON.    |
| `update_landing_page`                 | Edit a landing page name, slug, or full editor-compatible content.    |
| `publish_landing_page`                | Publish a landing page, optionally saving edits first.                |
| `unpublish_landing_page`              | Return a landing page to draft status, optionally saving edits first. |
| `delete_landing_page`                 | Delete an unpublished landing page.                                   |
| `connect_landing_page_domain`         | Connect a custom landing page domain and return DNS setup details.    |
| `update_landing_page_domain_settings` | Replace or verify landing page custom domain settings.                |

Landing page content uses Sequenzy's editor-compatible JSON schema with `version`, `template`, `seo`, `theme`, and `blocks`. Custom landing page domains require a CNAME record pointing to `pages.sequenzydns.com`; call `update_landing_page_domain_settings` with `verify: true` after DNS changes propagate.

### Sequences

| Tool                             | Description                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `list_sequences`                 | List email sequences and automation status.                                                  |
| `get_sequence`                   | Get sequence details, including nodes, edges, graph revision, linked emails, and blocks.     |
| `create_sequence`                | Create AI-generated or explicit-step sequences with optional From/Reply-To overrides.        |
| `update_sequence`                | Update identity, settings, enrollment, existing steps, branch logic, or insert linear steps. |
| `update_sequence_node`           | Type-aware patch of one existing sequence node.                                              |
| `update_sequence_nodes`          | Atomically patch multiple existing sequence nodes.                                           |
| `insert_sequence_step`           | Insert one new email step, optionally with a delay node before it.                           |
| `edit_sequence_graph`            | Move, reconnect, delete, or duplicate existing graph nodes, including A/B test steps.        |
| `enable_sequence`                | Activate a sequence.                                                                         |
| `disable_sequence`               | Freeze a sequence, blocking new enrollments and holding current recipients.                  |
| `pause_sequence_enrollments`     | Stop new enrollments for an active sequence while current recipients continue.               |
| `resume_sequence_enrollments`    | Reopen new enrollments for an active sequence without changing current recipients.           |
| `enroll_subscribers_in_sequence` | Enroll up to 500 subscribers by email, subscriber ID, or both, optionally at a target node.  |
| `cancel_sequence_enrollments`    | Stop active or waiting enrollments by subscriber or entry-event field values.                |
| `delete_sequence`                | Delete a sequence.                                                                           |

Sequence creation supports:

- `trigger: "segment_entered"` plus `segmentId` for saved-segment entry automations.
- `trigger: "event_received"` plus `{{event.*}}` merge tags in subjects or body content.
- `trigger: "inactivity"` plus `eventName`, `inactiveDays`, and optional `inactivityBaseline` (`sequence_created_at` or `subscriber_created_at`).
- `goal` for AI-generated email content.
- Explicit `steps` with Sequenzy `blocks`.
- Explicit `steps` with HTML, which Sequenzy converts into editable blocks.
- Explicit Update Subscriber steps that copy trigger-event properties into
  profile fields or typed custom attributes.
- Fixed waits via `delay` / `delayMs`, or dynamic date-field waits via `waitUntil` for renewal reminders, appointment follow-ups, trial-expiry nudges, and other event-specific dates.
- Dynamic Stripe or Shopify discount action steps. A `create_discount` step creates a fresh provider code when each subscriber reaches it; later emails can use merge tags like `{{discount.code}}`, `{{discount.percentOff}}`, and `{{discount.expiresAt}}`.
- `enrollmentMode: "matching_field"` and a scalar `enrollmentFieldPath` for product-, variant-, order-, or subscription-specific event automations. Array traversal with `[]` belongs in `propertyFilters`, not the enrollment key.

For a custom event trigger, the successful `create_sequence` result includes
`eventTrackingCode` and a structured `eventTracking` object. The object contains
the event endpoint, identity and payload contract, any property path required by
`matching_field` enrollment, normalized trigger `propertyFilters`, an example
payload, `examplePayloadMatchesFilters`, the direct event API docs URL, and
ready-to-use arguments for `get_integration_guide`. If the match status is
false, adapt the example using `examplePayloadNote` and the payload contract.
Add this event feed and verify its required properties before enabling the draft
sequence.

Example dynamic Shopify discount step:

```json
{
  "type": "create_discount",
  "discount": {
    "provider": "shopify",
    "discountType": "percent",
    "percentOff": 20,
    "duration": "once",
    "appliesToAllPlans": true,
    "maxRedemptions": 1,
    "codePrefix": "WINBACK"
  }
}
```

Example Update Subscriber step:

```json
{
  "type": "update_subscriber",
  "nodeType": "action_update_attributes",
  "config": {
    "firstName": "{{event.firstName}}",
    "customAttributeUpdates": [
      { "name": "plan", "value": "{{event.plan}}", "valueType": "text" },
      { "name": "mrr", "value": "{{event.amount}}", "valueType": "number" },
      { "name": "active", "value": "{{event.active}}", "valueType": "boolean" }
    ]
  }
}
```

Number and boolean values must be literals or one standalone merge tag. Use
`update_sequence.subscriberUpdateSteps` with an `action_update_attributes`
node ID from `get_sequence` to replace an existing step's config.

Sequence updates support `insertSteps` for adding new linear steps after a `nodeId` returned by `get_sequence`. Omit `afterNodeId` only when appending to a sequence with exactly one linear tail. `insertSteps` supports addable steps that do not require companion records, such as email, delay, tag/list actions, attribute updates, discounts, conditions, wait-for-event steps, and webhooks. Use `branch` for multi-path if/else branches; provide either `branch` or `insertSteps`, not both. Branch conditions support tag presence and absence checks with `has_tag` and `does_not_have_tag`, plus lists, saved segments, events, clicked links, and field comparisons. The `emails` and `steps` arrays only edit existing email steps by `nodeId`, `emailId`, or array order; use `insertSteps` to create new steps and include a step-level `delay`, `delayMs`, or `waitUntil` when the inserted email needs a timer. `waitUntil` accepts a date field from the trigger event plus optional `offset`, `direction` (`before` or `after`), and `missingAction` (`continue` or `exit`). For active sequences, pass `confirmStructuralChange: true` with `insertSteps` or `branch` only after confirming the live-flow impact.

Use `update_sequence_node` for a focused in-place edit, or
`update_sequence_nodes` when several node patches must commit atomically. Call
`get_sequence` first: every item in `sequence.nodes` includes the node `id`,
`nodeType`, current `config`, `updatedAt`, and `updateHints` with editable and
managed fields plus the exact concurrency token to return. Pass that token as
`expectedUpdatedAt` to reject stale writes. The tools support every stored node
type, including delays, email/SMS content, actions, conditions, webhooks,
branch configuration without topology changes, and triggers. To change a
5-minute delay to 7 days, send `changes: { "delay": { "days": 7 } }` for its
`logic_delay` node. Node-type conversion and edge/path changes belong in
`edit_sequence_graph`. Active sequences require `confirmLiveChange: true` after
the user confirms the impact; recipients already waiting retain their existing
scheduled timestamp.

Existing and newly inserted email steps can set their own From identity with
`senderProfileId` or `fromEmail` plus optional `fromName`, and their Reply-To
identity with `replyProfileId` or `replyTo` plus optional `replyToName`. A
`fromName` on its own changes only that step's visible sender name. New email
steps without explicit identity fields inherit the effective identity of the
nearest sequence email. After a branch merge, only identity fields shared by
every incoming path are inherited; conflicting fields use the sequence or
company defaults.

Use `edit_sequence_graph` with the latest `graphRevision` from `get_sequence` to restructure an existing sequence atomically. It can move a node before or after another node, reuse the normalized `sequence.edges` array for explicit reconnection or multi-node reordering, delete a node, or deep-copy a node. A/B test duplication creates independent test, variant, email, and localization records with reset statistics. Moving a node before the shared node below a branch reconnects every converging branch path through that node. Stale revisions, invalid branch lanes, cycles, unreachable nodes, and unsafe deletion of a node with active recipients are rejected. Active sequences also require `confirmStructuralChange: true`.

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

| Tool                         | Description                                                     |
| ---------------------------- | --------------------------------------------------------------- |
| `list_transactional_emails`  | List transactional templates and API slugs.                     |
| `get_transactional_email`    | Read a transactional email by ID or slug.                       |
| `create_transactional_email` | Create a transactional template from a prompt, HTML, or blocks. |
| `update_transactional_email` | Update transactional metadata or body content.                  |
| `send_email`                 | Send a single transactional email by template or HTML.          |

Prompt-created transactional templates are generated server-side and default
to disabled for review. Explicit HTML or block templates retain the
compatibility default of enabled; pass `enabled` explicitly to override either
default.

`send_email` variables support nested arrays for repeat blocks, such as `{ "event": { "items": [...] } }`.

### Analytics

| Tool                      | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `get_stats`               | Get overview stats for `7d`, `30d`, or `90d`.          |
| `get_campaign_stats`      | Get campaign performance plus Poll/NPS summaries.      |
| `get_sequence_stats`      | Get sequence performance.                              |
| `list_campaign_events`    | List paginated raw email events for a campaign.        |
| `list_sequence_events`    | List paginated raw email events for a sequence.        |
| `get_subscriber_activity` | Get subscriber email stats, activity, and enrollments. |

Analytics tools exclude detected bot, scanner, link-preview, and tracked asset opens/clicks by default. Pass `includeMachineEngagement: true` to `get_stats`, `get_campaign_stats`, `get_sequence_stats`, `get_ab_test_stats`, `get_subscriber`, or `get_subscriber_activity` when you need raw engagement diagnostics; included open/click activity rows expose `machine`, `engagementQuality`, and `classificationReasons` fields where the API returns event-level activity.

When a campaign collects Poll or NPS answers, `get_campaign_stats` includes a
top-level `polls` array. Each subscriber counts once per poll block using their
latest answer. NPS summaries include the score, average, and
promoter/passive/detractor counts. These are lifetime response summaries even
when engagement metrics use a time filter.

To list the exact historical respondents behind a count, call `create_segment`
with field `pollResponse`, operator `is`, and a JSON value scoped to the
campaign and the summary's `blockId`:

```json
{
  "v": 1,
  "campaignId": "camp_123",
  "blockId": "poll_1",
  "match": { "kind": "answer", "value": "loved" }
}
```

For NPS, use a match such as
`{"kind":"npsBucket","bucket":"detractors"}`; valid buckets are
`promoters`, `passives`, and `detractors`. The summary's `attributeKey` stores
the subscriber's current/latest response and may be overwritten by a later poll
that reuses the key, so it is not an exact historical drill-down.

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

| Tool                     | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `generate_email`         | Generate branded email blocks from a prompt.         |
| `generate_sequence`      | Generate a branded multi-email sequence from a goal. |
| `generate_subject_lines` | Generate A/B subject line variants.                  |

Generated email content includes the company's logo and footer by default.
`generate_email` accepts `applyBranding: false` for raw content blocks and
`emailType: "transactional"` for a footer without an unsubscribe link.
Prompt-based campaigns inherit the company's configured email font. Generated
content is returned as draft content for review.

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

### Missing API Key Scope

Call `get_account` and inspect `apiKeyPermissions`. Local connections should
open `apiKeyPermissions.manageUrl`, create a replacement key with the missing
scope, update `SEQUENZY_API_KEY`, and restart. Hosted OAuth connections should
disconnect and reauthorize with broader permissions. The tool error includes
the exact scope or scopes required.

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

## Agent-native discovery

Sequenzy publishes machine-readable manifests for agent networks and A2A-style discovery:

- Remote MCP endpoint: `https://api.sequenzy.com/v1/mcp`
- Agent capability manifest: [`agent-capability.json`](./agent-capability.json)
- A2A-style agent card: [`.well-known/agent-card.json`](./.well-known/agent-card.json)
- OpenClaw/Moltbot skill metadata: [`openclaw/skill.json`](./openclaw/skill.json)
- OpenClaw/Moltbot operating guide: [`openclaw/SKILL.md`](./openclaw/SKILL.md)

These files describe Sequenzy as an authorized email automation capability for agents. They explicitly exclude scraping, spam, and unsolicited cold outreach use cases.
