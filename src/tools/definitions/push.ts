import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const platform = {
  type: "string",
  enum: ["web", "ios", "android"],
} as const;

const contentProperties = {
  title: {
    type: "string",
    description:
      "Notification title (max 120 characters; most devices show about 40). Merge tags like {{FIRST_NAME|there}} work.",
  },
  body: {
    type: "string",
    description:
      "Notification message (max 500 characters; most devices show about 120). Merge tags work.",
  },
  url: {
    type: ["string", "null"],
    description:
      "Link opened on tap: https URL or app deep link (myapp://...). Browsers only open https links. Null clears it.",
  },
  imageUrl: {
    type: ["string", "null"],
    description: "Optional https image shown in the notification.",
  },
  iconUrl: {
    type: ["string", "null"],
    description:
      "Optional https icon for web push; defaults to the workspace icon.",
  },
  platforms: {
    type: "array",
    items: platform,
    description:
      "Limit delivery to these platforms. Omit (or pass []) to reach every platform the contact has a device on.",
  },
} as const;

const targetLists = {
  type: "object",
  description:
    'Audience, same shape as campaign targetLists: {"type":"all"}, {"type":"lists","listIds":[...]}, {"type":"segment","segmentId":"..."}, or {"type":"rules","include":[...]}. Only contacts with an active push device receive the campaign.',
} as const;

const campaignIdProperty = {
  campaignId: { type: "string", description: "Push campaign ID." },
} as const;

export const pushToolDefinitions: Tool[] = [
  {
    name: "get_push_settings",
    description:
      "Get push notification readiness: whether web push is enabled (with its VAPID public key), whether APNs (iOS) and Firebase (Android) credentials are connected, the last credential error for each, and active device counts per platform. Check this before creating push campaigns or push sequence steps.",
    inputSchema: { type: "object", properties: { companyId } },
  },
  {
    name: "update_web_push_settings",
    description:
      "Enable or disable web push, or set the default notification icon. The first enable generates the workspace's VAPID keys; disabling keeps them so existing browser subscriptions stay valid. The site must serve /sequenzy-sw.js (importScripts of the hosted worker) and call sequenzy.subscribeToPush() from a click.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        enabled: { type: "boolean", description: "Turn web push on or off." },
        defaultIconUrl: {
          type: ["string", "null"],
          description: "Default https icon URL; null clears it.",
        },
      },
    },
  },
  {
    name: "set_apns_credentials",
    description:
      "Connect iOS push by saving an APNs auth key (.p8). The key is encrypted at rest and never returned. Requires the integrations:manage scope and a role that can edit workspace settings (marketer keys cannot).",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        keyId: { type: "string", description: "10-character APNs key ID." },
        teamId: { type: "string", description: "10-character Apple team ID." },
        bundleId: {
          type: "string",
          description: "App bundle ID, e.g. com.example.app.",
        },
        privateKey: {
          type: "string",
          description: "Full contents of the AuthKey_XXXXXXXXXX.p8 file.",
        },
        environment: {
          type: "string",
          enum: ["production", "sandbox"],
          description:
            "production (App Store/TestFlight, default) or sandbox (Xcode development builds).",
        },
      },
      required: ["keyId", "teamId", "bundleId", "privateKey"],
    },
  },
  {
    name: "remove_apns_credentials",
    description:
      "Remove APNs credentials. iOS devices stop receiving push until a key is saved again; registered devices are kept.",
    inputSchema: { type: "object", properties: { companyId } },
  },
  {
    name: "set_fcm_credentials",
    description:
      "Connect Android push by saving a Firebase service account key (the JSON file from Firebase project settings > Service accounts). Encrypted at rest and never returned.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        serviceAccount: {
          type: "string",
          description: "The service account JSON file contents, as a string.",
        },
      },
      required: ["serviceAccount"],
    },
  },
  {
    name: "remove_fcm_credentials",
    description:
      "Remove Firebase credentials. Android devices stop receiving push until a key is uploaded again; registered devices are kept.",
    inputSchema: { type: "object", properties: { companyId } },
  },
  {
    name: "list_push_devices",
    description:
      "List registered push devices (browsers and app installs) in a stable order; pass nextCursor to page. Filter by contact (email or subscriberId), platform or status. Tokens are never returned in full.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        email: { type: "string", description: "Only this contact's devices." },
        subscriberId: {
          type: "string",
          description: "Only this subscriber's devices.",
        },
        platform: { ...platform, description: "Only this platform." },
        status: {
          type: "string",
          enum: ["active", "invalid", "unsubscribed"],
          description: "Only devices in this status.",
        },
        limit: {
          type: "number",
          description: "Page size, 1-100 (default 50).",
        },
        cursor: {
          type: "string",
          description: "nextCursor from the previous page.",
        },
      },
    },
  },
  {
    name: "register_push_device",
    description:
      "Register (or refresh) a push device for a contact, the way an app backend would after the app receives its token. Re-registering a token reactivates it and moves it to the given contact. Unknown emails become contacts quietly (no lists, no contact_added sequences).",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        platform: {
          ...platform,
          description: "ios (APNs token), android (FCM token) or web.",
        },
        token: {
          type: "string",
          description:
            "APNs device token (hex), FCM registration token, or web subscription endpoint URL.",
        },
        keys: {
          type: "object",
          description:
            "Web only: PushSubscription.toJSON().keys with p256dh and auth.",
          properties: {
            p256dh: { type: "string" },
            auth: { type: "string" },
          },
        },
        email: { type: "string", description: "Contact email to link." },
        subscriberId: {
          type: "string",
          description: "Existing subscriber ID to link (instead of email).",
        },
        deviceName: { type: "string", description: "Label for the device." },
        appVersion: { type: "string" },
        osVersion: { type: "string" },
        locale: { type: "string" },
        timezone: { type: "string", description: "IANA timezone." },
        permissionStatus: {
          type: "string",
          enum: [
            "granted",
            "provisional",
            "ephemeral",
            "denied",
            "not_determined",
          ],
          description:
            "iOS/Android only: the notification permission the app read. Feeds the push opt-in rate and the contact's pushPermission attribute. Omit to keep the stored one.",
        },
      },
      required: ["platform", "token"],
    },
  },
  {
    name: "remove_push_device",
    description:
      "Unsubscribe a push device and unlink it from its contact so it stops receiving push. A browser or app that still allows notifications can register again (browsers come back unlinked).",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        deviceId: { type: "string", description: "Push device ID." },
      },
      required: ["deviceId"],
    },
  },
  {
    name: "send_test_push",
    description:
      "Send a real test push to one device (deviceId) or to every active device of a contact (email or subscriberId). Provide title and/or body. Limited to 200 per company per rolling 24 hours; excluded from stats.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        deviceId: { type: "string", description: "One device to notify." },
        email: {
          type: "string",
          description: "Contact whose devices to notify.",
        },
        subscriberId: {
          type: "string",
          description: "Subscriber whose devices to notify.",
        },
        ...contentProperties,
      },
    },
  },
  {
    name: "list_push_campaigns",
    description: "List push campaigns, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        status: {
          type: "string",
          enum: ["draft", "scheduled", "sending", "sent", "cancelled"],
        },
        limit: { type: "number", description: "Page size, 1-100." },
        offset: { type: "number", description: "Number of campaigns to skip." },
      },
    },
  },
  {
    name: "get_push_campaign",
    description:
      "Get a push campaign's content, audience, status and (after sending) delivery stats.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
  {
    name: "create_push_campaign",
    description:
      "Create a push campaign draft. Content and audience can be set now or later with update_push_campaign; send with send_push_campaign.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        name: { type: "string", description: "Campaign name." },
        ...contentProperties,
        targetLists,
      },
    },
  },
  {
    name: "update_push_campaign",
    description:
      "Update a draft or scheduled push campaign. Only the fields you pass change. A scheduled campaign keeps its schedule.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        ...campaignIdProperty,
        name: { type: "string" },
        ...contentProperties,
        targetLists,
      },
      required: ["campaignId"],
    },
  },
  {
    name: "estimate_push_campaign_recipients",
    description:
      "Count how many contacts in an audience have an active push device (eligibleCount) versus the whole audience (audienceCount).",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        targetLists,
        platforms: contentProperties.platforms,
      },
      required: ["targetLists"],
    },
  },
  {
    name: "send_push_campaign",
    description:
      "Send a push campaign now, or schedule it with scheduledAt (future ISO 8601). Delivers real notifications to every contact in the audience with an active device on a set-up platform. Confirm with the user before calling.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        ...campaignIdProperty,
        scheduledAt: {
          type: "string",
          description: "Future ISO 8601 time. Omit to send immediately.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "unschedule_push_campaign",
    description: "Move a scheduled push campaign back to draft.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
  {
    name: "cancel_push_campaign",
    description:
      "Stop a scheduled or sending push campaign. Unsent notifications are skipped; delivered ones cannot be recalled.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
  {
    name: "duplicate_push_campaign",
    description:
      "Copy a push campaign (content and audience) into a new draft.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        ...campaignIdProperty,
        name: { type: "string", description: "Name for the copy." },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_push_campaign_stats",
    description:
      "Get push campaign delivery stats: sent, displayed (device-reported), clicked, failed and skipped contacts, devices targeted/accepted, and skip/failure reasons.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
];
