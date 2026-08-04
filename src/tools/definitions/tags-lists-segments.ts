import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  AVAILABLE_TAG_COLORS,
  segmentFilterItemSchema,
  segmentFilterGroupSchema,
} from "../internal.js";

export const tagListSegmentToolDefinitions: Tool[] = [
  // ============================================================================
  // Tags, Lists, Segments
  // ============================================================================
  {
    name: "list_tags",
    description: "List all tags in the account",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list tags for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_tag",
    description:
      "Create a new tag definition. The name is normalized to lowercase with hyphens (e.g. 'VIP Customer' becomes 'vip-customer'). Color defaults to gray.",
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
          description: "Tag name. Normalized to lowercase with hyphens.",
        },
        color: {
          type: "string",
          enum: [...AVAILABLE_TAG_COLORS],
          description: "Tag color. Defaults to gray.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_tag",
    description: "Update a tag's color. System tags cannot be updated.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        tagId: {
          type: "string",
          description: "Tag ID. Use list_tags to find tag IDs.",
        },
        color: {
          type: "string",
          enum: [...AVAILABLE_TAG_COLORS],
          description: "New tag color.",
        },
      },
      required: ["tagId", "color"],
    },
  },
  {
    name: "delete_tag",
    description:
      "Permanently delete a tag and remove it from all subscribers. This cannot be undone. System tags and tags used by sequences cannot be deleted.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        tagId: {
          type: "string",
          description: "Tag ID. Use list_tags to find tag IDs.",
        },
      },
      required: ["tagId"],
    },
  },
  {
    name: "list_lists",
    description: "List all subscriber lists",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list lists for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_list",
    description: "Create a new subscriber list",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the list in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "List name",
        },
        description: {
          type: "string",
          description: "List description",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_list",
    description:
      "Update a subscriber list's name, description, or privacy. Only the provided fields are changed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        listId: {
          type: "string",
          description: "Subscriber list ID to update.",
        },
        name: {
          type: "string",
          description: "New list name.",
        },
        description: {
          type: ["string", "null"],
          description: "New list description. Pass null to clear it.",
        },
        isPrivate: {
          type: "boolean",
          description: "Whether the list is private.",
        },
      },
      required: ["listId"],
    },
  },
  {
    name: "delete_list",
    description:
      "Permanently delete a subscriber list and remove all of its memberships. Subscribers themselves are kept. This cannot be undone.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        listId: {
          type: "string",
          description: "Subscriber list ID to delete.",
        },
      },
      required: ["listId"],
    },
  },
  {
    name: "add_subscribers_to_list",
    description:
      "Bulk add existing or new subscribers to a subscriber list from an email array. Existing subscribers are added to the list without requiring a per-subscriber update call.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        listId: {
          type: "string",
          description: "Subscriber list ID to add subscribers to.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses to add to the list. Maximum 500 per call.",
        },
        duplicateStrategy: {
          type: "string",
          description:
            "Duplicate strategy for existing subscribers: skip, merge, or overwrite. Defaults to skip.",
        },
        enrollInSequences: {
          type: "boolean",
          description:
            "Whether newly created subscribers should enroll in matching sequences. Defaults to false.",
        },
        optInMode: {
          type: "string",
          description:
            "Consent mode for newly created subscribers: default, confirmed, or double_opt_in. Defaults to default.",
        },
      },
      required: ["listId", "emails"],
    },
  },
  {
    name: "remove_subscribers_from_list",
    description:
      "Remove subscribers from a list by email address. Maximum 500 emails per call. Subscribers stay in the account; only the list membership is removed. Returns the removed count plus a notFound array of emails that did not match a subscriber.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        listId: {
          type: "string",
          description: "Subscriber list ID to remove subscribers from.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses to remove from the list. Maximum 500 per call.",
        },
      },
      required: ["listId", "emails"],
    },
  },
  {
    name: "list_segments",
    description: "List all segments",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list segments for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_segment",
    description:
      'Create a new segment from explicit filter rules. Use `filters` plus `filterJoinOperator` for flat legacy rules, or `root` for nested AND/OR groups such as `{ "kind": "group", "joinOperator": "and", "children": [{ "kind": "filter", "field": "attribute", "operator": "gte", "value": "mrr:50" }, { "kind": "group", "joinOperator": "or", "children": [{ "kind": "filter", "field": "tag", "operator": "contains", "value": "vip" }, { "kind": "filter", "field": "event", "operator": "is_not", "value": "saas.purchase:30d" }] }] }`. Supports `event` and `segment` fields, Stripe product purchase/current/trial/date filters, and campaign-specific engagement filters.',
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the segment in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Segment name",
        },
        filterJoinOperator: {
          type: "string",
          enum: ["and", "or"],
          description:
            'How top-level filters combine. Use `"and"` to require every filter or `"or"` to match any filter.',
        },
        filters: {
          type: "array",
          items: segmentFilterItemSchema,
          minItems: 1,
          description:
            'Array of segment filters. Example custom attribute empty check: [{"id":"filter-1","field":"attribute","operator":"is_empty","value":"last_logged_in:"}]. Example Stripe purchase filter: [{"id":"filter-1","field":"stripeProduct","operator":"is","value":"prod_123"}]. Example threshold filter: [{"id":"filter-1","field":"stripeProduct","operator":"at_least","value":"prod_123:3"}]. Example commerce product purchase filter (value is provider:productId since product ids are provider-scoped): [{"id":"filter-1","field":"commerceProduct","operator":"is","value":"api:prod-starter-kit"}]. Example repeat-buyer filter: [{"id":"filter-1","field":"commerceProduct","operator":"at_least","value":"shopify:42:2"}]. Example commerce collection filter (anyone who bought any product in the collection; value is a collection id or handle): [{"id":"filter-1","field":"commerceCollection","operator":"is","value":"skincare"}]. Example trial cancellation filter: [{"id":"filter-1","field":"stripeTrialProduct","operator":"is","value":"prod_123:is_canceled"}]. Example trial end filter: [{"id":"filter-1","field":"stripeTrialProduct","operator":"is","value":"prod_123:end_at:2026-05-26"}]. Example campaign-specific engagement combo: [{"id":"filter-1","field":"emailBounced","operator":"is","value":"campaign:cmp_abc"},{"id":"filter-2","field":"emailBounced","operator":"is_not","value":"campaign:cmp_xyz"}]. Combine them with `filterJoinOperator: "or"` to match any filter.',
        },
        root: {
          ...segmentFilterGroupSchema,
          description:
            "Nested filter root. Mutually exclusive with `filters` and `filterJoinOperator`.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_segment",
    description:
      "Update a segment's name and/or filter rules. Use the same `filters` plus `filterJoinOperator` or nested `root` shapes as create_segment; providing `filters` or `root` replaces the segment's existing rules.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        segmentId: {
          type: "string",
          description: "Segment ID to update.",
        },
        name: {
          type: "string",
          description: "New segment name.",
        },
        filterJoinOperator: {
          type: "string",
          enum: ["and", "or"],
          description:
            'How top-level filters combine. Use `"and"` to require every filter or `"or"` to match any filter.',
        },
        filters: {
          type: "array",
          items: segmentFilterItemSchema,
          minItems: 1,
          description:
            "Replacement segment filters. Same shape and validation rules as create_segment. Mutually exclusive with `root`.",
        },
        root: {
          ...segmentFilterGroupSchema,
          description:
            "Replacement nested filter root. Mutually exclusive with `filters` and `filterJoinOperator`.",
        },
      },
      required: ["segmentId"],
    },
  },
  {
    name: "delete_segment",
    description:
      "Permanently delete a segment. This cannot be undone. Subscribers are not affected.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        segmentId: {
          type: "string",
          description: "Segment ID to delete.",
        },
      },
      required: ["segmentId"],
    },
  },
  {
    name: "get_segment_count",
    description: "Get the number of subscribers in a segment",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        segmentId: {
          type: "string",
          description: "Segment ID",
        },
      },
      required: ["segmentId"],
    },
  },
];
