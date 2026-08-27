import type { Tool } from "../../mcp-types.js";
import { OUTBOUND_WEBHOOK_EVENT_TYPES } from "../internal.js";

export const webhookToolDefinitions: Tool[] = [
  // ============================================================================
  // Outbound Webhooks
  // ============================================================================
  {
    name: "list_webhooks",
    description:
      "List outbound webhook endpoints and their subscribed event types.",
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
    name: "create_webhook",
    description:
      "Create an outbound webhook endpoint. IMPORTANT: the response includes a signingSecret that is returned only once - show it to the user immediately so they can store it and verify webhook signatures. If events is omitted, a default set of event types is subscribed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Webhook endpoint name.",
        },
        url: {
          type: "string",
          description: "HTTPS URL that will receive webhook events.",
        },
        events: {
          type: "array",
          items: {
            type: "string",
            enum: [...OUTBOUND_WEBHOOK_EVENT_TYPES],
          },
          description:
            "Event types to subscribe to. If omitted, a default set is used.",
        },
      },
      required: ["name", "url"],
    },
  },
  {
    name: "update_webhook",
    description:
      "Update an outbound webhook endpoint's name, URL, subscribed events, or status (enabled/disabled). Providing events replaces the existing event list.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        webhookId: {
          type: "string",
          description: "Webhook endpoint ID.",
        },
        name: {
          type: "string",
          description: "New webhook endpoint name.",
        },
        url: {
          type: "string",
          description: "New HTTPS URL that will receive webhook events.",
        },
        events: {
          type: "array",
          items: {
            type: "string",
            enum: [...OUTBOUND_WEBHOOK_EVENT_TYPES],
          },
          description: "Replacement event type subscriptions.",
        },
        status: {
          type: "string",
          enum: ["enabled", "disabled"],
          description: "Enable or disable deliveries to this endpoint.",
        },
      },
      required: ["webhookId"],
    },
  },
  {
    name: "delete_webhook",
    description:
      "Permanently delete an outbound webhook endpoint along with its delivery history. This cannot be undone. To keep the endpoint but stop deliveries, use update_webhook with status disabled instead.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        webhookId: {
          type: "string",
          description: "Webhook endpoint ID to delete.",
        },
      },
      required: ["webhookId"],
    },
  },
  {
    name: "test_webhook",
    description:
      "Send a test event to an outbound webhook endpoint to verify it is reachable and signatures can be validated.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        webhookId: {
          type: "string",
          description: "Webhook endpoint ID to test.",
        },
      },
      required: ["webhookId"],
    },
  },
  {
    name: "list_webhook_deliveries",
    description:
      "List recent delivery attempts for an outbound webhook endpoint, including status and response codes.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        webhookId: {
          type: "string",
          description: "Webhook endpoint ID.",
        },
        limit: {
          type: "number",
          description:
            "Maximum number of deliveries to return, from 1 to 100. Defaults to 20.",
        },
      },
      required: ["webhookId"],
    },
  },
  {
    name: "replay_webhook_delivery",
    description:
      "Replay a previous webhook delivery, re-sending the same event payload to the endpoint.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        webhookId: {
          type: "string",
          description: "Webhook endpoint ID.",
        },
        deliveryId: {
          type: "string",
          description:
            "Delivery ID to replay. Use list_webhook_deliveries to find delivery IDs.",
        },
      },
      required: ["webhookId", "deliveryId"],
    },
  },
];
