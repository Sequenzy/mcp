import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { includeMachineEngagementToolProperty } from "../internal.js";

const subscriberImportRecordSchema = {
  type: "object" as const,
  properties: {
    email: {
      type: "string" as const,
      description:
        "Subscriber email address. Optional when the record has a phone - such rows import as phone-only (SMS) contacts.",
    },
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
    createdAt: {
      type: "string" as const,
      description:
        "Original signup date (ISO 8601) from the source platform. Set this when migrating so date-relative segments are correct immediately rather than treating every imported contact as having joined today. An existing contact's date only ever moves earlier.",
    },
  },
  required: [],
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
          description:
            "Subscriber email address. Optional when phone is provided - a contact created with only a phone becomes a phone-only (SMS) contact.",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide this with email when creating, or instead of email for an existing subscriber.",
        },
        phone: {
          type: "string",
          description:
            "Phone number in E.164 or national format, stored as a native profile field. With no email, creates or matches a phone-only (SMS) contact.",
        },
        phoneCountry: {
          type: "string",
          description:
            "ISO 3166-1 alpha-2 country used to read a national-format phone number, such as IT or US. Defaults to US. Only send it together with phone; the stored country always comes from the parsed number.",
        },
        smsConsent: {
          type: "boolean",
          description:
            "Set true only when express written SMS marketing consent was verified for this phone number. Never inferred from phone presence.",
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
        createdAt: {
          type: "string",
          description:
            "Original signup date (ISO 8601) when importing a contact from another platform. Preserves their real history so date-relative segments like 'added in the last 30 days' are correct immediately instead of treating every imported contact as brand new. An existing contact's date only ever moves earlier. Supplying this also stops welcome sequences from firing, since it describes the past rather than a signup happening now.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_subscriber_import",
    description:
      "Queue one CRM-grade subscriber import with up to 5,000 full contact records. Supports names, external IDs, phones, statuses, tags, lists, and custom attributes. Email addresses are automatically checked for deliverability, and invalid addresses are suppressed from sends. Prefer this over repeated add_subscriber calls. Returns an import ID for get_subscriber_import. Use optInMode='confirmed' only when the contacts already gave verified email consent.",
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
      "Get progress, row outcomes, email-hygiene counts (checked, valid, risky, invalid, and unavailable), skipped reasons, and failure summaries for a queued subscriber import.",
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
      "Update an existing subscriber's profile, phone, status, attributes, or tags. Names and phones are native profile fields - set them here rather than as custom attributes. Setting status to unsubscribed suppresses the contact from all marketing, deactivates list memberships, and cancels active sequence enrollments while preserving the record and suppression history.",
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
        phone: {
          type: "string",
          description:
            "New phone number in E.164 or national format, stored as a native profile field. Pass an empty string to clear it, which is rejected for a phone-only (SMS) contact that has no email. Changing the number resets SMS consent unless smsConsent is sent in the same call.",
        },
        phoneCountry: {
          type: "string",
          description:
            "ISO 3166-1 alpha-2 country used to read a national-format phone number, such as IT or US. Defaults to US. Only send it together with phone; the stored country always comes from the parsed number.",
        },
        smsConsent: {
          type: "boolean",
          description:
            "Set true only when express written SMS marketing consent was verified for this phone number; false unsubscribes them from SMS. Omitting this leaves consent unchanged unless phone changes, which resets consent because it belonged to the old number. Consent is never inferred from phone presence.",
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
      "Get the full subscriber profile, including tags, notes, list memberships, sequence enrollments, email stats, and recent activity. For commerce customers, customAttributes include nightly predictive analytics: predictedLtv (next-12-month spend), churnRisk (percent), expectedNextOrderAt, avgDaysBetweenOrders, and predictionConfidence.",
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
    name: "trigger_subscriber_event",
    description:
      "Emit a custom event for one subscriber, exactly as an integration or the public API would. This is the supported way to exercise event triggers, matching-field idempotency, branch conditions, and stop conditions end to end without waiting for real traffic. The event is recorded, sync rules apply, and matching event_received sequences enroll. Creates the subscriber if they do not exist. Use trigger_subscriber_events for several events on the same contact.",
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
        event: {
          type: "string",
          description:
            "Event name, such as saas.purchase or invoice.paid. The event definition is created if it does not exist.",
        },
        properties: {
          type: "object",
          description:
            "Event properties. Include the sequence's matching field (for example order.id or invoice.id) when testing idempotency or cancellation by field value.",
          additionalProperties: true,
        },
        firstName: {
          type: "string",
          description: "First name applied to the subscriber profile.",
        },
        lastName: {
          type: "string",
          description: "Last name applied to the subscriber profile.",
        },
        attributes: {
          type: "object",
          description: "Custom attributes to set on the subscriber.",
          additionalProperties: true,
        },
        occurredAt: {
          type: "string",
          description:
            "When the event actually happened (ISO 8601). Omit for live events. If this is more than an hour in the past the event is recorded as history: it is stored with its real timestamp and counts for segments and the timeline, but no sequences enroll, no sync rules apply, no waiting steps resume, and no webhooks fire. A historical event also moves the contact's signup date back to when it occurred (never later), so imported contacts do not read as added today. Use this when backfilling from another platform - never to fake a live event, since the side effects you are testing will not run.",
        },
        eventId: {
          type: "string",
          description:
            "Your own id for this event. Makes a historical import idempotent: re-sending the same eventId writes nothing new.",
        },
      },
      required: ["event"],
    },
  },
  {
    name: "trigger_subscriber_events",
    description:
      "Emit several custom events for one subscriber in order. Events are processed independently and sequentially, so a partial failure can still leave earlier events recorded.",
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
        events: {
          type: "array",
          minItems: 1,
          maxItems: 500,
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Event name" },
              properties: {
                type: "object",
                description: "Event properties",
                additionalProperties: true,
              },
              occurredAt: {
                type: "string",
                description:
                  "When the event actually happened (ISO 8601). When every event in the batch is more than an hour old the batch is imported as history in one idempotent write, with no sequences, sync rules, waiting steps or webhooks; the contact's signup date also moves back to the earliest event in the batch (never later).",
              },
              eventId: {
                type: "string",
                description:
                  "Your own id for this event, making a re-run idempotent.",
              },
            },
            required: ["name"],
            additionalProperties: false,
          },
          description: "Events to trigger, in order, for this subscriber.",
        },
        firstName: { type: "string" },
        lastName: { type: "string" },
        attributes: {
          type: "object",
          description: "Custom attributes to set on the subscriber.",
          additionalProperties: true,
        },
      },
      required: ["events"],
    },
  },
  {
    name: "bulk_add_subscriber_tags",
    description:
      "Add tags to up to 500 existing subscribers in one call, identified by emails, externalIds, or subscriberIds. Built for reconciling historical or derived tags: subscribers that do not exist are reported in notFound instead of being created, and tag automations do NOT run unless triggerAutomations is true. Needs the subscribers:tag scope, which the agent_safe key preset includes; a tag name that does not exist yet also needs tags:write. Use add_subscriber or update_subscriber for single-contact changes.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        tags: {
          type: "array",
          minItems: 1,
          items: { type: "string" },
          description: "Tag names to add to every matched subscriber.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Subscriber emails to tag. Combine with externalIds/subscriberIds as needed; at least one identifier list is required.",
        },
        externalIds: {
          type: "array",
          items: { type: "string" },
          description: "Customer-owned subscriber IDs to tag.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description: "Sequenzy subscriber IDs to tag.",
        },
        triggerAutomations: {
          type: "boolean",
          description:
            "Whether tag_added sequences may enroll these contacts. Defaults to false, which is what backfills want. Requires the automations:trigger scope.",
        },
      },
      required: ["tags"],
    },
  },
  {
    name: "bulk_remove_subscriber_tags",
    description:
      "Remove tags from up to 500 existing subscribers in one call, identified by emails, externalIds, or subscriberIds. Subscribers that do not exist are reported in notFound. Needs the subscribers:tag scope; the broader subscribers:write scope also satisfies it. Use this to roll back or reconcile a derived-tag backfill.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        tags: {
          type: "array",
          minItems: 1,
          items: { type: "string" },
          description: "Tag names to remove from every matched subscriber.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description: "Subscriber emails to untag.",
        },
        externalIds: {
          type: "array",
          items: { type: "string" },
          description: "Customer-owned subscriber IDs to untag.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description: "Sequenzy subscriber IDs to untag.",
        },
      },
      required: ["tags"],
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
