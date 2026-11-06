import { apiRequest } from "../../runtime.js";
import {
  isRecord,
  optionalStringArray,
  requiredString,
} from "../common-primitives.js";
import {
  optionalAllowedString,
  optionalIntegerInRange,
  requiredAllowedString,
} from "../subscriber-helpers.js";

const FREQUENCIES = [
  "every_15_minutes",
  "hourly",
  "daily",
  "weekly",
  "manual",
] as const;

function connectionPath(toolName: string, args: Record<string, unknown>) {
  const id = requiredString(toolName, args, "connectionId");
  return `/api/v1/warehouse-connections/${encodeURIComponent(id)}`;
}

function syncPath(toolName: string, args: Record<string, unknown>) {
  const id = requiredString(toolName, args, "syncId");
  return `/api/v1/warehouse-syncs/${encodeURIComponent(id)}`;
}

function optionalObject(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (!isRecord(value)) {
    throw new Error(
      `\`${key}\` must be an object when calling \`${toolName}\`.`
    );
  }
  return value;
}

function requiredObject(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): Record<string, unknown> {
  const value = optionalObject(toolName, args, key);
  if (!value) {
    throw new Error(`\`${key}\` is required when calling \`${toolName}\`.`);
  }
  return value;
}

function optionalBoolean(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): boolean | undefined {
  const value = args[key];
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(
      `\`${key}\` must be a boolean when calling \`${toolName}\`.`
    );
  }
  return value;
}

function syncSettings(toolName: string, args: Record<string, unknown>) {
  const frequency = optionalAllowedString(
    toolName,
    args,
    "frequency",
    FREQUENCIES
  );
  const optInMode = optionalAllowedString(toolName, args, "optInMode", [
    "confirmed",
    "double_opt_in",
  ]);
  const triggerAutomations = optionalBoolean(
    toolName,
    args,
    "triggerAutomations"
  );
  const cursorColumn = args["cursorColumn"];
  if (cursorColumn !== undefined && typeof cursorColumn !== "string") {
    throw new Error(
      `\`cursorColumn\` must be a string when calling \`${toolName}\`.`
    );
  }
  return {
    ...(typeof cursorColumn === "string"
      ? { cursorColumn: cursorColumn.trim() === "" ? null : cursorColumn }
      : {}),
    ...(frequency ? { frequency } : {}),
    ...(args["listIds"] !== undefined
      ? { listIds: optionalStringArray(toolName, args, "listIds") }
      : {}),
    ...(optInMode ? { optInMode } : {}),
    ...(triggerAutomations !== undefined ? { triggerAutomations } : {}),
  };
}

export async function handleWarehouseTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args["companyId"] as string | undefined;
  let result: unknown;

  switch (name) {
    case "list_warehouse_connections":
      result = await apiRequest(
        "GET",
        "/api/v1/warehouse-connections",
        undefined,
        companyId
      );
      break;

    case "get_warehouse_connection":
      result = await apiRequest(
        "GET",
        connectionPath(name, args),
        undefined,
        companyId
      );
      break;

    case "create_warehouse_connection":
      result = await apiRequest(
        "POST",
        "/api/v1/warehouse-connections",
        {
          name: requiredString(name, args, "name"),
          provider: requiredAllowedString(name, args, "provider", [
            "snowflake",
            "bigquery",
            "redshift",
            "postgres",
          ]),
          config: requiredObject(name, args, "config"),
          credentials: requiredObject(name, args, "credentials"),
        },
        companyId
      );
      break;

    case "update_warehouse_connection": {
      const config = optionalObject(name, args, "config");
      const credentials = optionalObject(name, args, "credentials");
      const body = {
        ...(typeof args["name"] === "string" ? { name: args["name"] } : {}),
        ...(config ? { config } : {}),
        ...(credentials ? { credentials } : {}),
      };
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Nothing to update: pass name, config or credentials to `update_warehouse_connection`."
        );
      }
      result = await apiRequest(
        "PATCH",
        connectionPath(name, args),
        body,
        companyId
      );
      break;
    }

    case "delete_warehouse_connection":
      result = await apiRequest(
        "DELETE",
        connectionPath(name, args),
        undefined,
        companyId
      );
      break;

    case "test_warehouse_connection":
      result = await apiRequest(
        "POST",
        `${connectionPath(name, args)}/test`,
        undefined,
        companyId
      );
      break;

    case "preview_warehouse_query":
      result = await apiRequest(
        "POST",
        `${connectionPath(name, args)}/preview`,
        { query: requiredString(name, args, "query") },
        companyId
      );
      break;

    case "list_warehouse_syncs": {
      const connectionId =
        typeof args["connectionId"] === "string" ? args["connectionId"] : "";
      result = await apiRequest(
        "GET",
        `/api/v1/warehouse-syncs${connectionId ? `?connectionId=${encodeURIComponent(connectionId)}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_warehouse_sync":
      result = await apiRequest(
        "GET",
        syncPath(name, args),
        undefined,
        companyId
      );
      break;

    case "create_warehouse_sync":
      result = await apiRequest(
        "POST",
        "/api/v1/warehouse-syncs",
        {
          connectionId: requiredString(name, args, "connectionId"),
          name: requiredString(name, args, "name"),
          kind: requiredAllowedString(name, args, "kind", [
            "subscribers",
            "events",
          ]),
          query: requiredString(name, args, "query"),
          mapping: requiredObject(name, args, "mapping"),
          ...syncSettings(name, args),
        },
        companyId
      );
      break;

    case "update_warehouse_sync": {
      const mapping = optionalObject(name, args, "mapping");
      const isEnabled = optionalBoolean(name, args, "isEnabled");
      const body = {
        ...(typeof args["name"] === "string" ? { name: args["name"] } : {}),
        ...(typeof args["query"] === "string" ? { query: args["query"] } : {}),
        ...(mapping ? { mapping } : {}),
        ...syncSettings(name, args),
        ...(isEnabled !== undefined ? { isEnabled } : {}),
      };
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Nothing to update: pass at least one field to `update_warehouse_sync`."
        );
      }
      result = await apiRequest("PATCH", syncPath(name, args), body, companyId);
      break;
    }

    case "delete_warehouse_sync":
      result = await apiRequest(
        "DELETE",
        syncPath(name, args),
        undefined,
        companyId
      );
      break;

    case "run_warehouse_sync": {
      const fullResync = optionalBoolean(name, args, "fullResync");
      result = await apiRequest(
        "POST",
        `${syncPath(name, args)}/run`,
        fullResync ? { fullResync: true } : {},
        companyId
      );
      break;
    }

    case "list_warehouse_sync_runs": {
      const limit = optionalIntegerInRange(name, args, "limit", 1, 100);
      result = await apiRequest(
        "GET",
        `${syncPath(name, args)}/runs${limit ? `?limit=${limit}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
