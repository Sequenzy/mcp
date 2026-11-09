import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

const FIELD_KEYS = [
  "name",
  "message",
  "priority",
  "endsAt",
  "targetLists",
] as const;

function pick(
  args: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const key of keys) {
    if (args[key] !== undefined) body[key] = args[key];
  }
  return body;
}

/**
 * In-app campaign tools: thin pass-throughs to /api/v1/in-app/campaigns so
 * MCP, CLI and REST share validation, permissions and error wording.
 */
export async function handleInAppCampaignTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  const campaignPath = (tool: string) =>
    `/api/v1/in-app/campaigns/${encodeURIComponent(
      requiredString(tool, args, "campaignId")
    )}`;
  let result: unknown;

  switch (name) {
    case "list_in_app_campaigns": {
      const search = new URLSearchParams();
      for (const key of ["status", "limit", "offset"]) {
        const value = args[key];
        if (typeof value === "string" || typeof value === "number") {
          search.set(key, String(value));
        }
      }
      const text = search.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/in-app/campaigns${text ? `?${text}` : ""}`,
        undefined,
        companyId
      );
      break;
    }
    case "get_in_app_campaign":
      result = await apiRequest(
        "GET",
        campaignPath(name),
        undefined,
        companyId
      );
      break;
    case "create_in_app_campaign":
      result = await apiRequest(
        "POST",
        "/api/v1/in-app/campaigns",
        pick(args, FIELD_KEYS),
        companyId
      );
      break;
    case "update_in_app_campaign":
      result = await apiRequest(
        "PATCH",
        campaignPath(name),
        pick(args, FIELD_KEYS),
        companyId
      );
      break;
    case "estimate_in_app_campaign_recipients":
      if (args.targetLists === undefined) {
        throw new Error(
          "Provide `targetLists` when calling `estimate_in_app_campaign_recipients`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/in-app/campaigns/estimate",
        { targetLists: args.targetLists },
        companyId
      );
      break;
    case "send_in_app_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/send`,
        pick(args, ["scheduledAt"]),
        companyId
      );
      break;
    case "unschedule_in_app_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/unschedule`,
        undefined,
        companyId
      );
      break;
    case "stop_in_app_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/stop`,
        undefined,
        companyId
      );
      break;
    case "duplicate_in_app_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/duplicate`,
        pick(args, ["name"]),
        companyId
      );
      break;
    case "get_in_app_campaign_stats":
      result = await apiRequest(
        "GET",
        `${campaignPath(name)}/stats`,
        undefined,
        companyId
      );
      break;
    default:
      return { handled: false, result: undefined };
  }
  return { handled: true, result };
}
