import type { Tool } from "../../mcp-types.js";

const COMPANY_ID = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const GEOFENCE_FIELDS = {
  name: { type: "string", description: "Geofence name, up to 120 characters." },
  latitude: { type: "number", description: "Center latitude, -90 to 90." },
  longitude: { type: "number", description: "Center longitude, -180 to 180." },
  radiusMeters: {
    type: "integer",
    description:
      "Radius in meters, 100 to 10,000. Phones trigger small regions late; 200 or more is recommended.",
  },
  dwellSeconds: {
    type: ["integer", "null"],
    description:
      "Record app.geofence_dwelled after the contact stays this many seconds (60 to 14,400). null turns dwell off.",
  },
  cooldownSeconds: {
    type: "integer",
    description:
      "Ignore a repeat of the same transition by the same contact for this long, 300 to 604,800 seconds. Default 3,600.",
  },
  group: {
    type: ["string", "null"],
    description:
      "Optional group label (letters, numbers, spaces, . _ -), e.g. stores. Triggers and segments can target a whole group. null removes it.",
  },
  externalId: {
    type: ["string", "null"],
    description:
      "Your own ID for the place, unique per workspace; import_geofences matches rows by it. null removes it.",
  },
  active: {
    type: "boolean",
    description: "Paused geofences are not sent to apps and record nothing.",
  },
} as const;

const GEOFENCE_ID = {
  type: "string",
  description: "Geofence ID from list_geofences.",
} as const;

export const geofenceToolDefinitions: Tool[] = [
  // ============================================================================
  // Geofences
  // ============================================================================
  {
    name: "list_geofences",
    description:
      "List geofences: circular places (stores, venues) the Sequenzy mobile SDKs watch. Signed-in app users entering, leaving or staying in one record app.geofence_entered, app.geofence_exited and app.geofence_dwelled events with geofenceId, geofenceName, geofenceGroup and geofenceExternalId properties, usable as sequence triggers (event trigger with propertyFilters) and in segments (field geofence). Paged by cursor.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: COMPANY_ID,
        group: { type: "string", description: "Only geofences in this group." },
        active: {
          type: "boolean",
          description: "true for active only, false for paused only.",
        },
        limit: {
          type: "integer",
          description: "Page size, 1 to 500. Default 100.",
        },
        cursor: {
          type: "string",
          description: "nextCursor from the previous page.",
        },
      },
    },
  },
  {
    name: "get_geofence",
    description: "Get one geofence by ID.",
    inputSchema: {
      type: "object",
      properties: { companyId: COMPANY_ID, geofenceId: GEOFENCE_ID },
      required: ["geofenceId"],
    },
  },
  {
    name: "create_geofence",
    description:
      "Create a geofence. Apps pick it up on their next refresh. A workspace holds at most 10,000.",
    inputSchema: {
      type: "object",
      properties: { companyId: COMPANY_ID, ...GEOFENCE_FIELDS },
      required: ["name", "latitude", "longitude", "radiusMeters"],
    },
  },
  {
    name: "update_geofence",
    description:
      "Update a geofence. Only the fields provided change; null clears dwellSeconds, group or externalId. Set active to pause or resume it.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: COMPANY_ID,
        geofenceId: GEOFENCE_ID,
        ...GEOFENCE_FIELDS,
      },
      required: ["geofenceId"],
    },
  },
  {
    name: "delete_geofence",
    description:
      "Delete a geofence. Apps stop watching it after their next refresh; past visits stay in contact history. Use update_geofence with active false to pause instead.",
    inputSchema: {
      type: "object",
      properties: { companyId: COMPANY_ID, geofenceId: GEOFENCE_ID },
      required: ["geofenceId"],
    },
  },
  {
    name: "import_geofences",
    description:
      "Create or update up to 1,000 geofences in one call, matched by externalId, which every row needs; importing the same rows again updates instead of duplicating. Invalid rows are skipped and listed in errors with their index.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: COMPANY_ID,
        geofences: {
          type: "array",
          description:
            "Rows with the create_geofence fields. On update, fields a row omits keep their stored value.",
          items: { type: "object", properties: GEOFENCE_FIELDS },
        },
      },
      required: ["geofences"],
    },
  },
];
