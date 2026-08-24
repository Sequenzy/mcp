# Sequenzy MCP Server

Official MCP server for [Sequenzy](https://sequenzy.com), the AI-powered email marketing platform.

Connect Sequenzy to Claude Desktop, Claude Code, Codex, Cursor, Windsurf, VS Code Copilot, OpenClaw, and other MCP clients so your AI assistant can manage email operations with structured tools instead of hand-written API calls.

## What You Can Do

- Manage subscribers, tags, lists, and dynamic segments, including bulk tag reconciliation and synthetic event testing.
- Sync segments to Meta custom audiences for Facebook and Instagram retargeting.
- Manage products and attach digital delivery files for purchase automations.
- Upload hosted email images with alt text and reusable responsive crop settings.
- Draft, update, schedule, and inspect campaigns, including resolved audience previews and From, Reply-To, CC, and BCC identities.
- Render campaigns, sequence steps, and templates to their exact email-safe HTML without sending.
- Add one-click Poll and NPS survey blocks to emails and inspect campaign response summaries.
- Create and edit email sequences, including multi-list/tag triggers, entry-audience and property-filtered stop conditions, sending identity overrides, existing graph restructuring, and direct step test sends to internal reviewers.
- Cancel, pause, resume, duplicate, or delete campaigns and enroll contacts into sequences.
- Manage transactional email templates and send transactional emails to shared To, Cc, and Bcc recipient lists.
- Supply localized template variants or queue AI translation for enabled locales.
- Create, edit, publish, unpublish, and delete landing pages.
- Create list-scoped saved signup forms with responsive stack, row, grid, and
  single-image overlay block groups (including foreground gap controls), then
  return client-safe static-site embeds.
- Create, target, publish, duplicate, and deploy saved signup popups with the
  same recursive block layouts.
- Connect and verify custom domains for published landing pages.
- Manage team invitations, inbox conversations, and outbound webhook endpoints.
- Generate email copy, subject lines, and multi-step sequences.
- Inspect analytics, subscriber activity, deliverability health, company-level sending pauses, integrations, published event payload schemas, sending identities, tracking settings, and dashboard URLs.
- Diagnose why sending is paused and restore eligible hard-bounce pauses after confirming list cleanup.
- Inspect exact-recipient bounce, complaint, and email-hygiene suppression, and clean up eligible stale bounces without exposing the shared SES suppression list.
- Configure company product info, account-wide sending identity defaults, rename individual sender and reply-to profiles, manage sender domains, and inspect integration examples for common frameworks.

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
current key identity and type, scopes, common missing marketing read scopes, and
a direct `manageUrl`. Personal keys open Account API Keys; company keys open the
selected workspace's API Keys settings. If the key does not include
`account:read`, open the
[Sequenzy dashboard](https://sequenzy.com/dashboard) directly and choose the
matching API Keys page.

Permissions are editable in place, so open `manageUrl`, update the active key,
and retry the failed tool without replacing the credential or restarting the
client. An agent using a company key with `api_keys:manage` can instead call
`update_api_key`; personal keys must be edited on the account-level page because
that tool only manages company keys. Its `scopes` and `preset` inputs replace
the whole permission selection rather than merging, so preserve every existing
scope that is still needed. Hosted OAuth connections can alternatively
disconnect and reauthorize with broader permissions.

When the active key itself lacks `api_keys:manage`, call
`request_api_key_handoff` instead of retrying `update_api_key`. It requires
`account:read` and returns an owner-review URL with the requested key name,
permissions, and optional predecessor prefilled. It never creates or returns a
key; the workspace owner reviews the form, creates the replacement in the
browser, and copies it into the client. Pass `replaceApiKeyId: "current"` to
offer revocation of the active key after the replacement is created. If the
active key also lacks `account:read`, use the dashboard directly.

The default **Safer agent access** preset includes `lists:write` and
`tags:write`, so agents can create and update list and tag definitions, and it
includes `subscribers:tag` for applying tags to existing contacts. It does not
include `subscribers:write`, so it cannot add contacts to lists or remove them
from lists. Deleting a list or tag still requires the matching `lists:delete`
or `tags:delete` permission.

The AI drafting preset includes `subscribers:write`, so drafting agents can
build a list as well as create it. Imports that apply `listIds` also need
`lists:write`; sequence enrollment or double-opt-in delivery additionally needs
`automations:trigger`.

## Tools

This server currently exposes 224 MCP tools.

Tools reject arguments they do not declare instead of silently ignoring them.
Errors name the unsupported fields, list the supported arguments, and provide
focused guidance for common mistakes such as invented subscriber filters or
sort options.

### Account, Companies, Setup

| Tool                                 | Description                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `get_account`                        | Get account info, available companies, current key permissions, and the API Keys management URL.                              |
| `select_company`                     | Set the active company for future tool calls.                                                                                 |
| `get_app_urls`                       | Build dashboard URLs for campaigns, landing pages, sequences, emails, settings, domains, and sent email details.              |
| `create_company`                     | Create a new company or brand.                                                                                                |
| `get_company`                        | Read company details, product info, brand context, localization, reply-tracking settings, and current From/Reply-To defaults. |
| `update_company`                     | Edit product info, brand context, email theme, reply tracking, and account-wide From/Reply-To profile defaults or names.      |
| `get_sync_rules`                     | Read the company's event-to-tag rules and whether it uses the inherited platform preset.                                      |
| `update_sync_rules`                  | Replace all sync rules; pass `[]` to disable them or `null` to opt into the SaaS/ecommerce platform preset.                   |
| `get_shopify_automation_settings`    | Read browse-abandonment, cart-abandonment, and price-drop settings for the connected Shopify store.                           |
| `update_shopify_automation_settings` | Partially update Shopify automation settings or reset an individual section to its platform defaults.                         |
| `create_api_key`                     | Create an API key for a company, with optional permission preset or explicit scopes.                                          |
| `request_api_key_handoff`            | Prepare an owner-reviewed create/rotation URL when the active key cannot manage API keys itself.                              |
| `list_api_keys`                      | List company API keys as non-secret metadata for safe identification and cleanup.                                             |
| `update_api_key`                     | Rename a company API key or replace its permission preset or scopes without changing the key value.                           |
| `revoke_api_key`                     | Permanently revoke an exact company API key by ID after checking it with `list_api_keys`.                                     |
| `delete_api_key`                     | Compatibility alias for `revoke_api_key`.                                                                                     |
| `list_websites`                      | List sending domains with stored aggregate, SPF, DKIM, and MAIL FROM status.                                                  |
| `add_sending_domain`                 | Add a sending domain and return its cohort-specific DNS setup records.                                                        |
| `add_website`                        | Compatibility alias for `add_sending_domain`.                                                                                 |
| `check_website`                      | Read a sending domain's stored SPF, DKIM, MAIL FROM, and aggregate verification details.                                      |
| `verify_sending_domain`              | Run a fresh sending-domain DNS/provider verification and return current status and diagnostics.                               |
| `list_integrations`                  | List connected integrations with connection and sync health, without returning credentials.                                   |
| `get_sending_status`                 | Diagnose active, paused, or suspended sending, including enforcement denominators, review gates, and remediation steps.       |
| `resume_sending`                     | Restore an eligible hard-bounce pause after explicitly confirming the list has been sanitized.                                |
| `get_tracking_settings`              | Read open, click, unsubscribe, attribution, UTM, click-domain, reply-tracking, and double-opt-in settings.                    |
| `update_tracking_settings`           | Update email tracking, attribution, UTM, and account-wide double-opt-in defaults.                                             |
| `get_integration_guide`              | Get framework-specific integration examples.                                                                                  |
| `get_integration`                    | Inspect one connected integration, its event wiring, list targeting, recent activity, and recommendations.                    |
| `list_integration_capabilities`      | Compare provider capabilities whether or not they are connected.                                                              |
| `connect_integration`                | Connect supported API-key or webhook-secret providers, including Segment and optional PostHog/Segment history import.         |
| `get_event_schema`                   | Inspect published event payload examples, property paths, types, and merge tags by provider.                                  |
| `list_integration_activity`          | Read the retained integration-specific webhook and sync activity log.                                                         |
| `set_integration_sync_enabled`       | Enable or disable bulk imports and backfills while leaving live webhooks connected.                                           |
| `set_integration_list_targeting`     | Choose which lists contacts created by a supported integration join on future provider writes.                                |
| `sync_integration`                   | Queue payment revenue, Supabase users, or a PostHog/Segment event-history import using the saved integration configuration.   |
| `get_integration_pixel`              | Read Shopify's live pixel/configuration state and distinguish confirmed dark events from an unknown read.                     |
| `activate_integration_pixel`         | Install or repoint Shopify's storefront pixel; idempotent when it is already current.                                         |
| `list_web_tracking_keys`             | List publishable website-tracking keys, origin restrictions, usage state, and install snippets.                               |
| `get_web_tracking_key`               | Get one website-tracking key with its exact install snippet and ingest endpoint.                                              |
| `create_web_tracking_key`            | Create a publishable tracking key for a non-Shopify storefront or website.                                                    |
| `update_web_tracking_key`            | Rename, restrict, revoke, or re-enable a website-tracking key.                                                                |
| `delete_web_tracking_key`            | Permanently delete a website-tracking key after its snippet has been removed.                                                 |
| `list_sender_profiles`               | List sender and reply-to profiles, defaults, and sending-domain readiness.                                                    |
| `update_sender_profile`              | Rename one sender or reply-to profile without changing the account defaults.                                                  |
| `get_notification_preferences`       | Read the current user's per-company account notification settings and supported modes.                                        |
| `update_notification_preferences`    | Update the current user's account notification delivery modes without affecting teammates.                                    |
| `render_email`                       | Render final email-safe HTML and diagnose unresolved merge tags, including typos hidden by defaults.                          |

`get_sending_status` keeps the Postgres-backed pause state, review gates, and
remediation available when sender-health analytics are temporarily unavailable;
in that degraded case `senderHealth` is `null`.

`render_email` returns `unresolvedMergeTags` so callers can distinguish an
unknown name from a recognized tag that is merely blank for the previewed
contact. Unknown names are reported even when a `default` filter supplied text:
for example, `{{ subscriber.frstName | default: "there" }}` renders a plausible
greeting for every contact while bypassing stored first names. A recognized
name that is blank for one contact is not reported when its default is used.

For Supabase, `sync_integration` reuses the project, schema, table, list
selection, and consent mappings saved in the dashboard. It cannot target an
arbitrary table. Run it after installing the live database trigger to import
users who existed before the trigger was installed, then poll `get_integration`
and `list_integration_activity` for progress and row-level outcomes.

`set_integration_sync_enabled` controls bulk imports and backfills only; it
does not stop a provider's live webhook from creating contacts. Use
`set_integration_list_targeting` to choose their future list memberships:
`null` follows workspace defaults, `[]` joins no list, and a populated array
targets those lists. The change is not retroactive and never removes existing
memberships. It also does not stop default `any_contact` sequences, which
enroll list-less contacts; explicit `any_list` and specific-list sequences
require a matching membership. Pair list targeting with
`pause_sequence_enrollments` when those default enrollments must stop too.
Supabase, Stripe, Shopify, Wix, and Webflow support this control.

For PostHog, `sync_integration` restarts the event-history import from the
beginning with the stored personal API key. Imported events are deduplicated, so
retrying a failed import does not create duplicates.

For Segment, `connect_integration` can optionally import recent event history
from Unify after the live webhook is connected. The import walks existing
contacts through the Profile API, covers the API's most recent 14 days, skips
contacts without a matching profile, and safely deduplicates retries and live
webhook overlap. New connections skip automatic page/screen calls unless those
names are explicitly allowlisted. Segment webhook secrets must be 16-153 UTF-8
bytes. Use `sync_integration` to retry with the saved credentials.

Call `get_event_schema` before writing an `{{event.*}}` merge tag or an event
property filter. Omit `eventName` to list documented built-in events; provide
an event name to receive provider-specific example payloads and property paths,
and optionally filter by `provider`. Custom event names remain valid even when
the result reports `documented: false`; that only means no reference sample is
published. Use integration activity or sequence enrollments for actual delivery
data because this tool returns static reference data.

For a new sending domain, call `add_sending_domain`, publish the DNS records in
the returned `website.dnsRecords`, wait for DNS propagation, and then call
`verify_sending_domain`. Publish every returned record instead of assuming a
fixed provider or record count: unified domains include required DMARC, while
legacy domains can return Amazon SES MAIL FROM and inbound-reply records. If
verification is attempted before creation, the error points back to
`add_sending_domain` with the requested domain.

For Shopify, call `get_integration_pixel` before relying on product views,
cart activity, or browse-abandonment triggers. The result is read live from
Shopify because merchants can remove the pixel independently. If
`pixel.healthy` is false, `dependentEvents` names the triggers that cannot
arrive; call `activate_integration_pixel` to install or repoint the pixel.
Activation is idempotent, and events begin on the next storefront visit rather
than being backfilled.

For custom, headless, ticketing, or SaaS websites, use
`list_web_tracking_keys` before relying on product-view or cart triggers. Create
a key with an explicit origin allowlist, install the returned `installSnippet`,
then have the customer's authenticated backend mint a short-lived proof through
`POST /api/v1/web-tracking-identities` and call
`sequenzy.identify(email, identityToken)` at sign-in or checkout. A publishable
key alone only records anonymous activity and cannot trigger subscriber
automation. The returned snippet installs synchronous method stubs before its
async loader, so identity and event calls made during page bootstrap are queued
until the SDK is ready. Prefer revoking a key with `update_web_tracking_key`
before permanently deleting it.

New companies start with no sync rules. The inherited preset remains available
for SaaS/ecommerce companies by passing `null` to `update_sync_rules`; services
and consulting companies should normally keep `[]` or define explicit rules.

Use `list_sender_profiles` to find the profile ID, then call
`update_sender_profile` to change only its display name. Pass `type: "reply"`
for a reply-to profile; sender is the default. The address, sending domain, and
account-wide default From/Reply-To selections remain unchanged. Renaming
requires the `companies:manage` scope.

Shopify cart abandonment is enabled by default. It fires
`ecommerce.cart_abandoned` after one hour of cart inactivity, with a 24-hour
per-subscriber cooldown. Use `update_shopify_automation_settings` to change the
`cartAbandonment.enabled`, `delayHours`, or `cooldownHours` fields; pass
`cartAbandonment: null` to restore those defaults without changing browse
abandonment or price-drop settings. Timing values must be positive;
`delayHours` is capped at 168 and `cooldownHours` at 720.

### Subscribers

| Tool                          | Description                                                                                                    |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `add_subscriber`              | Add one subscriber; status is creation-only, so use `update_subscriber` for an existing contact.               |
| `create_subscriber_import`    | Queue up to 5,000 full CRM records; enabled email-hygiene checks continue separately after ingestion.          |
| `get_subscriber_import`       | Read progress, row outcome counts, and failure summaries for a queued import.                                  |
| `update_subscriber`           | Update native profile and phone fields, SMS consent, attributes, tags, or global status.                       |
| `remove_subscriber`           | Unsubscribe while preserving suppression history, or permanently delete only with `hardDelete: true`.          |
| `get_subscriber`              | Fetch subscriber details by email or external ID.                                                              |
| `search_subscribers`          | Search by query, tags, list, status, segment, or one custom attribute, with automatic or resumable pagination. |
| `trigger_subscriber_event`    | Emit one custom event exactly as an integration would, applying sync rules and matching sequence triggers.     |
| `trigger_subscriber_events`   | Emit several ordered custom events for one subscriber.                                                         |
| `bulk_add_subscriber_tags`    | Add tags to up to 500 existing subscribers; requires `subscribers:tag` and may also require `tags:write`.      |
| `bulk_remove_subscriber_tags` | Remove tags from up to 500 existing subscribers; requires `subscribers:tag` or `subscribers:write`.            |

Use `create_subscriber_import` for CRM onboarding instead of looping over
`add_subscriber`. One call accepts 5,000 full records and returns an asynchronous
import ID; poll it with `get_subscriber_import`. A `completed` import can still
contain row failures, so inspect `failedCount` and `failedReasons`. Every
excluded row is accounted for: `skippedReasons` sums to `skippedCount`, and
`failedReasons` sums to `failedCount`. Report any shortfall with the import ID
instead of guessing which rows were omitted. When email hygiene is enabled,
deliverability checks continue separately after ingestion and results appear
in List health; import status does not wait for or include those verdicts.
Invalid verdicts are suppressed from later sends. Use `optInMode: "confirmed"`
only when consent was already verified.

For compliance suppression, call `update_subscriber` with
`status: "unsubscribed"` (or use `remove_subscriber` without `hardDelete`). Do
not retry `add_subscriber` with a different status: status on that tool applies
only when the contact is first created, and a mismatched skipped result is
reported as an error.

`update_subscriber.phone` writes the native phone field shown on the contact,
not a custom attribute. Pass `smsConsent: true` only after verifying express
written consent, or `false` to opt the contact out. Changing the phone without
`smsConsent` resets SMS consent because consent belongs to the old number.

`add_subscriber`, `update_subscriber`, and `create_subscriber_import` accept an
IANA `timezone` such as `America/New_York`. The value is stored on the native
contact profile and enables recipient-local campaign delivery. Pass an empty
timezone to `update_subscriber` to clear it; invalid import-row values are
ignored without rejecting the rest of the import.

### Products & Digital Delivery

| Tool                  | Description                                                                           |
| --------------------- | ------------------------------------------------------------------------------------- |
| `list_products`       | List synced products from Stripe, Shopify, WooCommerce, manual, or Commerce API data. |
| `upsert_products`     | Create or update up to 100 Commerce API products keyed by your product ID.            |
| `delete_product`      | Delete a product previously pushed through the Commerce API.                          |
| `attach_product_file` | Attach a hosted or locally uploaded delivery file to a product.                       |
| `remove_product_file` | Remove an attached product delivery file.                                             |
| `sync_products`       | Queue a Stripe product catalog sync, optionally selecting an integration by ID.       |

After a product delivery file is attached, matching purchase events include `download.url` and `download.name`, so purchase-triggered emails can use merge tags like `{{event.download.url}}`.

For Stripe products, `list_products` returns every active price as a variant, with the Stripe price ID in `variantId`. Use that ID to target an exact price in a purchase sequence even when it is not the product's default price.

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

For subscriber exports, `search_subscribers` accepts `listId`, exact `listName`,
or `list` (ID first, then exact name). It also accepts `attribute` plus
`attributeValue`, with `attributeOperator` for `contains`, numeric comparisons,
or `is_not_empty`; the combined `"attributeName:value"` form remains supported.
Filters combine with AND; use a saved segment for OR logic, nested groups,
exclusions, engagement, or event conditions. If `limit` is omitted, the tool
fetches every matching page automatically. For chunked reads, pass `limit` and
follow `pagination.nextCursor` (or `pagination.nextOffset`) while `hasMore` is
true. `offset` and `page` are supported below 1,000,000 skipped matches; use the
cursor for deeper audiences.

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

| Tool                          | Description                                                               |
| ----------------------------- | ------------------------------------------------------------------------- |
| `list_templates`              | List templates with localization status, label filtering, and pagination. |
| `get_template`                | Read template details, content, and localized variants.                   |
| `create_template`             | Create templates from a prompt, HTML, or Sequenzy blocks.                 |
| `update_template`             | Update template metadata, inbox preview text, labels, HTML, or blocks.    |
| `set_template_localization`   | Create or replace a caller-supplied localized variant.                    |
| `sync_template_localizations` | Queue AI translation for selected or all enabled non-primary locales.     |
| `delete_template`             | Delete a template.                                                        |

`list_templates` returns 50 email bodies newest first by default and accepts a
`limit` up to 100. Advance `offset` by `pagination.count` while
`pagination.hasMore` is true; `pagination.total` reports the full matching
count, including campaign and transactional-email bodies.

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

### Reusable Email Components

| Tool                          | Description                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------ |
| `list_email_components`       | List saved sections and footers, optionally limited to pinned defaults.        |
| `get_email_component`         | Read one component's blocks, metadata, version, and default-slot state.        |
| `get_default_email_component` | Read the component currently pinned to a default slot such as `footer`.        |
| `set_default_email_component` | Create or replace the company default footer used by newly built block emails. |
| `create_email_component`      | Save a reusable section or footer from a block list.                           |
| `update_email_component`      | Update component metadata or replace its blocks and increment its version.     |
| `delete_email_component`      | Delete a component without changing emails that already copied its blocks.     |

Components are copied into emails when those emails are built, so later edits
affect newly built emails rather than rewriting existing content. The default
footer keeps its unsubscribe link enabled, while transactional rendering hides
that link. Raw HTML emails keep their own markup and do not receive block
components; their send-time unsubscribe handling remains unchanged.

### A/B Tests

| Tool                     | Description                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| `list_ab_tests`          | List A/B tests and variants, optionally scoped by sequence.                    |
| `get_ab_test`            | Get effective settings, variants, localization status, and sequence-step copy. |
| `get_ab_test_stats`      | Get aggregate and per-variant stats.                                           |
| `restart_ab_test`        | Restart a stopped or completed A/B test.                                       |
| `select_ab_test_winner`  | Select a campaign test winner and queue remaining delivery.                    |
| `update_ab_test`         | Update campaign or sequence winner-selection settings.                         |
| `update_ab_test_variant` | Update campaign draft or sequence variant copy.                                |
| `create_ab_test`         | Create a campaign test or convert a sequence email step.                       |
| `add_ab_test_variant`    | Add a variant to an existing A/B test.                                         |
| `delete_ab_test_variant` | Delete a draft A/B test variant.                                               |
| `delete_ab_test`         | Delete an A/B test.                                                            |

Use `get_ab_test` to copy the effective `settings` object and discover variant IDs before editing. Campaign settings use `testPercentage`, `testDurationMinutes`, and `winnerCriteria`; sequence settings use `testType`, `winnerThreshold`, and `winnerCriteria`. The legacy sequence values `testPercentage: 100` and `testDurationMinutes: 0` are compatibility sentinels, not runtime settings. `select_ab_test_winner` applies only to a campaign test that is currently testing and immediately queues the winning variant for the remaining audience. `update_ab_test` changes the appropriate settings model and requires `confirmLiveChange: true` when sequence settings affect an active or already-used test. Variant updates accept either `html` or `blocks`, not both.

`create_ab_test` accepts exactly one of `campaignId` or `automationNodeId`; the latter requires one to four extra variants and converts a sequence email node into `action_ab_test`. The conversion moves the step's subject, preview text, and blocks onto independent variant emails. Read every variant with `get_ab_test` and edit each one with `update_ab_test_variant`; `update_sequence_node` cannot edit variant copy, and a change intended for the whole step must be repeated for every variant. The full workflow requires `ab_tests:read`, `ab_tests:write`, and `sequences:write`. With only `sequences:read`, `get_sequence` keeps the A/B step and control copy visible but redacts test-record fields and returns an empty variant list. An explicit sequence `winnerCriteria` overrides the `testType` default, so content variants can still be judged by opens. Pass `confirmLiveChange: true` when converting a node in an active sequence. Together with control A, an A/B test supports at most five variants. Sequence variants receive independent email templates and can be edited after creation; once the sequence is active or the test has activity, `update_ab_test_variant` requires `confirmLiveChange: true`. Variants can only be added or removed while the test is a draft, and live-sequence changes also require confirmation because they immediately change the rotation.

### Campaigns

| Tool                             | Description                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `list_campaigns`                 | List paginated campaigns by status or label, including reviewer feedback for rejected campaigns.           |
| `get_campaign`                   | Get details, stats, and reviewer feedback for a rejected campaign.                                         |
| `get_campaign_audience`          | Resolve saved targeting, missing references, a plain-language summary, and live recipient count.           |
| `list_email_sends`               | Search recent delivery history with resource IDs and URLs, optionally scoped to one sequence step.         |
| `get_email_send`                 | Inspect a queued, test, sent, suppressed, or failed delivery by durable email-send ID.                     |
| `list_recipient_suppressions`    | List associated suppressed recipients, including protected global invalid addresses and complaints.        |
| `get_recipient_suppression`      | Check local bounce, complaint, email-hygiene, and regional SES suppression for one exact recipient.        |
| `remove_recipient_suppression`   | Remove a workspace soft-bounce escalation while preserving global, hard-bounce, and complaint protections. |
| `create_campaign`                | Create a campaign with content, data, and optional From/Reply-To identity overrides.                       |
| `update_campaign`                | Update a draft campaign, including content, data, From, Reply-To, CC, and BCC.                             |
| `schedule_campaign`              | Schedule or reschedule a one-off or recurring campaign after validating subject, content, and audience.    |
| `send_test_email`                | Send a test email to one address.                                                                          |
| `render_email`                   | Render exact email-safe HTML and report unresolved tags, including typos hidden by defaults.               |
| `cancel_campaign`                | Cancel a scheduled or sending campaign.                                                                    |
| `pause_campaign`                 | Pause a sending campaign.                                                                                  |
| `resume_campaign`                | Resume a paused campaign, optionally spreading delivery over time.                                         |
| `delete_campaign`                | Delete a campaign.                                                                                         |
| `duplicate_campaign`             | Duplicate a campaign into a new draft.                                                                     |
| `resend_campaign_to_non_openers` | Create a draft resend for the original audience members who did not open a sent campaign.                  |

Prompt-created campaigns are generated and persisted in one API request and
remain drafts. Use `templateId`, `blocks`, or `html` only when copying or
preserving existing content rather than asking the agent to author it. Omit all
content fields to create an empty draft for later editing.

To deliver at the same wall-clock time in every recipient's own timezone, call
`schedule_campaign` with `sendInRecipientTimezone: true` and an IANA
`scheduledTimezone` that identifies the wall clock represented by
`scheduledAt`. Contacts without a stored timezone receive the campaign at the
`scheduledAt` instant. This mode cannot be combined with recurring or spread
delivery.

For campaign- and sequence-level identities, `fromEmail` plus `fromName`
selects the sender identity with that display name on the mailbox, creating it
when needed without renaming other same-address identities. A Reply-To address
instead has one company-wide saved name: when `replyToName` differs from that
name, the saved name is kept and the successful response includes recovery
guidance in `warnings`.

`send_email` and `send_test_email` return a durable `emailSendId`. Use
`list_email_sends` to discover recent IDs by subject/title, recipient, delivery
status, type, bounce type, or source; pass an ID to `get_email_send` to inspect
`status`, `errorMessage`, the stored body, and delivery events. Delivery-list
rows are retained for 14 days. Queue jobs are internal execution details and
are not exposed through the MCP contract. Every returned delivery has a direct
dashboard `url`. Use `list_recipient_suppressions` to distinguish protected
global invalid-recipient, protected company hard-bounce, and complaint rows from removable company soft-bounce
escalations, and use `get_recipient_suppression` for the exact regional status.
`remove_recipient_suppression` removes only the company escalation; global and
Amazon SES account-level suppressions, complaints, unsubscribes, and email-hygiene
protections remain intact. A local hygiene result uses the `bounced` reason with
`email_hygiene` as its source without changing the subscriber's consent status.

Agents should pass a caller-owned `idempotencyKey` to `send_email` before the
first attempt and reuse it for every retry of that same logical email. Sequenzy
returns the original `emailSendId` for 14 days instead of creating another
delivery. Reusing the key with different send arguments is rejected, so do not
generate a fresh key inside a retry loop.

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
Send `fromName` or `replyToName` alone to rename the existing default profile
without changing its address. When an address has multiple display names, use
`senderProfileId` or `replyProfileId` from `list_sender_profiles` to select the
exact profile to make default and rename.

`update_company` also manages the company's default email theme through
`emailTheme` (`presetId`, `colors`, `typography`, `layout`). Theme updates are
partial - omitted fields keep their current value (or the preset default) and
numeric values are clamped to supported ranges. Pass `emailTheme: null` to
reset the company to the platform default theme. Layout settings can control
the shared `baseRadius` and a separate `buttonRadius`.

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

Set `"allowMultiple": true` on a text-only options poll to open a hosted page
where recipients can check several answers and save the whole selection at
once. The subscriber attribute stores the selected-value list, so attribute
segments should use `contains`. Multi-select polls cannot use option images or
configurations whose encoded signed links exceed the delivery-safe size limit.
Campaign poll summaries set `allowMultiple: true`, use respondent count for
`totalResponses`, and can report answer percentages that add up past 100%.

Poll blocks also support brand-specific styling. `accentColor` recolors every
appearance, including `"brutal"`; `optionRadius` sets answer-button corners in
pixels (`0` is square), independently of the container's
`styles.borderRadius`; and `questionColor` recolors only the question.
`fontFamily` applies to the poll. Use the `optionFontSize`,
`optionFontWeight`, `optionLetterSpacing`, and `optionTextTransform` fields for
answers, or the matching `question*` fields for the question. Sizes and
spacing are pixels, weights range from 100 to 900, and text transforms are
`"none"` or `"uppercase"`.

### Saved Forms

| Tool             | Description                                                                                                      |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `list_forms`     | List saved forms with their server-managed audience settings, content blocks, and public action URLs.            |
| `create_form`    | Create and publish a saved form with standard email/name fields, audience settings, theme, and success behavior. |
| `update_form`    | Update a saved form, including its complete ordered block array and typed custom fields.                         |
| `get_form_embed` | Return the public action URL, hosted JavaScript, minimal native form, and fetch example for a saved form.        |

For Astro, Hugo, Jekyll, Cloudflare Pages, Netlify, GitHub Pages, or any other
static site, call `list_forms`, use `create_form` if a suitable form does not
exist, then call `get_form_embed`. The returned opaque `formId` is the public
capability: lists, tags, duplicate behavior, and success handling remain
server-side, so the deployed browser code never contains a Sequenzy API key.
Generated native and standalone markup includes "Powered by Sequenzy" for free
workspaces; paid workspaces receive unbranded markup. The API resolves that
entitlement server-side, so callers should use the returned snippet unchanged.
When updating a form, omitted fields remain unchanged and theme fields merge
into the current theme. Pass an empty `tagIds` array to clear tags or an empty
`redirectUrl` to restore confirmation-message behavior. The `blocks` field is
a complete replacement, so read the current content with `list_forms` first
and retain exactly one required email field and one submit button. Add custom
inputs as `form-field` blocks with a supported `fieldType`; select, radio, and
checkbox fields require options, while hidden defaults are enforced server-side.

### Saved Popups

| Tool              | Description                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `list_popups`     | List saved popups with status and engagement stats, optionally including full content.            |
| `get_popup`       | Get one popup's blocks, trigger, targeting, schedule, frequency, theme, and published embed code. |
| `create_popup`    | Create a popup from a starting template, published by default, and return its deployment script.  |
| `update_popup`    | Partially update popup copy, audience, behavior, theme, blocks, or publication status.            |
| `get_popup_embed` | Return secret-free HTML, React/Next.js, WordPress, and Shopify embed snippets.                    |
| `duplicate_popup` | Copy a popup into a draft with independent engagement counters.                                   |
| `delete_popup`    | Permanently delete a popup and its engagement counters.                                           |

Popup deployment uses one public script tag; API keys, audience settings,
triggering, targeting, scheduling, and frequency rules remain server-side.
Popups capture into every list by default unless `listIds` is provided. When
updating blocks, read the popup first and send the complete replacement array,
retaining exactly one required email field and one submit button. Setting
`status` to `draft` stops a popup without invalidating its existing embed code.

### Landing Pages

| Tool                                  | Description                                                           |
| ------------------------------------- | --------------------------------------------------------------------- |
| `list_landing_pages`                  | List landing pages with status, metrics, content, and URLs.           |
| `get_landing_page`                    | Get landing page details, builder content, metrics, and public URLs.  |
| `create_landing_page`                 | Create a draft landing page from default template content or JSON.    |
| `update_landing_page`                 | Edit a landing page name, slug, or full editor-compatible content.    |
| `publish_landing_page`                | Publish a landing page, optionally saving edits first.                |
| `unpublish_landing_page`              | Return a landing page to draft status, optionally saving edits first. |
| `duplicate_landing_page`              | Duplicate a landing page into a new draft with a unique slug.         |
| `delete_landing_page`                 | Delete an unpublished landing page.                                   |
| `connect_landing_page_domain`         | Connect a custom landing page domain and return DNS setup details.    |
| `update_landing_page_domain_settings` | Replace or verify landing page custom domain settings.                |

Landing page content uses Sequenzy's editor-compatible JSON schema with
`version`, `template`, `seo`, `theme`, and `blocks`. SEO settings include
`faviconUrl` and `hideFromSearchEngines`; hidden pages publish a `noindex`
directive. Blocks render in slot order: `top`, `hero`, `form`, `body`, then
`footer`; use `top` for a full-width announcement or banner above the hero.
Button and pricing CTA URLs accept external HTTPS destinations or in-page
anchors such as `#form`, `#section-<sectionId>`, `#block-<blockId>`, and
`#top`. Set `theme.sectionAnimation` to `none`, `fade`, `slide-up`, or
`zoom-in`, with `theme.sectionAnimationSpeed` set to `slow`, `normal`, or
`fast`, to control published scroll reveals. Custom landing page subdomains
require a CNAME record pointing to `pages.sequenzydns.com`; root domains use an
A record pointing to `76.76.21.21`, and their `www` host redirects to the root
when its CNAME points to `pages.sequenzydns.com`. Call
`update_landing_page_domain_settings` with `verify: true` after DNS changes
propagate.

### Sequences

| Tool                                     | Description                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `list_sequences`                         | List sequences with dashboard status, search, label, limit, and offset filters.                         |
| `get_sequence`                           | Get sequence details, including ordinary and A/B email steps, nodes, edges, and linked copy.            |
| `list_sequence_enrollments`              | List contact enrollments with pagination and accurate list/tag/event/time-based entry attribution.      |
| `send_sequence_test_email`               | Send one saved action_email step to 1-10 reviewers; A/B steps are inspected per variant.                |
| `create_sequence`                        | Create a blank dashboard draft or an AI-generated/explicit-step sequence.                               |
| `update_sequence`                        | Update identity, settings, enrollment, existing steps, branch logic, or insert linear steps.            |
| `update_sequence_node`                   | Type-aware patch of one existing sequence node.                                                         |
| `update_sequence_nodes`                  | Atomically patch multiple existing sequence nodes.                                                      |
| `insert_sequence_step`                   | Insert any typed dashboard step, including AI generation, outbound webhooks, waits, and wired branches. |
| `edit_sequence_graph`                    | Move, reconnect, delete, or duplicate graph nodes; reports recipients moved or completed.               |
| `enable_sequence`                        | Activate a sequence.                                                                                    |
| `disable_sequence`                       | Freeze a sequence, blocking new enrollments and holding current recipients.                             |
| `duplicate_sequence`                     | Create an independent draft copy of the graph, emails, and sequence A/B tests.                          |
| `archive_sequence`                       | Move a sequence into the dashboard archive and stop new enrollments.                                    |
| `unarchive_sequence`                     | Restore an archived sequence as a disabled draft.                                                       |
| `list_sequence_goals`                    | List the conversion goals persisted for a sequence.                                                     |
| `create_sequence_goal`                   | Add an event or subscriber-attribute conversion goal.                                                   |
| `update_sequence_goal`                   | Update a persisted sequence conversion goal.                                                            |
| `delete_sequence_goal`                   | Delete a persisted sequence conversion goal.                                                            |
| `get_sequence_inbound_webhook`           | Read the endpoint and setup state for an inbound-webhook sequence.                                      |
| `configure_sequence_inbound_webhook`     | Configure field mapping, sample payload, and integration metadata.                                      |
| `rotate_sequence_inbound_webhook_secret` | Rotate an inbound sequence endpoint's secret path.                                                      |
| `pause_sequence_enrollments`             | Stop new enrollments for an active sequence while current recipients continue.                          |
| `resume_sequence_enrollments`            | Reopen new enrollments for an active sequence without changing current recipients.                      |
| `enroll_subscribers_in_sequence`         | Enroll up to 500 subscribers by email, subscriber ID, or both, optionally at a target node.             |
| `cancel_sequence_enrollments`            | Stop active or waiting enrollments by subscriber or entry-event field values.                           |
| `realign_sequence_enrollments`           | Preview or queue moving live waits earlier to their sending-window opening.                             |
| `get_sequence_enrollment_realignment`    | Poll an applied realignment job and read its completed result or continuation cursor.                   |
| `delete_sequence`                        | Delete a sequence.                                                                                      |

Sequence creation supports:

- Name-only creation for a blank, disabled trigger-to-completion draft matching the dashboard.
- Dashboard metadata and delivery settings: `description`, `labels`, `userCancellable`, sequence BCC, and From/Reply-To identity.
- `trigger: "contact_added"` with `listId`, several `listIds`, or `listScope`:
  `any_contact` (the default) enrolls every added contact, including contacts
  that join no list, while `any_list` waits for an actual list membership.
- `trigger: "tag_added"` with `tagName` or several `tagNames`; any configured
  tag enrolls the contact.
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
- Fixed waits via `delay` / `delayMs`, dynamic date-field waits via `waitUntil`, or calendar gates via `waitUntilWeekday`. A weekday gate such as `{ "day": "sunday", "startTime": "09:00", "endTime": "12:00", "timezone": "America/Los_Angeles" }` holds the flow until the next matching window. Place it immediately before an email to keep that send inside the window; any intervening step can shift delivery outside it. Queue recovery rechecks the window before releasing a delayed contact.
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

`list_sequence_enrollments` returns `enteredVia` for each row. List and segment
sources keep their stable ID in `value` and resolve a display `name`; tag and
event sources retain their names in `value`. Time-based triggers report
`inactivity` or `frequency` rather than being misidentified as ordinary
received-event enrollments.

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

Sequence updates support `insertSteps` for adding new linear steps after a `nodeId` returned by `get_sequence`. Omit `afterNodeId` only when appending to a sequence with exactly one linear tail. `insertSteps` supports addable steps that do not require companion records, such as email, delay, tag/list actions, attribute updates, discounts, conditions, wait-for-event steps, outbound webhooks, and AI steps. An `action_ai` step requires a merge-tag `prompt`, unique `resultKey`, and one or more `outputFields`; later steps read generated or fallback text with `{{ai.KEY.field}}`. Combined output-field limits must fit the step's 2000-token response budget. Use `includeTags`, `includeEventProperties`, or `includeAttributes` to opt specific contact context into generation, and `onError` (`continue`, `exit`, or `fail`) to choose failure behavior. Use `branch` for multi-path if/else branches; provide either `branch` or `insertSteps`, not both. Branch conditions support tag presence and absence checks with `has_tag` and `does_not_have_tag`, plus lists, saved segments, events, clicked links, and field comparisons. Each branch path may provide new `steps`, an existing `targetNodeId`, or both; the fallback uses `elseSteps` and/or `elseTargetNodeId`. A target can be the completion node returned by `get_sequence`, so one atomic request can route replies to completion and Else to an existing follow-up. The `emails` and `steps` arrays edit ordinary `action_email` steps by `nodeId`, `emailId`, or array order. `get_sequence.sequence.emails` also includes `action_ab_test` entries; a positional update landing on one is rejected, and its copy must be changed per variant with `update_ab_test_variant`. Use `insertSteps` to create new steps and include a step-level `delay`, `delayMs`, `waitUntil`, or `waitUntilWeekday` when the inserted email needs a timer. `waitUntil` accepts a date field from the trigger event plus optional `offset`, `direction` (`before` or `after`), and `missingAction` (`continue` or `exit`). `waitUntilWeekday` accepts `day` or `days`, `startTime`, optional `endTime` (default `24:00`), and an IANA `timezone`; contacts already inside the window continue immediately. For active sequences, pass `confirmStructuralChange: true` with `insertSteps` or `branch` only after confirming the live-flow impact.

`insert_sequence_step` exposes every companion-record-free dashboard step directly: email, SMS, delay, discount, subscriber update, tag/list action, outbound webhook, AI generation, condition, wait, and branch. Set `type: "ai"` with `prompt`, `resultKey`, and `outputFields` to generate per-contact text for later `{{ai.KEY.field}}` merge tags. Outbound webhooks accept `url`, `method` (`POST` or `GET`), and string-valued `headers`. Email steps support transactional mode, per-step identity, and CC/BCC delivery settings. For a wait gate, set
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

For sequence position, prefer `structuralStepNumber` on linked emails and the
top level of email nodes. It is derived from the current graph and matches the
step badge shown in the dashboard. Parallel branch emails intentionally share
the same structural depth, and an unequal branch merge continues from the
longer incoming path. The older `stepNumber` field in linked emails and node
configs remains a stored ordinal for backward compatibility and may be stale
after graph edits.

Each linked email also returns its stored `emailTheme` override, or `null` when
it follows the company theme. Set `emailTheme` on an `emails`/`steps` item or in
an `action_email` node's `changes` to restyle only that step. Theme updates are
partial patches, so `changes: { "emailTheme": { "colors": {
"background": "#ffffff" } } }` changes the background while retaining the
email's other colors, typography, and layout. Pass `emailTheme: null` to drop
the override and follow the company theme again. Use `update_company` only when
the account-wide default should change.

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
`fromName` on its own changes only that step's visible sender name. A step-level
`replyToName` similarly overrides the visible Reply-To name for that step
without renaming the company-wide reply profile. New email steps without
explicit identity fields inherit the effective identity of the nearest
sequence email. After a branch merge, only identity fields shared by every
incoming path are inherited; conflicting fields use the sequence or company
defaults.

Use `edit_sequence_graph` with the latest `graphRevision` from `get_sequence` to restructure an existing sequence atomically. It can move a node before or after another node, reuse the normalized `sequence.edges` array for explicit reconnection or multi-node reordering, delete a node, or deep-copy a node. A/B test duplication creates independent test, variant, email, and localization records with reset statistics. Moving a node before the shared node below a branch reconnects every converging branch path through that node. Deleting a node immediately moves parked recipients to its unique surviving successor, or completes them when no successor remains; inspect `sequence.migratedRecipientCount` and `sequence.completedRecipientCount` in the result. Deletion is refused when parked recipients would have multiple surviving continuations. Stale revisions, invalid branch lanes, cycles, and unreachable nodes are also rejected. Active sequences require `confirmStructuralChange: true`.

Run `cancel_sequence_enrollments` with `dryRun: true` before applying bulk cancellation.

Run `realign_sequence_enrollments` after changing a live sequence's sending
window when existing email-bound waits should move earlier to the new opening.
It defaults to `dryRun: true`. Passing `dryRun: false` queues a background job
and returns `jobId`; poll it with `get_sequence_enrollment_realignment`. When a
completed result has `hasMore: true`, queue the next bounded apply with its
`nextCursor`. Applied realignment changes live delivery times and should only be
used after the user confirms the preview.

### Email Blocks

| Tool                     | Description                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `get_email_block_schema` | List every email block type or inspect one type's required fields, enum values, item shapes, and example. |

Call `get_email_block_schema` before hand-authoring a block type you have not
used before. Omit `blockType` to list every type, pass a type such as `list` or
`steps` for its complete reference, or pass `creatableOnly: true` to hide types
managed by the editor. Lists are their own block type rather than a `text`
variant: `list` items use `content`, while `steps` items use `title` and an
optional `description`.

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
| `send_email`                 | Send one email by template or HTML to shared To, Cc, and Bcc recipients.                   |

Prompt-created transactional templates are generated server-side and default
to disabled for review. Explicit HTML or block templates retain the
compatibility default of enabled; pass `enabled` explicitly to override either
default.

For a direct send, pass `to`, `subject`, and `html`; the MCP server maps `html`
to the transactional API's `body` field. For a saved transactional email, pass
its API slug through the compatibility-named `templateId` field instead.
For transactional sends, `to`, `cc`, and `bcc` each accept one address or an
array of up to 50. The API sends one email with a shared recipient list and
removes cross-field duplicates in `to`, then `cc`, then `bcc` priority order.
Marketing sends still require exactly one accepted `to` address and do not
support additional recipients.
`send_email` variables support nested arrays for repeat blocks, such as
`{ "event": { "items": [...] } }`. When the recipient matches a stored
subscriber by external ID or email, saved first and last names fill omitted name
variables automatically. Explicit values, including blanks, take precedence.
The optional `attachments` array accepts up to 10 files / 7MB total. Each item
needs `filename` and exactly one of Base64 `content` or a public HTTP(S) `path`.
Set `contentId` to embed a CID image referenced from the HTML and optionally set
`contentType` to override MIME detection.
Use `trackingSettings.clickTracking: false` or
`trackingSettings.openTracking: false` to disable link rewriting or the open
pixel for one send. These per-send options only opt out; they cannot enable
tracking that the account has disabled.

For agent and workflow retries, include a stable `idempotencyKey` (up to 255
characters) in `send_email`. Use one key per logical email and send the same
arguments when retrying; the key remains valid for 14 days.

### Analytics

| Tool                      | Description                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `get_stats`               | Get overview stats for `7d`, `30d`, or `90d`; filter by structural email type.                                 |
| `get_transactional_stats` | Get all-time or time-scoped metrics for one saved transactional email by ID or slug.                           |
| `get_campaign_stats`      | Get campaign performance, reply metrics, and Poll/NPS summaries.                                               |
| `list_poll_responses`     | List each respondent's latest Poll/NPS answer per block, with identity and response time.                      |
| `get_sequence_stats`      | Get aggregate and per-step sequence performance plus live active/waiting enrollment counts by current node.    |
| `list_email_metrics`      | Compare campaign and sequence-step funnels, replies, conversions, and revenue, including cross-sequence steps. |
| `list_campaign_events`    | List paginated raw email events for a campaign.                                                                |
| `list_sequence_events`    | List paginated raw events for a sequence, optionally scoped to one email step.                                 |
| `get_subscriber_activity` | Get subscriber email stats, activity, and enrollments.                                                         |

Campaign and sequence event filters accept `transport_failure` alongside
delivery, bounce, complaint, engagement, unsubscribe, and delay events.
Transport failures describe MTA infrastructure or egress-path exhaustion; they
do not classify a valid recipient address as bounced.

Analytics tools exclude detected bot, scanner, link-preview, and tracked asset opens/clicks by default. Pass `includeMachineEngagement: true` to `get_stats`, `get_campaign_stats`, `get_sequence_stats`, `get_ab_test_stats`, `get_subscriber`, or `get_subscriber_activity` when you need raw engagement diagnostics; included open/click activity rows expose `machine`, `engagementQuality`, and `classificationReasons` fields where the API returns event-level activity.

`get_sequence_stats.enrollmentCounts` is a live point-in-time snapshot of
active and waiting enrollment runs grouped by current node. It counts
enrollment tokens rather than necessarily distinct subscribers, and it is not
limited by historical `period`, `start`, or `end` filters.

Use `list_email_metrics` for comparisons across campaigns or sequence steps.
Pass `step` with optional `sequenceId` values to total the same step across
sequences; use the returned `automationNodeId` with `list_sequence_events` or
`list_email_sends` to inspect recipients. `campaignId` cannot be combined with
`sequenceId` or `step`. Explicit campaign and sequence scopes retain configured
emails with zero activity so weak performers are not silently omitted.

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

Use `list_poll_responses` to read who answered what and when. It returns each
subscriber's latest answer per poll block, newest first, including the email,
stored value, attribute key, and response time. Pass `blockId` to scope one
poll; for a sequence email step, pass its automation node ID as `campaignId`.
Do not reconstruct this history by scanning subscriber attributes: an
attribute has no response timestamp and may have been overwritten by a later
email that reused the same key.

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

Use the `email.failed` event for terminal delivery failures such as exhausted
MTA transport paths. Recipient bounces continue to use `email.bounced`.

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

### Product Feedback

Use `submit_feedback` when a needed Sequenzy capability is missing, confusing,
or broken. For wrong or unexpected tool outcomes, include `userIntent`, the
ordered `toolCalls` with short argument and error summaries, `expected`,
`actual`, and affected `resourceIds`. Do not include secrets, API keys, raw
subscriber data, or full email bodies.

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
| `sequenzy://email-blocks`        | Field reference for every email block type.    |
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
open `apiKeyPermissions.manageUrl`, add the missing scope to the active key, and
retry without restarting. `update_api_key` can perform this only for company
keys that already hold `api_keys:manage`; edit personal keys on the account-level
API Keys page. Hosted OAuth connections can alternatively disconnect and
reauthorize with broader permissions. The tool error includes the exact scope or
scopes required.

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
