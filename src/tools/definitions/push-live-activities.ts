import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const activityId = {
  type: "string",
  description:
    'Your id for this activity, e.g. "order-1234" (1-128 letters, digits, ".", ":", "-", "_"). Start sets it; update and end target it.',
} as const;

const contentState = {
  type: "object",
  description:
    "Your Swift ContentState as a JSON object. Date fields decode as seconds since 2001-01-01 unless your struct decodes them differently.",
  additionalProperties: true,
} as const;

const alert = {
  type: "object",
  description:
    'Alert shown with the push: title and/or body, plus an optional sound name such as "default".',
  properties: {
    title: { type: "string", description: "Max 120 characters." },
    body: { type: "string", description: "Max 500 characters." },
    sound: { type: "string", description: 'Sound name, e.g. "default".' },
  },
} as const;

const deliveryOptions = {
  staleDate: {
    type: "string",
    description:
      "When iOS shows the activity as out of date: Unix seconds or an ISO 8601 date.",
  },
  relevanceScore: {
    type: "number",
    description:
      "Orders a person's concurrent activities; higher shows first (0-1000000).",
  },
} as const;

const priority = {
  type: "string",
  enum: ["high", "low"],
  description:
    "high (default) delivers now and counts against Apple's update budget; low does not count against it. Pushes with an alert always go at high priority.",
} as const;

const contact = {
  email: {
    type: "string",
    description:
      "Contact whose activity it is. Provide email or subscriberId: activities are always addressed per contact.",
  },
  subscriberId: {
    type: "string",
    description: "Subscriber whose activity it is.",
  },
} as const;

export const pushLiveActivityToolDefinitions: Tool[] = [
  {
    name: "list_live_activities",
    description:
      "List iOS Live Activity tokens (push-to-start tokens per device and activity type, update tokens per running activity) with a per-type summary of devices that can start activities and running activities. Tokens are masked.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        email: { type: "string", description: "Only this contact's tokens." },
        subscriberId: {
          type: "string",
          description: "Only this subscriber's tokens.",
        },
        activityType: {
          type: "string",
          description: "Swift ActivityAttributes type name.",
        },
        activityId: {
          type: "string",
          description: "One activity's update tokens.",
        },
        kind: { type: "string", enum: ["push_to_start", "update"] },
        status: { type: "string", enum: ["active", "ended", "invalid"] },
        limit: { type: "number", description: "Page size, 1-100." },
        cursor: {
          type: "string",
          description: "nextCursor from the previous page.",
        },
      },
    },
  },
  {
    name: "start_live_activity",
    description:
      "Start an iOS Live Activity remotely on one contact's devices that registered a push-to-start token for activityType (iOS 17.2+, apps using the Sequenzy SDK's Live Activity setup). Requires an alert. Returns tokenCount 0 without sending when no device can start it. Repeating the call starts another copy.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        email: {
          type: "string",
          description:
            "Contact whose devices start it. Provide email or subscriberId.",
        },
        subscriberId: {
          type: "string",
          description: "Subscriber whose devices start it.",
        },
        activityType: {
          type: "string",
          description:
            "Swift ActivityAttributes type name exactly, e.g. DeliveryAttributes.",
        },
        activityId,
        attributes: {
          type: "object",
          description:
            "Static attributes as a JSON object with every field of the app's attributes struct; iOS silently drops a start whose attributes do not decode. Sequenzy adds sequenzy.activityId.",
          additionalProperties: true,
        },
        contentState,
        alert,
        ...deliveryOptions,
      },
      required: ["activityType", "activityId", "contentState", "alert"],
    },
  },
  {
    name: "update_live_activity",
    description:
      "Update every running copy of a contact's iOS Live Activity (one per device) with new content state. Requires email or subscriberId. Add an alert to light the screen. Returns tokenCount 0 when no running copy has reported an update token.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        ...contact,
        activityId,
        contentState,
        alert,
        priority,
        ...deliveryOptions,
      },
      required: ["activityId", "contentState"],
    },
  },
  {
    name: "end_live_activity",
    description:
      "End a contact's iOS Live Activity on every device running it, with its final content state and optionally a dismissal date. Requires email or subscriberId. Without dismissalDate iOS keeps it on the Lock Screen for up to four hours.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        ...contact,
        activityId,
        contentState: {
          ...contentState,
          description: `Final content state. ${contentState.description}`,
        },
        alert,
        priority,
        dismissalDate: {
          type: "string",
          description:
            "When to remove it: Unix seconds or ISO 8601; 0 or a past date removes it now.",
        },
        ...deliveryOptions,
      },
      required: ["activityId", "contentState"],
    },
  },
];
