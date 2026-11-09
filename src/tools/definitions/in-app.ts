import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const messageId = {
  type: "string",
  description: "In-app message or card ID (from list_in_app_messages).",
} as const;

export const inAppToolDefinitions: Tool[] = [
  {
    name: "list_in_app_messages",
    description:
      'List a contact\'s in-app messages and content cards (created by type "in_app" sequence steps). status "open" (default) is what their app should show now; "all" is history. Identify the contact by email, externalId or subscriberId.',
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
        kind: {
          type: "string",
          enum: ["message", "card", "placement"],
          description:
            'Only messages, cards or placement items. Placement items are listed only with status "all"; for what a placement shows now use get_in_app_placement_content.',
        },
        status: {
          type: "string",
          enum: ["open", "all"],
          description: "open (default) or all (history).",
        },
        formats: {
          type: "array",
          items: {
            type: "string",
            enum: ["modal", "banner", "fullscreen", "html"],
          },
          description:
            'Message formats the caller renders. Open feeds leave other formats out; default modal, banner and fullscreen, so custom HTML messages appear only when "html" is listed. History lists every format and includes the HTML document when "html" is listed.',
        },
        limit: { type: "number", description: "1-100 (default 50)." },
        actions: {
          type: "string",
          description:
            'Open items only: comma-separated button actions the app handles beyond open_url and dismiss, e.g. "request_push_permission". Items with other actions (push primers) are left out unless listed, and stay for an app that handles them.',
        },
      },
    },
  },
  {
    name: "record_in_app_event",
    description:
      "Record that the app displayed, clicked, dismissed or read an in-app item. Repeats change nothing except clickCount. Clicks, dismissals and reads also count as a display. Messages leave the open feed once displayed, clicked or dismissed; cards once dismissed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        messageId,
        type: {
          type: "string",
          enum: ["displayed", "clicked", "dismissed", "read"],
          description: "Event to record.",
        },
        pushPermission: {
          type: "string",
          enum: [
            "granted",
            "provisional",
            "ephemeral",
            "denied",
            "not_determined",
          ],
          description:
            'With type "clicked" on a push primer (a request_push_permission button): the notification permission the app read after asking. Kept once per item and written to the contact\'s pushPermission attribute.',
        },
        buttonId: {
          type: "string",
          description:
            "Clicks in custom HTML messages: which control was clicked (1-255 letters, numbers, spaces, dashes or underscores).",
        },
      },
      required: ["messageId", "type"],
    },
  },
  {
    name: "delete_in_app_message",
    description:
      "Delete an in-app message or card so the app stops showing it.",
    inputSchema: {
      type: "object",
      properties: { companyId, messageId },
      required: ["messageId"],
    },
  },
  {
    name: "get_in_app_step_stats",
    description:
      "Created, displayed, clicked and dismissed counts for one in-app sequence step, plus how many contacts allowed (pushPermissionGranted) or declined (pushPermissionDenied) notifications from a push primer.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        stepId: {
          type: "string",
          description: "In-app sequence step (node) ID.",
        },
      },
      required: ["stepId"],
    },
  },
  {
    name: "list_in_app_templates",
    description:
      'Starting points for in-app sequence steps (trial ending, welcome, new feature, milestone, a push primer that asks for notification permission, and more). Each has a complete step config: pass it as a type "in_app" step to create_sequence or insert_sequence_step after adding the urls its link buttons open.',
    inputSchema: {
      type: "object",
      properties: { companyId },
    },
  },
  {
    name: "validate_in_app_html",
    description:
      'Check a custom HTML in-app message document before using it as a format "html" in-app step. Returns its size against the 100 KB limit, Braze Liquid conversions (e.g. {{${email_address}}} becomes {{email}}, {{${braze_id}}} becomes {{contactId}}), script hosts a website CSP must allow, whether it closes itself, warnings and blocking errors. Nothing is saved.',
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        html: {
          type: "string",
          description:
            "The document: HTML/CSS/JS, e.g. a Survicate or Braze custom HTML in-app message.",
        },
      },
      required: ["html"],
    },
  },
  {
    name: "write_in_app_copy",
    description:
      "Write in-app message copy with AI from a short brief: eyebrow, title, message and button labels sized for the layout. Returns text only; nothing is saved. Button links are never invented, so add urls before using the copy in a step.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        brief: {
          type: "string",
          description:
            "What the message should say, 3-1000 characters, e.g. 'trial ends in 3 days, nudge them to upgrade'.",
        },
        kind: {
          type: "string",
          enum: ["message", "card", "placement"],
          description: "message (default), card or placement.",
        },
        format: {
          type: "string",
          enum: ["modal", "banner", "fullscreen"],
          description: "Message layout (default modal); sets length targets.",
        },
        hasImage: {
          type: "boolean",
          description: "True when the step shows an image.",
        },
      },
      required: ["brief"],
    },
  },
];
