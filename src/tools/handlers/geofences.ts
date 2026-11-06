import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

const NUMBER_FIELDS = [
  "latitude",
  "longitude",
  "radiusMeters",
  "cooldownSeconds",
];
const NULLABLE_STRING_FIELDS = ["group", "externalId"];

/**
 * Copies the geofence fields that are present, checking only their JSON
 * types. Ranges are validated by the API, so the messages match the
 * dashboard and CLI.
 */
export function buildGeofenceBody(
  tool: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (args["name"] !== undefined)
    body["name"] = requiredString(tool, args, "name");
  for (const field of NUMBER_FIELDS) {
    const value = args[field];
    if (value === undefined) continue;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `\`${field}\` must be a number when calling \`${tool}\`.`
      );
    }
    body[field] = value;
  }
  const dwell = args["dwellSeconds"];
  if (dwell !== undefined) {
    if (
      dwell !== null &&
      (typeof dwell !== "number" || !Number.isFinite(dwell))
    ) {
      throw new Error(
        `\`dwellSeconds\` must be a number or null when calling \`${tool}\`.`
      );
    }
    body["dwellSeconds"] = dwell;
  }
  for (const field of NULLABLE_STRING_FIELDS) {
    const value = args[field];
    if (value === undefined) continue;
    if (value !== null && typeof value !== "string") {
      throw new Error(
        `\`${field}\` must be a string or null when calling \`${tool}\`.`
      );
    }
    body[field] = value;
  }
  if (args["active"] !== undefined) {
    if (typeof args["active"] !== "boolean") {
      throw new Error(
        `\`active\` must be true or false when calling \`${tool}\`.`
      );
    }
    body["active"] = args["active"];
  }
  return body;
}

function geofencePath(tool: string, args: Record<string, unknown>): string {
  return `/api/v1/geofences/${encodeURIComponent(requiredString(tool, args, "geofenceId"))}`;
}

export async function handleGeofenceTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args["companyId"] as string | undefined;
  let result: unknown;

  switch (name) {
    case "list_geofences": {
      const params = new URLSearchParams();
      const group = optionalString(args, "group");
      if (group) params.set("group", group);
      if (args["active"] !== undefined) {
        if (typeof args["active"] !== "boolean") {
          throw new Error(
            "`active` must be true or false when calling `list_geofences`."
          );
        }
        params.set("active", String(args["active"]));
      }
      if (args["limit"] !== undefined) {
        const limit = args["limit"];
        if (
          typeof limit !== "number" ||
          !Number.isInteger(limit) ||
          limit < 1 ||
          limit > 500
        ) {
          throw new Error(
            "`limit` must be a whole number from 1 to 500 when calling `list_geofences`."
          );
        }
        params.set("limit", String(limit));
      }
      const cursor = optionalString(args, "cursor");
      if (cursor) params.set("cursor", cursor);
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/geofences${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_geofence": {
      result = await apiRequest(
        "GET",
        geofencePath(name, args),
        undefined,
        companyId
      );
      break;
    }

    case "create_geofence": {
      result = await apiRequest(
        "POST",
        "/api/v1/geofences",
        buildGeofenceBody(name, args),
        companyId
      );
      break;
    }

    case "update_geofence": {
      const path = geofencePath(name, args);
      const body = buildGeofenceBody(name, args);
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Provide at least one field to change when calling `update_geofence`."
        );
      }
      result = await apiRequest("PATCH", path, body, companyId);
      break;
    }

    case "delete_geofence": {
      result = await apiRequest(
        "DELETE",
        geofencePath(name, args),
        undefined,
        companyId
      );
      break;
    }

    case "import_geofences": {
      const rows = args["geofences"];
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error(
          "`geofences` must be a non-empty array when calling `import_geofences`."
        );
      }
      if (rows.length > 1000) {
        throw new Error(
          "`geofences` can hold at most 1,000 rows per `import_geofences` call; split larger imports."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/geofences/import",
        {
          // Rows go through unchanged: the API validates each one and
          // reports bad rows in `errors` while saving the rest, the same
          // as a REST import.
          geofences: rows.map((row, index) => {
            if (typeof row !== "object" || row === null || Array.isArray(row)) {
              throw new Error(
                `\`geofences[${index}]\` must be an object when calling \`import_geofences\`.`
              );
            }
            return row as Record<string, unknown>;
          }),
        },
        companyId
      );
      break;
    }

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
