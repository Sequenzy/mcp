import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

export const webTrackingToolDefinitions: Tool[] = [
  {
    name: "list_web_tracking_keys",
    description:
      "List the publishable keys that let a non-Shopify website send on-site events (product views, cart activity, collection views, search, and page views reported with sequenzy.page()) into this workspace. Whether browse abandonment, cart recovery, or any product-view trigger can work on a custom site depends on an installed key: without one those events never arrive, the sequences built on them never fire, and nothing reports an error anywhere. Each key returns `allowedOrigins`, `allowedAppIds` (iOS bundle IDs and Android package names for the mobile SDKs), `unrestricted`, `lastUsedAt`, and a paste-ready `installSnippet`. A key with `lastUsedAt: null` has not successfully authenticated an event yet; it may be undeployed, have no instrumented traffic, or be sending requests rejected by its origin or app ID allowlist. Shopify stores do not use these keys; they use the storefront pixel, which get_integration_pixel reports.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "get_web_tracking_key",
    description:
      "Get one web tracking key with its install snippet and ingest endpoint. Use this to hand a developer the exact `<script>` tag to paste, rather than reconstructing it - the snippet embeds both the publishable key and the workspace id, and a hand-built one that gets either wrong fails silently.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Web tracking key ID from list_web_tracking_keys.",
        },
        companyId: companyIdProperty,
      },
      required: ["id"],
    },
  },
  {
    name: "create_web_tracking_key",
    description:
      "Create a publishable key for the browser tracking SDK and return the install snippet. This is what turns on product views, cart activity, and browse abandonment for a site that is NOT Shopify or WooCommerce (custom storefronts, headless shops, marketplaces, SaaS marketing sites). Events start flowing once the snippet is deployed and nothing is backfilled for the period before that, so create and install it BEFORE building the sequence that depends on it. Always pass allowedOrigins for a website or allowedAppIds for an iOS or Android app using the mobile SDKs: a key with neither accepts anonymous events from any site or app, and a key with only allowedAppIds is rejected from browsers. Identified events require a short-lived token minted by the customer's authenticated backend through POST /api/v1/web-tracking-identities (passing the key's publicKey or keyId, plus the user's email or, for app users without one, externalId), then `sequenzy.identify(email, identityToken)` or, in the mobile SDKs, `identifyUser(externalId, ...)`; a publishable key alone can never trigger subscriber automation.",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Human-readable label for this key, e.g. 'Storefront' or 'Marketing site'.",
        },
        allowedOrigins: {
          type: "array",
          items: { type: "string" },
          description:
            "Origins allowed to use this key, e.g. ['https://example.com', 'https://*.example.com']. A bare domain is read as https. A `*.` wildcard matches subdomains at any depth but NOT the apex, so list the apex separately if you need it. Include the development origin (e.g. http://localhost:3000) while wiring the SDK up. Omitting this and allowedAppIds leaves the key unrestricted, which should be a deliberate choice for a server-side caller.",
        },
        allowedAppIds: {
          type: "array",
          items: { type: "string" },
          description:
            "iOS bundle IDs and Android package names allowed to use this key from the Sequenzy mobile SDKs, e.g. ['com.example.app']. Matched case-insensitively against the x-sequenzy-app-id header on requests without an Origin header. Native apps cannot prove their identity, so this keeps a copied key from being reused by mistake; identity tokens still protect contact data.",
        },
        companyId: companyIdProperty,
      },
      required: ["name"],
    },
  },
  {
    name: "update_web_tracking_key",
    description:
      "Rename a web tracking key, replace its allowed origins or app IDs, or revoke it. `allowedOrigins` and `allowedAppIds` each REPLACE the whole list rather than appending, so include the entries you want to keep. Revoking with isActive: false stops events within about a minute while preserving the key value, so the customer can still find and remove the matching snippet from their site; use delete_web_tracking_key only once the snippet is gone.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Web tracking key ID from list_web_tracking_keys.",
        },
        name: { type: "string", description: "New label for the key." },
        allowedOrigins: {
          type: "array",
          items: { type: "string" },
          description:
            "Replacement allowed-origins list. The key becomes unrestricted when both this and allowedAppIds are empty.",
        },
        allowedAppIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Replacement list of iOS bundle IDs and Android package names. The key becomes unrestricted when both this and allowedOrigins are empty. Adding app IDs to a key with no origins makes it app-only: a website already using it stops sending events, so add the site's origins too or create a separate key for the app.",
        },
        isActive: {
          type: "boolean",
          description:
            "Set false to revoke the key, true to re-enable a revoked one.",
        },
        companyId: companyIdProperty,
      },
      required: ["id"],
    },
  },
  {
    name: "delete_web_tracking_key",
    description:
      "Permanently delete a web tracking key. Cached authorization expires within one minute, after which requests from any remaining snippet are rejected; remove the snippet from the site as well. Prefer update_web_tracking_key with isActive: false when the key might be needed again.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Web tracking key ID from list_web_tracking_keys.",
        },
        companyId: companyIdProperty,
      },
      required: ["id"],
    },
  },
];
