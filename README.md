# Sequenzy MCP Server

Official MCP server for [Sequenzy](https://sequenzy.com), the AI-powered email marketing platform.

Connect Sequenzy to Claude Desktop, Claude Code, Codex, Cursor, Windsurf, VS Code Copilot, OpenClaw, and other MCP clients so your AI assistant can manage email operations with structured tools instead of hand-written API calls.

## Interactive email and sequence previews

In clients that support MCP Apps, including compatible ChatGPT and Claude connections, you can review your saved emails and sequences directly in the conversation.

- `render_email` opens the rendered email with **Desktop** (640px) and **Mobile** (375px) views, its subject, preview text and personalization warnings. Pass a campaign ID, template ID, or sequence ID plus node ID using the existing tool inputs. It renders your saved content through Sequenzy's email renderer. Personalization and locale options remain available through the same tool.
- `preview_sequence({ companyId, sequenceId })` opens the saved sequence as a connected diagram with triggers, delays, branches and actions. Select an email to render it, switch between available A/B variants, or use the **Emails** tab to browse the sequence's emails. Random splits show their configured allocation. **Refresh** reloads saved content, and failed requests offer an explicit retry.
- `list_sequence_email_variations`, `generate_sequence_email_variations`, `list_campaign_variations` and `generate_campaign_variations` open the design variations side by side, each rendered as it would send. While some are still generating, the view updates every few seconds for up to five minutes; after a generate call it follows only the new ones. **Use for Email 1** and **Use for every email** (campaigns: **Use this design**) ask for confirmation, then save through `use_sequence_email_variation` or `use_campaign_variation` with your existing permissions and tell your assistant what changed. Nothing changes until you confirm.

Supporting workflows use compact cards in the same Sequenzy style:

- `open_image_upload({ companyId })` opens an image picker. Choose a PNG, JPEG, GIF or WebP up to 10 MB, optionally describe it, then select **Upload image**. Opening the widget does not write anything. Submission uses `upload_image_asset` with your existing permissions and returns the saved asset to your assistant. After an uncertain failure, check your image library before retrying; uploads are never automatically retried.
- `monitor_subscriber_import({ companyId, importId })` shows counts and progress for an existing import. It polls `get_subscriber_import` every five seconds while running, for up to five minutes. Completion, blocked status, errors or leaving the view stop polling. **Refresh status** restarts monitoring. This does not start or retry imports.

Both widgets pin the company explicitly. Clients without MCP Apps can use `upload_image_asset` and `get_subscriber_import` directly; the same operations are available through the existing REST API and CLI.

The sequence preview requires an explicit company ID from `get_account` and keeps every email render pinned to that company. Previews never activate sequences, enroll subscribers or send email. A/B previews require the existing access to variant content; unavailable variants are shown as unavailable instead of being replaced with the control email.

Email content is isolated from the widget. Scripts, forms, nested frames and link navigation are disabled; external stylesheets and fonts are not loaded. HTTPS email images may load from their original hosts, subject to the client's policy. The widget itself bundles its logo and font and uses authenticated MCP tool calls without exposing credentials. Actual email-client rendering can differ, so use test sends for final inbox verification.

Clients without MCP Apps still receive the existing rendered HTML or sequence data. The same workflows are available through the existing public render and sequence-read endpoints and CLI render/sequence commands. No new REST endpoint or CLI command is needed for this presentation layer.

## What You Can Do

Use `create_campaign_for_audience` for a frozen group of selected contacts or all contacts matching contact/activity filters. It creates a blank draft, reports selected and currently eligible counts, and preserves existing campaign read/update/clear/schedule workflows. The limit is 100,000 contacts and 8 MiB; drafting sends no email.

- Manage subscribers, tags, lists, and dynamic segments, including bulk tag reconciliation and synthetic event testing.
- Sync segments to Meta custom audiences for Facebook and Instagram retargeting.
- Sync contacts and events from Snowflake, BigQuery, Redshift or Postgres on a schedule.
- Stream email events, custom events and subscriber snapshots to your S3 or GCS bucket for your data warehouse.
- Manage products and attach digital delivery files for purchase automations.
- Upload hosted email images with alt text and reusable responsive crop settings.
- Draft, update, schedule, and inspect campaigns, including resolved audience previews, persisted conversion goals, and From, Reply-To, CC, and BCC identities.
- Render campaigns, sequence steps, and templates to their exact email-safe HTML without sending.
- Add one-click Poll and NPS survey blocks to emails and inspect campaign response summaries.
- Create and edit email sequences, including multi-list/tag triggers, entry-audience and property-filtered stop conditions, sending identity overrides, existing graph restructuring, and direct step test sends to internal reviewers.
- Cancel, pause, resume, duplicate, or delete campaigns and enroll contacts into sequences.
- Manage transactional email templates and send transactional emails to shared To, Cc, and Bcc recipient lists.
- Supply localized template variants or queue AI translation for enabled locales.
- Create, preview, edit, publish, unpublish, and delete landing pages.
- Create list-scoped saved signup forms with responsive stack, row, grid, and
  single-image overlay block groups (including foreground gap controls), then
  return client-safe static-site embeds.
- Create, target, publish, duplicate, and deploy saved signup popups with the
  same recursive block layouts.
- Connect and verify custom domains for published landing pages.
- Manage team invitations, the inbox (its address, conversations, replies, forwards), and outbound webhook endpoints.
- Manage geofences (places the mobile SDKs watch) and bulk-import them by external ID. Visits become `app.geofence_*` events for sequence triggers and `geofence` segment filters.
- Generate email copy, subject lines, and multi-step sequences.
- Inspect analytics, subscriber activity, deliverability health, company-level sending pauses, integrations, published event payload schemas, sending identities, tracking settings, and dashboard URLs.
- Inspect whether "Sent with Sequenzy" is visible for a workspace, why the owner subscription does or does not remove it, and open the canonical subscription page for an upgrade or renewal. Entitlement changes apply to future sends from existing live sequences without editing their blocks.
- Diagnose why sending is paused and restore eligible hard-bounce pauses after confirming list cleanup.
- Inspect exact-recipient bounce, complaint, and email-hygiene suppression, and clean up eligible stale bounces without exposing the shared SES suppression list.
- Configure company product info, account-wide sending identity defaults, rename individual sender and reply-to profiles, manage sender domains, and inspect integration examples for common frameworks.

Every published MCP tool includes explicit `readOnlyHint`, `destructiveHint`, `idempotentHint`, and `openWorldHint` annotations so compatible clients can display accurate tool-use affordances. Any write that overwrites, cancels, deletes, changes a live sequence, or can send email or SMS is marked destructive; tools that can email real contacts, publish a public link, or reach a third-party service are marked open-world. Tools also publish `outputSchema` definitions (except on the OpenAI-reviewed route) and return `structuredContent`, giving clients and models machine-readable result shapes for follow-up calls.

## Tool results and recovery

Tool failures retain `isError: true` and readable error text, and also return
`structuredContent` with `{ success: false, error: { code, message, howToFix,
docsUrl } }`. HTTP errors include `statusCode`; a valid API `Retry-After` header
adds `retryAfterSeconds`. These fields are omitted when unavailable. The OpenAI
profile uses safe recovery descriptions and known codes or status-derived
fallbacks, omitting raw backend diagnostics.

Use the error code and recovery guidance to choose your next step. The client
retries a read (GET) up to 3 times within about 3 seconds after a 502, 503, 504
or network error, waiting out a `Retry-After` of 5 seconds or less, and never
retries a write. After an uncertain `send_email` outcome, reuse the
original `idempotencyKey` with unchanged input and inspect `emailSendId` when
available. A retry hint alone does not mean repeating a write is safe.

Segment counts and segment-filtered reads fail with
`SEGMENT_REFERENCE_DEPTH_EXCEEDED` or `SEGMENT_REFERENCE_COUNT_EXCEEDED` when
segments reference other segments too deeply or too many times. Retrying does
not help; reduce the nesting or the number of references with
`update_segment` first.

Successful results keep their existing shapes. Recoverable partial subscriber
event imports retain their counts and row failures without `isError`; inspect
those rows before retrying failed records.

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

The [Sequenzy plugin in the ChatGPT plugin directory](https://chatgpt.com/plugins/plugin_asdk_app_6ac14efcdc14819189d4eee6365dd26a) uses
the reviewed hosted surface, which ChatGPT custom connectors can also add
directly:

```text
https://api.sequenzy.com/v1/mcp/openai
```

That surface shares the same implementation and keeps the standard tool set
except for operations that accept or manage credentials, or return unprojected
payloads: `connect_integration`, `create_api_key`, `list_api_keys`,
`update_api_key`, `revoke_api_key`, `delete_api_key`,
`request_api_key_handoff`, `create_data_export`, `update_data_export`,
`create_warehouse_connection`, `update_warehouse_connection`,
`preview_warehouse_query`, `create_webhook`, the geofence tools
(`list_geofences`, `get_geofence`, `create_geofence`, `update_geofence`,
`delete_geofence`, `import_geofences`; they carry place coordinates), `list_webhook_deliveries`,
`list_capture_submissions`, `replay_webhook_delivery`, and
`rotate_sequence_inbound_webhook_secret`. It also omits `add_website`, a
compatibility alias of `add_sending_domain`, and `submit_feedback`. API keys, including the one behind
the ChatGPT connection, are managed in the dashboard. The surface also omits
subscription and upgrade links: `subscriptionUrl` fields, the
`get_app_urls` subscription URL, and the `emailBranding` tier and upgrade
action are removed, and `get_app_urls` rejects the `billing` and
`subscription` settings tab aliases. The surface also omits the push credential
tools `set_apns_credentials` and `set_fcm_credentials`, which take customer
private keys as input, and `register_push_device`, an app-backend call whose
required device token the surface's credential policy rejects.

Four tools use clearer names on this surface; standard MCP and the stdio
package keep the original names:

| Standard MCP                     | OpenAI-reviewed route            |
| -------------------------------- | -------------------------------- |
| `list_websites`                  | `list_sending_domains`           |
| `check_website`                  | `get_sending_domain`             |
| `resend_campaign_to_non_openers` | `create_non_opener_resend_draft` |
| `update_sms_number_label`        | `update_sms_number_settings`     |

`edit_sequence_graph` is listed there as four single-operation tools with the
same validation and behavior: `move_sequence_step` (`move_node`),
`duplicate_sequence_step` (`duplicate_node`), `delete_sequence_step`
(`delete_node`) and `replace_sequence_paths` (`replace_edges`).

OpenAI reviews again any published tool whose definition changes, so two
filters keep their approved definitions there until the next plugin
submission: `list_email_sends` describes `bounceType` as Permanent or
Transient (Soft and Blocked are still accepted), and
`list_sequence_enrollments` offers the active, waiting, completed, failed and
cancelled statuses and defaults to active and waiting, so paused enrollments
are not listed there.

The preview widget on this surface lists the image origins it may load
(`https://images.sequenzy.com` and the Pexels and Unsplash image hosts), so
other external images in an email preview show their alt text instead.

Tool annotations disclose supported replacement and irreversible-delivery modes, including automation-triggering actions. Edits to email content that can be live or shown on a public share link are destructive and open-world. Public content, provider changes, tools that fetch URLs or call outside services (link checks, AI drafting that can read URLs, gallery ranking), and membership changes that can start segment-triggered sequences are marked open-world; private draft creation and additive notes remain non-destructive. On the ChatGPT surface each tool's annotation justifications live in `src/tools/openai-justifications/`, and a tool whose description does not already explain a hint gets an effects sentence appended. Feedback goes to the Sequenzy team through Telegram with the authenticated company name/ID and account email added for attribution, which clients must disclose before sending.

To keep its tool list small, this surface publishes no output schemas (results
still include `structuredContent`).

On every surface, sequence tools describe repeated nested step schemas once and
point later fields at the first copy ("Same schema as `branches[].steps` in this
tool."). Those fields accept the same input as before; the server validates
nested steps.

Meta's Muse connector uses a smaller hosted surface, because Muse rejects
large tool lists:

```text
https://api.sequenzy.com/v1/mcp/muse
```

It serves about 70 everyday tools from the standard surface (account,
subscribers, lists, tags, segments, campaigns, sequences, templates,
transactional sends, stats and the inbox) with the same names, inputs and
handlers, and keeps `tools/list` under 200 KB by leaving out output schemas.
Tool results still include `structuredContent`. The large sequence builders
(`create_sequence`, `update_sequence`, `insert_sequence_step`) are left out;
`generate_sequence`, `create_sequence_from_example` and `edit_sequence_emails`
cover the same work. Calls to tools outside the list are rejected. The list is
`MUSE_TOOL_NAMES` in `src/tools/muse-profile.ts`.

Remote clients should authenticate with the Sequenzy OAuth flow when supported. Local and automation clients can still use the stdio package below with `SEQUENZY_API_KEY`.

The hosted endpoint and the stdio package support MCP specification
`2026-07-28` while remaining compatible with 2025-era clients. Modern HTTP
clients use per-request discovery and method headers; existing clients keep
working through the same endpoint and package command.

Machine-readable discovery files:

- MCP server manifest: [`server.json`](server.json)
- Agent card: [`.well-known/agent-card.json`](https://github.com/Sequenzy/mcp/blob/main/.well-known/agent-card.json)
- Agent capability manifest: [`agent-capability.json`](https://github.com/Sequenzy/mcp/blob/main/agent-capability.json)
- OpenClaw skill metadata: [`openclaw/skill.json`](https://github.com/Sequenzy/mcp/blob/main/openclaw/skill.json)

### MCP Events

The hosted endpoints (`/v1/mcp`, `/mcp`, `/v1/mcp/openai` and `/v1/mcp/muse`) support
[MCP Events](https://developers.openai.com/plugins/build/mcp-events), so an
agent such as a ChatGPT task can be woken by something that happens in
Sequenzy instead of a schedule or a manual prompt. The stdio package does not
offer events because it has no callback to deliver to.

`server/discover` advertises `events: {}`. The server implements
`events/list`, `events/subscribe` and `events/unsubscribe` with webhook
delivery; polling, streaming and replay are not offered, so `cursor` is always
`null`.

| Event                         | Fires when                                 | Optional filters             | Permission           |
| ----------------------------- | ------------------------------------------ | ---------------------------- | -------------------- |
| `email.replied`               | A subscriber replies to an email you sent  | `campaign_id`, `sequence_id` | `conversations:read` |
| `email.bounced`               | An email you sent bounces                  | `campaign_id`, `sequence_id` | `analytics:read`     |
| `email.complained`            | A recipient marks an email as spam         | `campaign_id`, `sequence_id` | `analytics:read`     |
| `poll.answered`               | A recipient answers a poll in an email     | `campaign_id`, `sequence_id` | `analytics:read`     |
| `subscriber.created`          | A subscriber is added, from any source     | `list_id`, `tag`             | `subscribers:read`   |
| `subscriber.unsubscribed`     | A subscriber unsubscribes                  | `tag`                        | `subscribers:read`   |
| `campaign.sent`               | A campaign finishes sending                | `campaign_id`                | `campaigns:read`     |
| `sequence.finished`           | A subscriber reaches the end of a sequence | `sequence_id`                | `sequences:read`     |
| `subscriber_import.completed` | A subscriber import finishes               | none                         | `subscribers:read`   |

`events/list` only returns events the connection's permissions can read in the
selected workspace. Filters are optional and combine with AND; `tag` matches
the subscriber's tags when the event is processed.

Each delivery is one Standard Webhooks-signed `POST` with headers
`webhook-id` (equal to `eventId`), `webhook-timestamp`, `webhook-signature` and
`X-MCP-Subscription-Id`, and a body like:

```json
{
  "eventId": "evt_3f2c...",
  "name": "email.replied",
  "timestamp": "2026-10-04T10:00:00.000Z",
  "data": {
    "reply_id": "rep_123",
    "conversation_id": "conv_123",
    "email_send_id": "send_123",
    "subscriber_id": "sub_123",
    "from_email": "jane@example.com",
    "from_name": "Jane",
    "subject": "Re: Our October launch",
    "email_type": "campaign",
    "campaign_id": "camp_123",
    "sequence_id": null,
    "received_at": "2026-10-04T10:00:00.000Z",
    "url": "https://www.sequenzy.com/dashboard/company/<id>/inbox/conv_123"
  },
  "cursor": null
}
```

Payloads are summaries: IDs, addresses, a subject and a dashboard link. Email
bodies, custom attributes and metadata are never included; read the full record
with the matching tool (for example `get_conversation` for a reply). Text such
as a reply subject is data written by your contacts, not instructions.

Subscribing and delivery rules:

- `delivery.secret` must be `whsec_` followed by base64 that decodes to 24-64
  bytes. Callback URLs must be HTTPS, may not resolve to a private or local
  address (checked again at every connection), and redirects are never
  followed.
- The callback is verified with a signed `{"type":"verification","challenge":"..."}`
  request that must be answered with a 2xx echoing the challenge. A successful
  verification is reused for that connection and URL for 24 hours. Each
  workspace may run 30 verifications per callback host per minute, and one host
  receives at most 600 per minute across all workspaces. Failures
  return `-32015` with `data.reason` (`connection_refused`, `timeout`,
  `tls_error`, `http_4xx`, `http_5xx` or `challenge_failed`).
- Other errors: `-32602` for an invalid secret, URL, filter or `ttlMs`;
  `-32011` (`data.kind: "event"`) for an unknown event; `-32012` when the
  connection lacks the event's permission or has no usable workspace; `-32013`
  for the subscription cap (`data.limit: "subscriptions"`) or the verification
  limit (`"callback_verifications"`); `-32014` (`data.feature:
"deliveryMode"`) for a delivery mode other than `webhook`. `events/list`
  returns an empty list for a connection without a workspace.
- The subscription ID is derived from the connection, workspace, callback URL,
  event name and arguments, so subscribing again refreshes the same
  subscription. A subscription stays in the workspace selected when it was
  created; refreshing or unsubscribing after `select_company` switches
  workspaces still finds it. `refreshBefore` defaults to 7 days; any `ttlMs` is
  clamped to 5 minutes through 30 days, and `ttlMs: null` is granted 30 days. A
  new secret on refresh rotates it, and both secrets sign deliveries for 10
  minutes.
- Failed deliveries are retried up to 5 attempts over about 11 minutes with the
  same `eventId` and a fresh signature. `410` stops the subscription until the
  client subscribes again, `413` is not retried, and deliveries stop when the
  subscription expires, is unsubscribed, or the connection loses access to the
  workspace or event. Deduplicate on `webhook-id`: events can repeat or arrive
  out of order.
- A workspace can have 25 active subscriptions. Deliveries above 600 per minute
  per workspace, or 120 per minute per subscription, are dropped. At most 20
  deliveries per workspace are in flight at once; others wait up to about 10
  minutes, then are dropped. Marketer-role connections
  do not receive events from transactional emails. Events start reaching a new
  subscription within about a minute.

Example: in a ChatGPT task, ask "When someone replies to a campaign, draft a
reply in my CRM." ChatGPT subscribes to `email.replied`, and each reply wakes
the task with the sender, subject and conversation link.

### Data and privacy

Sequenzy sends an MCP client only the data needed for the tool the user asks it
to run, within the selected workspace and the key or OAuth scopes granted to
that client. Depending on the requested tool, this can include workspace names
and IDs; subscriber contact, consent, audience, attribute, event, engagement,
reply, survey, and commerce data; campaign and automation content; delivery
analytics; and integration or webhook status. See the
[Sequenzy Privacy Policy](https://sequenzy.com/privacy) for the full categories,
purposes, recipients, retention periods, and user controls.

Do not use open-ended custom attributes, events, notes, forms, webhook samples,
email variables, or feedback to submit payment-card data, health or medical
data, government identifiers, biometric or genetic data, authentication
credentials, sensitive demographic data, or precise geolocation.

The OpenAI-reviewed route states and enforces those restrictions on relevant
open-ended inputs, including nested attribute paths such as `profile.ssn`,
coordinate pairs such as `lat`/`lng`, and labelled prose such as
`Religion: ...` or `GPS coordinates: ...`. It rejects a credential-bearing URL
in any argument, whether the credential sits in the userinfo, path, query, or
fragment, such as a form or popup `redirectUrl` with an access token or URL
signature. Restricted attribute selectors inside merge tags are rejected
without blocking ordinary authored copy about the same topic. On this surface,
`render_email` and `check_email` accept sample data or a policy-checked inline
`subscriber`, but not `subscriberId`, so they cannot resolve uninspected stored
custom attributes.
Its results remove restricted fields, raw API errors, debug payloads, internal
request/trace/session identifiers, unnecessary account or credential
identifiers, stored credential-bearing URLs, and inbound-webhook URLs. Standard
remote MCP and the local stdio package retain the complete contract for trusted
clients, including credential-based integration setup, one-time API-key and
webhook secrets, inbound-webhook URLs, and detailed API errors. Prefer the
dashboard or local CLI when secrets should stay outside an AI conversation.

What the reviewed surface guarantees is bounded. It recognizes restricted data
by shape: English field-name words such as `passport_id`, `user.ssn`, or
`api_secret` at any nesting depth, labelled prose such as `Diagnosis: ...`,
known credential shapes, decimal coordinate pairs, and credential-bearing URLs
inside any string, including HTML. It does not interpret unlabelled prose,
non-English field names, or values a client deliberately obfuscates; those
remain covered by the usage restriction above rather than by the filter.

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

Install **Sequenzy** from the Cursor Marketplace for a hosted connection with Sequenzy OAuth. The plugin connects to:

```text
https://api.sequenzy.com/v1/mcp
```

After installing, complete the browser sign-in flow. Cursor's agent can then use Sequenzy tools from chat, including when Grok is the selected model.

For a manual local stdio setup instead, add this to `~/.cursor/mcp.json`:

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

If the local server starts without `SEQUENZY_API_KEY`, it still starts and
lists its tools, but every tool call returns `MCP_AUTH_REQUIRED` with a link to
create a free account at
[sequenzy.com/sign-up](https://sequenzy.com/sign-up?utm_source=mcp&utm_medium=mcp-no-key)
and the steps above. Add the key and restart the client to continue.

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
a direct `manageUrl`. The OpenAI-reviewed route returns the same permissions
without the user's account ID or the active key's identity. Personal keys open
Account API Keys; company keys open the selected workspace's API Keys settings.
If the key does not include
`account:read`, open the
[Sequenzy dashboard](https://sequenzy.com/dashboard) directly and choose the
matching API Keys page.

Permissions are editable in place, so open `manageUrl`. For a company key, use
`list_api_keys` and its `isCurrent` flag to identify the active key before
editing it, then retry the failed tool without replacing the credential or
restarting the client. An agent using a company key with `api_keys:manage` can
instead call `update_api_key`; personal keys must be edited on the account-level
page because that tool only manages company keys. Its `scopes` and `preset`
inputs replace the whole permission selection rather than merging, so preserve
every existing scope that is still needed. Hosted OAuth connections can
alternatively disconnect and reauthorize with broader permissions.

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
includes `subscribers:tag` for applying tags to existing contacts. It also
includes `ab_tests:read`, `ab_tests:write`, and `sequences:write`, so agents can
audit and edit sequence A/B variant copy, including cart and browse abandonment
messages. It does not include `subscribers:write`, so it cannot add contacts to
lists or remove them from lists. Deleting a list or tag still requires the
matching `lists:delete` or `tags:delete` permission.

The AI drafting preset includes `subscribers:write`, so drafting agents can
build a list as well as create it. `add_subscriber` uses `subscribers:write`
for explicit `listIds`; imports into explicit lists and dedicated list membership tools still
need `lists:write`. Sequence enrollment or double-opt-in delivery additionally
needs `automations:trigger`. The two data ingest presets omit `lists:write`
and support explicit list placement through `add_subscriber`. Use custom
permissions for imports into explicit lists.

## Tools

The standard surface currently exposes 387 MCP tools. The OpenAI-reviewed
surface exposes 368; the omitted, renamed and split operations are listed above.

Tools reject arguments they do not declare instead of silently ignoring them.
Errors name the unsupported fields, list the supported arguments, and provide
focused guidance for common mistakes such as invented subscriber filters or
sort options.

### Account, Companies, Setup

| Tool                                 | Description                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `get_account`                        | Get account info, available companies, current key permissions, and the API Keys management URL.                                                                                                                                                                               |
| `select_company`                     | Set the active company for future tool calls.                                                                                                                                                                                                                                  |
| `get_app_urls`                       | Build dashboard URLs for campaigns, landing pages, sequences, emails, settings, subscription management, domains, and sent email details. `settingsTab: "billing"` resolves to Account -> Subscription.                                                                        |
| `create_company`                     | Create a company with a website or without one, optionally with a description and generated welcome sequence.                                                                                                                                                                  |
| `get_company`                        | Read company details, product info, brand context, localization, reply-tracking settings, current From/Reply-To defaults, the read-only dark-mode logo status (`darkModeLogoStatus`, `darkModeLogoUrl`), and the effective read-only `emailBranding` entitlement with plan/status reason and subscription URL; STO is explicitly identified as campaign-only. |
| `update_company`                     | Edit product info, brand context, your own dark-mode logo (`darkModeLogoUrl`, null for automatic), email theme, reply tracking, account-wide From/Reply-To profile defaults or names, and the company category (`websiteType`, e.g. `mobile_app`).                                                                                                                                                       |
| `get_design_md`                      | Read design.md: the email design brief as Markdown, with exact brand values in frontmatter plus Voice and Design direction, and its `version`.                                                                                                                                 |
| `update_design_md`                   | Save an edited design.md; only changed values are written. Supports `dryRun` and `expectedVersion`; errors name the line.                                                                                                                                                      |
| `get_sync_rules`                     | Read the company's event-to-tag rules and whether it uses the inherited platform preset.                                                                                                                                                                                       |
| `update_sync_rules`                  | Replace all sync rules; pass `[]` to disable them or `null` to opt into the SaaS/ecommerce platform preset.                                                                                                                                                                    |
| `get_shopify_automation_settings`    | Read browse-abandonment, cart-abandonment, and price-drop settings for the connected Shopify store.                                                                                                                                                                            |
| `update_shopify_automation_settings` | Partially update Shopify automation settings or reset an individual section to its platform defaults.                                                                                                                                                                          |
| `create_api_key`                     | Create a company API key and return its one-time secret on standard MCP; omitted from the OpenAI-reviewed route.                                                                                                                                                               |
| `request_api_key_handoff`            | Prepare an owner-reviewed create/rotation URL when the active key cannot manage API keys itself.                                                                                                                                                                               |
| `list_api_keys`                      | List company API keys as non-secret metadata for safe identification and cleanup.                                                                                                                                                                                              |
| `update_api_key`                     | Rename a company API key or replace its permission preset or scopes without changing the key value.                                                                                                                                                                            |
| `revoke_api_key`                     | Permanently revoke an exact company API key by ID after checking it with `list_api_keys`.                                                                                                                                                                                      |
| `delete_api_key`                     | Compatibility alias for `revoke_api_key`.                                                                                                                                                                                                                                      |
| `list_websites`                      | List sending domains with stored aggregate, SPF, DKIM, and MAIL FROM status. Named `list_sending_domains` on the OpenAI-reviewed route.                                                                                                                                        |
| `add_sending_domain`                 | Add a sending domain and return its cohort-specific DNS setup records.                                                                                                                                                                                                         |
| `add_website`                        | Compatibility alias for `add_sending_domain`; omitted from the OpenAI-reviewed route.                                                                                                                                                                                          |
| `check_website`                      | Read a sending domain's stored SPF, DKIM, MAIL FROM, and aggregate verification details. Named `get_sending_domain` on the OpenAI-reviewed route.                                                                                                                              |
| `verify_sending_domain`              | Run a fresh sending-domain DNS/provider verification and return current status and diagnostics.                                                                                                                                                                                |
| `upgrade_sending_domain_dns`         | Recommended, optional one-time upgrade of a verified domain to the current per-domain CNAMEs, without removing it; returns the CNAMEs to add.                                                                                                                                              |
| `configure_sending_domain`           | Deprecated: set `<label>.<domain>` as the company tracking domain when none is set; prefer `set_tracking_domain`.                                                                                                                                                              |
| `get_tracking_domain`                | Read the company tracking domain, its status, whether links use it now, and its CNAME record.                                                                                                                                                                                  |
| `set_tracking_domain`                | Set or change the company tracking domain every sending domain uses for tracked links, and return its CNAME.                                                                                                                                                                   |
| `verify_tracking_domain`             | Check the company tracking domain's CNAME and HTTPS certificate now.                                                                                                                                                                                                           |
| `remove_tracking_domain`             | Remove the company tracking domain; links and images in emails already sent through it stop working.                                                                                                                                                                                      |
| `list_integrations`                  | List connected integrations with connection and sync health, without returning credentials.                                                                                                                                                                                    |
| `get_sending_status`                 | Diagnose active, paused, or suspended sending, including enforcement denominators, review gates, and remediation steps.                                                                                                                                                        |
| `resume_sending`                     | Restore an eligible hard-bounce pause after explicitly confirming the list has been sanitized.                                                                                                                                                                                 |
| `get_tracking_settings`              | Read account-wide and Transactional API open/click defaults, unsubscribe, attribution, UTM, click-domain, reply-tracking, and double-opt-in settings.                                                                                                                          |
| `update_tracking_settings`           | Update account-wide and Transactional API tracking defaults, attribution, UTM, and account-wide double opt-in.                                                                                                                                                                 |
| `get_frequency_cap`                  | Read the company frequency cap: most marketing emails per contact in a rolling window, or null when off.                                                                                                                                                                       |
| `set_frequency_cap`                  | Set the company frequency cap (maxEmails per windowHours) that opted-in sequences respect.                                                                                                                                                                                     |
| `clear_frequency_cap`                | Turn the company frequency cap off.                                                                                                                                                                                                                                            |
| `get_account_health`                 | Read the account health report: settings, next run, the latest check's AI summary and stats, and open findings with recommendations, drafted fixes and your own feedback.                                                                                                                         |
| `update_account_health_settings`     | Turn the weekly check (Mondays, 05:00 UTC) on or off and choose whether it drafts fixes. Who gets the findings is each person's `account_health` notification preference.                                                                                                      |
| `run_account_health_check`           | Queue an account health check now (workspaces with more than 1,000 active subscribers that sent email in the last 14 days, one manual check per 10 minutes, and none for a day after a check that left findings open).                                                         |
| `update_account_health_insight`      | Dismiss, snooze, resolve, or reopen an account health finding.                                                                                                                                                                                                                 |
| `submit_account_health_feedback`     | Tell the Sequenzy team whether an account health finding was useful (with an optional comment). Changes nothing in the workspace.                                                                                                                                              |
| `create_account_health_fix`          | Build the inactive draft sequence an "event without a sequence" or "missing sequence" finding asks for: trigger, timing and email steps, with the emails written by AI like a template.                                                                                                              |
| `get_integration_guide`              | Get framework-specific integration examples.                                                                                                                                                                                                                                   |
| `get_integration`                    | Inspect one connected integration, its event wiring, list targeting, recent activity, and recommendations.                                                                                                                                                                     |
| `list_integration_capabilities`      | Compare provider capabilities whether or not they are connected.                                                                                                                                                                                                               |
| `list_integration_suggestions`       | Suggest integrations to connect from what was found on the company website, plus every payment provider when the site lists pricing.                                                                                                                                           |
| `connect_integration`                | Connect supported API-key or webhook-secret providers on standard MCP; omitted from the OpenAI-reviewed route.                                                                                                                                                                 |
| `get_event_schema`                   | Inspect published event payload examples, property paths, types, and merge tags by provider.                                                                                                                                                                                   |
| `list_integration_activity`          | Read the retained integration-specific webhook and sync activity log.                                                                                                                                                                                                          |
| `set_integration_sync_enabled`       | Enable or disable bulk imports and backfills while leaving live webhooks connected.                                                                                                                                                                                            |
| `set_integration_list_targeting`     | Choose which lists contacts created by a supported integration join on future provider writes.                                                                                                                                                                                 |
| `disconnect_integration`             | Disconnect Lemon Squeezy or SparkLoop locally and remove its managed webhook; after cleanupWarning, repeat to retry Lemon Squeezy cleanup or delete the SparkLoop webhook in SparkLoop. Requires integrations:manage.                                                      |
| `update_amplitude_settings`          | Choose which Amplitude events sync (syncAllEvents, eventAllowlist, skipInternalEvents) without the webhook secret. Amplitude only. Requires integrations:manage.                                                                                                              |
| `sync_integration`                   | Queue payment revenue, Supabase users, or a PostHog/Segment event-history import using the saved integration configuration.                                                                                                                                                    |
| `get_integration_pixel`              | Read Shopify's live pixel/configuration state and distinguish confirmed dark events from an unknown read.                                                                                                                                                                      |
| `activate_integration_pixel`         | Install or repoint Shopify's storefront pixel; idempotent when it is already current.                                                                                                                                                                                          |
| `list_web_tracking_keys`             | List publishable website and mobile app tracking keys, origin and app ID restrictions, usage state, and install snippets.                                                                                                                                                      |
| `get_web_tracking_key`               | Get one website-tracking key with its exact install snippet and ingest endpoint.                                                                                                                                                                                               |
| `create_web_tracking_key`            | Create a publishable tracking key for a non-Shopify storefront, website, or mobile app (`allowedAppIds`).                                                                                                                                                                      |
| `update_web_tracking_key`            | Rename, restrict (origins or app IDs), revoke, or re-enable a tracking key.                                                                                                                                                                                                    |
| `delete_web_tracking_key`            | Permanently delete a website-tracking key after its snippet has been removed.                                                                                                                                                                                                  |
| `list_sender_profiles`               | List sender and reply-to profiles, defaults, and sending-domain readiness.                                                                                                                                                                                                     |
| `update_sender_profile`              | Rename one sender or reply-to profile without changing the account defaults.                                                                                                                                                                                                   |
| `delete_sender_profile`              | Permanently delete an unused sender profile, with guards for live sending surfaces and the last remaining sender.                                                                                                                                                              |
| `get_notification_preferences`       | Read the current user's per-company account notification settings and supported modes, including the Monday weekly report and the account health findings.                                                                                                                     |
| `update_notification_preferences`    | Update the current user's account notification delivery modes, including weekly-report and account-health opt-out, without affecting teammates.                                                                                                                                |
| `render_email`                       | Render final email-safe HTML and diagnose unresolved merge tags, including typos hidden by defaults. The OpenAI-reviewed route accepts sample data or a policy-checked inline subscriber, not a stored subscriber ID.                                                          |
| `check_email`                        | Check a saved email before sending: live broken-link and image verification plus content rules. The OpenAI-reviewed route accepts sample data or a policy-checked inline subscriber.                                                                                           |

`get_sending_status` keeps the Postgres-backed pause state, review gates, and
remediation available when sender-health analytics are temporarily unavailable;
in that degraded case `senderHealth` is `null`.

`render_email` returns `unresolvedMergeTags` so callers can distinguish an
unknown name from a recognized tag that is merely blank for the previewed
contact. Unknown names are reported even when a `default` filter supplied text:
for example, `{{ subscriber.frstName | default: "there" }}` renders a plausible
greeting for every contact while bypassing stored first names. A recognized
name that is blank for one contact is not reported when its default is used.
The OpenAI-reviewed route rejects restricted custom-attribute selectors inside
merge tags. It also omits the `subscriberId` argument; use a policy-checked
inline `subscriber`, or omit subscriber data for a sample preview.

To render a sequence step whose `nodeType` is `action_ab_test`, pass the
step's `sequenceId` and `nodeId` together with a `variantId` from
`get_sequence.sequence.emails[].abTest.variants`. These steps have no email of
their own, so the variant is required; reading and rendering their competing
copy also requires the `ab_tests:read` scope.

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
Supabase, Stripe, Shopify, Wix, Webflow, and SparkLoop support this control.

Webflow requires an explicit choice: pass `[]` for no lists or specific list
IDs; `null` is rejected. Native form selection, field allowlists, required
double opt-in, and sequence enrollment are configured in **Settings →
Integrations → Webflow**. Authorization alone never starts capture; with no
selected forms, no contacts are created.

For PostHog, `sync_integration` restarts the event-history import from the
beginning with the stored personal API key. Imported events are deduplicated, so
retrying a failed import does not create duplicates.

For Segment, `connect_integration` on standard MCP can optionally import recent
event history from Unify after the live webhook is connected. The import walks
existing contacts through the Profile API, covers the API's most recent 14 days,
skips contacts without a matching profile, and safely deduplicates retries and
live webhook overlap. New connections skip automatic page/screen calls unless
those names are explicitly allowlisted. Segment webhook secrets must be 16-153
UTF-8 bytes. On the OpenAI-reviewed route, which omits `connect_integration`,
connect Segment in the dashboard or local CLI instead. Use `sync_integration`
to retry with the saved credentials.

For RevenueCat, `connect_integration` on standard MCP takes a secret API v2 key
(Projects read and Customers read permissions) and a `webhookSecret` of at
least 16 characters: the authorization header value set on the RevenueCat
webhook, or its HMAC signing secret. The project ID is resolved from the key;
pass `providerAccountId` only when the key can access several projects. The
integration is webhook-only, so `sync_integration` is not available. Contacts
are matched by `externalId` (the RevenueCat app user ID or an alias), then by
the `$email` attribute (read from the event or the RevenueCat API), then by an
app user ID that is an email address; unmatched events appear as skipped in
`list_integration_activity`.

For Superwall, `connect_integration` on standard MCP takes only a
`webhookSecret`: the `whsec_` signing secret of the Superwall webhook pointed
at the returned `webhookUrl`. Superwall has no API key, so the secret's format
is checked and the first signed delivery proves the connection. The integration
is webhook-only, so `sync_integration` is not available. Contacts are matched
by `externalId` (the user ID passed to Superwall's `identify()`, or the
subscription's original app user ID), then by an `email` user attribute, then
by a user ID that is an email address. Sandbox events and unmatched events
appear as skipped in `list_integration_activity`.

For Adapty, `connect_integration` on standard MCP takes only a
`webhookSecret`: at least 16 characters, set as the Authorization header value
of the Adapty webhook pointed at the returned `webhookUrl`. Connect before
saving the webhook in Adapty, because Adapty sends a verification request on
Save. Adapty has no API key; the verification request proves the connection.
The integration is webhook-only, so `sync_integration` is not available.
Contacts are matched by `externalId` (the customer user ID passed to Adapty's
`identify()`, or the Adapty profile ID), then by the profile email, then by an
`email` user attribute, then by a customer user ID that is an email address.
Keep Adapty's default event names. Sandbox events and unmatched events appear
as skipped in `list_integration_activity`.

For Mixpanel and Amplitude, `connect_integration` on standard MCP takes only a
`webhookSecret`: a random value of 16-153 characters without spaces or colons
that you choose (Sequenzy cannot show it again, so hand it to the user once).
Mixpanel sends it as the Basic auth password of a Webhook destination (any
username; the dashboard suggests `sequenzy`). Mixpanel can only export cohorts
to webhooks, so each synced cohort becomes a `mixpanel-<cohort>` tag that people
gain when they join and lose when they leave. Amplitude sends it in an
`X-Webhook-Secret` header on its Webhook destinations: streamed events become
`product.<event type>`, identify calls and the Users stream update the contact
profile, and synced cohorts become `amplitude-<cohort>` tags. Optional
`settings` (`syncAllEvents`, `eventAllowlist`, `skipInternalEvents`) scope
Amplitude events. The first sync of a cohort tags its current members without
starting automations. `get_integration` lists synced cohorts and their tags in
`integration.cohorts`. Change Amplitude's event scope later with
`update_amplitude_settings`, which needs no secret; reconnecting would replace
it. Neither provider supports `sync_integration`.

For Attio, `connect_integration` on standard MCP accepts a workspace access
token without a webhook secret, with optional `settings.listMap` as a map of
Sequenzy list IDs to Attio people-list UUIDs or API slugs, plus
`syncCompanyFromDomain` to control company matching from non-free-mail domains.
On the OpenAI-reviewed route, connect Attio in the dashboard or local CLI, then
use `update_attio_settings` for the same settings. Sync runs both ways, per
mapping: `listMap` and `tagMap` put people on Attio lists when they join a
mapped Sequenzy list or get a mapped tag, and `inboundListMap` and
`inboundTagMap` add people to Sequenzy lists or tags (triggering their
automations) when they are added to a mapped Attio list. Inbound maps make
Sequenzy register an Attio webhook, which needs the `webhook:read-write` scope
on the token. `syncRemovals` mirrors removals; off, the sync only adds people.
`get_attio_mapping` shows every map and whether inbound sync is listening.

For SparkLoop, `connect_integration` on standard MCP takes `apiKey`.
Sequenzy registers its own webhook in SparkLoop, authenticated by a secret in
its URL. `webhookSecret` is optional: pass the webhook authentication token
from SparkLoop only to verify the `SparkLoop-Token` header instead. An account with
several publications needs `providerAccountId` set to the publication ID; the
400 error lists them in `publications`. Optional `settings.listIds` picks the
lists new referrals join (omit to keep the current choice, `null` for the
workspace defaults). A rejected SparkLoop key is a 400 with code
`sparkloop_api_key_rejected`; a publication already connected to another
workspace is a 409. Partner referrals become subscribers with
`sparkloop*` attributes and trigger `sparkloop.referral_pending`,
`sparkloop.referral_confirmed`, and `sparkloop.referral_rejected`; a referral of
an existing subscriber leaves them unchanged and is rejected in SparkLoop.
`disconnect_integration` removes the SparkLoop webhook.

Call `get_event_schema` before writing an `{{event.*}}` merge tag or an event
property filter. Omit `eventName` to list documented built-in events; provide
an event name to receive provider-specific example payloads and property paths,
and optionally filter by `provider`. Custom event names remain valid even when
the result reports `documented: false`; that only means no reference sample is
published. Use integration activity or sequence enrollments for actual delivery
data because this tool returns static reference data.

For a new sending domain, call `add_sending_domain`, publish the DKIM, DMARC and
bounce records it returns (see `website.bounceRecords` below), wait for DNS
propagation, and then call `verify_sending_domain`. Optional `mailFromPrefix` (default `rp`) chooses the
return-path subdomain when the domain is created; new domains also get a second return path, usually `<label>2` (`rp2` by default).
Publish the names returned. New domains publish the return path (`rp` by default) as one CNAME (`website.bounceRecords.cnameRecord`), which also works
where the DNS host blocks custom MX records; domains added earlier keep their
SPF TXT and MX records. Verification checks SPF and MX through the CNAME, so
either shape verifies. Tracked links use the company
tracking domain, which every sending domain shares: the first domain creates it
under itself (`links.<domain>`, or `trackingPrefix`) and returns its CNAME as
`dnsRecords.trackingRecord`; `website.tracking` reports its status. It is
optional and never blocks verification or sending: until it verifies, links use
the shared Sequenzy domain. Use `get_tracking_domain`, `set_tracking_domain`, `verify_tracking_domain`
and `remove_tracking_domain` to manage it; `configure_sending_domain` is
deprecated. Publish the returned records instead of assuming a fixed provider
or record count, using `website.bounceRecords` for the bounce subdomain (its
`cnameRecord`, or `spf.record` and `mailFrom.mxRecord`, never both at the same
name): unified domains include required DMARC, while
legacy domains can return Amazon SES MAIL FROM records. If
verification is attempted before creation, the error points back to
`add_sending_domain` with the requested domain.

A verified domain on the previous record set, including an older SES-only
domain that has a working DMARC record, reports
`website.dnsUpgrade.status: "available"`. An older SES-only domain without
DMARC is `unavailable` and the start returns 400 ("Add a DMARC record for this
domain before upgrading its DNS records."). Call `upgrade_sending_domain_dns`
for a recommended, optional one-time upgrade to the current per-domain CNAMEs
(better deliverability and security) without removing it: publish the
`dnsUpgrade.records` CNAMEs next to the current records and remove nothing.
About an hour after the required ones are visible on public DNS, the domain
switches by itself (`verify_sending_domain` checks now but does not skip the
wait). Sending is normally not interrupted at the switch; if that isn't
possible for a domain, emails sent through Amazon SES can be held for a few
minutes. `dnsUpgrade.replacedRecords` lists beforehand which current records
the switch replaces; `dnsUpgrade.oldRecords` then lists the records that can optionally be deleted after
`deleteOldRecordsAfter`, 8 days after the switch (for an older SES-only domain
that includes the old return path MX and TXT at `send.<domain>` and the DKIM
TXT; DMARC stays). Once started, an upgrade runs to the switch and can't be
cancelled; until then it changes nothing.

Receiving mail (inbox addresses and replies) is not part of sending-domain
setup: it uses receiving domains (see Receiving domains below). `inbound*`
fields that may still appear in `website.dnsRecords` describe an older reply
setup; check and fix receiving with the receiving-domain tools.

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

Use `delete_sender_profile` to permanently remove an obsolete From identity.
It refuses the last sender and any profile used by a live campaign, active
sequence (including a step override), or transactional email. Eligible drafts
and account defaults move to the returned `fallbackSenderProfileId`; review it
before sending. Reply-to profiles are not supported by this delete tool.

Shopify cart abandonment is enabled by default. It fires
`ecommerce.cart_abandoned` after one hour of cart inactivity, with a 24-hour
per-subscriber cooldown. Use `update_shopify_automation_settings` to change the
`cartAbandonment.enabled`, `delayHours`, or `cooldownHours` fields; pass
`cartAbandonment: null` to restore those defaults without changing browse
abandonment or price-drop settings. Timing values must be positive;
`delayHours` is capped at 168 and `cooldownHours` at 720.

### Subscribers

| Tool                          | Description                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `add_subscriber`              | Add one subscriber, including explicit `listIds`, with `subscribers:write`; status is creation-only.                                               |
| `create_subscriber_import`    | Queue up to 5,000 full CRM records with an optional retry-safe `idempotencyKey`; enabled email-hygiene checks continue separately after ingestion. |
| `get_subscriber_import`       | Read progress, row outcome counts, and failure summaries for a queued import.                                                                      |
| `update_subscriber`           | Update native profile and phone fields, SMS consent, attributes, tags, or global status.                                                           |
| `remove_subscriber`           | Unsubscribe while preserving suppression history, or permanently delete only with `hardDelete: true`.                                              |
| `get_subscriber`              | Fetch subscriber details by email or external ID.                                                                                                  |
| `list_subscriber_attributes`  | List custom attribute names in use with value type, list flag, example, and sampled-contact count; use before setting attributes.                  |
| `search_subscribers`          | Search by query, tags, list, status, segment, or one custom attribute, with automatic or resumable pagination.                                     |
| `trigger_subscriber_event`    | Emit one custom event exactly as an integration would, applying sync rules and matching sequence triggers.                                         |
| `trigger_subscriber_events`   | Emit several ordered custom events for one subscriber.                                                                                             |
| `import_subscriber_events`    | Import up to 25 source-identified events across contacts; silent history requires every row for a contact to be over an hour old.                  |
| `bulk_add_subscriber_tags`    | Add tags to up to 500 existing subscribers; requires `subscribers:tag` and may also require `tags:write`.                                          |
| `bulk_remove_subscriber_tags` | Remove tags from up to 500 existing subscribers; requires `subscribers:tag` or `subscribers:write`.                                                |

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

Carry each contact's source status in `status`. Map provider values first:
`Subscribed` or `active` is `active`; `Unsubscribed`, `cancelled`, `inactive`
or `complained` is `unsubscribed`; `cleaned` or `hard bounce` is `bounced`.
The dashboard and CLI import contacts the source marks `Not Confirmed`,
`pending` or `unconfirmed` as `active`. Unsubscribed and bounced records never enroll in sequences or
receive a double opt-in email, and an `active` record never resubscribes an
unsubscribed or bounced contact. With `merge` or `overwrite`, an unsubscribed
or bounced record applies that status to an existing active contact.

For `import_subscriber_events`, email is required when a row may create a new
contact; `externalId` can stand alone only for an existing contact. Supply a
stable `eventId` on every row. Retrying reuses the original receipt and
idempotently re-attempts downstream recovery. Historical classification is per
contact: if any row for a contact is recent, that contact's whole group uses
the live side-effect path.

For compliance suppression, call `update_subscriber` with
`status: "unsubscribed"` (or use `remove_subscriber` without `hardDelete`). Do
not retry `add_subscriber` with a different status: status on that tool applies
only when the contact is first created, and a mismatched skipped result is
reported as an error.

When a contact reported spam, call `update_subscriber` with
`status: "complained"`. It records a company spam-complaint suppression for the
address, then unsubscribes the contact and cancels its sequence enrollments.
The contact reads as `unsubscribed` afterwards, and
`get_recipient_suppression` shows the complaint. Repeating it is safe.

`add_subscriber` with a `createdAt` at most one hour old remains eligible for new-subscriber account notifications. Older dates do not notify on creation; a later double opt-in confirmation can still notify. Recipient preferences, double opt-in and daily caps still apply. Supplying `createdAt` continues to default sequence enrollment to false. Bulk imports do not notify on creation.

When `add_subscriber` omits `listIds`, a contact created by the call follows
the workspace default lists while an existing contact keeps its current list
memberships. Pass list IDs explicitly when an existing contact should join
specific lists using `subscribers:write`. Pass `[]` to target no lists.

`update_subscriber.phone` writes the native phone field shown on the contact,
not a custom attribute. Pass `smsConsent: true` only after verifying express
written consent, or `false` to opt the contact out. Changing the phone without
`smsConsent` resets SMS consent because consent belongs to the old number.

`add_subscriber`, `update_subscriber`, and `create_subscriber_import` accept an
IANA `timezone` such as `America/New_York`. The value is stored on the native
contact profile and enables recipient-local campaign delivery. Pass an empty
timezone to `update_subscriber` to clear it; invalid import-row values are
ignored without rejecting the rest of the import.

### Accounts (B2B organizations)

Accounts are your customers' companies, workspaces or teams, not your Sequenzy
account (`get_account`). The dashboard calls them Organizations. Their fields
work as `organization.<name>` in segment attribute filters, sequence conditions
and `{{organization.<name>}}` merge tags (`account.*` is an older alias), and a
sequence with matching field `organization.externalId` runs once per
organization.

| Tool                                            | Description                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_accounts`                                 | List accounts with search, sort and pagination. `withoutEventRecipients: true` finds accounts with no owner or admin.                                                                                                                                                 |
| `get_account_by_external_id`                    | Get one account with up to 100 members and their roles.                                                                                                                                                                                                               |
| `upsert_account`                                | Create or update an account by external ID, with optional members.                                                                                                                                                                                                    |
| `delete_account`                                | Delete an account and its memberships; contacts are kept.                                                                                                                                                                                                             |
| `list_account_members`                          | List members, owners first.                                                                                                                                                                                                                                           |
| `add_account_member` / `remove_account_member`  | Change membership by email or contact external ID.                                                                                                                                                                                                                    |
| `trigger_account_event` / `list_account_events` | Record an account event for owners, admins, all or none, and read the timeline.                                                                                                                                                                                       |
| `list_account_suggestions`                      | Read-only: work email domains several contacts share (default 3+), with up to 10 sample emails, skipping personal and disposable providers, your sending domains, domains where a contact is already in an account, and domains an account uses.                      |
| `accept_account_suggestions`                    | Create accounts for up to 25 confirmed domains, adding the domain's unassigned contacts as members (or adding them to the one account already using the domain). Skips domains already partly grouped. Safe to retry; no sync rules or segment-entered sequences run. |
| `detect_account_organization_ids`               | Read-only: event properties and contact attributes holding your organization ID (such as `workspaceId`), with organization counts and a matching name key.                                                                                                            |
| `preview_accounts_from_organization_id`         | Read-only: the biggest accounts a key would create, each with the name it would get (from the name key, otherwise its contacts' shared work email domain), domain, contact count and sample emails.                                                                   |
| `create_accounts_from_organization_id`          | Start a background run creating one account per organization ID with its contacts as members. Returns `jobId` and `alreadyRunning`; nothing is sent and reruns are safe.                                                                                              |
| `get_account_organization_id_job`               | Check that run: `queued`, `running`, `completed` with counts, or `failed` with the error.                                                                                                                                                                             |

Show suggestions to the user and accept only the domains they confirm. Likewise, show the organization ID preview and create accounts only after the user confirms it.

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

The tool accepts PNG, JPEG, GIF, and WebP images up to 10MB. Local stdio clients
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
| `create_segment`               | Create nested or same-element array-filtered segments.      |
| `update_segment`               | Update segment name, filters, root group, or join operator. |
| `delete_segment`               | Delete a segment (requires `segments:delete`).              |
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

For array-of-object attributes, use wildcard paths such as
`history_events[].eventvenue_id:2103`. When an AND group also filters
`history_events[].showing_date`, both conditions must match one shared
`history_events[]` element; values from unrelated history entries are not
combined. Deleting a segment requires `segments:delete`; `segments:write` is
not sufficient.

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

Engagement fields such as `emailSent`, `emailDelivered`, `emailOpened`, `emailClicked`, `emailBounced`, and `emailComplained` accept rolling windows like `24h`, `7d`, `30d`, `90d`, `180d`, or `all` (whole hours from `1h` to `8760h`). Presence operators can scope by delivery policy with `marketing:<timeRange>` (marketing-policy campaign, automation, and Send API traffic) or `transactional:<timeRange>` (transactional-policy sends); policy scopes require a send-time policy snapshot, so ambiguous older automation and Send API events remain available only through unscoped filters. `emailBounced` also supports scoped values with `is_temporary_bounce` and `is_permanent_bounce`. With `at_least` and `less_than_count`, use `count:timeRange`, such as `10:30d` or `10:all`. Presence operators can instead use a campaign scope like `campaign:cmp_123`; campaign and email-type scopes cannot be combined with count operators.

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

### Warehouse Sync

| Tool                          | Description                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `list_warehouse_connections`  | List warehouse connections with status and number of syncs.                           |
| `get_warehouse_connection`    | One connection with its settings and last test; credentials are never returned.       |
| `create_warehouse_connection` | Connect Snowflake, BigQuery, Redshift or Postgres; runs a test query before saving.   |
| `update_warehouse_connection` | Rename, change settings (merged) or rotate credentials; re-tested before saving.      |
| `delete_warehouse_connection` | Delete a connection that no sync uses.                                                |
| `test_warehouse_connection`   | Run the test query with the stored credentials.                                       |
| `preview_warehouse_query`     | Run a query with a 20-row limit to see its columns.                                   |
| `list_warehouse_syncs`        | Syncs with status, cursor position and the latest run.                                |
| `get_warehouse_sync`          | One sync.                                                                             |
| `create_warehouse_sync`       | Sync contacts or events from a query on a schedule; only changed rows are sent.       |
| `update_warehouse_sync`       | Change query, mapping, cursor, schedule or options; pause or resume with `isEnabled`. |
| `delete_warehouse_sync`       | Stop a sync; imported data stays.                                                     |
| `run_warehouse_sync`          | Run now; `fullResync` sends every row again.                                          |
| `list_warehouse_sync_runs`    | Row counts, sample problems and import progress per run.                              |

Subscriber syncs import through the regular import pipeline (mapped values replace stored ones; tags are only added; unsubscribed contacts stay unsubscribed). Event syncs record events only for contacts that already exist. `triggerAutomations` and `optInMode: "double_opt_in"` need `automations:trigger`; event syncs need `events:write`. The credential-taking tools and `preview_warehouse_query` are excluded from the OpenAI-reviewed profile.

### Data Exports

| Tool                    | Description                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| `list_data_exports`     | List bucket exports with status, per-dataset progress and the last error.                   |
| `get_data_export`       | Get one export.                                                                             |
| `create_data_export`    | Add an S3, GCS or S3-compatible bucket; writes a test file first, then exports immediately. |
| `update_data_export`    | Change datasets, frequency, location or credentials; pause or resume with `isEnabled`.      |
| `delete_data_export`    | Stop exporting; files already written are kept.                                             |
| `test_data_export`      | Write a test file with the stored credentials.                                              |
| `run_data_export`       | Export now instead of waiting for the schedule.                                             |
| `list_data_export_runs` | Recent runs with rows, files, bytes and errors.                                             |

Datasets are `email_events`, `sms_events`, `custom_events` and `subscribers` (a daily snapshot). Files are gzipped JSON lines under `<pathPrefix>/<dataset>/date=YYYY-MM-DD/`; rows are delivered at least once, so deduplicate on `id`. Credentials are never returned, and the credential-taking tools are excluded from the OpenAI-reviewed profile.

### Templates

| Tool                            | Description                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `list_templates`                | List templates with localization status, label and `isTemplate` filtering, and pagination.                         |
| `get_template`                  | Read template details, content, and localized variants.                                                            |
| `create_template`               | Create templates from a prompt, HTML, or Sequenzy blocks; use `isTemplate: true` to save a reusable master design. |
| `update_template`               | Update template metadata, inbox preview text, labels, HTML, or blocks; mark or unmark a master with `isTemplate`.  |
| `create_template_from_example`  | Remix a public email gallery email into a new template written in the company's brand.                             |
| `preview_template_from_example` | The same rewrite for the company or another `website`, returned as HTML without saving.                            |
| `list_email_references`         | List gallery emails from the brands most like the company, or the whole gallery, to model a new email on.          |
| `list_gallery_brand_requests`   | List the company's requests to add brands (like competitors) to the gallery, with where each one stands.           |
| `request_gallery_brand`         | Ask for a brand, usually a competitor, to be added to the gallery; asking again keeps one request.                 |
| `remove_gallery_brand_request`  | Withdraw a brand request.                                                                                          |
| `list_watched_brands`           | List the brands the company watches (its Competitors page), with each one's status, email count and newest email.  |
| `watch_brand`                   | Watch a brand, usually a competitor; one not in the gallery yet is requested.                                      |
| `unwatch_brand`                 | Stop watching a brand.                                                                                             |
| `list_watched_brand_emails`     | Read what watched brands sent, newest first, filtered by `domain` or `since`, with cursor paging.                  |
| `set_template_localization`     | Create or replace a caller-supplied localized variant.                                                             |
| `sync_template_localizations`   | Queue AI translation for selected or all enabled non-primary locales.                                              |
| `get_template_localization_coverage` | Count, per language, translated sequence and transactional emails.                                                 |
| `translate_missing_template_localizations` | Translate every sequence and transactional email missing a language.                                               |
| `delete_template`               | Delete a template.                                                                                                 |

`list_templates` returns 50 email bodies newest first by default and accepts a
`limit` up to 100. Advance `offset` by `pagination.count` while
`pagination.hasMore` is true; `pagination.total` reports the full matching
count, including campaign and transactional-email bodies.

Set `isTemplate: true` on `list_templates` to return only saved master designs,
or `false` to return ordinary email bodies. Marked masters are offered as
starting points for dashboard sequence steps and campaigns; starting from one creates
an independent copy so edits leave the master intact.

Standalone/sequence source-design copying and AI rewriting within a selected layout are currently
dashboard-only. This release intentionally keeps those workflows in interactive
authoring, where users can review the source, translations, and any fallback copy
before saving a sequence step. REST, CLI, and MCP expose no equivalent standalone/sequence source-design
operation. `create_template` with `prompt` generates new content without preserving
an existing layout; supplied HTML or blocks create a new body without automatically
copying localized variants. See the [interface availability documentation](https://docs.sequenzy.com/concepts/email-templates#availability-across-interfaces).

Remixing a public example from the [Sequenzy email gallery](https://sequenzy.com/email-examples)
(real emails other brands sent, not the dashboard's designed templates) is a separate,
supported workflow: `create_template_from_example` remixes a gallery email into a new
HTML template (the example's exact layout, with every word rewritten for the company and its logo, color and links swapped in, never
naming the example brand), and `create_sequence_from_example` clones a gallery sequence
into a draft with the same trigger family and send timing, up to 12 emails (pass
`stepNumbers`, the 1-based positions of the example's emails, to choose which). Pass the
gallery `url`, or `brand` plus `email`/`sequence` slugs, and an optional `brief`.
`preview_template_from_example` and `preview_sequence_from_example` return the same
rewrite (the first 3 emails for a sequence) without saving anything, for the company's
brand or for another `website`, matching the gallery's **See it for your brand** preview.
`list_email_references` returns each email's `analysis` (main button, length, layout,
voice, structure and takeaways; null until analyzed) to help choose a model. Both
match the dashboard's **Remix this email** and **Clone this sequence**. A template remix
takes 5-20 seconds and saves nothing on failure; a cloned sequence returns right away
with `enrichmentStatus: "processing"`, so poll `get_sequence` until it is `complete`.
If it returns `enrichmentStatus: "not_queued"` with a warning, the draft exists but writing
did not start; open it in the dashboard. Every successful call creates something new,
so do not retry after a success.

Campaign copies already work through REST `POST /api/v1/campaigns` and MCP
`create_campaign` with `templateId`; it cannot be combined with `prompt` for an AI rewrite.

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

To translate many emails at once, `translate_missing_template_localizations`
queues AI translation for every sequence email (including sequence A/B variants)
and enabled transactional email with no translation in a language yet, or a
failed one. It leaves edited, up-to-date and outdated translations alone.
`get_template_localization_coverage` reports per-language counts so you can
follow the translations as they finish. Adding a language in the dashboard
already translates existing emails into it.

### Reusable Email Components

| Tool                              | Description                                                                                |
| --------------------------------- | ------------------------------------------------------------------------------------------ |
| `list_email_components`           | List saved sections and footers, optionally limited to pinned defaults.                    |
| `get_email_component`             | Read one component's blocks, metadata, version, and default-slot state.                    |
| `get_default_email_component`     | Read the component currently pinned to a default slot such as `footer`.                    |
| `preview_default_email_component` | Preview affected existing emails and optional before/after HTML without writes.            |
| `set_default_email_component`     | Save the default footer, optionally applying a reviewed token to selected existing emails. |
| `create_email_component`          | Save a reusable section or footer from a block list.                                       |
| `update_email_component`          | Update component metadata or replace its blocks and increment its version.                 |
| `duplicate_email_component`       | Copy a component into a new one named "(Copy)" or a name you choose; never a default.      |
| `delete_email_component`          | Delete a component without changing emails that already copied its blocks.                 |

Components are copied into emails when those emails are built, so later edits
affect newly built emails. Use the default-footer preview and apply workflow below
to update selected existing content. The default
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
| `select_ab_test_winner`  | Select a campaign winner, or select or change a sequence test winner.          |
| `resume_ab_test`         | Clear a sequence test winner and keep testing until a winner is selected.      |
| `update_ab_test`         | Update campaign or sequence winner-selection settings.                         |
| `update_ab_test_variant` | Update campaign draft or sequence variant copy.                                |
| `create_ab_test`         | Create a campaign test or convert a sequence email step.                       |
| `add_ab_test_variant`    | Add a variant to an existing A/B test.                                         |
| `delete_ab_test_variant` | Delete a draft A/B test variant.                                               |
| `delete_ab_test`         | Delete an A/B test.                                                            |

Use `get_sequence.sequence.emails[].abTest.variants` to discover sequence variant IDs, subjects, preview text, and block counts; call `get_ab_test` to audit every variant's full `blocks`, effective `settings`, localization status, or stats. Campaign settings use `testPercentage`, `testDurationMinutes`, and `winnerCriteria`; sequence settings use `testType`, `winnerThreshold`, and `winnerCriteria`. The legacy sequence values `testPercentage: 100` and `testDurationMinutes: 0` are compatibility sentinels, not runtime settings. `select_ab_test_winner` on a campaign test requires the testing phase and immediately queues the winning variant for the remaining audience; on a sequence test it selects or changes the winner, including one picked automatically, for everyone who reaches the step afterwards. `resume_ab_test` clears a sequence test's winner so contacts are split again and turns off automatic selection for that test. `update_ab_test` changes the appropriate settings model and requires `confirmLiveChange: true` when sequence settings affect an active or already-used test. Variant updates accept either `html` or `blocks`, not both.

`create_ab_test` accepts exactly one of `campaignId` or `automationNodeId`; the latter requires one to four extra variants and converts a sequence email node into `action_ab_test`. The conversion moves the step's subject, preview text, and blocks onto independent variant emails. Get the test and variant IDs from `get_sequence`, read every variant's copy with `get_ab_test`, and edit each one with `update_ab_test_variant`; `update_sequence_node` and `update_template` cannot edit variant copy, and a change intended for the whole step must be repeated for every variant. If `update_ab_test_variant` is not in the MCP tool list, enable it on the Sequenzy connector rather than writing through another email tool. The full workflow requires `ab_tests:read`, `ab_tests:write`, and `sequences:write`, all included in **Safer agent access**. With only `sequences:read`, `get_sequence` keeps the A/B step and control copy visible but redacts test-record fields and returns an empty variant list. An explicit sequence `winnerCriteria` overrides the `testType` default, so content variants can still be judged by opens. Pass `confirmLiveChange: true` when converting a node in an active sequence. Together with control A, an A/B test supports at most five variants. Sequence variants receive independent email templates and can be edited after creation; once the sequence is active or the test has activity, `update_ab_test_variant` requires `confirmLiveChange: true`. Variants can only be added or removed while the test is a draft, and live-sequence changes also require confirmation because they immediately change the rotation.

`winnerCriteria` accepts `open_rate`, `click_rate`, `goal_conversion_rate`, `goal_value`, and `event_rate` on `create_ab_test` and `update_ab_test`. Goal criteria need `winnerGoalId` (an active company-wide goal, a goal of this campaign or sequence, or `default-revenue` for purchase revenue) and judge variants by conversions attributed to each variant's emails; `event_rate` needs `winnerEventName` and judges by recipients who fire it after receiving the variant. When no variant converts, campaign tests fall back to click rate and sequence tests keep splitting. `get_ab_test_stats` reports per-variant `outcome` (convertedRecipients, conversionRate, value, valuePerDelivery) for these tests.

### Campaigns

| Tool                                          | Description                                                                                                                                                                                              |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_campaigns`                              | List paginated campaigns by status or label, including reviewer feedback and delivery-pacing fields for account-wide STO audits.                                                                         |
| `get_campaign`                                | Get details, stats, reviewer feedback, and recorded delivery pacing for a campaign.                                                                                                                      |
| `get_campaign_audience`                       | Resolve saved targeting, missing references, a plain-language summary, and live recipient count.                                                                                                         |
| `list_campaign_goals`                         | List campaign-specific goals plus automatically applied company-wide Settings goals (SMS is unsupported).                                                                                                |
| `create_campaign_goal`                        | Add an event, subscriber-attribute, or tag-applied email-campaign conversion goal.                                                                                                                       |
| `update_campaign_goal`                        | Update a persisted email-campaign conversion goal.                                                                                                                                                       |
| `delete_campaign_goal`                        | Delete a persisted email-campaign conversion goal.                                                                                                                                                       |
| `list_campaign_variations`                    | List a campaign email's variations (alternative versions compared on the editor canvas) with status, lineage and whether each is in use.                                                                 |
| `get_campaign_variation`                      | Get one variation, including its status while it generates.                                                                                                                                              |
| `generate_campaign_variations`                | Start generating 1-4 AI variations of the email or of a variation. Returns at once; poll until each is ready or failed.                                                                                  |
| `create_campaign_variation`                   | Save blocks or HTML as a new variation, optionally as a branch of another.                                                                                                                               |
| `update_campaign_variation`                   | Rename a variation or replace its content once it is ready.                                                                                                                                              |
| `discard_campaign_variation`                  | Discard a variation; its branches move up a level until it is restored.                                                                                                                                  |
| `restore_campaign_variation`                  | Bring back a discarded variation and its lineage.                                                                                                                                                        |
| `use_campaign_variation`                      | Put a variation's content in a draft campaign's email, saving the previous content as a variation first.                                                                                                 |
| `generate_campaign_variation_section_options` | Generate unsaved options for selected sections of the email or a variation.                                                                                                                              |
| `edit_campaign_variation` | Change one variation with AI (optionally only some sections) and save it over the variation. |
| `list_email_sends`                            | Search recent delivery history with resource IDs and URLs, optionally scoped to one sequence step. Successful live-test sends are omitted.                                                               |
| `get_email_send`                              | Inspect a queued, test, sent, suppressed, or failed delivery by durable email-send ID.                                                                                                                   |
| `list_recipient_suppressions`                 | List associated suppressed recipients, including protected global invalid addresses and complaints.                                                                                                      |
| `get_recipient_suppression`                   | Check local bounce, complaint, email-hygiene, and regional SES suppression for one exact recipient.                                                                                                      |
| `remove_recipient_suppression`                | Remove a workspace soft-bounce escalation while preserving global, hard-bounce, and complaint protections.                                                                                               |
| `create_campaign`                             | Create a campaign with content, data, file attachments, and optional From/Reply-To identity overrides.                                                                                                   |
| `update_campaign`                             | Update a draft campaign, including content, data, identities, audience, persisted STO configuration, the recipient limit, and file attachments.                                                          |
| `schedule_campaign`                           | Schedule or reschedule a campaign, optionally overriding STO, its 1-24 hour delivery window, and the recipient limit.                                                                                    |
| `send_test_email`                             | Send a test email to one address.                                                                                                                                                                        |
| `render_email`                                | Render exact email-safe HTML and report unresolved tags, including typos hidden by defaults.                                                                                                             |
| `check_email`                                 | Pre-send check: live broken-link and image verification plus content, subject and client rules.                                                                                                          |
| `cancel_campaign`                             | Cancel a scheduled or sending campaign.                                                                                                                                                                  |
| `pause_campaign`                              | Pause a sending campaign.                                                                                                                                                                                |
| `resume_campaign`                             | Resume a paused campaign, optionally spreading delivery over time.                                                                                                                                       |
| `delete_campaign`                             | Delete a campaign.                                                                                                                                                                                       |
| `duplicate_campaign`                          | Duplicate a campaign into a new draft.                                                                                                                                                                   |
| `resend_campaign_to_non_openers`              | Create a draft resend using live audience membership and hard opener exclusions that survive manual additions and repeated resends. Named `create_non_opener_resend_draft` on the OpenAI-reviewed route. |

For older resend drafts missing `excludedCampaignOpenerIds`, use `resend_campaign_to_non_openers` on the original campaign to recreate the draft, then review its audience before scheduling.

Prompt-created campaigns are generated and persisted in one API request and
remain drafts. Use `templateId`, `blocks`, or `html` only when copying or
preserving existing content rather than asking the agent to author it. Omit all
content fields to create an empty draft for later editing.

Campaign variations never change what a campaign sends until
`use_campaign_variation`, which works on drafts only and returns the email's
previous content as `savedPrevious` when it had to save it as a new variation.
`generate_campaign_variations` does not wait: poll `list_campaign_variations`
until no variation has `status: "generating"` (one still generating after 10
minutes is reported as `failed`). Section options save nothing; apply one by
swapping its `replacements` into the variation's blocks by id and calling
`update_campaign_variation`, or change a variation directly with
`edit_campaign_variation`. `style` on generation sets how far new versions
move: `close`, `fresh`, or `bold` (a new layout with its own `emailTheme` and
`fontFamily`, which using the variation puts on the email).

`list_campaign_goals` returns campaign-specific definitions in `goals` and
company-wide Settings definitions in `companyGoals`, including inactive goals.
Company-wide custom goals already apply after an open or click within their
configured window. Do not recreate or delete them through campaign goal tools;
manage them in Settings. Empty arrays mean no goals of that scope exist.

Campaign goals credit recipients who were actually sent that campaign within
the configured attribution window; an open or click remains the stronger
last-touch signal when one exists. Event goals require `triggerEventName`,
subscriber-attribute goals require `attributePath`, and tag-applied goals
require `triggerTagName`. The campaign attribution window defaults to 168
hours when omitted.

To deliver at the same wall-clock time in every recipient's own timezone, call
`schedule_campaign` with `sendInRecipientTimezone: true` and an IANA
`scheduledTimezone` that identifies the wall clock represented by
`scheduledAt`. Contacts without a stored timezone receive the campaign at the
`scheduledAt` instant. This mode cannot be combined with recurring or spread
delivery.

Send Time Optimization is configured per campaign, not at the company or
sequence level. Audit it across campaigns with `list_campaigns`, or inspect one
campaign with `get_campaign`. Set `sendTimeOptimization` and
`sendTimeWindowHours` (1-24, default 12) on a draft with `update_campaign`, or
override them while scheduling with `schedule_campaign`. `spreadOverHours`
takes precedence and disables STO, as does recipient-timezone delivery.
Sequences instead use `sendingWindow`, a shared allowed-hours/days gate rather
than per-recipient predicted send times.

For A/B campaigns, `maxRecipients` must allow at least one recipient per variant plus one for the winner. A schedule request with a smaller saved or requested cap fails without changing the campaign. Raise the cap or explicitly clear it with `null` before retrying.

To send to only part of an audience, set `maxRecipients` (1-10,000,000) on a
draft with `update_campaign` or while scheduling with `schedule_campaign`. The
first N matching subscribers by subscriber id receive the campaign after every
audience and suppression rule; recipients already reached count against the
cap when a paused send resumes, and duplicates and recurring runs keep it.
Omit the field on `schedule_campaign` to keep the draft's saved cap, or pass
`null` to clear it. `get_campaign` and `list_campaigns` report the cap as
`maxRecipients` (`null` for the whole audience). For a daily ramp-up, duplicate
the campaign, exclude contacts who already received it with an "email sent"
audience filter, and raise the cap.

To send a file with every recipient's email, pass `attachments` to
`create_campaign` or `update_campaign`: up to 10 items, 5MB in total, each a
`filename` plus Base64 `content` (stored by Sequenzy and returned as a `path`)
or a public `path` URL. `contentType` sets the MIME type of Base64 content;
inline images (`contentId`) are not supported on campaigns. On
`update_campaign`, `null` or an empty array removes every attachment. CC/BCC
copies, test sends, duplicates and recurring runs carry the same files. If a
file cannot be loaded when sending starts, nothing is sent and the campaign
returns to draft. `get_campaign` reports `attachments`.

Every API response also lists request fields the API ignored, as
`ignoredFields` (`[{ path, reason }]`). Check it after a write: a listed field
had no effect.

For campaign- and sequence-level identities, `fromEmail` plus `fromName`
selects the sender identity with that display name on the mailbox, creating it
when needed without renaming other same-address identities. A Reply-To address
instead has one company-wide saved name: when `replyToName` differs from that
name, the saved name is kept and the successful response includes recovery
guidance in `warnings`.

`send_email` and `send_test_email` return a durable `emailSendId`. Use
`list_email_sends` to discover recent IDs by subject/title, recipient, delivery
status, type, bounce type, source, recipient mailbox provider (`mailboxProvider`,
the same values as the analytics filter), or list (`listId`); pass an ID to `get_email_send` to inspect
`status`, `errorMessage`, the stored body, and delivery events. Delivery-list
rows are retained for 14 days. Successful live-test and other test sends are
omitted so they do not bury real deliveries. Replies to those test sends show
in `list_conversations` only when inbound reply capture is enabled. Queue jobs
are internal execution details and
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

YouTube video blocks accept an optional custom cover: `{ "type": "video",
"videoUrl": "https://www.youtube.com/watch?v=...", "thumbnailUrl":
"https://cdn.example.com/cover.jpg", "alt": "Watch the product tour" }`.
Replacing blocks without `thumbnailUrl` restores YouTube's own still while
keeping `videoUrl` as the click destination.

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
the shared `baseRadius` and a separate `buttonRadius`, and `contentAlign`
(`center` by default, or `left`) moves the content column flush left in wide
email clients, along with buttons, the logo and footers unless they are set
to right or kept centered with the block's `styles.keepAlign: true`. Within `colors`,
`background` paints the outer canvas, `content` paints the inner content card,
and `surface` paints nested cards or tinted tiles. Omitting `content` preserves
its current value; when no content color is stored, the card follows
`background`.

`update_company` also sets `emailStylePreference` (`visual` for designed
emails, `plain` for simple text, `null` to clear the choice so the dashboard
asks again) and `emailPreset` (`branded` for the logo and full footer,
`minimal` for a compact footer without the logo). `get_company` returns both.
`footerStyle` sets the footer AI-designed emails get: `classic` (brand-colored
social icons), `mono` (monochrome icons, company name as a small wordmark),
`band` (mono on a dark full-width band), `editorial` (mono, left-aligned) or
`auto` (the default, fits the brand). Existing emails keep their footers.
`footerTheme` sets the auto-added footer's colors and copy (`linkColor`,
`reasonText`, `showCompanyLine` and the rest) as a merge patch: omitted fields
keep their value and `null` resets one, or all with `footerTheme: null`.
`get_company` returns the resolved `footerTheme`. Footer font, size and line
height are `emailTheme.typography.footerFontFamily`, `footerFontSize` (10-16px)
and `footerLineHeight` (1-2), and apply to footer blocks too. The double opt-in
confirmation email (`consent.doubleOptInEmailId` from `get_tracking_settings`)
is edited with `update_template`; new content must keep
`{{DOUBLE_OPT_IN_URL}}` or the update fails.
While a saved AI style exists (`get_email_ai_style`), AI-written emails keep its
design, header and footer until it is cleared.

Reply tracking is available on the same company tools. Use
`replyTrackingEnabled`, `replyTrackingDomainMode` (`sequenzy` or `custom`), and
`forwardReplies` with `update_company`. Company reads also return the current
read-only `replyRetentionDays` value. Turning Inbox on with
`replyTrackingEnabled: true` returns `409 receiving_domain_required` when the
workspace has no verified receiving domain and has never received a
conversation; add one with `add_receiving_domain` instead, and its first
verification turns Inbox on.

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
| `get_form_embed` | Return the public action URL, hosted JavaScript (recommended), minimal native form, and fetch example for a saved form, plus `recommendedSnippet` and `reducedProtectionWarning`. |

For Astro, Hugo, Jekyll, Cloudflare Pages, Netlify, GitHub Pages, or any other
static site, call `list_forms`, use `create_form` if a suitable form does not
exist, then call `get_form_embed`. The returned opaque `formId` is the public
capability: lists, tags, duplicate behavior, and success handling remain
server-side, so the deployed browser code never contains a Sequenzy API key.
Install the `javascript` snippet (`recommendedSnippet`): only the script
carries spam protection, so use `nativeForm` or `fetch` only where scripts
cannot run, and pass `reducedProtectionWarning` on to the user. The form
appears right after the script tag; when the script loads elsewhere, put the
returned `placeholder` where the form should appear.
Generated native and standalone markup includes "Powered by Sequenzy" for free
workspaces; paid workspaces receive unbranded markup. The API resolves that
entitlement server-side, so callers should use the returned snippet unchanged.
For a Webflow-connected company, form tools return `embed.disabled: true` and
the native Webflow settings path instead of custom embed code. Previously
deployed Sequenzy form endpoints reject submissions until Webflow is
disconnected; configure selected native forms in the Webflow integration.
When updating a form, omitted fields remain unchanged and theme fields merge
into the current theme. Pass an empty `tagIds` array to clear tags or an empty
`redirectUrl` to restore confirmation-message behavior. The `blocks` field is
a complete replacement, so read the current content with `list_forms` first
and retain exactly one required email field and one submit button. Add custom
inputs as `form-field` blocks with a supported `fieldType`; select, radio, and
checkbox fields require options, while hidden defaults are enforced server-side.

A contact who unsubscribed from all email and submits a saved form or popup
again is resubscribed and rejoins its lists; `duplicateStrategy` only controls
profile fields. Set `resubscribeBehavior` to `double_opt_in` on `create_form`,
`update_form`, `create_popup`, or `update_popup` to send the double opt-in
confirmation email first. That value requires a confirmation email and default
sender in the workspace, otherwise the API returns 400. The default is
`reactivate`.

Set `botProtection` to `true` on the same tools to run an invisible Cloudflare
Turnstile check before each signup from the hosted JavaScript embed or popup.
Signups that fail it, or come from the plain HTML form snippet, which cannot
run it, must confirm by email before they are subscribed. Turning it on requires a double opt-in confirmation email and a sender profile, otherwise the API returns 400. It defaults to
`false`.

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
For a Webflow-connected company, popup tools return `embed.disabled: true` and
the native Webflow settings path instead of custom code; previously deployed
popup scripts become no-ops and their submission endpoint rejects requests.
Popups capture into every list by default unless `listIds` is provided. When
updating blocks, read the popup first and send the complete replacement array,
retaining exactly one required email field and one submit button. Setting
`status` to `draft` stops a popup without invalidating its existing embed code.

Pass `reward` to `create_popup` or `update_popup` to turn a popup into a
scratch card. The visitor scratches a public teaser, claims it with their
email, and then sees `reward.value` and the optional `reward.code`. Neither
appears in the embed script: only a successful submit returns them, and the
same reward is saved on the subscriber as the `discount` attribute, so welcome
emails can use `{{discount.value}}` and `{{discount.code}}`. Style the card
with `coverStyle`, `coverColor`, `coverPattern`, `coverImageUrl`,
`prizeBackgroundColor`, `prizeTextColor` and `cardRadius`. The
`scratch-to-reveal` template starts with the reward enabled.

### Landing Pages

| Tool                                  | Description                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `list_landing_pages`                  | List landing pages with status, metrics, content, and URLs.                                        |
| `get_landing_page`                    | Get landing page details, builder content, metrics, and published URLs.                            |
| `render_landing_page`                 | Return a signed 24-hour visitor preview without publishing, counting views, or collecting signups. |
| `create_landing_page`                 | Create a draft landing page from default template content or JSON.                                 |
| `update_landing_page`                 | Edit a landing page name, slug, or full editor-compatible content.                                 |
| `publish_landing_page`                | Publish a landing page, optionally saving edits first.                                             |
| `unpublish_landing_page`              | Return a landing page to draft status, optionally saving edits first.                              |
| `duplicate_landing_page`              | Duplicate a landing page into a new draft with a unique slug.                                      |
| `delete_landing_page`                 | Delete an unpublished landing page.                                                                |
| `connect_landing_page_domain`         | Connect a custom landing page domain and return DNS setup details.                                 |
| `update_landing_page_domain_settings` | Replace or verify landing page custom domain settings.                                             |

Landing page content uses Sequenzy's editor-compatible JSON schema with
`version`, `template`, `seo`, `theme`, and `blocks`. SEO settings include
`faviconUrl` and `hideFromSearchEngines`; hidden pages publish a `noindex`
directive. Use `render_landing_page` to review the current visitor-facing page
before publishing. Its signed `previewUrl` expires after 24 hours, is unlisted,
is not indexed, and does not increment page views; forms remain visible but do
not collect contacts. Blocks render in slot order:
`top`, `hero`, `form`, `body`, then
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

| Tool                                     | Description                                                                                                                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_sequences`                         | List sequences with dashboard status, search, label, limit, and offset filters, each with its `emailCount`.                                                                                                                                             |
| `get_sequence`                           | Get sequence details, A/B variant IDs and block counts with `ab_tests:read`, nodes, edges, linked copy, and the sequence sending window.                                                                                                                |
| `list_sequence_enrollments`              | List contact enrollments with pagination and accurate list/tag/event/time-based entry attribution. Live sequence tests do not create enrollments.                                                                                                       |
| `send_sequence_test_email`               | Send one saved action_email step to 1-10 reviewers; A/B steps are inspected per variant.                                                                                                                                                                |
| `create_sequence`                        | Create a blank dashboard draft or an AI-generated/explicit-step sequence.                                                                                                                                                                               |
| `update_sequence`                        | Update identity, settings, enrollment, existing steps, branch logic, or insert linear steps.                                                                                                                                                            |
| `update_sequence_node`                   | Type-aware patch of one existing sequence node.                                                                                                                                                                                                         |
| `update_sequence_nodes`                  | Atomically patch multiple existing sequence nodes.                                                                                                                                                                                                      |
| `edit_sequence_emails`                   | Change a sequence's emails with AI in one request: every email, the ones the prompt names, or `emailIds` (`sectionIds` for one); "look like email 1" copies its style; saved unless `dryRun`.                                                           |
| `list_sequence_email_variations`         | List the design variations of one email of a sequence, with status and whether each is in use. Opens them rendered in MCP Apps clients.                                                                                                                 |
| `generate_sequence_email_variations`     | Start designing 1-4 AI variations of one email of a sequence. Returns at once; poll until each is ready or failed.                                                                                                                                      |
| `use_sequence_email_variation`           | Save a ready variation's design into its email, or with `scope: "all"` every other email's style too; `dryRun` previews.                                                                                                                                |
| `discard_sequence_email_variation`       | Discard a sequence email variation; the email does not change.                                                                                                                                                                                          |
| `insert_sequence_step`                   | Insert any typed dashboard step, including AI generation, outbound webhooks, waits, and wired branches.                                                                                                                                                 |
| `edit_sequence_graph`                    | Move, reconnect, delete, or duplicate graph nodes; reports recipients moved or completed.                                                                                                                                                               |
| `get_sequence_definition`                | Read a whole sequence as one definition document (trigger and nested steps; `format: raw` for steps plus connections) by key or sequence id. |
| `push_sequence_definition`               | Create or update a sequence from a definition; steps matched by key, dryRun previews, never changes on/off. |
| `simulate_sequence`                      | Dry-run current matches, activation readiness, and an optional contact's branch path without enrolling or sending.                                                                                                                                      |
| `enable_sequence`                        | Activate a sequence.                                                                                                                                                                                                                                    |
| `disable_sequence`                       | Freeze a sequence, blocking new enrollments and holding current recipients.                                                                                                                                                                             |
| `duplicate_sequence`                     | Create an independent draft copy of the graph, emails, and sequence A/B tests.                                                                                                                                                                          |
| `create_sequence_from_example`           | Clone a public email gallery sequence into a draft with the example's trigger and timing; AI writes each email in the background.                                                                                                                       |
| `list_sequence_templates` | List the dashboard's ready-made sequence templates for the company category, including push-first mobile app journeys (channels, trigger event, goal, quiet hours). |
| `create_sequence_from_template` | Create a draft sequence from a template id exactly as the dashboard does: push-first branch with email fallback, daytime waits, stop condition and attribution goal. |
| `preview_sequence_from_example`          | Preview the first 3 emails of a gallery sequence written for the company or another `website`, without creating anything.                                                                                                                               |
| `archive_sequence`                       | Move a sequence into the dashboard archive and stop new enrollments.                                                                                                                                                                                    |
| `unarchive_sequence`                     | Restore an archived sequence as a disabled draft.                                                                                                                                                                                                       |
| `list_sequence_goals`                    | List the event, subscriber-attribute, and tag-applied conversion goals persisted for a sequence.                                                                                                                                                        |
| `create_sequence_goal`                   | Add an event, subscriber-attribute, or tag-applied conversion goal.                                                                                                                                                                                     |
| `update_sequence_goal`                   | Update a persisted sequence conversion goal.                                                                                                                                                                                                            |
| `delete_sequence_goal`                   | Delete a persisted sequence conversion goal.                                                                                                                                                                                                            |
| `get_sequence_inbound_webhook`           | Read the inbound URL, setup state, sample, and mapping on standard MCP; the OpenAI route removes the credential-bearing URL.                                                                                                                            |
| `configure_sequence_inbound_webhook`     | Configure the endpoint, field mapping, and sample; the OpenAI route removes the credential-bearing URL from its result.                                                                                                                                 |
| `rotate_sequence_inbound_webhook_secret` | Rotate an inbound sequence endpoint's secret and return its replacement URL on standard MCP; omitted from the OpenAI-reviewed route.                                                                                                                    |
| `pause_sequence_enrollments`             | Stop new enrollments for an active sequence while current recipients continue.                                                                                                                                                                          |
| `resume_sequence_enrollments`            | Reopen new enrollments for an active sequence without changing current recipients.                                                                                                                                                                      |
| `enroll_subscribers_in_sequence`         | Enroll up to 500 subscribers by email, subscriber ID, or both, with retry-safe idempotency.                                                                                                                                                             |
| `enroll_sequence_audience`               | Estimate (default) or start a background run that enrolls a whole audience: everyone, lists, a segment, a filter, or rules. No per-call cap. `scheduledFor` starts it later; `data` attaches run-level values read in emails as `{{enrollment.field}}`. |
| `list_sequence_audience_enrollments`     | List recent audience enrollment runs with status and counters. Hand-picked ID lists show the first 20; `includedSubscriberCount` has the total.                                                                                                         |
| `get_sequence_audience_enrollment`       | Poll one audience enrollment run.                                                                                                                                                                                                                       |
| `cancel_sequence_audience_enrollment`    | Stop a queued or running audience enrollment; contacts already enrolled stay.                                                                                                                                                                           |
| `get_sequence_recurring_enrollment`      | Read a sequence's recurring schedule with a readable description and its next run times.                                                                                                                                                                |
| `set_sequence_recurring_enrollment`      | Make a manual-trigger sequence recurring: re-enroll an audience daily, on chosen weekdays, or on chosen days of the month (`lastDayOfMonth` for the end of the month) at a time in an IANA timezone. `endsAt` stops it after a date, `enrollmentMode` (`unlimited` or `one_time`) sets who enters each run, and `remove: true` deletes the schedule.               |
| `cancel_sequence_enrollments`            | Stop active, waiting, or paused enrollments by subscriber or entry-event field values.                                                                                                                                                                  |
| `pause_sequence_subscribers`             | Hold specific contacts on their current step until resumed; they keep their place and entry data.                                                                                                                                                       |
| `resume_sequence_subscribers`            | Continue paused contacts from the step they were paused on; waits keep their original time.                                                                                                                                                             |
| `realign_sequence_enrollments`           | Preview or queue moving live waits earlier to their sending-window opening.                                                                                                                                                                             |
| `get_sequence_enrollment_realignment`    | Poll an applied realignment job and read its completed result or continuation cursor.                                                                                                                                                                   |
| `delete_sequence`                        | Delete a sequence.                                                                                                                                                                                                                                      |

Sequence creation supports:

- Name-only creation for a blank, disabled trigger-to-completion draft matching the dashboard.
- Dashboard metadata and delivery settings: `description`, `labels`, `userCancellable`, sequence BCC, and From/Reply-To identity.
- `activeSubscribersOnly: true` keeps unsubscribed and bounced contacts out of the sequence. By default they still enter so non-marketing steps run, and only their marketing emails are skipped. `update_sequence` accepts the same field.
- `trigger: "contact_added"` with `listId`, several `listIds`, or `listScope`:
  `any_contact` (the default) enrolls every added contact, including contacts
  that join no list, while `any_list` waits for an actual list membership.
- `trigger: "tag_added"` with `tagName` or several `tagNames`; any configured
  tag enrolls the contact.
- `trigger: "segment_entered"` plus `segmentId` for saved-segment entry automations.
- `trigger: "segment_exited"` plus `segmentId` to enroll active contacts who stop matching a saved segment (unsubscribes and bounces do not count).
- `trigger: "event_received"` plus `{{event.*}}` merge tags in subjects or body content.
- `trigger: "inbound_webhook"` plus integration metadata for dashboard-compatible webhook entry nodes.
- `trigger: "inactivity"` plus `eventName`, `inactiveDays`, and optional `inactivityBaseline` (`sequence_created_at` or `subscriber_created_at`).
- `trigger: "manual"` for one-time, calendar-anchored campaigns: nobody enrolls
  automatically. Pair it with `keyDates` (named moments such as
  `black_friday_starts`) and step-level `waitUntilKeyDate`
  (`{ key, days, hours, direction, pastAction }`), then enroll the audience with
  `enroll_sequence_audience` after enabling (add `scheduledFor` to start on a
  date, and `data` for run-level values such as a sale end time that every
  email in the run reads as `{{enrollment.field}}`). Late enrollees skip steps whose moment already passed
  (`pastAction: "skip"`, the default). To keep enrolling people who join a
  list or segment later, set `audienceAutoEnroll: { audience }` with
  `update_sequence`; it runs until the last key date and then stops itself
  (changing the trigger away from `manual` also switches it off).
  For recurring sends that are not tied to an event (end-of-month updates,
  balance reminders, a daily digest), keep `trigger: "manual"` and call
  `set_sequence_recurring_enrollment` with an audience, `frequency` (`daily`,
  `weekly` with `weekdays`, or `monthly` with `monthDays` and/or
  `lastDayOfMonth`), `time` and `timezone`. Every run re-enrolls the audience:
  contacts who finished an earlier run enter again, contacts still in the
  sequence are skipped, and `one_time` sequences never re-enroll anyone. It
  cannot run beside `audienceAutoEnroll`, and changing the trigger away from
  `manual` switches it off.
  Countdown sends are spread out: each contact gets their own send time
  within `keyDates.sendWindow.spreadOverHours` (default 4), after the moment
  for steps at or after it and in the hours leading up to the step's time
  for steps timed before it. Omit `sendWindow` to keep the current spread, or
  set `spreadOverHours` to `0` to send at the exact moment.
- `goal` for AI-generated email content.
- `emailStyle: "visual"` or `"plain"` to choose the presentation of goal-based AI-generated emails; when omitted, the company's saved preference is used.
- Explicit `steps` with Sequenzy `blocks`.
- Explicit `steps` with HTML, which Sequenzy converts into editable blocks.
- Explicit Update Subscriber steps that copy trigger-event properties into
  profile fields or typed custom attributes.
- Fixed waits via `delay` / `delayMs`, dynamic date-field waits via `waitUntil` (from the trigger event or, with `source: "attribute"`, a contact attribute such as a due date; `pastAction: "skip"` lets late joiners skip the emails whose date already passed), or calendar gates via `waitUntilWeekday`. A weekday gate such as `{ "day": "sunday", "startTime": "09:00", "endTime": "12:00", "timezone": "America/Los_Angeles" }` holds the flow until the next matching window. Add `"timezoneSource": "subscriber"` to evaluate it in each contact's own timezone instead, for example 9am local for every contact. Add `"minimumWait": { "days": 6 }` to wait at least that long first and then release at the next window, in one step instead of a fixed delay plus a weekday gate. Place it immediately before an email to keep that send inside the window; any intervening step can shift delivery outside it. Queue recovery rechecks the window before releasing a delayed contact.
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
received-event enrollments. Live sequence tests do not create enrollments;
they send isolated test emails and record activity on the sequence test run
instead.

For a confirmed manual enrollment batch, generate `idempotencyKey` once and
reuse that exact key only with identical ordered targets and `targetNodeId`.
Receipts last 14 days. A retry returns the original `enrolled`, `skipped`,
`notFound`, `targetNodeId`, and `scheduledFor` values with
`idempotentReplay: true`; it does not create tokens or queue the batch again.

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

Sequence updates support `insertSteps` for adding new linear steps after a `nodeId` returned by `get_sequence`. Omit `afterNodeId` only when appending to a sequence with exactly one linear tail. `insertSteps` supports addable steps that do not require companion records, such as email, delay, tag/list actions, attribute updates, discounts, conditions, wait-for-event steps, outbound webhooks, and AI steps. An `action_ai` step requires a merge-tag `prompt`, unique `resultKey`, and one or more `outputFields`; later steps read generated or fallback text with `{{ai.KEY.field}}`. Combined output-field limits must fit the step's 2000-token response budget. Use `includeTags`, `includeEventProperties`, or `includeAttributes` to opt specific contact context into generation, and `onError` (`continue`, `exit`, or `fail`) to choose failure behavior. Use `branch` for multi-path if/else branches; provide either `branch` or `insertSteps`, not both. Branch conditions support tag presence and absence checks with `has_tag` and `does_not_have_tag`, plus lists, saved segments, events, clicked links, and field comparisons. Each branch path may provide new `steps`, an existing `targetNodeId`, or both; the fallback uses `elseSteps` and/or `elseTargetNodeId`. A target can be the completion node returned by `get_sequence`, so one atomic request can route replies to completion and Else to an existing follow-up. The `emails` and `steps` arrays edit ordinary `action_email` steps by `nodeId`, `emailId`, or array order. `get_sequence.sequence.emails` also includes `action_ab_test` entries; with `ab_tests:read`, each `abTest.variants[]` entry contains the variant ID, subject, preview text, and block count. Call `get_ab_test` for full variant bodies before auditing or rewriting copy. A positional update landing on one is rejected, and its copy must be changed per variant with `update_ab_test_variant`; do not retry through `update_template` or `update_sequence_node`. Use `insertSteps` to create new steps and include a step-level `delay`, `delayMs`, `waitUntil`, or `waitUntilWeekday` when the inserted email needs a timer. `waitUntil` accepts a date `field` plus optional `source` (`event`, the default, reads the trigger event; `attribute` reads the contact's custom attributes), `offset`, `direction` (`before` or `after`), `missingAction` (`continue` or `exit`), and `pastAction` (`continue`, the default, `skip`, or `exit`) for dates that already passed when the contact reaches the wait. `waitUntilWeekday` accepts `day` or `days`, `startTime`, optional `endTime` (default `24:00`), an IANA `timezone`, and optional `timezoneSource` (`fixed`, the default, or `subscriber` to use each contact's own timezone with `timezone` as the fallback); contacts already inside the window continue immediately. For active sequences, pass `confirmStructuralChange: true` with `insertSteps` or `branch` only after confirming the live-flow impact.

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
"background": "#f3f4f6", "content": "#ffffff" } } }` gives that email a gray
outer canvas and white content card while retaining its other colors,
typography, and layout. Omitting either color preserves its current value. Pass
`emailTheme: null` to drop the override and follow the company theme again. Use
`update_company` only when the account-wide default should change.

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

Use `get_sequence_definition` and `push_sequence_definition` to manage a sequence as code. A definition is one document with the sequence's name, settings, `trigger` and `steps` in run order, all addressed by your own keys. Steps use shorthands (`wait: 2d`, `email` with `html`, `blocks` or a `template` email ID to copy, `branch` paths with `if` conditions and an `else`, `split` with percentages, `continueIf`, `tag`, `untag`, `end: true`); nested paths rejoin at the next step and the end is implicit. `get_sequence_definition` returns this readable format, or the explicit format (`type`/`config` steps plus `connections`) with `format: raw` or when nesting cannot describe the sequence; both push. Pushing a pulled definition back unchanged is a no-op; `dryRun: true` returns the added, changed and removed steps and where waiting contacts continue. Missing steps are removed and their waiting contacts move to the next step. A push never turns a sequence on or off: new sequences are drafts with `managedBy: code`, which makes their steps read-only in the dashboard, and changing an active sequence needs `confirmLiveChange: true`. A/B test steps pass through unchanged, and webhook header values stay `[REDACTED]`.

Use `edit_sequence_graph` with the latest `graphRevision` from `get_sequence` to restructure an existing sequence atomically. It can move a node before or after another node, reuse the normalized `sequence.edges` array for explicit reconnection or multi-node reordering, delete a node, or deep-copy a node. A/B test duplication creates independent test, variant, email, and localization records with reset statistics. Moving a node before the shared node below a branch reconnects every converging branch path through that node. Deleting a node immediately moves parked recipients to its unique surviving successor, or completes them when no successor remains; inspect `sequence.migratedRecipientCount` and `sequence.completedRecipientCount` in the result. Deletion is refused when parked recipients would have multiple surviving continuations. Stale revisions, invalid branch lanes, cycles, and unreachable nodes are also rejected. Active sequences require `confirmStructuralChange: true`.

Run `cancel_sequence_enrollments` with `dryRun: true` before applying bulk cancellation.

Use `pause_sequence_subscribers` to stop one contact's sequence temporarily (for
example while their account is blocked) and `resume_sequence_subscribers` to
continue from the same step. Nothing restarts or is skipped: a wait that ran out
while paused continues right away, and one that has not ends when it would have.
A paused contact cannot be enrolled in the same sequence again, a
wait-for-event step only picks up an event that arrived meanwhile once the
contact is resumed, and unsubscribes, bounces, and
`cancel_sequence_enrollments` still end the enrollment. This is
per contact; `pause_sequence_enrollments` only stops new contacts entering.

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
managed by the editor. Persisted `group` blocks are structural editor content:
they recursively wrap child blocks in Stack, Row, Grid, or single-image Overlay
layouts, but AI generation and `creatableOnly` intentionally omit them. Request
`blockType: "group"` to inspect their fields when reading or updating existing
grouped content. Lists are their own block type rather than a `text`
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
Add `trackAs` (for example `weekly-report`) to a direct `subject`/`html`
`send_email` call to count every send with that value under one code-managed
transactional email. The first send creates it; `list_transactional_emails`
reports it with `managedBy: "code"` and its own stats. Use a stable ASCII email-type
name (letters, digits, spaces and `. _ - : /`), never per-recipient values (up
to 100 per company). Code-managed emails
cannot be sent with `templateId`, and `update_transactional_email` only changes
their `name`, `enabled` and `labels`.
`send_email` variables support nested arrays for repeat blocks, such as
`{ "event": { "items": [...] } }`. When the recipient matches a stored
subscriber by external ID or email, saved first and last names fill omitted name
variables automatically. Explicit values, including blanks, take precedence.
The optional `attachments` array accepts up to 10 files / 15MB total. Each item
needs `filename` and exactly one of Base64 `content` or a public HTTP(S) `path`.
Set `contentId` to embed a CID image referenced from the HTML and optionally set
`contentType` to override MIME detection.
When `trackingSettings` is omitted, the company's Transactional API tracking
defaults apply. Use `trackingSettings.clickTracking: false` or
`trackingSettings.openTracking: false` to disable link rewriting or the open
pixel for one send. These per-send options only opt out; they cannot enable
tracking disabled by an account-wide or Transactional API default. Use
`get_tracking_settings` and `update_tracking_settings` to inspect or change
those defaults. Set `unsubscribeTrackingEnabled: false` with
`update_tracking_settings` to send unsubscribe links directly to
`https://sequenzy.com`, even with a custom tracking domain. Actual unsubscribes
and their email attribution are still recorded.
Set `emailContentStorageEnabled: false` to keep no rendered body once an email
is sent, store the email's name in place of its subject, and store no IP
address, user agent or country for opens and clicks.

Use the optional `headers` object for extra email headers (up to 50), for
example your own `List-Unsubscribe` and
`List-Unsubscribe-Post: List-Unsubscribe=One-Click` on a transactional send.
Marketing sends always use Sequenzy's signed unsubscribe headers, and headers
Sequenzy manages (From, To, Subject, Reply-To, Message-ID, Content-Type,
`X-Sequenzy-*` and similar) are never applied. Headers that are not applied do
not fail the send; the result lists them in `ignoredHeaders` with a reason.
Header values must be strings.

For agent and workflow retries, include a stable `idempotencyKey` (up to 255
characters) in `send_email`. Use one key per logical email and send the same
arguments when retrying; the key remains valid for 14 days.

### Analytics

| Tool                      | Description                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `get_stats`               | Get overview stats for a period or start/end; filter by email type, provider, recipient domain, source or send outcome (bounce type or complaint). |
| `get_stats_breakdown`     | Break the funnel and revenue down by email, sequence, email type, provider or domain, with drill-in filters; `outcome: "complaint"` shows where complaints came from. |
| `get_transactional_stats` | Get all-time or time-scoped metrics for one saved transactional email by ID or slug.                           |
| `get_campaign_stats`      | Get campaign performance, reply metrics, attached conversion goals, and Poll/NPS summaries.                    |
| `get_email_client_stats`  | Get mail client and device shares of unique opens for a campaign or the whole company.                         |
| `get_link_click_stats`    | Get clicks per link destination across every email for a period, with unique clicks and share.                 |
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

Analytics tools exclude detected bot, scanner, link-preview, and tracked asset opens/clicks by default. Pass `includeMachineEngagement: true` to `get_stats`, `get_stats_breakdown`, `get_campaign_stats`, `get_email_client_stats`, `get_link_click_stats`, `get_sequence_stats`, `get_ab_test_stats`, `get_subscriber`, or `get_subscriber_activity` when you need raw engagement diagnostics; included open/click activity rows expose `machine`, `engagementQuality`, and `classificationReasons` fields where the API returns event-level activity.

`get_sequence_stats.enrollmentCounts` is a live point-in-time snapshot of
active and waiting enrollment runs grouped by current node. It counts
enrollment tokens rather than necessarily distinct subscribers, and it is not
limited by historical `period`, `start`, or `end` filters. Contacts held by
`pause_sequence_subscribers` are counted separately in `pausedEnrollments`.

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
when engagement metrics use a time filter. `get_sequence_stats` returns the
same summaries per email step as `steps[].polls`, omitted for steps without
answers.

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

| Tool                              | Description                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `list_team_members`               | List team members and pending invitations.                                                                                   |
| `invite_team_member`              | Invite a teammate as admin or viewer, with optional billing access.                                                          |
| `cancel_team_invitation`          | Cancel a pending team invitation.                                                                                            |
| `get_inbox_address`               | Get the address anyone can email to reach the inbox, whether receiving is on, attachment availability, and retention.        |
| `update_inbox_address`            | Set a branded inbox address like support@support.acme.com on one of your receiving domains, or reset to the default.         |
| `list_conversations`              | List inbox conversations (replies and inbox address email) with status and unread filters, each with a `lastMessagePreview`. |
| `get_conversation`                | Read a conversation and its message history, with signed `downloadUrl`s for stored attachments.                              |
| `reply_to_conversation`           | Queue an outbound reply (optionally with base64 `attachments`) or add an internal note.                                      |
| `forward_conversation_message`    | Email a copy of one received or sent message, with its attachments, to another address.                                      |
| `update_conversation_status`      | Open or close a conversation.                                                                                                |
| `bulk_update_conversation_status` | Open or close up to 100 conversations in one call; reports updated, unchanged, and not-found IDs.                            |
| `bulk_update_conversation_spam`   | Move up to 100 conversations to the Spam folder or back to the inbox; reports updated, unchanged, and not-found IDs.         |
| `list_conversation_recipients`    | List the inbox addresses conversations started at, for the `recipient` filter of `list_conversations`.                       |
| `list_receiving_domains`          | List receiving domains (mail to any address on them reaches the inbox) with status and DNS records.                          |
| `add_receiving_domain`            | Add the workspace's one receiving domain; returns the MX (and TXT) records to publish. Refuses domains with a mailbox.       |
| `get_receiving_domain`            | Read one receiving domain's status, records, error, and how long an unverified name stays reserved.                          |
| `verify_receiving_domain`         | Check a receiving domain's DNS records now.                                                                                  |
| `remove_receiving_domain`         | Destructive: remove a receiving domain; all mail to it, including replies to emails already sent, stops arriving.            |
| `mark_conversation_read`          | Mark all messages in a conversation as read.                                                                                 |
| `mark_conversation_unread`        | Mark a conversation unread again.                                                                                            |
| `list_webhooks`                   | List outbound webhook endpoints.                                                                                             |
| `create_webhook`                  | Create an endpoint and return its one-time signing secret on standard MCP; omitted from the OpenAI-reviewed route.           |
| `update_webhook`                  | Update webhook name, URL, events, or status. Enabling clears an automatic disable.                                           |
| `delete_webhook`                  | Permanently delete a webhook endpoint and delivery history.                                                                  |
| `test_webhook`                    | Send a test event to a webhook endpoint.                                                                                     |
| `list_webhook_deliveries`         | List recent delivery attempts for a webhook.                                                                                 |
| `replay_webhook_delivery`         | Replay a webhook delivery.                                                                                                   |

`list_conversations` returns `lastMessagePreview` on each conversation: `{ type, text }`, where `type` is `inbound` (subscriber) or `outbound` (team) and `text` is up to 200 characters of plain text with quoted history, signatures and markup removed. Internal notes are skipped. It is `null` when the latest reply has no readable text. Use `get_conversation` to read the full thread before replying.

Per-list consent changes are available as opt-in outbound events:
`subscriber.list_subscribed` and `subscriber.list_unsubscribed`. Their payloads
identify the subscriber and list, report `action` as `added` or `removed`, and
include the change `source` (for example `preferences_page`, `dashboard`,
`api`, or `automation`).

Use the `email.failed` event for terminal delivery failures such as exhausted
MTA transport paths. Recipient bounces continue to use `email.bounced`.

The opt-in `email.received` event fires for new mail to your inbox addresses
and receiving domains (not replies to emails you sent, which are
`email.replied`). It is not sent for mail the inbound scan flags as spam or a
virus, and it is not added when `create_webhook` omits `events`.

A receiving domain is a domain or subdomain whose mail reaches the inbox:
every address on it arrives. A workspace has one, and like the tracking domain
it serves every sending domain: once it is verified, replies to emails from any
of your sending domains come back to reply addresses on it. Until then, replies
use Sequenzy's shared inbound address. Workspaces that set up several before
keep them; replies then prefer the sender's own domain or one on the same root,
else the oldest verified one. Adding a second one returns `409 limit_reached`.
After `add_receiving_domain`, publish the MX record (and the TXT record when
listed), then call `verify_receiving_domain`. The first verification turns
Inbox on. `verified` means mail arrives and new reply addresses use the domain;
`pending` means its records are not published yet (a new name is reserved for 7
days); `failed` means something broke: mail that still arrives is accepted, but
new reply addresses use Sequenzy's address until it is fixed. A domain that
already receives email elsewhere (its MX points at Google Workspace, Microsoft
365, Cloudflare Email Routing...) is refused with `409 domain_has_mailbox`, so
use a subdomain such as `support.acme.com`. `503 dns_check_failed` means the MX
lookup got no answer; retry in a minute. When a conversation has a
`recipientAddress`, reply from the sender profile with that email address if
one exists.

Use the explicit-only `campaign.sent` event when a workflow needs one terminal
notification after an email or SMS campaign settles, including a valid
zero-recipient send. It is not added when `create_webhook` omits `events` on
standard MCP; on the OpenAI-reviewed route, add it in the dashboard when
creating or editing the webhook.

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

### SMS

| Tool                      | Description                                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `generate_sms`            | Generate SMS copy from a prompt.                                                                                                     |
| `get_sms_settings`        | Read SMS add-on readiness, credits, defaults, and provisioned numbers.                                                               |
| `get_sms_usage`           | Compare sends, delivery outcomes, charged credits, last activity, and test sends by number.                                          |
| `update_sms_number_label` | Update a number's label, brand-prefix override, or link shortening. Named `update_sms_number_settings` on the OpenAI-reviewed route. |
| `release_sms_number`      | Permanently return a number to the carrier and free its workspace slot.                                                              |
| `send_test_sms`           | Send a test message, optionally choosing a provisioned sender with `fromNumberId`.                                                   |

`release_sms_number` is irreversible. Campaign or sequence steps pinned to a
released number will skip their SMS sends until they are repointed to an active
number. `get_sms_usage` reports production totals separately from `testSends`.
When `send_test_sms` omits `fromNumberId`, it uses the same oldest-active-number
default as production sends. Test sends are real, credit-charged messages that
bypass quiet hours and are limited to 100 per company in a rolling 24-hour
window.

### Push Notifications

| Tool                                | Description                                                                                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------- |
| `get_push_settings`                 | Read web push, APNs and Firebase readiness, last credential errors, and active device counts. |
| `update_web_push_settings`          | Enable or disable web push (generates VAPID keys on first enable) or set the default icon.    |
| `set_apns_credentials`              | Save an APNs auth key (.p8) for iOS push.                                                     |
| `remove_apns_credentials`           | Remove APNs credentials.                                                                      |
| `set_fcm_credentials`               | Save a Firebase service account key for Android push.                                         |
| `remove_fcm_credentials`            | Remove Firebase credentials.                                                                  |
| `list_push_devices`                 | List registered browsers and app installs, filtered by contact, platform or status.           |
| `register_push_device`              | Register an APNs, FCM or web push token for a contact.                                        |
| `remove_push_device`                | Unsubscribe a device.                                                                         |
| `send_test_push`                    | Send a test push to one device or to every active device of a contact.                        |
| `get_push_import_preflight` | Check APNs/Firebase setup before importing devices from another provider. |
| `create_push_import` | Create a draft import from OneSignal, Braze, Customer.io or a CSV, with warnings. |
| `add_push_import_rows` | Add another CSV part (up to 5 MB) to a draft CSV import. |
| `start_push_import` | Start a draft import, or resume a failed or stalled one. |
| `get_push_import` | Read an import's status, progress, counts and skip/invalid reasons. |
| `list_push_imports` | List recent push imports. |
| `cancel_push_import` | Stop an import; devices already imported stay. |
| `list_push_campaigns`               | List push campaigns.                                                                          |
| `get_push_campaign`                 | Read a push campaign with its stats.                                                          |
| `create_push_campaign`              | Create a push campaign draft.                                                                 |
| `update_push_campaign`              | Update a draft or scheduled push campaign.                                                    |
| `estimate_push_campaign_recipients` | Count contacts in an audience with an active device.                                          |
| `send_push_campaign`                | Send now or schedule a push campaign.                                                         |
| `unschedule_push_campaign`          | Move a scheduled push campaign back to draft.                                                 |
| `cancel_push_campaign`              | Stop a scheduled or sending push campaign.                                                    |
| `duplicate_push_campaign`           | Copy a push campaign into a new draft.                                                        |
| `get_push_campaign_stats`           | Read sent, displayed, clicked, failed and skipped counts with reasons.                        |
| `list_live_activities`              | List iOS Live Activity tokens with counts per activity type.                                  |
| `start_live_activity`               | Start a Live Activity on one contact's iPhones (push-to-start, iOS 17.2+).                    |
| `update_live_activity`              | Send new content state to every running copy of a contact's activity.                         |
| `end_live_activity`                 | End a contact's activity with its final content, optionally with a dismissal date.            |

Push reaches contacts who allowed notifications in a browser (web SDK
`subscribeToPush()`) or in your app (tokens registered with
`register_push_device` or the REST API). Web push needs the site to serve
`/sequenzy-sw.js`; iOS and Android need your APNs key and Firebase service
account. Push campaigns and `type: "push"` sequence steps skip contacts without
an active device on a set-up platform. `send_test_push` is limited to 200 per
company per rolling 24 hours and excluded from stats.

Live Activities go to ActivityKit tokens that the iOS SDK reports
(`Sequenzy.observeLiveActivities(of:)`), not to push devices. Start, update and
end always name the contact (`email` or `subscriberId`) and return
`tokenCount`; `0` means nothing was sent. Updates carry the request
time, so repeating one is safe; repeating a start shows a second activity.

### In-App Messages

| Tool                    | Description                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `list_in_app_messages`  | List a contact's open in-app messages and content cards, or their history.          |
| `record_in_app_event`   | Record that an item was displayed, clicked, dismissed or read.                      |
| `delete_in_app_message` | Remove an item from the contact's feed.                                             |
| `get_in_app_step_stats` | Read created, displayed, clicked and dismissed counts for one in-app sequence step. |
| `list_in_app_templates` | List built-in in-app step templates with their full step configs.                   |
| `write_in_app_copy`     | Write in-app eyebrow, title, message and button text with AI from a brief.          |
| `validate_in_app_html`  | Check a custom HTML in-app message: size, Braze Liquid conversions, script hosts.   |

In-app items come from `type: "in_app"` sequence steps (modal, banner,
fullscreen or content card). Nothing is sent: the customer's app fetches each
contact's feed, renders it and reports events, so ask the user to set that up
first (Settings > In-app has a prompt for their coding tool).

Custom HTML messages are `in_app` steps with `format: "html"` and `html`: the
customer's own document, such as a Survicate survey or Braze custom HTML,
shown sandboxed by the SDKs with a JS bridge (Braze's `brazeBridge` works).
Check a document with `validate_in_app_html` first. `list_in_app_messages`
leaves them out of open feeds unless `formats` includes `html`.

A button with `action: "request_push_permission"` makes a push primer: the
app asks for notification permission, or opens its notification settings
when the contact turned them off. Only apps whose SDK handles that action get
such items (`list_in_app_messages` with `actions: "request_push_permission"`
for backend-rendered feeds). Record the result with `record_in_app_event`
(`type: "clicked"`, `pushPermission`); `get_in_app_step_stats` counts allowed
and declined results, `get_push_settings` reports the app opt-in rate, and
the contact's `pushPermission` attribute holds the best status across their
app devices.

### Product Feedback

Use `submit_feedback` only when the user explicitly asks the assistant to send
feedback to the Sequenzy team. Standard MCP can include the structured
reproduction fields `userIntent`, `toolCalls`, `expected`, `actual`, and
`resourceIds` when needed for that report. The OpenAI-reviewed route omits
this tool. Do not
include unrelated subscriber data, email content, raw API payloads, debug data,
or secrets.

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
| `sequenzy://design-md`           | The company's design.md as raw Markdown.       |

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
- Every key is scoped, and the API checks the scope on every call. The default **Safer agent access** preset drafts but cannot send, schedule, turn on sequences or delete. It can still edit emails in an already-live sequence (`sequences:write`) and publish landing pages (`landing_pages:write`); leave those out with custom scopes for a strict drafts-only key. `get_account` returns the key's exact scopes and `canSendLive`. See [Scoped agent access](https://docs.sequenzy.com/concepts/mcp-permissions).

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
open `apiKeyPermissions.manageUrl`, add the missing scope to the loaded key, and
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

This standalone repository mirrors the MCP package maintained in the Sequenzy monorepo. Release automation updates it after successful API deployment and package publication. Maintain source, tests and this README in the monorepo `packages/mcp/` directory.

## License

MIT

## Agent-native discovery

Sequenzy publishes machine-readable manifests for agent networks and A2A-style discovery:

- Remote MCP endpoint: `https://api.sequenzy.com/v1/mcp`
- Agent capability manifest: [`agent-capability.json`](https://github.com/Sequenzy/mcp/blob/main/agent-capability.json)
- A2A-style agent card: [`.well-known/agent-card.json`](https://github.com/Sequenzy/mcp/blob/main/.well-known/agent-card.json)
- OpenClaw/Moltbot skill metadata: [`openclaw/skill.json`](https://github.com/Sequenzy/mcp/blob/main/openclaw/skill.json)
- OpenClaw/Moltbot operating guide: [`openclaw/SKILL.md`](https://github.com/Sequenzy/mcp/blob/main/openclaw/SKILL.md)

These files describe Sequenzy as an authorized email automation capability for agents. They explicitly exclude scraping, spam, and unsolicited cold outreach use cases.

## Workspace roles

Account-key access combines key scopes with your current workspace role. `get_account` reports blocked scopes in `apiKeyPermissions.roleRestrictedScopes`; `canSendLive` means at least one permitted delivery workflow is available, not that every send tool is allowed.

You can invite a `marketer` to manage subscribers, marketing campaigns and sequences without granting access to transactional mail, workspace settings, team or billing. Marketers choose existing sender/reply profiles. Transactional-backed campaign, A/B and sequence sources remain protected through previews, sharing, analytics and send history. Marketers and restricted members cannot receive billing access.

### design.md

`get_design_md` returns the company's email design brief as one Markdown document: YAML frontmatter with the exact values AI-generated emails use (`logo`, `colors`, `fonts.body`/`fonts.heading`, `buttons.style`/`buttons.radius`, `cornerRadius`, and `layout` tokens), then `## Voice`, `## Design direction` and a read-only `## Reference email`. The same document is the `sequenzy://design-md` resource. Edit the markdown and save it with `update_design_md`, passing the `version` you read as `expectedVersion`; a 409 means it changed since, so read it again and reapply your edits. Only values that differ from the current document are written, a removed key or section is left unchanged, and an empty section clears it. `dryRun: true` reports `changes` and `warnings` without saving; invalid documents fail with line-numbered `issues`. Reads need `account:read`; saves and dry runs need `company_profile:manage`.

### Saved AI email styles

Use `get_email_ai_style` to inspect the company's saved appearance and `revisionId`. `save_email_ai_style` captures an existing email by its underlying `emailId`; pass `expectedStyleId: null` only for an initial save, or the reviewed revision when replacing. Optional `canvas` captures an unsaved editor snapshot containing `blocks`, `theme`, `fontFamily`, and `emailPreset`. Saving also detects layout habits (for example dotted dividers around every button) and keeps all of them unless `layoutRuleIds` lists the rule IDs to keep (`[]` keeps none); optional `notes` (500 characters max) adds design guidance. Review `style.layout.rules` in the response. `clear_email_ai_style` requires the current nonempty revision.

Reads require `emails:read`; saves/clears require `emails:write` and the current workspace role. Marketers cannot capture transactional source emails. A 409 conflict requires reading and reviewing the new state before retrying. These tools never edit or send the source email. Generation across all surfaces uses the saved default unless explicit styling or a plain-text choice takes precedence.

### Background contact tasks

Use `start_subscriber_operation` to add tags to an entire filtered contact
audience. Supply `kind: "add_tags"`, `tags` and `requestKey`; reuse the same
key/settings after an uncertain response. `list_subscriber_operations`,
`get_subscriber_operation` and `cancel_subscriber_operation` provide the same
progress and cancellation workflow as Contacts.

All operations require `subscribers:read`; tagging additionally requires
`subscribers:tag`, new tag definitions require `tags:write`, and
`triggerAutomations: true` requires `automations:trigger`. Automation triggering
defaults to false. Existing synchronous bulk tag tools remain available for up
to 500 explicit contacts. Background audiences accept up to 1,000 explicit IDs,
or live filters/list/search criteria without a total audience limit.

Selection walks live pages before tagging and excludes contacts created after
the request. It is not a point-in-time snapshot. Inspect `failed` and `failures`
even when status is completed. Interrupted in-flight tag actions are reported
as uncertain and never automatically replayed; reconcile those contacts before
starting another task. Cancellation retains applied changes. Active tasks have
a seven-day processing deadline; terminal records are retained for seven days.

## Apply a default footer to existing emails

You can save for future emails only, or preview and apply to selected `sequences`,
`campaigns`, `transactional`, and `templates`. Campaigns must be draft or scheduled;
sent and in-progress content stays unchanged. Draft A/B variants and localizations
are included. Customized footers are preserved unless you explicitly include them.
Raw HTML, missing or ambiguous footers, and content shared with a protected owner
are skipped with reasons.

Preview is read-only. Review the affected counts, skipped reasons, and optional
before/after HTML, then apply with the returned token and identical blocks,
metadata, and scope options. If the relevant saved content changes, application
returns `409`; preview again. A successful application saves the default and
selected content atomically. It does not send emails.

Layout previews use the email theme and locale, with placeholder personalization.
They are not subscriber-specific inbox previews. You can request a particular
sample by its affected item `id` and `kind` (`email`, `ab_variant`, or `localization`).

Use `preview_default_email_component` with `slot: "footer"`, `blocks`,
`application: { scopes: ["sequences", "campaigns", "transactional", "templates"],
includeCustomized: false }`, and `renderPreview: true`. Inspect
`renderedPreview.footerHtml` and `renderedPreview.samples[].beforeHtml/afterHtml`.
Pass the identical inputs and `previewToken: application.token` to
`set_default_email_component`. You can also supply `sample: { id, kind }` to
preview an affected version. Omitting `application` keeps future-only saves.

### Live sequence tests

Use `start_sequence_test_run` with `sequenceId`, one active `subscriberId`, and optional `customVariables` such as `{"cart_id":"cart_123","event_ids":["event_1"]}`. Nested values keep their types for `event.*` references. Optional `speedMultiplier` is an integer from 60 to 10000 (default 120). Omit properties or use `{}` for none; null is invalid. Start requires `sequences:activate` and `subscribers:read`. Inspect the returned `run.id` with `get_sequence_test_run` (`sequenceId`, `runId`; requires `sequences:read` and `subscribers:read`). Both accept `companyId`.

Live tests perform real subscriber updates, webhooks and other actions; emails are marked as tests. They do not enable the sequence or record a trigger event. Only one queued/running test per sequence/subscriber is allowed (409). Ordinary failure retries are disabled, but stalled-job recovery can replay actions after worker loss; inspect `run.steps` and `run.errorMessage` before repeating failed tests because completed actions are not rolled back. Queue failures mark the run failed. The existing single-step `send_sequence_test_email` and dry-run `simulate_sequence` tools remain available.

On the OpenAI-reviewed MCP surface, `customVariables` uses the same restricted personal-data checks as event properties, including text nested in objects or arrays.

### Reuse received event data for sequence tests

Use `sequenzy events sample <eventName> --company <companyId> --json`, MCP `get_event_sample`, or `GET /api/v1/events/sample?eventName=<eventName>` to read the latest retained payload in your workspace. Requires `subscribers:read`. This includes older and custom events across all subscribers; `sample: null` means none exists. Copy `sample.properties` into the test run's `customVariables` (CLI `--event-properties`) and edit as needed. The dashboard's **Use latest received event** button replaces the JSON field. Copying data does not change the selected recipient or fire an event. Clear the field, omit the properties, or pass `{}` to test without overrides. Lookup errors are safe to retry; starting a real test still has delivery side effects.

## Renaming your company in footers

When you change your company name in Settings, select the option to also replace
matching names in existing email footers. Only footer company names exactly equal
to the previous name change. Saved components and editable emails are included;
custom names, body copy, sent or sending campaigns and active A/B tests are preserved.
The operation does not send emails. Existing open editor drafts may still contain
the old name; reload them before continuing to edit.

With the API or MCP `update_company`, pass `name`, `renameMatchingFooters: true`
and `previousCompanyName` from get company. In the CLI, use
`sequenzy companies update comp_123 --name Grove --rename-matching-footers --previous-company-name Linear`.
The option defaults to false. A stale previous name returns 409 with no changes;
refresh the company and confirm again. Repeating a completed rename is safe.

Only the new `renameMatchingFooters: true` option additionally requires `emails:write`, `templates:write`, `campaigns:write`, `sequences:write`, `transactional:write` and `ab_tests:write`. Personal keys also require workspace owner or admin access. Ordinary company updates keep their existing permissions.

Test delivery history: `list_email_sends` includes pending, successful and failed test attempts with `isTestEmail: true`; `get_email_send` retrieves their details.

### Cart design previews

`preview_cart_items` calls `POST /api/v1/email-blocks/line-items/assist` with optional `items` (up to 50 objects), `itemFields`, `priceUnit` (`minor` or `major`) and `scenario` (`real`, `one`, `many`, `empty`, `missing-images`, `long-names`). It returns mapping suggestions, ambiguous numeric price candidates, cloned preview items and three design presets. It never saves or sends; retries have no persistent effects. Existing restricted keys remain supported. Invalid input returns the API validation error.

Apply mappings explicitly and choose numeric price units. Read and update saved email/template blocks with existing tools, preserving unrelated fields. Design settings are `imageSize`, `imageFit`, `rowSpacing`, `fontSize` and `showPrices`; remove optional fields in the replacement block to reset defaults, rather than passing null. Use existing render tools with scenario items under the configured source in `variables` for HTML at desktop or mobile widths. Totals remain in cents; row counts respect `maxItems`.

## Review a whole sequence

Review the saved graph with `sequences get` / `get_sequence`, render each email node with `sequences render --node <nodeId> --subscriber <subscriberId>` / `render_email`, and keep the same sample contact across steps. For an A/B step, render every stored variant ID and use its stored variant label. Edit the matching template or variant, save, then render again before moving on. Editing a shared template affects its other uses; make an independent copy first when only this step should change.

Use `sequences simulate <id>` / `simulate_sequence` to check readiness. Activate with `sequences enable <id>` / `enable_sequence` only when the user asks. Existing-contact enrollment is a separate explicit operation. Historical events are never replayed.

## Campaign audience status

`campaigns list --json` and MCP `list_campaigns` include `hasAudience`. Drafts with this flag have an explicit audience configuration, not a confirmed eligible-recipient count. Use `campaigns from-audience` / `create_campaign_for_audience` to save matching contact IDs directly in a blank campaign draft, then update its content. This does not create a list, change list membership or enroll contacts. The dashboard opens the existing campaign template picker for filtered groups; saved lists and segments retain their campaign and sequence actions.

### Running campaign A/B controls

Use `ab-tests get <id> --json` / `get_ab_test` to inspect actual variant content,
`progress`, original audience percentage, `testStartedAt`, `testEndsAt`, and any
`pendingSampleUpdate`. The winning metric does not identify which content differs.
Update via `ab-tests update <id> --test-percentage 30 --duration-minutes 120` /
`update_ab_test` with `testPercentage` and `testDurationMinutes`. Duration is total
minutes from the original start, 15–1440; an elapsed deadline requests selection
immediately. Percentage is 5–50 of the full original audience. Committed sends
keep their variants; the worker waits for previous jobs and can reject a shrink.
The winning metric cannot change during campaign testing. Paused campaigns stay
paused. Previously issued settings keys keep their existing scopes.

Repeat the same percentage to retry pending work safely. Discard only a failed
request with `--cancel-sample-update` / `cancelSampleUpdate: true`, without a new
percentage. To stop a running campaign test early and let its criteria pick the
winner from the results so far, use `--end-now` / `endTestNow: true` (needs
`campaigns:send`; it sends the winner to the remaining audience). GET after an uncertain response, since settings may have saved before
enqueue failed. Capture `updatedAt` when reviewing changes and pass
`--expected-updated-at` / `expectedUpdatedAt` for stale-update protection.
Use `ab-tests select-winner <id> <variantId>` / `select_ab_test_winner`
only when winner delivery is authorized; it ends the comparison and queues the
remaining audience. Repeat the same winner to repair interrupted delivery.
Pending sample changes block selection. Finishing early requires existing
`ab_tests:write` and `campaigns:send` scopes; sample/time updates use `ab_tests:write`.

On a sequence A/B test, the same command/tool selects or changes the winner,
including one picked automatically at the test sample size, when the user asks
to promote a variant. Contacts who already got a variant keep it; everyone who
reaches the step afterwards gets the new winner. Sequence tests need
`ab_tests:write` and `sequences:write` (not `campaigns:send`), plus
`--confirm-live-change` / `confirmLiveChange: true` while the sequence is active.
Use `ab-tests resume <id>` / `resume_ab_test` when the user wants to keep
testing a sequence test that already has a winner: it clears the winner, splits
contacts again, keeps results, and waits for a manual `select-winner`. Turn
automatic selection back on with `ab-tests update <id> --auto-select-winner` /
`update_ab_test` `autoSelectWinner: true` only when the user asks.

When reducing a campaign sample, only queue jobs whose sends have never started and that have no committed recipients can be withdrawn. Active jobs and pending transport retries finish first, so the minimum can rise before the change applies. Retrying preserves the request; discarding a failed change keeps work already performed, including withdrawn sample jobs. Recipients without committed sends remain eligible for the eventual winner.

### Transactional template labels

`create_transactional_email` and `update_transactional_email` accept `labels`,
an array of company label names. Names are trimmed and deduplicated; missing
names are created. Names must be non-empty and at most 255 characters. An omitted
field preserves existing assignments on update; `[]` clears them, and `null` is
invalid. `list_transactional_emails` and `get_transactional_email` return
`labels` on each template. List with `labels: ["Billing", "Receipts"]` to match
any of those names, combined with `search` and `status`. CLI equivalents are
`transactional create/update --label Billing Receipts`,
`transactional update receipt --clear-labels`, and `transactional list --label Billing`.
Label-only changes preserve content and translations and never send email. Read
back the template after an uncertain update before retrying its replacement.

### Private list member unsubscribe

`create_list` and `update_list` accept `allowMemberUnsubscribe` (boolean). Creation defaults to false; updates preserve omitted values and accept false to disable; null is rejected. `list_lists` and mutation results include the setting. When enabled on a private list, current members can see its name and opt out through preferences, but cannot join or rejoin. It is stored without effect on public lists. Repeating an update is safe; inspect lists before retrying an uncertain creation.

### Building the interactive widgets

Run `bun run build:app` after editing `ui/`. Commit `src/app-html.generated.ts` with the source changes. The self-contained HTML is embedded in the server bundle so hosted API deployments and standalone packages need no extra runtime assets. `bun run build` regenerates it automatically. Browser regression QA runs from the monorepo root with `bun test scripts/mcp-app.browser.test.ts` and uses local Chrome with a mocked MCP host.

### Capture submissions

`list_capture_submissions` reads preserved answers and field labels for forms, popups and landing pages. Supply `sourceType` (`form`, `popup`, `landing_page`) and `sourceId`, optional `companyId`, `limit` (1–100, default 50), and
`cursor` from `nextCursor`. Supply both `field` and `value` for exact custom
answer filtering (including string array members). `format: "csv"` adds a CSV
string for the returned page; keep filters unchanged when paginating. Requires
`subscribers:read` plus `widgets:read` for forms/popups or `landing_pages:read` for landing pages. Only future accepted form, popup and landing-page posts are
recorded; payloads are normalized, exclude tokens/headers, and survive profile
edits. Deleting a subscriber, source or company removes its snapshots.

The submission-payload tool is available on standard MCP. The OpenAI-reviewed
MCP profile excludes it under its existing raw-payload restrictions; use the
dashboard, API or CLI for this workflow on that profile.

Reconstructed capture submissions include `payload.recovery` with `evidenceType`, `evidenceId`, `recoveredAt`, `sourceAttribution: inferred` and `timestampMeaning: event_time`. Treat `createdAt` as the historical evidence time, not a verified submission timestamp. CSV pages containing these rows append `record_origin`, `timestamp_meaning` and `recovered_at`; ordinary pages retain their existing columns. Recovery is an operator repair, not a customer MCP write tool.
