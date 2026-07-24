# Sequenzy MCP Server

Official MCP server for [Sequenzy](https://sequenzy.com), the AI-powered email marketing platform.

Connect Sequenzy to Claude Desktop, Claude Code, Codex, Cursor, Windsurf, VS Code Copilot, OpenClaw, and other MCP clients so your AI assistant can manage email operations with structured tools instead of hand-written API calls.

## What You Can Do

- Manage subscribers, tags, lists, and dynamic segments.
- Sync segments to Meta custom audiences for Facebook and Instagram retargeting.
- Manage products and attach digital delivery files for purchase automations.
- Upload hosted email images with alt text and reusable responsive crop settings.
- Draft, update, schedule, and inspect campaigns, including From, Reply-To, CC, and BCC identities.
- Add one-click Poll and NPS survey blocks to emails and inspect campaign response summaries.
- Create and edit email sequences, including event-triggered and segment-entry automations, sending identity overrides, existing graph restructuring, and direct step test sends to internal reviewers.
- Cancel, pause, resume, duplicate, or delete campaigns and enroll contacts into sequences.
- Manage transactional email templates and send single transactional emails.
- Supply localized template variants or queue AI translation for enabled locales.
- Create, edit, publish, unpublish, and delete landing pages.
- Create list-scoped saved signup forms and return client-safe static-site embeds.
- Connect and verify custom domains for published landing pages.
- Manage team invitations, inbox conversations, and outbound webhook endpoints.
- Generate email copy, subject lines, and multi-step sequences.
- Inspect analytics, subscriber activity, deliverability health, and dashboard URLs.
- Inspect and clean up exact-recipient bounce suppression without exposing the shared SES suppression list.
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

Company keys can also be cleaned up without exposing secrets. Call
`list_api_keys` to compare the key ID, name, non-secret prefix, permissions,
last-use timestamp, and `isCurrent` marker, then pass the exact ID to
`revoke_api_key`. `delete_api_key` is a compatibility alias for the same
permanent operation. List and revoke responses never contain the plain key or
stored key hash.

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

The AI drafting preset includes `subscribers:write`, so drafting agents can
build a list as well as create it. Imports that apply `listIds` also need
`lists:write`; sequence enrollment or double-opt-in delivery additionally needs
`automations:trigger`.

## Tools

This server currently exposes 164 MCP tools.

### Account, Companies, Setup

| Tool                                 | Description                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `get_account`                        | Get account info, available companies, current key permissions, and the API Keys management URL.                              |
| `select_company`                     | Set the active company for future tool calls.                                                                                 |
| `get_app_urls`                       | Build dashboard URLs for campaigns, landing pages, sequences, emails, settings, domains, and sent email details.              |
| `create_company`                     | Create a new company or brand.                                                                                                |
| `get_company`                        | Read company details, product info, brand context, localization, reply-tracking settings, and current From/Reply-To defaults. |
| `update_company`                     | Edit product info, brand context, the default email theme, reply-tracking settings, and account-wide From/Reply-To defaults.  |
| `get_sync_rules`                     | Read the company's event-to-tag rules and whether it uses the inherited platform preset.                                      |
| `update_sync_rules`                  | Replace all sync rules; pass `[]` to disable them or `null` to opt into the SaaS/ecommerce platform preset.                   |
| `get_shopify_automation_settings`    | Read browse-abandonment, cart-abandonment, and price-drop settings for the connected Shopify store.                           |
| `update_shopify_automation_settings` | Partially update Shopify automation settings or reset an individual section to its platform defaults.                         |
| `create_api_key`                     | Create an API key for a company, with optional permission preset or explicit scopes.                                          |
| `list_api_keys`                      | List company API keys as non-secret metadata for safe identification and cleanup.                                             |
| `revoke_api_key`                     | Permanently revoke an exact company API key by ID after checking it with `list_api_keys`.                                     |
| `delete_api_key`                     | Compatibility alias for `revoke_api_key`.                                                                                     |
| `list_websites`                      | List sending domains with stored aggregate, SPF, DKIM, and MAIL FROM status.                                                  |
| `add_sending_domain`                 | Add a sending domain and return its cohort-specific DNS setup records.                                                        |
| `add_website`                        | Compatibility alias for `add_sending_domain`.                                                                                 |
| `check_website`                      | Read a sending domain's stored SPF, DKIM, MAIL FROM, and aggregate verification details.                                      |
| `verify_sending_domain`              | Run a fresh sending-domain DNS/provider verification and return current status and diagnostics.                               |
| `get_integration_guide`              | Get framework-specific integration examples.                                                                                  |

For a new sending domain, call `add_sending_domain`, publish the DNS records in
the returned `website.dnsRecords`, wait for DNS propagation, and then call
`verify_sending_domain`. Publish every returned record instead of assuming a
fixed provider or record count: unified domains include required DMARC, while
legacy domains can return Amazon SES MAIL FROM and inbound-reply records. If
verification is attempted before creation, the error points back to
`add_sending_domain` with the requested domain.

New companies start with no sync rules. The inherited preset remains available
for SaaS/ecommerce companies by passing `null` to `update_sync_rules`; services
and consulting companies should normally keep `[]` or define explicit rules.

Shopify cart abandonment is enabled by default. It fires
`ecommerce.cart_abandoned` after one hour of cart inactivity, with a 24-hour
per-subscriber cooldown. Use `update_shopify_automation_settings` to change the
`cartAbandonment.enabled`, `delayHours`, or `cooldownHours` fields; pass
`cartAbandonment: null` to restore those defaults without changing browse
abandonment or price-drop settings. Timing values must be positive;
`delayHours` is capped at 168 and `cooldownHours` at 720.

### Subscribers

| Tool                       | Description                                                                                                     |
| -------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `add_subscriber`           | Add one subscriber; status is creation-only, so use `update_subscriber` for an existing contact.                |
| `create_subscriber_import` | Queue up to 5,000 full CRM records with names, IDs, phones, statuses, tags, lists, and typed custom attributes. |
| `get_subscriber_import`    | Read progress, row outcome counts, and failure summaries for a queued import.                                   |
| `update_subscriber`        | Update profile fields, attributes, tags, or global status; `unsubscribed` safely suppresses marketing.          |
| `remove_subscriber`        | Unsubscribe while preserving suppression history, or permanently delete only with `hardDelete: true`.           |
| `get_subscriber`           | Fetch subscriber details by email or external ID.                                                               |
| `search_subscribers`       | Search by query, tags, list, status, segment, or pagination.                                                    |

Use `create_subscriber_import` for CRM onboarding instead of looping over
`add_subscriber`. One call accepts 5,000 full records and returns an asynchronous
import ID; poll it with `get_subscriber_import`. A `completed` import can still
contain row failures, so inspect `failedCount` and `failedReasons`. Use
`optInMode: "confirmed"` only when consent was already verified.

For compliance suppression, call `update_subscriber` with
`status: "unsubscribed"` (or use `remove_subscriber` without `hardDelete`). Do
not retry `add_subscriber` with a different status: status on that tool applies
only when the contact is first created, and a mismatched skipped result is
reported as an error.

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

Authenticated image bytes are always uploaded to the origin configured by
`SEQUENZY_API_URL`, even if a reverse proxy returns an equivalent upload URL
under another host. API credentials are never forwarded to that alternate
origin.

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

| Tool                          | Description                                                            |
| ----------------------------- | ---------------------------------------------------------------------- |
| `list_templates`              | List templates with localization status.                               |
| `get_template`                | Read template details, content, and localized variants.                |
| `create_template`             | Create templates from a prompt, HTML, or Sequenzy blocks.              |
| `update_template`             | Update template metadata, inbox preview text, labels, HTML, or blocks. |
| `set_template_localization`   | Create or replace a caller-supplied localized variant.                 |
| `sync_template_localizations` | Queue AI translation for selected or all enabled non-primary locales.  |
| `delete_template`             | Delete a template.                                                     |

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
| `get_ab_test`            | Get effective settings, variants, and localization status.     |
| `get_ab_test_stats`      | Get aggregate and per-variant stats.                           |
| `restart_ab_test`        | Restart a stopped or completed A/B test.                       |
| `update_ab_test`         | Update campaign or sequence winner-selection settings.         |
| `update_ab_test_variant` | Update a draft variant subject, preview text, HTML, or blocks. |
| `create_ab_test`         | Create a campaign or sequence A/B test.                        |
| `add_ab_test_variant`    | Add a variant to an existing A/B test.                         |
| `delete_ab_test_variant` | Delete a draft A/B test variant.                               |
| `delete_ab_test`         | Delete an A/B test.                                            |

Use `get_ab_test` to copy the effective `settings` object and discover variant IDs before editing. Campaign settings use `testPercentage`, `testDurationMinutes`, and `winnerCriteria`; sequence settings use `testType`, `winnerThreshold`, and `winnerCriteria`. The legacy sequence values `testPercentage: 100` and `testDurationMinutes: 0` are compatibility sentinels, not runtime settings. `update_ab_test` changes the appropriate settings model and requires `confirmLiveChange: true` when sequence settings affect an active or already-used test. Variant updates accept either `html` or `blocks`, not both.

`create_ab_test` accepts exactly one of `campaignId` or `automationNodeId`; the latter requires one to four extra variants and converts a sequence email node into `action_ab_test`. An explicit sequence `winnerCriteria` overrides the `testType` default, so content variants can still be judged by opens. Pass `confirmLiveChange: true` when converting a node in an active sequence. Together with control A, an A/B test supports at most five variants. Sequence variants receive independent email templates and can be edited, added, or removed while the test is a draft; when the parent sequence is active, `update_ab_test_variant`, `add_ab_test_variant`, and `delete_ab_test_variant` also require `confirmLiveChange: true` because they immediately change the live rotation.

### Campaigns

| Tool                             | Description                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `list_campaigns`                 | List campaigns by status, including reviewer feedback for rejected campaigns.             |
| `get_campaign`                   | Get details, stats, and reviewer feedback for a rejected campaign.                        |
| `list_email_sends`               | Search and filter recent delivery history; every row includes its dashboard URL.          |
| `get_email_send`                 | Inspect a queued, test, sent, suppressed, or failed delivery by durable email-send ID.    |
| `get_recipient_suppression`      | Check local and regional SES suppression for one exact recipient.                         |
| `remove_recipient_suppression`   | Remove stale bounce suppression for a company-associated recipient.                       |
| `create_campaign`                | Create a campaign with content, data, and optional From/Reply-To identity overrides.      |
| `update_campaign`                | Update a draft campaign, including content, data, From, Reply-To, CC, and BCC.            |
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

`send_email` and `send_test_email` return a durable `emailSendId`. Use
`list_email_sends` to discover recent IDs by subject/title, recipient, delivery
status, type, bounce type, or source; pass an ID to `get_email_send` to inspect
`status`, `errorMessage`, the stored body, and delivery events. Delivery-list
rows are retained for 14 days. Queue jobs are internal execution details and
are not exposed through the MCP contract. Every returned delivery has a direct
dashboard `url`. Use `get_recipient_suppression` before cleanup, then
`remove_recipient_suppression` only after confirming a hard-bounced mailbox is
working again. Cleanup removes bounce entries but never complaint or unsubscribe
protections.

Email blocks may use conditional display rules or `conditional-group` branches.
Conditions support render-time variables and subscriber attributes plus live
subscriber data such as segment/list membership, tags, events, engagement,
subscription/SMS status, and Stripe or commerce purchases. Live-data
conditions use the same field values and operators as segment filters;
recipients without a stored subscriber match use the OTHERWISE branch.

Core block shapes are `{ "type": "heading", "content": "Title", "level": 1
}`, `{ "type": "text", "content": "<p>Copy</p>" }`, `{ "type": "button",
"text": "Book a call", "url": "https://example.com", "variant": "primary" }
`, and `{ "type": "image", "src": "https://...", "alt": "Description",
"width": 100, "widthType": "percent" }`. Buttons also accept `content` as an
alias for `text` and default to the `primary` variant. Image `widthType` accepts
`percent` or `px`.

Raw `html` is stored as one opaque block. It preserves supplied markup but does
not add a company logo, native branded sections, or theme-driven block design.
Use `prompt` for a new branded draft or `blocks` for editor-native design; MCP
authoring results include a warning when raw HTML is used.

Use `update_company` with `fromEmail` and/or `replyTo` to set account-wide
defaults. `fromEmail` must use a configured, verified sending domain; `replyTo`
may be any valid mailbox. `create_campaign`, `update_campaign`,
`create_sequence`, and `update_sequence` accept the same direct-address fields
for resource-specific overrides and create the backing profile when needed.

`update_company` also manages the company's default email theme through
`emailTheme` (`presetId`, `colors`, `typography`, `layout`). Theme updates are
partial - omitted fields keep their current value (or the preset default) and
numeric values are clamped to supported ranges. Pass `emailTheme: null` to
reset the company to the platform default theme.

Reply tracking is available on the same company tools. Use
`replyTrackingEnabled`, `replyTrackingDomainMode` (`sequenzy` or `custom`), and
`forwardReplies` with `update_company`. Company reads also return the current
read-only `replyRetentionDays` value.

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
Generated native and standalone markup includes "Powered by Sequenzy" for free
workspaces; paid workspaces receive unbranded markup. The API resolves that
entitlement server-side, so callers should use the returned snippet unchanged.

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

| Tool                                     | Description                                                                                  |
| ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `list_sequences`                         | List sequences with dashboard status, search, label, limit, and offset filters.              |
| `get_sequence`                           | Get sequence details, including nodes, edges, linked emails, blocks, and per-email format.   |
| `send_sequence_test_email`               | Send one saved email step to 1-10 reviewers and return a durable delivery ID for each.       |
| `create_sequence`                        | Create a blank dashboard draft or an AI-generated/explicit-step sequence.                    |
| `update_sequence`                        | Update identity, settings, enrollment, existing steps, branch logic, or insert linear steps. |
| `update_sequence_node`                   | Type-aware patch of one existing sequence node.                                              |
| `update_sequence_nodes`                  | Atomically patch multiple existing sequence nodes.                                           |
| `insert_sequence_step`                   | Insert any typed dashboard step, including outbound webhooks, waits, and wired branches.     |
| `edit_sequence_graph`                    | Move, reconnect, delete, or duplicate graph nodes; reports recipients moved or completed.    |
| `enable_sequence`                        | Activate a sequence.                                                                         |
| `disable_sequence`                       | Freeze a sequence, blocking new enrollments and holding current recipients.                  |
| `duplicate_sequence`                     | Create an independent draft copy of the graph, emails, and sequence A/B tests.               |
| `archive_sequence`                       | Move a sequence into the dashboard archive and stop new enrollments.                         |
| `unarchive_sequence`                     | Restore an archived sequence as a disabled draft.                                            |
| `list_sequence_goals`                    | List the conversion goals persisted for a sequence.                                          |
| `create_sequence_goal`                   | Add an event or subscriber-attribute conversion goal.                                        |
| `update_sequence_goal`                   | Update a persisted sequence conversion goal.                                                 |
| `delete_sequence_goal`                   | Delete a persisted sequence conversion goal.                                                 |
| `get_sequence_inbound_webhook`           | Read the endpoint and setup state for an inbound-webhook sequence.                           |
| `configure_sequence_inbound_webhook`     | Configure field mapping, sample payload, and integration metadata.                           |
| `rotate_sequence_inbound_webhook_secret` | Rotate an inbound sequence endpoint's secret path.                                           |
| `pause_sequence_enrollments`             | Stop new enrollments for an active sequence while current recipients continue.               |
| `resume_sequence_enrollments`            | Reopen new enrollments for an active sequence without changing current recipients.           |
| `enroll_subscribers_in_sequence`         | Enroll up to 500 subscribers by email, subscriber ID, or both, optionally at a target node.  |
| `cancel_sequence_enrollments`            | Stop active or waiting enrollments by subscriber or entry-event field values.                |
| `delete_sequence`                        | Delete a sequence.                                                                           |

Sequence creation supports:

- Name-only creation for a blank, disabled trigger-to-completion draft matching the dashboard.
- Dashboard metadata and delivery settings: `description`, `labels`, `userCancellable`, sequence BCC, and From/Reply-To identity.
- `trigger: "segment_entered"` plus `segmentId` for saved-segment entry automations.
- `trigger: "event_received"` plus `{{event.*}}` merge tags in subjects or body content.
- `trigger: "inbound_webhook"` plus integration metadata for dashboard-compatible webhook entry nodes.
- `trigger: "inactivity"` plus `eventName`, `inactiveDays`, and optional `inactivityBaseline` (`sequence_created_at` or `subscriber_created_at`).
- `goal` for AI-generated email content.
- `emailStyle: "visual"` or `"plain"` to choose the presentation of goal-based AI-generated emails; when omitted, the company's saved preference is used.
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

Sequence updates support `insertSteps` for adding new linear steps after a `nodeId` returned by `get_sequence`. Omit `afterNodeId` only when appending to a sequence with exactly one linear tail. `insertSteps` supports addable steps that do not require companion records, such as email, delay, tag/list actions, attribute updates, discounts, conditions, wait-for-event steps, and webhooks. Use `branch` for multi-path if/else branches; provide either `branch` or `insertSteps`, not both. Branch conditions support tag presence and absence checks with `has_tag` and `does_not_have_tag`, plus lists, saved segments, events, clicked links, and field comparisons. Each branch path may provide new `steps`, an existing `targetNodeId`, or both; the fallback uses `elseSteps` and/or `elseTargetNodeId`. A target can be the completion node returned by `get_sequence`, so one atomic request can route replies to completion and Else to an existing follow-up. The `emails` and `steps` arrays only edit existing email steps by `nodeId`, `emailId`, or array order; use `insertSteps` to create new steps and include a step-level `delay`, `delayMs`, or `waitUntil` when the inserted email needs a timer. `waitUntil` accepts a date field from the trigger event plus optional `offset`, `direction` (`before` or `after`), and `missingAction` (`continue` or `exit`). For active sequences, pass `confirmStructuralChange: true` with `insertSteps` or `branch` only after confirming the live-flow impact.

`insert_sequence_step` exposes every companion-record-free dashboard step directly: email, SMS, delay, discount, subscriber update, tag/list action, outbound webhook, condition, wait, and branch. Outbound webhooks accept `url`, `method` (`POST` or `GET`), and string-valued `headers`. Email steps support transactional mode, per-step identity, and CC/BCC delivery settings. For a wait gate, set
`type: "logic_wait_for_event"` with `eventName`, optional `timeoutDays` (1-365),
and `timeoutAction` (`continue` or `exit`). For a branch, set
`type: "logic_branch"`, provide typed `branches`, and wire their targets:

```json
{
  "sequenceId": "seq_123",
  "type": "logic_branch",
  "afterNodeId": "node_email_1",
  "branches": [
    {
      "id": "replied",
      "conditionType": "event_received",
      "eventName": "email.replied",
      "activityScope": "this_sequence",
      "targetNodeId": "node_complete"
    }
  ],
  "elseTargetNodeId": "node_email_2"
}
```

Each linked email returned by `get_sequence` includes its effective
`emailPreset` (`branded` or `minimal`), matching **Style > Format** in the
dashboard. Set `emailPreset` on an `emails`/`steps` item, or in an
`action_email` node's `changes`, to change only that linked email without
changing the company theme. This applies the same format transformation as the
dashboard to native Sequenzy blocks, including emails that contain supported
custom HTML blocks. Emails stored entirely as one standalone raw HTML block
return `null` for `emailPreset` and do not support format changes.
`emailPreset` cannot be combined with `html` or `htmlContent` because those
fields replace the entire email with standalone raw HTML.

Use `update_sequence_node` for a focused in-place edit, or
`update_sequence_nodes` when several node patches must commit atomically. Call
`get_sequence` first: every item in `sequence.nodes` includes the node `id`,
`nodeType`, current `config`, `updatedAt`, and `updateHints` with editable and
managed fields plus the exact concurrency token to return. Pass that token as
`expectedUpdatedAt` to reject stale writes. The tools support every stored node
type, including delays, email/SMS content, actions, conditions, webhooks,
branch configuration without topology changes, and triggers. To change a
5-minute delay to 7 days, send `changes: { "delay": { "days": 7 } }` for its
`logic_delay` node. To make several founder-style notes Minimal, patch their
`action_email` nodes with `changes: { "emailPreset": "minimal" }`. Node-type
conversion and edge/path changes belong in `edit_sequence_graph`. Active
sequences require `confirmLiveChange: true` after the user confirms the impact;
recipients already waiting retain their existing scheduled timestamp.

Existing and newly inserted email steps can set their own From identity with
`senderProfileId` or `fromEmail` plus optional `fromName`, and their Reply-To
identity with `replyProfileId` or `replyTo` plus optional `replyToName`. A
`fromName` on its own changes only that step's visible sender name. New email
steps without explicit identity fields inherit the effective identity of the
nearest sequence email. After a branch merge, only identity fields shared by
every incoming path are inherited; conflicting fields use the sequence or
company defaults.

Use `edit_sequence_graph` with the latest `graphRevision` from `get_sequence` to restructure an existing sequence atomically. It can move a node before or after another node, reuse the normalized `sequence.edges` array for explicit reconnection or multi-node reordering, delete a node, or deep-copy a node. A/B test duplication creates independent test, variant, email, and localization records with reset statistics. Moving a node before the shared node below a branch reconnects every converging branch path through that node. Deleting a node immediately moves parked recipients to its unique surviving successor, or completes them when no successor remains; inspect `sequence.migratedRecipientCount` and `sequence.completedRecipientCount` in the result. Deletion is refused when parked recipients would have multiple surviving continuations. Stale revisions, invalid branch lanes, cycles, and unreachable nodes are also rejected. Active sequences require `confirmStructuralChange: true`.

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

| Tool                         | Description                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `list_transactional_emails`  | Search/filter templates and sort by delivery metrics; returns subjects and dashboard URLs. |
| `get_transactional_email`    | Read a transactional email by ID or slug.                                                  |
| `create_transactional_email` | Create a transactional template from a prompt, HTML, or blocks.                            |
| `update_transactional_email` | Update transactional metadata or body content.                                             |
| `send_email`                 | Send a single transactional email by template or HTML.                                     |

Prompt-created transactional templates are generated server-side and default
to disabled for review. Explicit HTML or block templates retain the
compatibility default of enabled; pass `enabled` explicitly to override either
default.

For a direct send, pass `to`, `subject`, and `html`; the MCP server maps `html`
to the transactional API's `body` field. For a saved transactional email, pass
its API slug through the compatibility-named `templateId` field instead.
`send_email` variables support nested arrays for repeat blocks, such as
`{ "event": { "items": [...] } }`. When the recipient matches a stored
subscriber by external ID or email, saved first and last names fill omitted name
variables automatically. Explicit values, including blanks, take precedence.

### Analytics

| Tool                      | Description                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `get_stats`               | Get overview stats for `7d`, `30d`, or `90d`; filter by structural email type.                              |
| `get_transactional_stats` | Get all-time or time-scoped metrics for one saved transactional email by ID or slug.                        |
| `get_campaign_stats`      | Get campaign performance, reply metrics, and Poll/NPS summaries.                                            |
| `get_sequence_stats`      | Get aggregate and per-step sequence performance plus live active/waiting enrollment counts by current node. |
| `list_campaign_events`    | List paginated raw email events for a campaign.                                                             |
| `list_sequence_events`    | List paginated raw email events for a sequence.                                                             |
| `get_subscriber_activity` | Get subscriber email stats, activity, and enrollments.                                                      |

Analytics tools exclude detected bot, scanner, link-preview, and tracked asset opens/clicks by default. Pass `includeMachineEngagement: true` to `get_stats`, `get_campaign_stats`, `get_sequence_stats`, `get_ab_test_stats`, `get_subscriber`, or `get_subscriber_activity` when you need raw engagement diagnostics; included open/click activity rows expose `machine`, `engagementQuality`, and `classificationReasons` fields where the API returns event-level activity.

`get_sequence_stats.enrollmentCounts` is a live point-in-time snapshot of
active and waiting enrollment runs grouped by current node. It counts
enrollment tokens rather than necessarily distinct subscribers, and it is not
limited by historical `period`, `start`, or `end` filters.

Pass `emailType: "transactional"` to `get_stats` for Send API and
transactional SMTP delivery, open, click, and reply rates. This includes direct
and saved-template sends. Use the `emailSendId` returned by `send_email` with
`get_email_send` when you need one delivery's status and event timeline.
Use `get_transactional_stats` when you need aggregate rates for one saved
transactional email. Its response includes top clicked links, complaints,
replies, latest permanent/transient bounce classifications, and separate human
and machine open/click counts. Direct-content sends do not have a stable
template ID and remain available through account transactional stats plus
delivery search.

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
| `reply_to_conversation`      | Queue an outbound reply or add an internal note.                    |
| `update_conversation_status` | Open or close a conversation.                                       |
| `mark_conversation_read`     | Mark all messages in a conversation as read.                        |
| `list_webhooks`              | List outbound webhook endpoints.                                    |
| `create_webhook`             | Create an outbound webhook and return its one-time signing secret.  |
| `update_webhook`             | Update webhook name, URL, events, or status.                        |
| `delete_webhook`             | Permanently delete a webhook endpoint and delivery history.         |
| `test_webhook`               | Send a test event to a webhook endpoint.                            |
| `list_webhook_deliveries`    | List recent delivery attempts for a webhook.                        |
| `replay_webhook_delivery`    | Replay a webhook delivery.                                          |

Per-list consent changes are available as opt-in outbound events:
`subscriber.list_subscribed` and `subscriber.list_unsubscribed`. Their payloads
identify the subscriber and list, report `action` as `added` or `removed`, and
include the change `source` (for example `preferences_page`, `dashboard`,
`api`, or `automation`).

### AI Generation

| Tool                     | Description                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `generate_email`         | Generate branded email blocks from a prompt.                |
| `generate_sequence`      | Deprecated alias that persists a goal-based sequence draft. |
| `generate_subject_lines` | Generate A/B subject line variants.                         |

Generated email content includes the company's logo and footer by default.
`generate_email` accepts `applyBranding: false` for raw content blocks and
`emailType: "transactional"` for a footer without an unsubscribe link.
Prompt-based campaigns inherit the company's configured email font. Generated
content is returned as draft content for review. Use `create_sequence` to
generate and persist a disabled sequence draft that appears in
`list_sequences`; the deprecated `generate_sequence` alias does the same.

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
