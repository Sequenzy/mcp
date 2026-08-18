import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

function optionalStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  return value.filter((entry): entry is string => typeof entry === "string");
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
      const allowedOrigins = optionalStringArray(args.allowedOrigins);
      result = await apiRequest(
        "POST",
        "/api/v1/web-tracking-keys",
        {
          name: keyName,
          ...(allowedOrigins ? { allowedOrigins } : {}),
        },
        companyId
      );
      break;
    }

    case "update_web_tracking_key": {
      const id = requiredString("update_web_tracking_key", args, "id");
      const allowedOrigins = optionalStringArray(args.allowedOrigins);
      if (
        typeof args.name !== "string" &&
        allowedOrigins === undefined &&
        typeof args.isActive !== "boolean"
      ) {
        throw new Error(
          "Provide at least one of `name`, `allowedOrigins`, or `isActive` when calling `update_web_tracking_key`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/web-tracking-keys/${encodeURIComponent(id)}`,
        {
          ...(typeof args.name === "string" ? { name: args.name } : {}),
          ...(allowedOrigins ? { allowedOrigins } : {}),
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
