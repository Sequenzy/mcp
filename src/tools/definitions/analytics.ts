import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { includeMachineEngagementToolProperty } from "../internal.js";

export const analyticsToolDefinitions: Tool[] = [
  // ============================================================================
  // Analytics
  // ============================================================================
  {
    name: "get_stats",
    description:
      "Get overview statistics for a time period, including reply count and reply rate. Set emailType to transactional for Send API and transactional SMTP open/click rates, including both direct and saved-template sends. When no emailType filter is used and a background-computed snapshot is available, the response also includes a top-level commerceForecast with predicted AOV, 12-month customer value, 90-day revenue, confidence, and data-eligibility reasons.",
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
        emailType: {
          type: "string",
          description:
            "Optional structural email type filter: campaign, transactional, or sequence. Use transactional for Send API and transactional SMTP traffic.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
    },
  },
  {
    name: "get_transactional_stats",
    description:
      "Get aggregate sends, deliveries, bounces, opens, clicks, and rates for one saved transactional email selected by ID or slug. Results are all-time by default; pass period or start/end for a window. For direct-content Send API messages, use get_stats with emailType transactional and list_email_sends/get_email_send for delivery-level detail.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        idOrSlug: {
          type: "string",
          description: "Saved transactional email ID or API slug.",
        },
        period: {
          type: "string",
          description:
            "Optional sliding window: 1h, 24h, 7d, 30d, or 90d. Ignored when start and end are provided.",
        },
        start: {
          type: "string",
          description:
            "Optional ISO 8601 custom range start. Must be provided with end.",
        },
        end: {
          type: "string",
          description:
            "Optional ISO 8601 custom range end. Must be provided with start; maximum range is 90 days.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["idOrSlug"],
    },
  },
  {
    name: "get_campaign_stats",
    description:
      "Get detailed statistics for a campaign, including replies and reply rate, attributed conversions, revenue (revenueCents), product recommendation funnel metrics, a per-link click breakdown in the top-level clickedLinks array, and any Poll or NPS survey summaries in the top-level polls array",
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
        period: {
          type: "string",
          description: "Time period: 1h, 24h, 7d, 30d, or 90d",
        },
        start: {
          type: "string",
          description:
            "Custom range start as an ISO 8601 timestamp; provide end too",
        },
        end: {
          type: "string",
          description:
            "Custom range end as an ISO 8601 timestamp; provide start too",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_sequence_stats",
    description:
      "Get statistics for a sequence, including aggregate and per-step replies and reply rates, attributed conversions and revenue (revenueCents), product recommendation funnel metrics, per-step failed subscribers and failure reasons, plus enrollmentSkipped counts for trigger matches where the contact could not be enrolled (unsubscribed/bounced). The enrollmentCounts field is a live snapshot of active and waiting enrollments grouped by current node, so it is not limited by period or start/end. Date filters scope the historical metrics; without them, enrollmentSkipped defaults to the last 30 days.",
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
        period: {
          type: "string",
          description:
            "Optional sliding window: 1h, 24h, 7d, 30d, or 90d. Ignored when start and end are provided.",
        },
        start: {
          type: "string",
          description:
            "Optional ISO 8601 custom range start. Must be provided with end.",
        },
        end: {
          type: "string",
          description:
            "Optional ISO 8601 custom range end. Must be provided with start; maximum range is 90 days.",
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
