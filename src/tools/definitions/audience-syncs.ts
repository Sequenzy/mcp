import type { Tool } from "../../mcp-types.js";

export const audienceSyncToolDefinitions: Tool[] = [
  // ============================================================================
  // Audience Syncs (segment -> Meta custom audience)
  // ============================================================================
  {
    name: "list_audience_syncs",
    description:
      "List Meta custom audience syncs (segment -> ad audience mappings) with their schedule and last sync status. Requires the Meta Ads integration to be connected in the dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "list_ad_accounts",
    description:
      "List the Meta ad accounts available through the connected Meta Ads integration. Use the returned account id as `adAccountId` when creating an audience sync.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_audience_sync",
    description:
      'Push a segment to a Meta custom audience and keep it synced on a schedule. Provide `segmentId` for an existing segment OR `predefinedSegmentId` for a ready-made template (for example "zero-ltv", "no-purchase-1y", "recent-buyers", "high-spenders-ecom", "non-buyers", "engaged") - the template segment is created automatically on first use. The first upload runs immediately. Note: audiences are add-only; subscribers who later leave the segment stay in the Meta audience.',
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
          description:
            "Existing segment ID to sync. Mutually exclusive with `predefinedSegmentId`.",
        },
        predefinedSegmentId: {
          type: "string",
          description:
            'Predefined segment template ID (for example "zero-ltv", "no-purchase-1y", "recent-buyers"). The segment is created automatically if it does not exist. Mutually exclusive with `segmentId`.',
        },
        adAccountId: {
          type: "string",
          description: "Meta ad account ID (act_...) from `list_ad_accounts`.",
        },
        audienceName: {
          type: "string",
          description: "Name for the custom audience in Meta Ads Manager.",
        },
        frequency: {
          type: "string",
          enum: ["hourly", "daily", "weekly"],
          description: "How often to re-upload the segment. Default: daily.",
        },
      },
      required: ["adAccountId", "audienceName"],
    },
  },
  {
    name: "update_audience_sync",
    description:
      "Update an audience sync's frequency or pause/resume it (`isActive`).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        syncId: {
          type: "string",
          description: "Audience sync ID",
        },
        frequency: {
          type: "string",
          enum: ["hourly", "daily", "weekly"],
          description: "New sync frequency.",
        },
        isActive: {
          type: "boolean",
          description: "Set false to pause the sync, true to resume it.",
        },
      },
      required: ["syncId"],
    },
  },
  {
    name: "delete_audience_sync",
    description:
      "Remove an audience sync mapping. The Meta audience itself is kept (running ads are not disrupted) - only future syncs stop.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        syncId: {
          type: "string",
          description: "Audience sync ID to remove.",
        },
      },
      required: ["syncId"],
    },
  },
  {
    name: "sync_audience_now",
    description:
      "Trigger an immediate upload of the segment's subscribers to its Meta custom audience, outside the regular schedule.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        syncId: {
          type: "string",
          description: "Audience sync ID to run.",
        },
      },
      required: ["syncId"],
    },
  },
];
