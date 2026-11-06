import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
};

const dataExportIdProperty = {
  type: "string",
  description: "Data export ID from `list_data_exports`.",
};

const datasetsProperty = {
  type: "array",
  items: {
    type: "string",
    enum: ["email_events", "sms_events", "custom_events", "subscribers"],
  },
  description:
    "What to export. email_events: sends, deliveries, bounces, complaints, opens, clicks, unsubscribes. sms_events: SMS lifecycle. custom_events: events tracked via API/SDK/integrations. subscribers: a daily snapshot of every subscriber. Default: email_events, custom_events, subscribers.",
};

const frequencyProperty = {
  type: "string",
  enum: ["every_5_minutes", "every_15_minutes", "hourly", "daily"],
  description: "How often new data is written. Default: every_15_minutes.",
};

const locationProperties = {
  bucket: {
    type: "string",
    description: "Bucket name only, not a URL.",
  },
  region: {
    type: "string",
    description:
      "Bucket region in lowercase, for example us-east-1. Required for Amazon S3; optional for GCS, where it defaults to auto.",
  },
  endpoint: {
    type: "string",
    description:
      "Optional HTTPS origin of an S3-compatible service (Cloudflare R2, MinIO, Backblaze). Leave empty for AWS and GCS.",
  },
  pathPrefix: {
    type: "string",
    description:
      "Folder inside the bucket. Files land under <pathPrefix>/<dataset>/date=YYYY-MM-DD/.",
  },
};

export const dataExportToolDefinitions: Tool[] = [
  {
    name: "list_data_exports",
    description:
      "List data exports: destinations (S3, GCS or S3-compatible buckets) that Sequenzy streams email events, SMS events, custom events and daily subscriber snapshots to as gzipped JSON lines. Shows status, how far each dataset has been exported, and the last error. Credentials are never returned.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "get_data_export",
    description:
      "Get one data export with its status, per-dataset progress (`exportedThrough`), next run and last error.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        dataExportId: dataExportIdProperty,
      },
      required: ["dataExportId"],
    },
  },
  {
    name: "create_data_export",
    description:
      'Start streaming workspace data to the user\'s own bucket, ready to load into Snowflake, BigQuery, Redshift, Athena or DuckDB. Sequenzy first writes a small test file to confirm access; the call fails with a readable reason when the bucket, region or key is wrong. The first export starts immediately. Use provider "gcs" with an HMAC key for Google Cloud Storage. Ask the user for the credentials; never invent them.',
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        name: { type: "string", description: "Display name." },
        provider: {
          type: "string",
          enum: ["s3", "gcs"],
          description:
            "s3 for Amazon S3 or any S3-compatible service (with `endpoint`); gcs for Google Cloud Storage.",
        },
        ...locationProperties,
        accessKeyId: {
          type: "string",
          description: "Access key ID (GCS: HMAC access ID).",
        },
        secretAccessKey: {
          type: "string",
          description:
            "Secret access key (GCS: HMAC secret). Stored encrypted and never returned.",
        },
        datasets: datasetsProperty,
        frequency: frequencyProperty,
        startFrom: {
          type: "string",
          description:
            "Optional ISO timestamp up to 30 days ago to include events recorded since then. Default: now.",
        },
      },
      required: [
        "name",
        "provider",
        "bucket",
        "accessKeyId",
        "secretAccessKey",
      ],
    },
  },
  {
    name: "update_data_export",
    description:
      "Update a data export: rename, change datasets or frequency, pause (`isEnabled: false`) or resume, move it to another bucket/prefix, or rotate credentials (send `accessKeyId` and `secretAccessKey` together). Location and credential changes are verified with a test file first. Newly added event datasets start from now.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        dataExportId: dataExportIdProperty,
        name: { type: "string", description: "New display name." },
        ...locationProperties,
        accessKeyId: {
          type: "string",
          description: "New access key ID. Requires `secretAccessKey`.",
        },
        secretAccessKey: {
          type: "string",
          description: "New secret. Requires `accessKeyId`.",
        },
        datasets: datasetsProperty,
        frequency: frequencyProperty,
        isEnabled: {
          type: "boolean",
          description: "false pauses the export; true resumes it.",
        },
      },
      required: ["dataExportId"],
    },
  },
  {
    name: "delete_data_export",
    description:
      "Delete a data export. Sequenzy stops writing to the bucket; files already written are kept. Recreating it later starts from the time it is recreated.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        dataExportId: dataExportIdProperty,
      },
      required: ["dataExportId"],
    },
  },
  {
    name: "test_data_export",
    description:
      "Write a small test file to the data export's bucket to confirm the stored credentials still work. Returns a readable reason on failure.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        dataExportId: dataExportIdProperty,
      },
      required: ["dataExportId"],
    },
  },
  {
    name: "run_data_export",
    description:
      "Start an export now instead of waiting for the schedule. Poll `list_data_export_runs` or `get_data_export` for progress. Paused exports must be resumed first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        dataExportId: dataExportIdProperty,
      },
      required: ["dataExportId"],
    },
  },
  {
    name: "list_data_export_runs",
    description:
      "List recent export runs (last 14 days) with status, rows, files, bytes and errors.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        dataExportId: dataExportIdProperty,
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 100,
          description: "Number of runs to return. Default 20.",
        },
      },
      required: ["dataExportId"],
    },
  },
];
