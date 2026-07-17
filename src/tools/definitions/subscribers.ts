import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { includeMachineEngagementToolProperty } from "../internal.js";

const subscriberImportRecordSchema = {
  type: "object" as const,
  properties: {
    email: { type: "string" as const, description: "Subscriber email address" },
    externalId: {
      type: "string" as const,
      description: "Customer-owned subscriber ID",
    },
    firstName: { type: "string" as const },
    lastName: { type: "string" as const },
    phone: {
      type: "string" as const,
      description:
        "Phone number. National-format values use the batch defaultPhoneCountry.",
    },
    status: {
      type: "string" as const,
      enum: ["active", "unsubscribed", "bounced"],
    },
    tags: { type: "array" as const, items: { type: "string" as const } },
    customAttributes: {
      type: "object" as const,
      description:
        "CRM fields and other custom attributes. Values may be strings, numbers, booleans, arrays of those scalar values, or null.",
      additionalProperties: true,
    },
  },
  required: ["email"],
  additionalProperties: false,
};

export const subscriberToolDefinitions: Tool[] = [
  // ============================================================================
  // Subscribers
  // ============================================================================
  {
    name: "add_subscriber",
    description:
      "Add one subscriber. Status is only applied when creating a new contact; use update_subscriber to change an existing contact's status. For multiple contacts or CRM records, use create_subscriber_import instead of looping this tool. For an email-only batch going into one list, add_subscribers_to_list is also available.",
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
          enum: ["active", "unsubscribed", "bounced"],
          description:
            "Initial subscriber status: active, unsubscribed, or bounced. Defaults to active and does not change an existing contact; use update_subscriber for existing contacts.",
        },
        optInMode: {
          type: "string",
          enum: ["default", "confirmed", "double_opt_in"],
          description:
            "Consent mode: confirmed creates active immediately when consent is verified, double_opt_in sends a confirmation email before activation, and default obeys company double opt-in settings.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_subscriber_import",
    description:
      "Queue one CRM-grade subscriber import with up to 5,000 full contact records. Supports names, external IDs, phones, statuses, tags, lists, and custom attributes. Prefer this over repeated add_subscriber calls. Returns an import ID for get_subscriber_import. Use optInMode='confirmed' only when the contacts already gave verified email consent.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        subscribers: {
          type: "array",
          minItems: 1,
          maxItems: 5000,
          items: subscriberImportRecordSchema,
          description: "Full subscriber records to import in one batch.",
        },
        duplicateStrategy: {
          type: "string",
          enum: ["skip", "merge", "overwrite"],
          description:
            "How existing contacts are handled. Defaults to skip. Merge fills missing fields; overwrite replaces public fields without reactivating unsubscribed contacts.",
        },
        fileName: {
          type: "string",
          description:
            "Optional source label shown in import history, such as copper-export.csv.",
        },
        listIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Lists to add every successfully imported active subscriber to.",
        },
        enrollInSequences: {
          type: "boolean",
          description:
            "Whether matching sequences may enroll imported contacts. Defaults to false and requires automations:trigger.",
        },
        defaultPhoneCountry: {
          type: "string",
          description:
            "ISO 3166-1 alpha-2 country used for national-format phone numbers, such as SG or US.",
        },
        smsConsent: {
          type: "boolean",
          description:
            "Set true only when express written SMS marketing consent was verified for every imported phone number.",
        },
        optInMode: {
          type: "string",
          enum: ["default", "confirmed", "double_opt_in"],
          description:
            "Email consent mode. Default follows workspace double opt-in settings. Confirmed creates active contacts immediately and must only be used for verified consent. Double_opt_in may send confirmation email and requires automations:trigger.",
        },
      },
      required: ["subscribers"],
    },
  },
  {
    name: "get_subscriber_import",
    description:
      "Get progress, counts, skipped reasons, and failure summaries for a queued subscriber import.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        importId: {
          type: "string",
          description:
            "Import ID or batch ID returned by create_subscriber_import.",
        },
      },
      required: ["importId"],
    },
  },
  {
    name: "update_subscriber",
    description:
      "Update an existing subscriber's profile, status, attributes, or tags. Setting status to unsubscribed suppresses the contact from all marketing, deactivates list memberships, and cancels active sequence enrollments while preserving the record and suppression history.",
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
        status: {
          type: "string",
          enum: ["active", "unsubscribed", "bounced"],
          description:
            "New global subscriber status. Use unsubscribed for compliance-grade suppression without deleting the record. Use active only when the contact has valid consent to be resubscribed.",
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
    description:
      "Unsubscribe a subscriber while preserving the record and suppression history. Only permanently deletes when hardDelete is true.",
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
            "If true, permanently deletes the subscriber and suppression history. Defaults to false, which globally unsubscribes the contact, deactivates list memberships, and cancels active sequence enrollments.",
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
