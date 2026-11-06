import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
};

const connectionIdProperty = {
  type: "string",
  description: "Warehouse connection ID from `list_warehouse_connections`.",
};

const syncIdProperty = {
  type: "string",
  description: "Warehouse sync ID from `list_warehouse_syncs`.",
};

const configProperty = {
  type: "object",
  description:
    "Connection settings. snowflake: account, username, warehouse, database, schema?, role?. bigquery: projectId, location?. redshift/postgres: host, port?, database, username, sslMode? (require or verify-full).",
};

const credentialsProperty = {
  type: "object",
  description:
    "Secrets, stored encrypted and never returned. snowflake: privateKey (PKCS#8 PEM), privateKeyPassphrase?. bigquery: serviceAccountJson (the key file contents). redshift/postgres: password. Ask the user for these; never invent them.",
};

const mappingProperty = {
  type: "object",
  description:
    'Column mapping. Subscriber syncs: emailColumn (or phoneColumn), externalIdColumn?, firstNameColumn?, lastNameColumn?, tagsColumn?, attributes?: [{"column","attribute"}]. Event syncs: emailColumn or externalIdColumn, eventNameColumn or eventName (fixed), eventIdColumn?, occurredAtColumn?, properties?: [{"column","property"}]. Columns must exist in the query; run `preview_warehouse_query` first.',
  properties: {
    emailColumn: { type: "string" },
    phoneColumn: { type: "string" },
    externalIdColumn: { type: "string" },
    firstNameColumn: { type: "string" },
    lastNameColumn: { type: "string" },
    tagsColumn: { type: "string" },
    attributes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          column: { type: "string" },
          attribute: { type: "string" },
        },
        required: ["column", "attribute"],
      },
    },
    eventNameColumn: { type: "string" },
    eventName: { type: "string" },
    eventIdColumn: { type: "string" },
    occurredAtColumn: { type: "string" },
    properties: {
      type: "array",
      items: {
        type: "object",
        properties: {
          column: { type: "string" },
          property: { type: "string" },
        },
        required: ["column", "property"],
      },
    },
  },
};

const syncSettings = {
  cursorColumn: {
    type: "string",
    description:
      "Column read incrementally, for example updated_at. Each run reads rows at or after the last value. Empty string clears it on update.",
  },
  frequency: {
    type: "string",
    enum: ["every_15_minutes", "hourly", "daily", "weekly", "manual"],
    description: "Schedule. Default: daily.",
  },
  listIds: {
    type: "array",
    items: { type: "string" },
    description:
      "Subscriber syncs only: lists that contacts the sync creates join. Existing contacts keep their lists.",
  },
  optInMode: {
    type: "string",
    enum: ["confirmed", "double_opt_in"],
    description:
      "Subscriber syncs only. confirmed (default) imports contacts whose consent is already verified; double_opt_in emails new contacts first and needs automations:trigger.",
  },
  triggerAutomations: {
    type: "boolean",
    description:
      "Let new contacts or events from the last hour start automations. Default false. Needs automations:trigger.",
  },
};

export const warehouseToolDefinitions: Tool[] = [
  {
    name: "list_warehouse_connections",
    description:
      "List warehouse connections (Snowflake, BigQuery, Redshift, Postgres) with status, last test and number of syncs. Credentials are never returned.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "get_warehouse_connection",
    description:
      "Get one warehouse connection with its settings, status, last test and number of syncs. Credentials are never returned.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: connectionIdProperty,
      },
      required: ["connectionId"],
    },
  },
  {
    name: "create_warehouse_connection",
    description:
      "Connect a data warehouse with a read-only user. Sequenzy runs a test query before saving and returns the warehouse's reason when it fails. Next, preview a query with `preview_warehouse_query` and create a sync.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        name: { type: "string", description: "Display name." },
        provider: {
          type: "string",
          enum: ["snowflake", "bigquery", "redshift", "postgres"],
        },
        config: configProperty,
        credentials: credentialsProperty,
      },
      required: ["name", "provider", "config", "credentials"],
    },
  },
  {
    name: "update_warehouse_connection",
    description:
      "Rename a connection, change its settings (merged with the saved ones) or rotate its credentials. Settings and credential changes are re-tested before saving.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: connectionIdProperty,
        name: { type: "string" },
        config: configProperty,
        credentials: credentialsProperty,
      },
      required: ["connectionId"],
    },
  },
  {
    name: "delete_warehouse_connection",
    description:
      "Delete a warehouse connection and its stored credentials. Fails while syncs still use it.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: connectionIdProperty,
      },
      required: ["connectionId"],
    },
  },
  {
    name: "test_warehouse_connection",
    description:
      "Run a test query with the stored credentials and record the result.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: connectionIdProperty,
      },
      required: ["connectionId"],
    },
  },
  {
    name: "preview_warehouse_query",
    description:
      "Run a SELECT query on a connection with a 20-row limit and return its columns and rows, so you can build a sync mapping. Only single SELECT/WITH statements are accepted.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: connectionIdProperty,
        query: { type: "string", description: "SELECT query." },
      },
      required: ["connectionId", "query"],
    },
  },
  {
    name: "list_warehouse_syncs",
    description:
      "List warehouse syncs with schedule, status, cursor position and the latest run, including progress of the subscriber imports it queued.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: {
          type: "string",
          description: "Only syncs of this connection.",
        },
      },
    },
  },
  {
    name: "get_warehouse_sync",
    description: "Get one warehouse sync with its status and latest run.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty, syncId: syncIdProperty },
      required: ["syncId"],
    },
  },
  {
    name: "create_warehouse_sync",
    description:
      "Sync contacts (kind subscribers) or events on existing contacts (kind events) from a warehouse query on a schedule. The mapping and cursor are checked against the query's real columns, and the first run starts right away. Each run only sends rows that changed since the last run.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        connectionId: connectionIdProperty,
        name: { type: "string" },
        kind: { type: "string", enum: ["subscribers", "events"] },
        query: { type: "string", description: "Single SELECT/WITH statement." },
        mapping: mappingProperty,
        ...syncSettings,
      },
      required: ["connectionId", "name", "kind", "query", "mapping"],
    },
  },
  {
    name: "update_warehouse_sync",
    description:
      "Change a sync's name, query, mapping, cursor, schedule, lists or options, or pause/resume it with `isEnabled`. A changed query or cursor reads from the beginning again; unchanged rows are still skipped.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        syncId: syncIdProperty,
        name: { type: "string" },
        query: { type: "string" },
        mapping: mappingProperty,
        ...syncSettings,
        isEnabled: {
          type: "boolean",
          description: "false pauses, true resumes.",
        },
      },
      required: ["syncId"],
    },
  },
  {
    name: "delete_warehouse_sync",
    description:
      "Delete a warehouse sync. Scheduled runs stop; contacts and events already imported stay.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty, syncId: syncIdProperty },
      required: ["syncId"],
    },
  },
  {
    name: "run_warehouse_sync",
    description:
      "Run a sync now. With `fullResync`, the run forgets which rows were sent and sends every row again (use after changing data outside the cursor). Poll `list_warehouse_sync_runs` for progress.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        syncId: syncIdProperty,
        fullResync: { type: "boolean" },
      },
      required: ["syncId"],
    },
  },
  {
    name: "list_warehouse_sync_runs",
    description:
      "List recent sync runs (last 30 days) with rows read, synced, unchanged, skipped and failed, sample row problems, and import progress.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        syncId: syncIdProperty,
        limit: { type: "integer", minimum: 1, maximum: 100 },
      },
      required: ["syncId"],
    },
  },
];
