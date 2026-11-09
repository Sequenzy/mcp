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
    "Your Swift ContentState as a JSON object; Android apps receive the same object in their Live Update renderer. Date fields decode as seconds since 2001-01-01 on iOS unless your struct decodes them differently.",
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
      "Contact whose activity it is. Provide email or subscriberId, or set broadcast instead.",
  },
  subscriberId: {
    type: "string",
    description: "Subscriber whose activity it is.",
  },
  broadcast: {
    type: "boolean",
    description:
      "true: send to every signed-in device running this activityId, of any contact, e.g. an activity started for a segment, list or tag. Use instead of email/subscriberId (ignored when either is set), never for a per-person id like an order. Needs the campaigns:send scope.",
  },
} as const;

export const pushLiveActivityToolDefinitions: Tool[] = [
  {
    name: "list_live_activities",
    description:
      "List iOS Live Activity and Android Live Update tokens (push-to-start tokens per device and activity type, update tokens per running activity) with a per-type summary of devices that can start activities and running activities. Each token has platform ios or android. Tokens are masked.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        email: { type: "string", description: "Only this contact's tokens." },
        subscriberId: {
          type: "string",
          description: "Only this subscriber's tokens.",
        },
        platform: {
          type: "string",
          enum: ["ios", "android"],
          description:
            "Only iOS Live Activity tokens or Android Live Update tokens; the summary counts the same platform.",
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
      "Start a Live Activity remotely on the devices that registered a push-to-start token for activityType: iOS 17.2+ through APNs, and Android Live Updates through FCM on apps that observe the same type name with the Sequenzy Android SDK (promoted on Android 16, an ongoing notification before). Target one contact (email or subscriberId), or every contact in a segment, list or tag (exactly one of segmentId, listId, tag; up to 100,000 devices, needs campaigns:send), then update and end it with broadcast: true. Requires an alert. Returns tokenCount 0 without sending when no device can start it; contactCount and platforms count contacts and devices per platform. Repeating the call starts another copy.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        email: {
          type: "string",
          description:
            "Contact whose devices start it. Provide email or subscriberId, or one of segmentId, listId, tag.",
        },
        subscriberId: {
          type: "string",
          description: "Subscriber whose devices start it.",
        },
        segmentId: {
          type: "string",
          description:
            "Start it for every contact in this segment instead of one contact (ignored when email or subscriberId is set).",
        },
        listId: {
          type: "string",
          description:
            "Start it for every contact in this list (ignored when email or subscriberId is set).",
        },
        tag: {
          type: "string",
          description:
            "Start it for every contact with this tag: one tag name, no commas (ignored when email or subscriberId is set).",
        },
        activityType: {
          type: "string",
          description:
            "Swift ActivityAttributes type name exactly, e.g. DeliveryAttributes. Android apps observe the same name.",
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
      "Update every running copy of a contact's Live Activity (one per device, iOS and Android Live Updates) with new content state. Requires email or subscriberId, or broadcast: true to update every signed-in device running the activityId (for activities started for a segment, list or tag). Add an alert to light the screen. Returns tokenCount 0 when no running copy has reported an update token.",
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
      "End a contact's Live Activity on every device running it (iOS and Android Live Updates), with its final content state and optionally a dismissal date. Requires email or subscriberId, or broadcast: true to end it on every signed-in device running the activityId. Without dismissalDate iOS keeps it on the Lock Screen and Android in the shade for up to four hours.",
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
