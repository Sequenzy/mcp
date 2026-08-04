import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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
      "Connect an API-key / webhook-secret integration: polar, paddle, dodo, whop, creem, chargebee, clerk, posthog, or affonso. Check list_integration_capabilities first - each connectable provider lists its exact connectFields there. Credentials are validated against the provider where possible, stored encrypted, and never returned; payment providers queue their initial revenue backfill automatically. The response includes the webhookUrl the user must configure at the provider with the same secret - always relay it. Reconnecting an already-connected provider replaces its stored credentials. OAuth and app-install providers (Stripe, Shopify, Supabase, GitHub, WooCommerce, Meta) are rejected with guidance: their flows need a human in the dashboard. SECURITY: only pass credentials the user explicitly provided for this purpose; suggest the CLI (`sequenzy integrations connect`) or dashboard when the user prefers keeping secrets out of the conversation.",
    inputSchema: {
      type: "object",
      properties: {
        provider: {
          type: "string",
          description:
            "Provider to connect: polar, paddle, dodo, whop, creem, chargebee, clerk, posthog, or affonso.",
          enum: [
            "polar",
            "paddle",
            "dodo",
            "whop",
            "creem",
            "chargebee",
            "clerk",
            "posthog",
            "affonso",
          ],
        },
        apiKey: {
          type: "string",
          description:
            "Provider API key. Required for every provider except clerk and posthog.",
        },
        webhookSecret: {
          type: "string",
          description:
            "Signing secret of the webhook you create at the provider, pointed at the returned webhookUrl. Required for every provider. For Chargebee, pass the webhook's basic-auth credentials as username:password.",
        },
        providerAccountId: {
          type: "string",
          description:
            "Provider account id, required for paddle (seller ID), dodo (business ID), whop (company ID, biz_...), creem (store ID), and chargebee (site name). Polar resolves it from the API key; clerk, posthog, and affonso do not use one.",
        },
        settings: {
          type: "object",
          description:
            "PostHog only: event delivery scope. Defaults to syncing all non-internal events.",
          properties: {
            syncAllEvents: {
              type: "boolean",
              description: "Sync every event PostHog delivers.",
            },
            eventAllowlist: {
              type: "array",
              items: { type: "string" },
              description:
                "Only sync these PostHog event names. Set syncAllEvents to false when using this.",
            },
          },
        },
        historyImport: {
          type: "object",
          description:
            "PostHog only: import the project's event history after connecting. Needs a personal API key with query read access.",
          properties: {
            region: {
              type: "string",
              enum: ["us", "eu"],
              description: "PostHog Cloud region hosting the project.",
            },
            projectId: {
              type: "string",
              description: "Numeric PostHog project ID.",
            },
            personalApiKey: {
              type: "string",
              description: "PostHog personal API key (phx_...).",
            },
          },
          required: ["region", "projectId", "personalApiKey"],
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
      "Turn a supported payment integration's future bulk imports and backfills on or off. Check get_integration.availableActions first; providers without enable_sync or disable_sync are dashboard-managed. Disabling keeps the connection, credentials, and live webhook delivery active, and requires any in-flight sync to finish first. It does not disconnect the integration. Idempotent: setting the current state succeeds with `changed: false`.",
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
    name: "sync_integration",
    description:
      "Queue a manual re-sync of customers and revenue for a payment provider integration (Stripe, Polar, Paddle, Dodo, Creem, Chargebee, Whop). Returns immediately - poll get_integration to watch `syncStatus` and `lastSyncAt`. Fails with a conflict if a sync is already running, and with a clear error naming the dashboard for providers whose backfill is not API-triggerable (Shopify products, Supabase users, PostHog history, Affonso affiliates). Check `availableActions` on get_integration to see whether this is supported before calling.",
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
