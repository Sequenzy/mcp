import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const importId = {
  type: "string",
  description:
    "Push import ID, as returned when the import was created or by list_push_imports.",
} as const;

const source = {
  type: "string",
  enum: ["onesignal", "braze", "customer_io", "csv"],
  description: "Where the devices come from.",
} as const;

const platforms = {
  type: "array",
  items: { type: "string", enum: ["ios", "android"] },
  description:
    "Platforms to import (default both). Web push cannot be imported: browsers tie those subscriptions to the previous provider's VAPID keys.",
} as const;

/**
 * Push subscription imports: move iOS (APNs) and Android (FCM) device tokens
 * from OneSignal, Braze, Customer.io or a CSV. Thin pass-throughs to
 * /api/v1/push/imports.
 */
export const pushImportToolDefinitions: Tool[] = [
  {
    name: "get_push_import_preflight",
    description:
      "Check push settings before importing devices: warns when APNs or Firebase is not set up, or APNs is on sandbox. Imported tokens only work with the same bundle ID, Apple team and Firebase project the app used with the previous provider. Show these warnings to the user before starting an import.",
    inputSchema: {
      type: "object",
      properties: { companyId, source, platforms },
      required: ["source"],
    },
  },
  {
    name: "list_push_imports",
    description:
      "List recent push imports with status, progress and counts (imported, matched, unsubscribed, skipped, invalid, contacts created).",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        limit: { type: "number", description: "How many, 1-50 (default 20)." },
      },
    },
  },
  {
    name: "get_push_import",
    description:
      "Get one push import: status (draft, queued, exporting, importing, completed, failed, canceled), progress, counts, skip/invalid reasons, warnings and whether it can be resumed. Poll this while it runs.",
    inputSchema: {
      type: "object",
      properties: { companyId, importId },
      required: ["importId"],
    },
  },
  {
    name: "create_push_import",
    description:
      "Create a draft push import and return its warnings; nothing is read until start_push_import. Requirements by source: onesignal needs apiKey (App API key) and onesignalAppId; braze needs apiKey (REST key with users.export.segment), brazeRestEndpoint and brazeSegmentId; customer_io needs apiKey (App API key), customerIoSegmentId and optionally customerIoRegion; csv takes the file as csv (token and platform columns, plus external_id or email; at most 5 MB, send more with add_push_import_rows and set csvParts to the total part count so a partial upload can never start). Opted-in devices are linked to contacts by external ID or email (unmatched devices get a new contact, quietly: no lists, no sequences; push-only with no email or phone when the device has only an external ID); opted-out devices are kept as unsubscribed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        source,
        apiKey: {
          type: "string",
          description:
            "Source API key (not for csv). Stored encrypted and never returned; deleted once devices are read or the import is canceled (a failed import keeps it for resume).",
        },
        onesignalAppId: {
          type: "string",
          description: "OneSignal App ID (UUID). Required for onesignal.",
        },
        brazeRestEndpoint: {
          type: "string",
          description:
            "Braze REST endpoint such as rest.iad-01.braze.com. Required for braze.",
        },
        brazeSegmentId: {
          type: "string",
          description:
            "API identifier of a Braze segment with the users to import. Required for braze.",
        },
        customerIoRegion: {
          type: "string",
          enum: ["us", "eu"],
          description: "Customer.io account region (default us).",
        },
        customerIoSegmentId: {
          type: "string",
          description:
            "ID of a Customer.io segment with the people to import. Required for customer_io.",
        },
        platforms,
        importAttributes: {
          type: "boolean",
          description:
            "Copy source tags/attributes onto contacts, only for keys a contact lacks (default true).",
        },
        appIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Only import devices of these source apps (Braze app name, Customer.io app_identifier, CSV app_id).",
        },
        csv: {
          type: "string",
          description: "csv source only: the CSV text (or its first part).",
        },
        csvParts: {
          type: "integer",
          minimum: 1,
          maximum: 10000,
          description:
            "csv source only: how many parts you will send, including this first one. When set, start_push_import is refused until every part has been added, so an interrupted upload is never imported partially. Recommended whenever you send more than one part.",
        },
      },
      required: ["source"],
    },
  },
  {
    name: "add_push_import_rows",
    description:
      "Add another part of a CSV file to a draft csv import (at most 5 MB per part; every part starts with the header row). Parts are imported in the order they are added.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        importId,
        csv: { type: "string", description: "CSV text with its header row." },
      },
      required: ["importId", "csv"],
    },
  },
  {
    name: "start_push_import",
    description:
      "Start a draft push import, or resume a failed or stalled one from where it stopped. Runs in the background; poll get_push_import. One import runs per workspace at a time.",
    inputSchema: {
      type: "object",
      properties: { companyId, importId },
      required: ["importId"],
    },
  },
  {
    name: "cancel_push_import",
    description:
      "Stop a push import, or discard a draft or failed one. Devices already imported stay; staged rows and the stored source key are deleted. Cannot be undone.",
    inputSchema: {
      type: "object",
      properties: { companyId, importId },
      required: ["importId"],
    },
  },
];
