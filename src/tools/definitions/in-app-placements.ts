import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const key = {
  type: "string",
  description:
    "Placement key, the id app code passes to the SDK (from list_in_app_placements).",
} as const;

const width = {
  type: ["number", "null"] as ["number", "null"],
  description:
    "Width hint in points (1-4000) for whoever writes the content; null clears it.",
} as const;

const height = {
  type: ["number", "null"] as ["number", "null"],
  description:
    "Height hint in points (1-4000) for whoever writes the content; null clears it.",
} as const;

export const inAppPlacementToolDefinitions: Tool[] = [
  {
    name: "list_in_app_placements",
    description:
      'List the workspace\'s in-app placements: named slots in the customer\'s app or website that show in-app content inline (key, name, description, size hints) with all-time counts (created, live, displayed, clicked, dismissed). Fill one from a sequence step with type "in_app", kind "placement" and placement set to its key.',
    inputSchema: {
      type: "object",
      properties: { companyId },
    },
  },
  {
    name: "get_in_app_placement",
    description:
      "Get one in-app placement by key, with its all-time counts: items created, live (open now), and contacts who displayed, clicked or dismissed their item.",
    inputSchema: {
      type: "object",
      properties: { companyId, key },
      required: ["key"],
    },
  },
  {
    name: "create_in_app_placement",
    description:
      "Create an in-app placement: a slot in the customer's app that shows in-app content inline, such as a home screen hero. The key is what app code passes to the SDK and never changes. Up to 50 per workspace.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        key: {
          type: "string",
          description:
            "1-64 lowercase letters, numbers, dots, dashes or underscores, starting with a letter or number, e.g. home_hero.",
        },
        name: {
          type: "string",
          description: "Name shown in the dashboard, up to 100 characters.",
        },
        description: {
          type: "string",
          description: "Where the slot sits in the app, up to 500 characters.",
        },
        width,
        height,
      },
      required: ["key", "name"],
    },
  },
  {
    name: "update_in_app_placement",
    description:
      "Rename an in-app placement or change its description or size hints. The key cannot change. Provide at least one field.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        key,
        name: { type: "string", description: "New name." },
        description: { type: "string", description: "New description." },
        width,
        height,
      },
      required: ["key"],
    },
  },
  {
    name: "delete_in_app_placement",
    description:
      "Delete an in-app placement. Its slots collapse in the app on the next refresh, and in-app steps that target it skip contacts until a placement with the same key exists again. Items already created stay in contact history.",
    inputSchema: {
      type: "object",
      properties: { companyId, key },
      required: ["key"],
    },
  },
  {
    name: "get_in_app_placement_content",
    description:
      "What each placement shows one contact now: for each key, the contact's highest-priority open placement item (ties: newest), or null when the slot collapses. Identify the contact by email, externalId or subscriberId. Reading marks nothing displayed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        email: { type: "string", description: "Contact email." },
        externalId: {
          type: "string",
          description: "Contact external ID from your app.",
        },
        subscriberId: { type: "string", description: "Subscriber ID." },
        placements: {
          type: "array",
          items: { type: "string" },
          maxItems: 10,
          description: "Placement keys, up to 10.",
        },
        actions: {
          type: "string",
          description:
            'Comma-separated button actions the app handles beyond open_url and dismiss, e.g. "request_push_permission". Items with other actions are skipped.',
        },
      },
      required: ["placements"],
    },
  },
];
