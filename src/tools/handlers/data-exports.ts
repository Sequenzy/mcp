import { apiRequest } from "../../runtime.js";
import { optionalStringArray, requiredString } from "../common-primitives.js";
import {
  optionalAllowedString,
  optionalIntegerInRange,
  requiredAllowedString,
} from "../subscriber-helpers.js";

const DATASETS = [
  "email_events",
  "sms_events",
  "custom_events",
  "subscribers",
] as const;
const FREQUENCIES = [
  "every_5_minutes",
  "every_15_minutes",
  "hourly",
  "daily",
] as const;

function exportPath(toolName: string, args: Record<string, unknown>): string {
  const id = requiredString(toolName, args, "dataExportId");
  return `/api/v1/data-exports/${encodeURIComponent(id)}`;
}

function optionalDatasets(
  toolName: string,
  args: Record<string, unknown>
): string[] | undefined {
  if (args["datasets"] === undefined) return undefined;
  const datasets = optionalStringArray(toolName, args, "datasets");
  const unknown = datasets.filter(
    (dataset) => !(DATASETS as readonly string[]).includes(dataset)
  );
  if (datasets.length === 0 || unknown.length > 0) {
    throw new Error(
      `\`datasets\` must list one or more of ${DATASETS.join(", ")} when calling \`${toolName}\`.`
    );
  }
  return datasets;
}

/** Copy string fields that were provided, keeping explicit empty strings. */
function pickStrings(
  args: Record<string, unknown>,
  keys: readonly string[]
): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string") picked[key] = value;
  }
  return picked;
}

export async function handleDataExportTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args["companyId"] as string | undefined;
  let result: unknown;

  switch (name) {
    case "list_data_exports": {
      result = await apiRequest(
        "GET",
        "/api/v1/data-exports",
        undefined,
        companyId
      );
      break;
    }

    case "get_data_export": {
      result = await apiRequest(
        "GET",
        exportPath(name, args),
        undefined,
        companyId
      );
      break;
    }

    case "create_data_export": {
      const datasets = optionalDatasets(name, args);
      const frequency = optionalAllowedString(
        name,
        args,
        "frequency",
        FREQUENCIES
      );
      result = await apiRequest(
        "POST",
        "/api/v1/data-exports",
        {
          name: requiredString(name, args, "name"),
          provider: requiredAllowedString(name, args, "provider", [
            "s3",
            "gcs",
          ]),
          bucket: requiredString(name, args, "bucket"),
          accessKeyId: requiredString(name, args, "accessKeyId"),
          secretAccessKey: requiredString(name, args, "secretAccessKey"),
          ...pickStrings(args, [
            "region",
            "endpoint",
            "pathPrefix",
            "startFrom",
          ]),
          ...(datasets ? { datasets } : {}),
          ...(frequency ? { frequency } : {}),
        },
        companyId
      );
      break;
    }

    case "update_data_export": {
      const hasKeyId = typeof args["accessKeyId"] === "string";
      const hasSecret = typeof args["secretAccessKey"] === "string";
      if (hasKeyId !== hasSecret) {
        throw new Error(
          "Provide `accessKeyId` and `secretAccessKey` together when rotating credentials with `update_data_export`."
        );
      }
      const datasets = optionalDatasets(name, args);
      const frequency = optionalAllowedString(
        name,
        args,
        "frequency",
        FREQUENCIES
      );
      if (
        args["isEnabled"] !== undefined &&
        typeof args["isEnabled"] !== "boolean"
      ) {
        throw new Error(
          "`isEnabled` must be a boolean when calling `update_data_export`."
        );
      }
      const body = {
        ...pickStrings(args, [
          "name",
          "bucket",
          "region",
          "endpoint",
          "pathPrefix",
          "accessKeyId",
          "secretAccessKey",
        ]),
        ...(datasets ? { datasets } : {}),
        ...(frequency ? { frequency } : {}),
        ...(typeof args["isEnabled"] === "boolean"
          ? { isEnabled: args["isEnabled"] }
          : {}),
      };
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Nothing to update: pass name, datasets, frequency, isEnabled, a new location or new credentials to `update_data_export`."
        );
      }
      result = await apiRequest(
        "PATCH",
        exportPath(name, args),
        body,
        companyId
      );
      break;
    }

    case "delete_data_export": {
      result = await apiRequest(
        "DELETE",
        exportPath(name, args),
        undefined,
        companyId
      );
      break;
    }

    case "test_data_export": {
      result = await apiRequest(
        "POST",
        `${exportPath(name, args)}/test`,
        undefined,
        companyId
      );
      break;
    }

    case "run_data_export": {
      result = await apiRequest(
        "POST",
        `${exportPath(name, args)}/run`,
        undefined,
        companyId
      );
      break;
    }

    case "list_data_export_runs": {
      const limit = optionalIntegerInRange(name, args, "limit", 1, 100);
      result = await apiRequest(
        "GET",
        `${exportPath(name, args)}/runs${limit ? `?limit=${limit}` : ""}`,
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
