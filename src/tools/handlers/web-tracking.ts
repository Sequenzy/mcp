import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

/** allowedOrigins keeps its shipped behavior: non-arrays and non-strings are ignored. */
function lenientStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.filter((entry): entry is string => typeof entry === "string");
}

/**
 * allowedAppIds is new, so it can be strict without breaking callers: a value
 * that is not an array of strings fails loudly rather than being dropped,
 * which would silently create or leave an unrestricted key. A single string
 * is accepted as a one-entry list, the slip agents make most often.
 */
function strictStringArray(
  tool: string,
  field: string,
  value: unknown
): string[] | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "string") return [value];
  if (
    !Array.isArray(value) ||
    value.some((entry) => typeof entry !== "string")
  ) {
    throw new Error(
      `\`${field}\` must be an array of strings when calling \`${tool}\`.`
    );
  }
  return value as string[];
}

/**
 * Publishable keys for the browser tracking SDK.
 *
 * Thin pass-throughs to `/api/v1/web-tracking-keys` so MCP, CLI, and REST
 * cannot disagree about origin validation or what the install snippet says.
 */
export async function handleWebTrackingTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  let result: unknown;

  switch (name) {
    case "list_web_tracking_keys": {
      result = await apiRequest(
        "GET",
        "/api/v1/web-tracking-keys",
        undefined,
        companyId
      );
      break;
    }

    case "get_web_tracking_key": {
      const id = requiredString("get_web_tracking_key", args, "id");
      result = await apiRequest(
        "GET",
        `/api/v1/web-tracking-keys/${encodeURIComponent(id)}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_web_tracking_key": {
      const keyName = requiredString("create_web_tracking_key", args, "name");
      const allowedOrigins = lenientStringArray(args.allowedOrigins);
      const allowedAppIds = strictStringArray(
        "create_web_tracking_key",
        "allowedAppIds",
        args.allowedAppIds
      );
      result = await apiRequest(
        "POST",
        "/api/v1/web-tracking-keys",
        {
          name: keyName,
          ...(allowedOrigins ? { allowedOrigins } : {}),
          ...(allowedAppIds ? { allowedAppIds } : {}),
        },
        companyId
      );
      break;
    }

    case "update_web_tracking_key": {
      const id = requiredString("update_web_tracking_key", args, "id");
      const allowedOrigins = lenientStringArray(args.allowedOrigins);
      const allowedAppIds = strictStringArray(
        "update_web_tracking_key",
        "allowedAppIds",
        args.allowedAppIds
      );
      if (
        typeof args.name !== "string" &&
        allowedOrigins === undefined &&
        allowedAppIds === undefined &&
        typeof args.isActive !== "boolean"
      ) {
        throw new Error(
          "Provide at least one of `name`, `allowedOrigins`, `allowedAppIds`, or `isActive` when calling `update_web_tracking_key`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/web-tracking-keys/${encodeURIComponent(id)}`,
        {
          ...(typeof args.name === "string" ? { name: args.name } : {}),
          ...(allowedOrigins ? { allowedOrigins } : {}),
          ...(allowedAppIds ? { allowedAppIds } : {}),
          ...(typeof args.isActive === "boolean"
            ? { isActive: args.isActive }
            : {}),
        },
        companyId
      );
      break;
    }

    case "delete_web_tracking_key": {
      const id = requiredString("delete_web_tracking_key", args, "id");
      result = await apiRequest(
        "DELETE",
        `/api/v1/web-tracking-keys/${encodeURIComponent(id)}`,
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
