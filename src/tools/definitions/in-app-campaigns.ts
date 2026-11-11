import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const campaignIdProperty = {
  campaignId: { type: "string", description: "In-app campaign ID." },
} as const;

const message = {
  type: "object",
  description:
    'The in-app message, same fields as an in-app sequence step: kind ("message" default, or "card"), format ("modal" default, "banner", "fullscreen", "html"), position (banners "top"/"bottom", modals "bottom"/"center"), eyebrow, title, body, imageUrl, imagePlacement ("top"/"background"), buttons (up to 2: {label, action: "open_url"|"dismiss"|"request_push_permission", url}), data (string map for the app), style ({preset} plus overrides), pinned (cards), expiresAfterDays (how long a contact keeps it after first receiving it; default: until the campaign ends), html and showCloseButton (format "html"). Merge tags like {{firstName}} are filled per contact when they receive it. On update, the fields you pass are merged over the stored message; clear imageUrl, position, imagePlacement, expiresAfterDays, style, html or showCloseButton with null, eyebrow with "", buttons with [] and data with {}.',
} as const;

const contentProperties = {
  message,
  priority: {
    type: "string",
    enum: ["low", "medium", "high"],
    description:
      "Order among messages waiting in the app at the same time; higher first. Default medium (same as sequence messages).",
  },
  endsAt: {
    type: ["string", "null"],
    description:
      "ISO 8601 time the campaign ends: after it nobody new gets it and it leaves every feed that still has it. Null: runs until stopped.",
  },
} as const;

const targetLists = {
  type: "object",
  description:
    'Audience, same shape as campaign targetLists: {"type":"all"}, {"type":"lists","listIds":[...]}, {"type":"segment","segmentId":"..."}, or {"type":"rules","include":[...],"exclude":[...]}. Each contact is checked against it when their app fetches its feed while the campaign is live, so people who join the audience later get it too.',
} as const;

export const inAppCampaignToolDefinitions: Tool[] = [
  {
    name: "list_in_app_campaigns",
    description:
      "List in-app campaigns, newest first. Each has a stored status and a state: draft, scheduled, live, ended (past endsAt) or stopped.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        status: {
          type: "string",
          enum: ["draft", "scheduled", "sent", "cancelled"],
          description:
            "Stored status: sent covers live and ended campaigns, cancelled covers stopped ones.",
        },
        limit: { type: "number", description: "Page size, 1-100." },
        offset: { type: "number", description: "Number of campaigns to skip." },
      },
    },
  },
  {
    name: "get_in_app_campaign",
    description:
      "Get an in-app campaign's message, audience, priority, schedule, end time and state, plus reach and engagement stats once it has launched.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
  {
    name: "create_in_app_campaign",
    description:
      "Create an in-app campaign draft: one in-app message or content card for an audience, shown inside the customer's app. Set the message and audience now or later with update_in_app_campaign; launch with send_in_app_campaign.",
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
    name: "update_in_app_campaign",
    description:
      "Update a draft or scheduled in-app campaign. Only the fields you pass change; message fields merge over the stored message. Live campaigns can't be edited: stop and duplicate them instead.",
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
    name: "estimate_in_app_campaign_recipients",
    description:
      "Count contacts who match an audience now (audienceCount) and how many are known to have your app connected (appUserCount, a lower bound). Everyone in the audience gets the campaign the next time their app fetches the feed, including contacts who join while it is live. If appUserCount is 0, say Sequenzy hasn't seen their app connect yet; if in-app isn't set up, point to Settings > In-app.",
    inputSchema: {
      type: "object",
      properties: { companyId, targetLists },
      required: ["targetLists"],
    },
  },
  {
    name: "send_in_app_campaign",
    description:
      "Launch an in-app campaign now, or schedule it with scheduledAt (future ISO 8601). While live, every contact in the audience sees the message the next time their app fetches its feed. Confirm with the user before calling.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        ...campaignIdProperty,
        scheduledAt: {
          type: "string",
          description: "Future ISO 8601 time to go live. Omit to launch now.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "unschedule_in_app_campaign",
    description: "Move a scheduled in-app campaign back to draft.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
  {
    name: "stop_in_app_campaign",
    description:
      "Stop a scheduled or live in-app campaign. Nobody new gets it and it leaves every feed that still has it, including seen cards; stats are kept. Stopping is final (duplicate to run it again); stopping again succeeds.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
  {
    name: "duplicate_in_app_campaign",
    description:
      "Copy an in-app campaign (message, priority, audience and a future end time) into a new draft.",
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
    name: "get_in_app_campaign_stats",
    description:
      "Get in-app campaign results: delivered (contacts whose app received it), displayed, clicked, totalClicks, dismissed, push permission results for primer buttons, and first clicks per custom HTML button, plus the audience size at launch.",
    inputSchema: {
      type: "object",
      properties: { companyId, ...campaignIdProperty },
      required: ["campaignId"],
    },
  },
];
