import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { includeMachineEngagementToolProperty } from "../internal.js";

export const subscriberToolDefinitions: Tool[] = [
  // ============================================================================
  // Subscribers
  // ============================================================================
  {
    name: "add_subscriber",
    description: "Add a new subscriber to your list",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to add subscriber to. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide this with email when creating, or instead of email for an existing subscriber.",
        },
        firstName: {
          type: "string",
          description:
            "Subscriber first name, stored as a native profile field.",
        },
        lastName: {
          type: "string",
          description:
            "Subscriber last name, stored as a native profile field.",
        },
        attributes: {
          type: "object",
          description:
            "Custom attributes (plan, company, etc.). Use firstName/lastName for names instead of attributes.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to apply to the subscriber",
        },
        listIds: {
          type: "array",
          items: { type: "string" },
          description: "List IDs to add subscriber to",
        },
        status: {
          type: "string",
          description:
            "Initial subscriber status: active, unsubscribed, or bounced. Defaults to active.",
        },
        optInMode: {
          type: "string",
          description:
            "Consent mode: confirmed creates active immediately when consent is verified, double_opt_in sends a confirmation email before activation, and default obeys company double opt-in settings.",
        },
      },
      required: [],
    },
  },
  {
    name: "update_subscriber",
    description: "Update an existing subscriber's attributes or tags",
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
        firstName: {
          type: "string",
          description:
            "New first name, stored as a native profile field. Pass an empty string to clear it.",
        },
        lastName: {
          type: "string",
          description:
            "New last name, stored as a native profile field. Pass an empty string to clear it.",
        },
        attributes: {
          type: "object",
          description:
            "Custom attributes to update. Use firstName/lastName for names instead of attributes.",
        },
        addTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add",
        },
        removeTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to remove",
        },
      },
      required: [],
    },
  },
  {
    name: "remove_subscriber",
    description: "Unsubscribe or delete a subscriber",
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
        hardDelete: {
          type: "boolean",
          description:
            "If true, permanently deletes. If false, just unsubscribes.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_subscriber",
    description:
      "Get the full subscriber profile, including tags, notes, list memberships, sequence enrollments, email stats, and recent activity",
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
  {
    name: "list_subscriber_notes",
    description:
      "List internal notes for a subscriber. Provide email or externalId to identify the subscriber.",
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
      },
      required: [],
    },
  },
  {
    name: "add_subscriber_note",
    description:
      "Add an internal note to a subscriber. Provide email or externalId to identify the subscriber.",
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
        body: {
          type: "string",
          description: "Internal note body, up to 5000 characters.",
        },
      },
      required: ["body"],
    },
  },
  {
    name: "delete_subscriber_note",
    description: "Delete one internal subscriber note by note ID.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        noteId: {
          type: "string",
          description: "Subscriber note ID to delete.",
        },
      },
      required: ["noteId"],
    },
  },
  {
    name: "search_subscribers",
    description:
      "Search subscribers by free-text query, tags, list, or segment. If you omit limit, the tool fetches all pages and returns every match.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        query: {
          type: "string",
          description: "Search query (email or name)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        list: {
          type: "string",
          description:
            "Filter by subscriber list ID or exact list name. Prefer listId when known.",
        },
        listId: {
          type: "string",
          description: "Filter by subscriber list ID.",
        },
        listName: {
          type: "string",
          description:
            "Filter by exact subscriber list name when the list ID is not known.",
        },
        segmentId: {
          type: "string",
          description: "Filter by segment ID",
        },
        status: {
          type: "string",
          description:
            "Filter by subscriber status: active, unsubscribed, or bounced.",
        },
        limit: {
          type: "number",
          description:
            "Maximum results to return. If omitted, the tool returns all matches across pages.",
        },
      },
    },
  },
];
