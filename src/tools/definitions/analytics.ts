import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { includeMachineEngagementToolProperty } from "../internal.js";

export const analyticsToolDefinitions: Tool[] = [
  // ============================================================================
  // Analytics
  // ============================================================================
  {
    name: "get_stats",
    description: "Get overview statistics for a time period",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        period: {
          type: "string",
          description: "Time period: 7d, 30d, or 90d (default: 7d)",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
    },
  },
  {
    name: "get_campaign_stats",
    description:
      "Get detailed statistics for a campaign, including attributed conversions, revenue (revenueCents), a per-link click breakdown in the top-level clickedLinks array, and any Poll or NPS survey summaries in the top-level polls array",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_sequence_stats",
    description:
      "Get statistics for a sequence, including attributed conversions and revenue (revenueCents) plus per-step failed subscribers and failure reasons",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "list_campaign_events",
    description:
      "List paginated raw email events for a campaign. Defaults to deliveries; use eventType or eventTypes to include opens, clicks, bounces, complaints, unsubscribes, sends, or delivery delays.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
        eventType: {
          type: "string",
          description:
            "Optional single event type. Supported values: send, delivery, bounce, complaint, open, click, unsubscribe, delivery_delay. Defaults to delivery.",
        },
        eventTypes: {
          type: "array",
          description:
            "Optional event types to include. Supported values: send, delivery, bounce, complaint, open, click, unsubscribe, delivery_delay. Defaults to delivery.",
          items: { type: "string" },
        },
        period: {
          type: "string",
          description:
            "Optional sliding time window: 1h, 24h, 7d, 30d, or 90d. Ignored when start/end are provided.",
        },
        start: {
          type: "string",
          description:
            "Optional ISO 8601 start time. Must be used with end; max range is 90 days.",
        },
        end: {
          type: "string",
          description:
            "Optional ISO 8601 end time. Must be used with start; max range is 90 days.",
        },
        page: {
          type: "number",
          description: "Page number, starting at 1. Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Events per page. Defaults to 100; maximum 500.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["campaignId"],
    },
  },
  {
    name: "list_sequence_events",
    description:
      "List paginated raw email events for every email step in a sequence. Defaults to deliveries; use eventType or eventTypes to include opens, clicks, bounces, complaints, unsubscribes, sends, or delivery delays.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
        eventType: {
          type: "string",
          description:
            "Optional single event type. Supported values: send, delivery, bounce, complaint, open, click, unsubscribe, delivery_delay. Defaults to delivery.",
        },
        eventTypes: {
          type: "array",
          description:
            "Optional event types to include. Supported values: send, delivery, bounce, complaint, open, click, unsubscribe, delivery_delay. Defaults to delivery.",
          items: { type: "string" },
        },
        period: {
          type: "string",
          description:
            "Optional sliding time window: 1h, 24h, 7d, 30d, or 90d. Ignored when start/end are provided.",
        },
        start: {
          type: "string",
          description:
            "Optional ISO 8601 start time. Must be used with end; max range is 90 days.",
        },
        end: {
          type: "string",
          description:
            "Optional ISO 8601 end time. Must be used with start; max range is 90 days.",
        },
        page: {
          type: "number",
          description: "Page number, starting at 1. Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Events per page. Defaults to 100; maximum 500.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "get_subscriber_activity",
    description:
      "Get recent activity, email stats, and current sequence enrollments for a subscriber",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description:
            "Subscriber email address. Provide email or externalId to identify the subscriber.",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide email or externalId to identify the subscriber.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: [],
    },
  },
];
