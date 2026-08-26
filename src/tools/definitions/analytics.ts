import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { emailEventTypesList } from "../descriptions.js";
import { includeMachineEngagementToolProperty } from "../internal.js";

export const analyticsToolDefinitions: Tool[] = [
  // ============================================================================
  // Analytics
  // ============================================================================
  {
    name: "get_stats",
    description:
      "Get overview statistics for a time period, including reply count and reply rate. Counts form a funnel over the sends made inside the period: opened and clicked are unique per email send (not total open events) and include engagement that arrives after the period ends, so they never exceed sent. Rates divide by rateDenominator (delivered, falling back to sent), reported alongside rateDenominatorBasis. Set emailType to transactional for Send API and transactional SMTP open/click rates, including both direct and saved-template sends. Also returns top-level subscriberCount (every stored contact) and activeSubscriberCount (status=active) as a live audience snapshot, independent of period; use these for 'how many subscribers do I have' instead of search_subscribers pagination.total. When no emailType filter is used and a background-computed snapshot is available, the response also includes a top-level commerceForecast with predicted AOV, 12-month customer value, 90-day revenue, confidence, and data-eligibility reasons.",
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
      "Get detailed statistics for a campaign, including replies and reply rate, attributed conversions, revenue (revenueCents), attached campaign conversion goals in the top-level goals array (sent → opened → clicked → each named goal), product recommendation funnel metrics, a per-link click breakdown in the top-level clickedLinks array, and any Poll or NPS survey summaries in the top-level polls array",
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
    name: "list_poll_responses",
    description:
      "List individual Poll and NPS responses for a campaign, newest answer first, with each respondent's email, their answer and stored value, the subscriber attribute the answer was saved to, and the response time. get_campaign_stats reports the totals; this reports who answered what and when. Only each subscriber's latest answer per poll block is returned, so the counts match the campaign stats summary. Do not reconstruct respondents by scanning subscribers for the poll attribute - the attribute carries no response time and reflects the latest answer to any email. Multi-select answers list every selected option in answers/values. Results are paginated: read the returned pagination object and keep paging with page while page < totalPages.",
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
          description:
            "Campaign ID. For a sequence email step, pass the step's automation node ID.",
        },
        blockId: {
          type: "string",
          description:
            "Restrict to one poll block. Block IDs come from the polls array of get_campaign_stats. Omit to return every poll block in the email.",
        },
        page: {
          type: "number",
          description: "1-based page number. Defaults to 1.",
        },
        limit: {
          type: "number",
          description:
            "Page size. Defaults to 100 and is capped at 500 by the server.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_sequence_stats",
    description:
      "Get statistics for a sequence. The steps array is the per-step breakdown: one entry per email step in graph order with its step number, automation nodeId, subject, and its own sent, delivered, bounced, opened, clicked, replies, and unsubscribed counts plus rates - so this is where you read how many of Email 4 went out, without reconstructing anything from list_sequence_events. Step counts come from the retained event stream, not the 14-day delivery history behind list_email_sends, so they stay answerable for old sends. Also returns the aggregate funnel across every step, attributed conversions and revenue (revenueCents), product recommendation funnel metrics, per-step failed subscribers and failure reasons, and enrollmentSkipped counts for trigger matches where the contact could not be enrolled (unsubscribed/bounced). Pass period or start/end to use one explicit window for every historical metric; without them, step and aggregate counts are all-time and enrollmentSkipped defaults to the last 30 days. The enrollmentCounts field is a live snapshot of active and waiting enrollments grouped by current node, so it is not limited by period or start/end. To compare the same step across many sequences in one call, use list_email_metrics instead.",
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
          description: `Optional single event type. Supported values: ${emailEventTypesList}. Defaults to delivery.`,
        },
        eventTypes: {
          type: "array",
          description: `Optional event types to include. Supported values: ${emailEventTypesList}. Defaults to delivery.`,
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
      "List paginated raw email events for every email step in a sequence, or for one step via automationNodeId. Defaults to deliveries; use eventType or eventTypes to include opens, clicks, bounces, complaints, unsubscribes, sends, or delivery delays. This is the per-recipient event stream - do not page it to count sends. Per-step and per-sequence totals already exist as get_sequence_stats steps[], and list_email_metrics gives the same per-step totals across many sequences at once.",
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
        automationNodeId: {
          type: "string",
          description:
            "Optional email step to scope the stream to, taken from get_sequence_stats steps[].nodeId or get_sequence nodes. Must be an email step of this sequence. Defaults to every email step.",
        },
        eventType: {
          type: "string",
          description: `Optional single event type. Supported values: ${emailEventTypesList}. Defaults to delivery.`,
        },
        eventTypes: {
          type: "array",
          description: `Optional event types to include. Supported values: ${emailEventTypesList}. Defaults to delivery.`,
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
    name: "list_email_metrics",
    description:
      "List per-email metrics across the account: one row per campaign and per sequence email step, each with its own delivery funnel, attributed conversions, and revenueCents. This is the tool for cross-sequence questions - 'how many Email 4s went out across these sequences' is one call with step=4 plus the returned totals, instead of one get_sequence_stats per sequence. Sequence rows carry sequenceId, sequenceName, automationNodeId, and step, so you can group or compare steps yourself. Counts come from the retained event stream (not the 14-day list_email_sends history) and match get_sequence_stats steps[] for the same step. Filter by emailType, sequenceId, campaignId, and step; sort with sort/order; page with page/limit. totals covers every matching email, not just the current page.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        emailType: {
          type: "string",
          description:
            "Optional email type: campaign or sequence. Defaults to both. Implied as sequence when sequenceId or step is set.",
        },
        sequenceId: {
          type: "array",
          description:
            "Optional sequence IDs to restrict the breakdown to. Omit for every sequence in the account. Cannot be combined with campaignId.",
          items: { type: "string" },
        },
        campaignId: {
          type: "array",
          description:
            "Optional campaign IDs to restrict the breakdown to. Cannot be combined with sequenceId, step, or emailType sequence.",
          items: { type: "string" },
        },
        step: {
          type: "number",
          description:
            "Optional 1-based email step position to keep, counted in graph order per sequence. step 4 keeps only the fourth email of each sequence. Sequence emails only.",
        },
        period: {
          type: "string",
          description:
            "Optional sliding window: 1h, 24h, 7d, 30d, or 90d. Ignored when start and end are provided. Omit for all-time counts.",
        },
        start: {
          type: "string",
          description:
            "Optional ISO 8601 custom range start. Must be provided with end.",
        },
        end: {
          type: "string",
          description:
            "Optional ISO 8601 custom range end. Must be provided with start; maximum range is 90 days. Omit start and end for all-time counts over the full retained window.",
        },
        sort: {
          type: "string",
          description:
            "Sort field: sent, delivered, opened, clicked, openRate, clickRate, unsubscribed, conversions, revenue, step, or name. Defaults to sent.",
        },
        order: {
          type: "string",
          description: "Sort order: asc or desc. Defaults to desc.",
        },
        page: {
          type: "number",
          description: "Page number, starting at 1. Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Emails per page. Defaults to 50; maximum 500.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
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
