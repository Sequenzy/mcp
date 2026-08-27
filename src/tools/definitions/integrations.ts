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
    name: "connect_integration",
    description:
      "Connect an API-key / webhook-secret integration: polar, paddle, dodo, whop, creem, chargebee, clerk, posthog, segment, or affonso. Check list_integration_capabilities first - each connectable provider lists its exact connectFields there. Credentials are validated against the provider where possible, stored encrypted, and never returned; payment providers queue their initial revenue backfill automatically. The response includes the webhookUrl the user must configure at the provider with the same secret - always relay it. Reconnecting an already-connected provider replaces its stored credentials. OAuth and app-install providers (Stripe, Shopify, Supabase, GitHub, WooCommerce, Meta) are rejected with guidance: their flows need a human in the dashboard. SECURITY: only pass credentials the user explicitly provided for this purpose; suggest the CLI (`sequenzy integrations connect`) or dashboard when the user prefers keeping secrets out of the conversation.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "Provider to connect: polar, paddle, dodo, whop, creem, chargebee, clerk, posthog, segment, or affonso.",
          enum: [
            "polar",
            "paddle",
            "dodo",
            "whop",
            "creem",
            "chargebee",
            "clerk",
            "posthog",
            "segment",
            "affonso",
          ],
        },
        apiKey: {
          type: "string",
          description:
            "Provider API key. Required for every provider except clerk, posthog, and segment.",
        },
        webhookSecret: {
          type: "string",
          description:
            "Signing secret of the webhook you create at the provider, pointed at the returned webhookUrl. Required for every provider. For Chargebee, pass the webhook's basic-auth credentials as username:password. For segment, the secret is your own choice and must be 16-153 UTF-8 bytes.",
        },
        providerAccountId: {
          type: "string",
          description:
            "Provider account id, required for paddle (seller ID), dodo (business ID), whop (company ID, biz_...), creem (store ID), and chargebee (site name). Polar resolves it from the API key; clerk, posthog, segment, and affonso do not use one.",
        },
        settings: {
          type: "object",
          description:
            "PostHog and Segment only: event delivery scope. PostHog defaults to syncing every non-internal event. New Segment connections sync track and identify calls but skip automatic page/screen calls unless those names are explicitly allowlisted.",
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
      required: ["provider", "webhookSecret"],
    },
  },
  {
    name: "get_integration",
    description:
      "Inspect one connected integration in depth: what the provider syncs, every event it can emit and when, every matching tag rule, which sequences trigger on those events, recent integration-specific activity, and prioritized recommendations. `observedByAccount` and `accountLastSeenAt` are account-wide because event definitions can also be updated by another integration or the public events API; use the retained activity log for connection-specific delivery diagnosis. Read-only; credentials are never returned. Get the id from list_integrations.",
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
      "Describe what Sequenzy's integration providers do, whether or not they are connected. For each provider: category, how it connects, what it syncs, every event it emits with the real-world moment that triggers it, the subscriber attributes it writes, supported actions, availability, and caveats. Use this to answer 'what would connecting Stripe give me?', to compare providers before recommending one, or to check whether an event a sequence needs actually exists for that provider. Coverage differs sharply between providers - only Shopify has storefront browse tracking, and only Stripe and Chargebee cover the full trial lifecycle - so check here rather than assuming.",
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
            "Filter by category: payments, ecommerce, auth, analytics, ads, affiliate, cms, developer.",
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
      "Turn a supported integration's future bulk imports and backfills on or off. THIS DOES NOT STOP AN INTEGRATION CREATING CONTACTS: disabling sync only pauses full imports and backfills, while the provider's live webhook keeps writing every new signup or customer as it happens. To change where those contacts land, use set_integration_list_targeting; to stop them arriving at all, the integration has to be disconnected from the dashboard. Check get_integration.availableActions first; providers without enable_sync or disable_sync are dashboard-managed. Disabling keeps the connection, credentials, and live webhook delivery active, and requires any in-flight sync to finish first. It does not disconnect the integration. Idempotent: setting the current state succeeds with `changed: false`. Requires an API key with the `integrations:manage` scope, which agent-safe keys deliberately do not carry - without it, report the dashboard path (Settings -> Integrations) instead of retrying.",
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
      "Choose which lists the contacts a connected integration creates join. This is the tool for 'stop this integration adding people to my marketing lists' - set_integration_sync_enabled only pauses bulk backfills and leaves the provider's live webhook writing. IMPORTANT SCOPE: this changes list membership only, and it takes effect on future provider writes. It does not stop contacts being created, does not stop their attributes syncing, does not stop sync-rule tags, and does not stop `contact_added` sequences using the default `any_contact` scope, which fire precisely because the contact joined no list. Explicit `any_list` and specific-list sequences require a matching membership and do not enroll a list-less contact. Nobody is ever removed from a list and nothing is applied retroactively. Provider behavior for existing contacts differs: Wix or Webflow submissions, Shopify customer updates, and Supabase resubscriptions can add an existing contact to the new target lists; Stripe applies targeting only when its webhook creates a subscriber. If the goal is to stop `any_contact` enrollments too, pair this tool with pause_sequence_enrollments on the affected sequences. Check get_integration first - `ingestion` reports the current targeting with list names, and `availableActions` says whether this provider honors set_list_targeting. Supported for Supabase, Stripe, Shopify, Wix, and Webflow. Dodo Payments, PostHog, Polar, Paddle, and other providers without that action reject this tool; their live contacts follow defaultSubscriberListIds on get_company/update_company instead (null = every list, [] = none), which is workspace-wide. PostHog history imports are an exception and create contacts without list memberships. Idempotent: asking for the current state succeeds with `changed: false`. Requires an API key with the `integrations:manage` scope, which agent-safe keys deliberately do not carry - without it, report the dashboard path (Settings -> Integrations) instead of retrying.",
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
            "Lists that contacts created by this integration join from now on. `null` clears the choice so they follow the workspace default lists; `[]` means they join no list at all; a populated array means exactly those lists. Every ID must belong to this company.",
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
      "Check whether a Shopify store's storefront tracking pixel is installed and reporting to this account. Read live from Shopify on every call, because a merchant can remove the pixel without Sequenzy hearing about it. ALWAYS check this before promising that browse abandonment, cart recovery, product views, collection views, or storefront search will work: without a live pixel those events never arrive, the sequences built on them never fire, and nothing anywhere reports an error. Returns `pixel.healthy`, the endpoint and signed configuration state, and `dependentEvents` - the event names that rely on this pixel. When `pixel.error` is null and `pixel.healthy` is false, those events are confirmed dark; an error means Shopify could not confirm their state. Fix a confirmed unhealthy state with activate_integration_pixel. Shopify only; other providers return a clear error.",
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
      "Queue a manual re-sync for an integration: customers and revenue for a payment provider (Stripe, Polar, Paddle, Dodo, Creem, Chargebee, Whop), the user backfill for Supabase, or the event-history import for PostHog and Segment. Use this for Supabase before a campaign that depends on names or plan attributes - the live trigger only sends rows that change after it was installed, so existing users have no attributes until a backfill runs. The Supabase sync reads the project, schema, and table already configured for the integration and cannot be pointed at a different table; if none is configured yet it fails saying so. This is also the supported way to retry a failed PostHog or Segment history import: it restarts from the beginning using the stored credentials, and already-imported events dedupe, so a re-run cannot duplicate them. Returns immediately - poll get_integration to watch `syncStatus` and `lastSyncAt`, and list_integration_activity for per-row outcomes. Fails with a conflict if a sync is already queued or running; terminal BullMQ failures release history imports for retry. Providers whose backfill is not API-triggerable (Shopify products, Affonso affiliates) return a clear error naming the dashboard. Check `availableActions` on get_integration to see whether this is supported before calling.",
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
];
