import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

export const webTrackingToolDefinitions: Tool[] = [
  {
    name: "list_web_tracking_keys",
    description:
      "List the publishable keys that let a non-Shopify website send on-site events (product views, cart activity, collection views, search) into this workspace. Check this BEFORE promising that browse abandonment, cart recovery, or any product-view trigger will work on a custom site: without an installed key those events never arrive, the sequences built on them never fire, and nothing reports an error anywhere. Each key returns `allowedOrigins`, `unrestricted`, `lastUsedAt`, and a paste-ready `installSnippet`. A key with `lastUsedAt: null` has not successfully authenticated an event yet; it may be undeployed, have no instrumented traffic, or be sending requests rejected by its origin allowlist. Shopify stores do not use these keys; they use the storefront pixel, so check get_integration_pixel instead.",
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
      "Create a publishable key for the browser tracking SDK and return the install snippet. This is what turns on product views, cart activity, and browse abandonment for a site that is NOT Shopify or WooCommerce (custom storefronts, headless shops, marketplaces, SaaS marketing sites). Events start flowing once the snippet is deployed and nothing is backfilled for the period before that, so create and install it BEFORE building the sequence that depends on it. Always pass allowedOrigins: a key with none accepts anonymous events from any site. Identified events require a short-lived token minted by the customer's authenticated backend through POST /api/v1/web-tracking-identities (passing the key's publicKey or keyId), then `sequenzy.identify(email, identityToken)`; a publishable key alone can never trigger subscriber automation.",
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
            "Origins allowed to use this key, e.g. ['https://example.com', 'https://*.example.com']. A bare domain is read as https. A `*.` wildcard matches subdomains at any depth but NOT the apex, so list the apex separately if you need it. Include the development origin (e.g. http://localhost:3000) while wiring the SDK up. Omitting this leaves the key unrestricted, which should be a deliberate choice for a native app or server-side caller.",
        },
        companyId: companyIdProperty,
      },
      required: ["name"],
    },
  },
  {
    name: "update_web_tracking_key",
    description:
      "Rename a web tracking key, replace its allowed origins, or revoke it. `allowedOrigins` REPLACES the whole list rather than appending, so include the origins you want to keep. Revoking with isActive: false stops events within about a minute while preserving the key value, so the customer can still find and remove the matching snippet from their site; use delete_web_tracking_key only once the snippet is gone.",
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
            "Replacement allowed-origins list. Pass an empty array to make the key unrestricted.",
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
