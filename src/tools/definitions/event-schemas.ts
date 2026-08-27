import type { Tool } from "../../mcp-types.js";

/**
 * Event payload discovery.
 *
 * `list_integration_capabilities` answers "which events does Shopify emit?".
 * This answers the question that immediately follows and used to have no
 * answer anywhere: "what is actually inside one of those payloads, so I can
 * write a merge tag or a property filter against it?"
 */
export const eventSchemaToolDefinitions: Tool[] = [
  {
    name: "get_event_schema",
    description:
      "Read the published payload of a built-in event: a real example payload per provider, plus every property path with its type, the merge tag that resolves it, and a note wherever the example alone is ambiguous. Call this BEFORE writing {{event.*}} merge tags or event property filters - an unrecognized merge tag renders as an empty string rather than an error, so a guessed property name ships silently broken. It is also the only place that spells out the traps the sample cannot: money fields ending in `Cents` are minor units while `predictedLtv` is whole currency units, `price` is a preformatted display string that must not be parsed, `churnRisk` is a 0-95 percent and not a probability, and `orderId` is a string on Shopify but a number on WooCommerce. Omit eventName to list every documented event, or pass provider to get one provider's payload instead of all of them. Custom events are first-class and deliberately absent from this list: `documented: false` means no sample is published, never that the event name is invalid or will be rejected. Static reference data - it describes the event shape, not what this account has received. Use list_integration_activity or the sequence's own enrollments to see real deliveries.",
    inputSchema: {
      type: "object",
      properties: {
        eventName: {
          type: "string",
          description:
            "Event to describe, for example `ecommerce.order_placed` or `ecommerce.browse_abandoned`. Legacy aliases such as `order.completed` resolve to their current name. Omit to list every documented event.",
        },
        provider: {
          type: "string",
          description:
            "Return only this provider's payload. Omit to compare every provider that documents the event.",
          enum: ["shopify", "woocommerce", "manual", "api", "stripe"],
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: [],
    },
  },
];
