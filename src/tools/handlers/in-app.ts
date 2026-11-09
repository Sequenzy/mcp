import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

const LIST_QUERY_KEYS = [
  "email",
  "externalId",
  "subscriberId",
  "kind",
  "status",
  "limit",
  "actions",
] as const;

/**
 * In-app message and content card tools: thin pass-throughs to
 * /api/v1/in-app so MCP, CLI and REST share validation, permissions and
 * error wording.
 */
export async function handleInAppTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  const messagePath = (tool: string) =>
    `/api/v1/in-app/messages/${encodeURIComponent(
      requiredString(tool, args, "messageId")
    )}`;
  let result: unknown;

  switch (name) {
    case "list_in_app_messages": {
      if (!args.email && !args.externalId && !args.subscriberId) {
        throw new Error(
          "Provide `email`, `externalId` or `subscriberId` when calling `list_in_app_messages`."
        );
      }
      const search = new URLSearchParams();
      for (const key of LIST_QUERY_KEYS) {
        const value = args[key];
        if (typeof value === "string" || typeof value === "number") {
          search.set(key, String(value));
        }
      }
      if (Array.isArray(args.formats) && args.formats.length > 0) {
        search.set("formats", args.formats.map(String).join(","));
      }
      // Looking at a feed must not deliver live in-app campaigns to the
      // contact (that happens when their app fetches it).
      if (args.status !== "all") search.set("deliver", "false");
      result = await apiRequest(
        "GET",
        `/api/v1/in-app/messages?${search.toString()}`,
        undefined,
        companyId
      );
      break;
    }
    case "record_in_app_event":
      result = await apiRequest(
        "POST",
        `${messagePath(name)}/events`,
        {
          type: requiredString(name, args, "type"),
          ...(typeof args.buttonId === "string"
            ? { buttonId: args.buttonId }
            : {}),
          ...(typeof args.pushPermission === "string"
            ? { pushPermission: args.pushPermission }
            : {}),
        },
        companyId
      );
      break;
    case "validate_in_app_html":
      result = await apiRequest(
        "POST",
        "/api/v1/in-app/html/validate",
        { html: requiredString(name, args, "html") },
        companyId
      );
      break;
    case "delete_in_app_message":
      result = await apiRequest(
        "DELETE",
        messagePath(name),
        undefined,
        companyId
      );
      break;
    case "get_in_app_step_stats":
      result = await apiRequest(
        "GET",
        `/api/v1/in-app/steps/${encodeURIComponent(
          requiredString(name, args, "stepId")
        )}/stats`,
        undefined,
        companyId
      );
      break;
    case "list_in_app_templates":
      result = await apiRequest(
        "GET",
        "/api/v1/in-app/templates",
        undefined,
        companyId
      );
      break;
    case "write_in_app_copy":
      result = await apiRequest(
        "POST",
        "/api/v1/in-app/copy",
        {
          brief: requiredString(name, args, "brief"),
          ...(typeof args.kind === "string" ? { kind: args.kind } : {}),
          ...(typeof args.format === "string" ? { format: args.format } : {}),
          ...(typeof args.hasImage === "boolean"
            ? { hasImage: args.hasImage }
            : {}),
        },
        companyId
      );
      break;
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
