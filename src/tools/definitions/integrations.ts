import type { Tool } from "../../mcp-types.js";

/**
 * Integration inspection and management.
 *
 * `list_integrations` (in account.ts) answers "what is connected?".
 * These answer the follow-up questions: what does a provider actually do,
 * what is this connected one doing right now, and what have I not built on
 * top of it yet.
 */
export const integrationToolDefinitions: Tool[] = [
  {
    name: "disconnect_integration",
    description:
      "Disconnect a Lemon Squeezy or SparkLoop integration and stop live ingestion and sync. Deletes only the managed provider webhook; manual webhooks remain. Local disconnection succeeds even if provider cleanup fails: inspect cleanupWarning. Repeating the call retries Lemon Squeezy cleanup; for SparkLoop, delete the leftover webhook in SparkLoop. Other providers require the dashboard. Requires integrations:manage and owner/admin access.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description: "Lemon Squeezy or SparkLoop integration ID.",
        },
        companyId: {
          type: "string",
          description: "Company ID; defaults to the selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "connect_integration",
    description:
      "Connect an API-key / webhook-secret integration: polar, paddle, dodo, lemon_squeezy, whop, revenuecat, superwall, adapty, creem, chargebee, clerk, posthog, segment, mixpanel, amplitude, affonso, attio, or sparkloop. Check list_integration_capabilities first - each connectable provider lists its exact connectFields there. Credentials are validated, stored encrypted, and never returned; payment providers queue their initial revenue backfill automatically. Lemon Squeezy creates a managed signed webhook when webhookSecret is omitted, or uses the supplied secret for manual setup. RevenueCat is webhook-only (no backfill): webhookSecret is the authorization header value configured on the RevenueCat webhook, or its HMAC signing secret. Superwall is webhook-only too and needs only webhookSecret: the whsec_ signing secret of the Superwall webhook pointed at the returned webhookUrl. Mixpanel and Amplitude need only webhookSecret, a strong random value you choose: Mixpanel sends it as the Basic auth password of its webhook destination (any username, the dashboard suggests sequenzy) and syncs cohorts as mixpanel-<cohort> tags; Amplitude sends it in an X-Webhook-Secret header and streams events (product.*), user properties, and cohorts (amplitude-<cohort> tags). Sequenzy cannot show the secret again, so give it to the user once. Attio is outbound-only and has no webhookUrl. SparkLoop needs only apiKey; Sequenzy registers the SparkLoop webhook itself with a secret in its URL (webhookSecret, the account's SparkLoop-Token, is optional), and an account with several publications needs providerAccountId (the 400 error lists them in publications). Reconnecting replaces stored credentials. OAuth and app-install providers (Stripe, Shopify, Supabase, GitHub, WooCommerce, Meta) are rejected with guidance: their flows need a human in the dashboard. SECURITY: only pass credentials the user explicitly provided for this purpose; suggest the CLI (`sequenzy integrations connect`) or dashboard when the user prefers keeping secrets out of the conversation.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "Provider to connect: polar, paddle, dodo, lemon_squeezy, whop, revenuecat, superwall, adapty, creem, chargebee, clerk, posthog, segment, mixpanel, amplitude, affonso, attio, or sparkloop.",
          enum: [
            "polar",
            "paddle",
            "dodo",
            "lemon_squeezy",
            "whop",
            "revenuecat",
            "superwall",
            "adapty",
            "creem",
            "chargebee",
            "clerk",
            "posthog",
            "segment",
            "mixpanel",
            "amplitude",
            "affonso",
            "attio",
            "sparkloop",
          ],
        },
        apiKey: {
          type: "string",
          description:
            "Provider API key. Required for polar, paddle, dodo, lemon_squeezy, whop, revenuecat (secret API v2 key), creem, chargebee, affonso, attio, and sparkloop. Attio uses the workspace access token from Settings → Developers; SparkLoop the API key from Settings → Integrations.",
        },
        webhookSecret: {
          type: "string",
          description:
            "Signing secret for the provider webhook. Optional for lemon_squeezy: omit it for managed provisioning, or provide 16-40 characters for manual fallback. Optional for sparkloop. Required for every other provider except attio, which is outbound-only. For Chargebee, pass username:password. For revenuecat, pass at least 16 characters: the authorization header value set on the RevenueCat webhook, or its HMAC signing secret. For superwall, pass the webhook's whsec_ signing secret. For adapty, pass at least 16 characters: the authorization header value set on the Adapty webhook. For segment, use 16-153 UTF-8 bytes. For mixpanel and amplitude, use 16-153 characters without spaces or colons: the Basic auth password (Mixpanel) or X-Webhook-Secret header value (Amplitude) you will configure. For sparkloop, omit it: Sequenzy authenticates deliveries with a secret in the webhook URL it registers. Pass the account's webhook authentication token only to verify the SparkLoop-Token header instead.",
        },
        providerAccountId: {
          type: "string",
          description:
            "Provider account id, required for paddle (seller ID), dodo (business ID), lemon_squeezy (numeric store ID), whop (company ID, biz_...), creem (store ID), and chargebee (site name). Polar resolves it from the API key, and revenuecat does too unless the key can access several projects (then pass the RevenueCat project ID, proj...); clerk, superwall, adapty, posthog, segment, mixpanel, amplitude, and affonso do not use one. For sparkloop it is the SparkLoop publication ID (pub_...), required only when the account has more than one publication.",
        },
        settings: {
          type: "object",
          description:
            "PostHog, Segment, and Amplitude: event delivery scope. New Segment connections skip automatic page/screen calls, and new Amplitude connections skip session and [Amplitude] autocapture events, unless those names are explicitly allowlisted. Mixpanel takes no settings. Attio: listMap (Sequenzy list id → Attio list id or slug) and syncCompanyFromDomain (default true). SparkLoop: listIds for new referrals.",
          properties: {
            syncAllEvents: {
              type: "boolean",
              description: "Sync every event the provider delivers.",
            },
            eventAllowlist: {
              type: "array",
              items: { type: "string" },
              description:
                "Only sync these event names. Set syncAllEvents to false when using this.",
            },
            skipInternalEvents: {
              type: "boolean",
              description:
                "Skip provider-internal events (PostHog $ events, Segment page/screen, Amplitude session_start/session_end and [Amplitude] autocapture) unless allowlisted. Identify calls always pass. New Segment and Amplitude connections default to true, as do PostHog connections made without settings.",
            },
            matchByDistinctId: {
              type: "boolean",
              description:
                "PostHog only. Match events without an email to the existing contact whose externalId (or stored posthogDistinctId) equals the event's distinct_id. Never creates contacts. New connections default to true; omit to keep the current value on reconnect.",
            },
            listMap: {
              type: "object",
              additionalProperties: { type: "string" },
              description:
                "Attio only. Optional map of Sequenzy list id to Attio people-list UUID or api slug. When omitted, mappings can be configured later with update_attio_settings, which reuses the stored token and does not need the access token again.",
            },
            syncCompanyFromDomain: {
              type: "boolean",
              description:
                "Attio only. When true, upsert a company from the person's non-free-mail email domain.",
            },
            listIds: {
              type: ["array", "null"],
              items: { type: "string" },
              description:
                "SparkLoop only. Lists new referrals join. Omit to keep the current choice (the workspace default lists on a first connect), pass null to reset to the workspace default lists, or [] for none. Change later with set_integration_list_targeting.",
            },
          },
        },
        historyImport: {
          type: "object",
          description:
            "PostHog and Segment only: import event history after connecting. PostHog needs region + projectId + personalApiKey (query read access) and imports the project archive. Segment needs region + spaceId + profileApiToken (Unify Profile API) and imports each existing contact's recent profile history - the Profile API serves at most the last 14 days, and contacts without a Unify profile are skipped.",
          properties: {
            region: {
              type: "string",
              enum: ["us", "eu"],
              description:
                "Region hosting the data: the PostHog Cloud region, or the Segment workspace's deployment.",
            },
            projectId: {
              type: "string",
              description: "PostHog only: numeric PostHog project ID.",
            },
            personalApiKey: {
              type: "string",
              description: "PostHog only: personal API key (phx_...).",
            },
            spaceId: {
              type: "string",
              description: "Segment only: Unify space ID (spa_...).",
            },
            profileApiToken: {
              type: "string",
              description:
                "Segment only: Profile API access token for the space.",
            },
          },
          required: ["region"],
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["provider"],
    },
  },
  {
    name: "get_integration",
    description:
      "Inspect one connected integration in depth: what the provider syncs, every event it can emit and when, every matching tag rule, which sequences trigger on those events, recent integration-specific activity, and prioritized recommendations. For Webflow, `webflowCapture` reports the exact selected native forms, retained field names, double-opt-in policy, list IDs, sequence toggle, webhook status, and schema fetch time; capture is off when its forms array is empty. `observedByAccount` and `accountLastSeenAt` are account-wide because event definitions can also be updated by another integration or the public events API; use the retained activity log for connection-specific delivery diagnosis. For Attio, an `attio_lists_unmapped` recommendation means nothing is mapped so nothing syncs, and `attio_inbound_sync_error` means changes made in Attio are not reaching Sequenzy — use get_attio_mapping then update_attio_settings; do not reconnect for that. Read-only; credentials are never returned. Get the id from list_integrations.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description: "Integration ID from list_integrations.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "list_integration_capabilities",
    description:
      "Describe what Sequenzy's integration providers do, whether or not they are connected. For each provider: category, how it connects, what it syncs, every event it emits with the real-world moment that triggers it, the subscriber attributes it writes, supported actions, availability, and caveats. Use this to answer 'what would connecting Stripe give me?', to compare providers before recommending one, or to check whether an event a sequence needs actually exists for that provider. Coverage differs sharply between providers - only Shopify has storefront browse tracking, and only Stripe, Chargebee, and RevenueCat cover the full trial lifecycle - so check here rather than assuming.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "Only return this provider, for example `stripe`, `shopify`, `clerk`. Omit to list every provider.",
        },
        category: {
          type: "string",
          description:
            "Filter by category: payments, ecommerce, auth, analytics, ads, affiliate, cms, crm, developer.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "list_integration_suggestions",
    description:
      "Suggest integrations to connect next, based on what Sequenzy found on the company's website during onboarding: tools on the homepage or the sign-in page it links to (Clerk, Supabase, PostHog, Segment, Mixpanel, Amplitude, Webflow, Wix, WordPress, WooCommerce) or a Shopify storefront, minus anything already connected. Payment providers are never guessed from the site: when the website lists pricing and no payment or commerce integration is connected, `paymentProviders` lists every payment provider so the user can pick theirs. `scanComplete` is false while the website is still being read, so an empty list then means 'not scanned yet', not 'nothing found'. Use list_integration_capabilities to explain what a suggested provider gives and how it connects. Read-only.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "list_integration_activity",
    description:
      "Read recent integration webhook and sync activity, newest first. This is the log to check when an integration reports connected but contacts or events are not appearing: each row carries the action, status, event type, matched contact, and error. Payloads are sanitized at write time, so no credentials or secrets appear here. Activity is retained for 24 hours only.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description: "Only show activity for this integration.",
        },
        provider: {
          type: "string",
          description:
            "Only show activity for this provider, for example `stripe`.",
        },
        status: {
          type: "string",
          description:
            "Filter by status: received, queued, processed, skipped, or failed. Use `failed` to triage a broken integration.",
          enum: ["received", "queued", "processed", "skipped", "failed"],
        },
        limit: {
          type: "number",
          description: "Rows to return, 1-100. Defaults to 25.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "set_integration_sync_enabled",
    description:
      "Turn a supported integration's future bulk imports and backfills on or off. THIS DOES NOT STOP AN INTEGRATION CREATING CONTACTS: disabling sync only pauses full imports and backfills, while the provider's live webhook keeps writing every new signup or customer as it happens. To change where those contacts land, use set_integration_list_targeting; to stop them arriving at all, use disconnect_integration for Lemon Squeezy or SparkLoop, or disconnect from the dashboard for other providers. Check get_integration.availableActions first; providers without enable_sync or disable_sync are dashboard-managed. Disabling keeps the connection, credentials, and live webhook delivery active, and requires any in-flight sync to finish first. It does not disconnect the integration. Idempotent: setting the current state succeeds with `changed: false`. Requires an API key with the `integrations:manage` scope, which agent-safe keys deliberately do not carry - without it, report the dashboard path (Settings -> Integrations) instead of retrying.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description: "Integration ID from list_integrations.",
        },
        syncEnabled: {
          type: "boolean",
          description: "True to enable sync, false to pause it.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId", "syncEnabled"],
    },
  },
  {
    name: "set_integration_list_targeting",
    description:
      "Choose which lists the contacts a connected integration creates join. This is the tool for 'stop this integration adding people to my marketing lists' - set_integration_sync_enabled only pauses bulk backfills and leaves the provider's live webhook writing. Scope: this changes list membership only, and it takes effect on future provider writes. It does not stop contacts being created, does not stop their attributes syncing, does not stop sync-rule tags, and does not stop `contact_added` sequences using the default `any_contact` scope, which fire precisely because the contact joined no list. Explicit `any_list` and specific-list sequences require a matching membership and do not enroll a list-less contact. Nobody is ever removed from a list and nothing is applied retroactively. Provider behavior for existing contacts differs: Wix or Webflow submissions, Shopify customer updates, and Supabase resubscriptions can add an existing contact to the new target lists; Stripe applies targeting only when its webhook creates a subscriber. Webflow is deliberately fail-closed: `null` is rejected, so pass `[]` or explicit list IDs; form selection, field allowlists, required double opt-in, and sequence enrollment remain dashboard-only under Settings -> Integrations -> Webflow. With no selected forms, Webflow capture is off and no contacts are created. If the goal is to stop `any_contact` enrollments too, pair this tool with pause_sequence_enrollments on the affected sequences. Check get_integration first - `ingestion` reports the current targeting with list names, and `availableActions` says whether this provider honors set_list_targeting. Supported for Supabase, Stripe, Shopify, Wix, Webflow, and SparkLoop. Dodo Payments, PostHog, Polar, Paddle, and other providers without that action reject this tool; their live contacts follow defaultSubscriberListIds on get_company/update_company instead (null = every list, [] = none), which is workspace-wide. PostHog history imports are an exception and create contacts without list memberships. Idempotent: asking for the current state succeeds with `changed: false`. Requires an API key with the `integrations:manage` scope, which agent-safe keys deliberately do not carry - without it, report the dashboard path (Settings -> Integrations) instead of retrying.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description: "Integration ID from list_integrations.",
        },
        listIds: {
          type: ["array", "null"],
          items: { type: "string" },
          description:
            "Lists that contacts created by this integration join from now on. `null` clears the choice so most providers follow workspace defaults, but Webflow rejects `null` and requires `[]` or explicit IDs. `[]` means no list; a populated array means exactly those lists. Every ID must belong to this company.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId", "listIds"],
    },
  },
  {
    name: "get_integration_pixel",
    description:
      "Check whether a Shopify store's storefront tracking pixel is installed and reporting to this account. Read live from Shopify on every call, because a merchant can remove the pixel without Sequenzy hearing about it. Check this before telling the user that browse abandonment, cart recovery, product views, collection views, or storefront search will work: without a live pixel those events never arrive, the sequences built on them never fire, and nothing anywhere reports an error. Returns `pixel.healthy`, the endpoint and signed configuration state, and `dependentEvents` - the event names that rely on this pixel. When `pixel.error` is null and `pixel.healthy` is false, those events are confirmed dark; an error means Shopify could not confirm their state. Fix a confirmed unhealthy state with activate_integration_pixel. Shopify only; other providers return a clear error.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description:
            "Shopify integration ID from list_integrations or get_integration.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "activate_integration_pixel",
    description:
      "Install the Shopify storefront tracking pixel on the connected store, or repoint an existing one at this account. This is what turns on product views, cart activity, and browse abandonment - the data every browse-abandonment and cart-recovery sequence depends on. Idempotent: an already-live pixel returns `changed: false`. Events start flowing on the next storefront visit and nothing is backfilled for the period the pixel was off, so run it before, not after, building the sequence. If the store granted an older permission set, this fails with a message naming the reconnect step rather than silently doing nothing. Shopify only.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description:
            "Shopify integration ID from list_integrations or get_integration.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "sync_integration",
    description:
      "Queue a manual re-sync for an integration: customers and revenue for a payment provider (Stripe, Polar, Paddle, Dodo, Lemon Squeezy, Creem, Chargebee, Whop), the user backfill for Supabase, or the event-history import for PostHog and Segment. Use this for Supabase before a campaign that depends on names or plan attributes - the live trigger only sends rows that change after it was installed, so existing users have no attributes until a backfill runs. The Supabase sync reads the project, schema, and table already configured for the integration and cannot be pointed at a different table; if none is configured yet it fails saying so. This is also the supported way to retry a failed PostHog or Segment history import: it restarts from the beginning using the stored credentials, and already-imported events dedupe, so a re-run cannot duplicate them. Returns immediately - poll get_integration to watch `syncStatus` and `lastSyncAt`, and list_integration_activity for per-row outcomes. Fails with a conflict if a sync is already queued or running; terminal BullMQ failures release history imports for retry. Providers whose backfill is not API-triggerable (Shopify products, Affonso affiliates) return a clear error naming the dashboard. Check `availableActions` on get_integration to see whether this is supported before calling.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description: "Integration ID from list_integrations.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "get_attio_mapping",
    description:
      "Inspect a connected Attio integration's two-way sync: every Sequenzy list, every Attio people-list the stored token can write (id, api slug, name), the saved maps in both directions (listMap and tagMap push Sequenzy lists and tags to Attio lists; inboundListMap and inboundTagMap pull Attio lists into Sequenzy lists and tags), syncRemovals, whether company matching from work-email domains is on, and `inbound` (whether the Attio webhook is listening, and the error when it is not). Use it when Attio is connected but nothing is mapped, and call it before update_attio_settings so you have Attio list ids or slugs instead of asking the user to paste UUIDs. Reads Attio live on every call. Credentials are never returned. Attio only; other providers return a clear error. Check get_integration first — availableActions includes update_attio_settings when mapping can be saved without reconnecting.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description:
            "Attio integration ID from list_integrations or get_integration.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "update_amplitude_settings",
    description:
      "Choose which events a connected Amplitude integration records, without the webhook secret (reconnecting would replace the secret and stop deliveries until the destination is updated). syncAllEvents false plus eventAllowlist records only those types. skipInternalEvents (on for new connections) drops session, [Amplitude] autocapture, and other $ events unless allowlisted; identify always passes. Applies to later deliveries; dropped events are not replayed. Amplitude only. Requires the `integrations:manage` scope; otherwise use the dashboard (Settings -> Integrations -> Amplitude).",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description:
            "Amplitude integration ID from list_integrations or get_integration.",
        },
        syncAllEvents: {
          type: "boolean",
          description:
            "true records every event type; false records only eventAllowlist.",
        },
        eventAllowlist: {
          type: "array",
          items: { type: "string" },
          description:
            "Amplitude event types to record when syncAllEvents is false, exactly as Amplitude names them. Replaces the saved list.",
        },
        skipInternalEvents: {
          type: "boolean",
          description:
            "Skip session_start, session_end, [Amplitude] autocapture, and other $ events unless allowlisted.",
        },
      },
      required: ["integrationId"],
    },
  },
  {
    name: "update_attio_settings",
    description:
      "Set the two-way sync of an already-connected Attio integration, using the stored access token, so changing mappings does not require connect_integration or the Attio access token again. Sequenzy → Attio: listMap (Sequenzy list id → Attio list) and tagMap (Sequenzy tag → Attio list) upsert the person and add them to the Attio list when they join the list or get the tag. Attio → Sequenzy: inboundListMap (Attio list → Sequenzy list id) and inboundTagMap (Attio list → Sequenzy tag) create or update the subscriber and add them to the list or tag when someone is added to the Attio list, which triggers list and tag automations. Saving an inbound map makes Sequenzy register the Attio webhook itself; that needs the webhook:read-write scope on the token, and the call fails with instructions when it is missing. Each map is a full replacement: pass the complete desired map, `{}` to clear it, or omit it to leave it unchanged. syncRemovals (default false) mirrors removals in every mapped direction; off keeps sync add-only. Optionally set syncCompanyFromDomain. Provide at least one field. Idempotent: asking for the current state succeeds with changed: false. Only changes after saving sync; existing members are not backfilled. Check get_attio_mapping first for Sequenzy list ids and live Attio list ids/slugs, and list_tags for tag names. Attio only. Requires an API key with the `integrations:manage` scope, which agent-safe keys deliberately do not carry; without it, the same settings are available in the dashboard at Settings -> Integrations -> Attio -> Sync settings.",
    inputSchema: {
      type: "object",
      properties: {
        integrationId: {
          type: "string",
          description:
            "Attio integration ID from list_integrations or get_integration.",
        },
        listMap: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Sequenzy → Attio. Complete map of Sequenzy list id to Attio people-list UUID or api slug. Replaces the saved map. Pass `{}` to clear every mapping. Omit to leave mappings unchanged.",
        },
        tagMap: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Sequenzy → Attio. Complete map of Sequenzy tag name to Attio people-list UUID or api slug. Tag names are normalized like stored tags (lowercase, spaces become dashes). Replaces the saved map; `{}` clears it; omit to leave it unchanged.",
        },
        inboundListMap: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Attio → Sequenzy. Complete map of Attio people-list UUID or api slug to Sequenzy list id. Stored with Attio list UUIDs. Replaces the saved map; `{}` clears it; omit to leave it unchanged. Needs the webhook:read-write scope on the Attio token.",
        },
        inboundTagMap: {
          type: "object",
          additionalProperties: { type: "string" },
          description:
            "Attio → Sequenzy. Complete map of Attio people-list UUID or api slug to Sequenzy tag name. Replaces the saved map; `{}` clears it; omit to leave it unchanged. Needs the webhook:read-write scope on the Attio token.",
        },
        syncRemovals: {
          type: "boolean",
          description:
            "When true, leaving a mapped Sequenzy list or losing a mapped tag removes the Attio list entry, and removal from a mapped Attio list removes the Sequenzy list membership or tag. Omit to leave the current setting unchanged.",
        },
        syncCompanyFromDomain: {
          type: "boolean",
          description:
            "When true, upsert a company from the person's non-free-mail email domain. Omit to leave the current setting unchanged.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["integrationId"],
    },
  },
];
