import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

const CONTENT_KEYS = [
  "title",
  "body",
  "url",
  "imageUrl",
  "iconUrl",
  "platforms",
] as const;

const TIMING_KEYS = [
  "sendInRecipientTimezone",
  "scheduledTimezone",
  "sendTimeOptimization",
  "sendTimeWindowHours",
] as const;

const LIVE_ACTIVITY_DELIVERY_KEYS = ["staleDate", "relevanceScore"] as const;

function pick(
  args: Record<string, unknown>,
  keys: readonly string[]
): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of keys) {
    if (args[key] !== undefined) picked[key] = args[key];
  }
  return picked;
}

function query(args: Record<string, unknown>, keys: readonly string[]): string {
  const search = new URLSearchParams();
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" || typeof value === "number") {
      search.set(key, String(value));
    }
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

/**
 * Push notification tools: thin pass-throughs to /api/v1/push so MCP, CLI
 * and REST share validation, permissions and error wording.
 */
export async function handlePushTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  const campaignPath = (tool: string) =>
    `/api/v1/push/campaigns/${encodeURIComponent(
      requiredString(tool, args, "campaignId")
    )}`;
  let result: unknown;

  switch (name) {
    case "get_push_settings":
      result = await apiRequest(
        "GET",
        "/api/v1/push/settings",
        undefined,
        companyId
      );
      break;
    case "update_web_push_settings":
      if (args.enabled === undefined && args.defaultIconUrl === undefined) {
        throw new Error(
          "Provide `enabled` and/or `defaultIconUrl` when calling `update_web_push_settings`."
        );
      }
      result = await apiRequest(
        "PUT",
        "/api/v1/push/settings/web",
        pick(args, ["enabled", "defaultIconUrl"]),
        companyId
      );
      break;
    case "set_apns_credentials":
      result = await apiRequest(
        "PUT",
        "/api/v1/push/settings/ios",
        {
          keyId: requiredString(name, args, "keyId"),
          teamId: requiredString(name, args, "teamId"),
          bundleId: requiredString(name, args, "bundleId"),
          privateKey: requiredString(name, args, "privateKey"),
          ...pick(args, ["environment"]),
        },
        companyId
      );
      break;
    case "remove_apns_credentials":
      result = await apiRequest(
        "DELETE",
        "/api/v1/push/settings/ios",
        undefined,
        companyId
      );
      break;
    case "set_fcm_credentials":
      result = await apiRequest(
        "PUT",
        "/api/v1/push/settings/android",
        { serviceAccount: requiredString(name, args, "serviceAccount") },
        companyId
      );
      break;
    case "remove_fcm_credentials":
      result = await apiRequest(
        "DELETE",
        "/api/v1/push/settings/android",
        undefined,
        companyId
      );
      break;
    case "list_push_devices":
      result = await apiRequest(
        "GET",
        `/api/v1/push/devices${query(args, [
          "email",
          "subscriberId",
          "platform",
          "status",
          "limit",
          "cursor",
        ])}`,
        undefined,
        companyId
      );
      break;
    case "register_push_device":
      result = await apiRequest(
        "POST",
        "/api/v1/push/devices",
        {
          platform: requiredString(name, args, "platform"),
          token: requiredString(name, args, "token"),
          ...pick(args, [
            "keys",
            "email",
            "subscriberId",
            "deviceName",
            "appVersion",
            "osVersion",
            "locale",
            "timezone",
            "permissionStatus",
          ]),
        },
        companyId
      );
      break;
    case "remove_push_device":
      result = await apiRequest(
        "DELETE",
        `/api/v1/push/devices/${encodeURIComponent(
          requiredString(name, args, "deviceId")
        )}`,
        undefined,
        companyId
      );
      break;
    case "send_test_push":
      if (!args.deviceId && !args.email && !args.subscriberId) {
        throw new Error(
          "Provide `deviceId`, `email`, or `subscriberId` when calling `send_test_push`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/test",
        pick(args, ["deviceId", "email", "subscriberId", ...CONTENT_KEYS]),
        companyId
      );
      break;
    case "list_push_campaigns":
      result = await apiRequest(
        "GET",
        `/api/v1/push/campaigns${query(args, ["status", "limit", "offset"])}`,
        undefined,
        companyId
      );
      break;
    case "get_push_campaign":
      result = await apiRequest(
        "GET",
        campaignPath(name),
        undefined,
        companyId
      );
      break;
    case "create_push_campaign":
      result = await apiRequest(
        "POST",
        "/api/v1/push/campaigns",
        pick(args, ["name", "targetLists", "localizations", ...CONTENT_KEYS]),
        companyId
      );
      break;
    case "update_push_campaign":
      result = await apiRequest(
        "PATCH",
        campaignPath(name),
        pick(args, [
          "name",
          "targetLists",
          "localizations",
          ...CONTENT_KEYS,
          ...TIMING_KEYS,
        ]),
        companyId
      );
      break;
    case "estimate_push_campaign_recipients":
      if (args.targetLists === undefined) {
        throw new Error(
          "Provide `targetLists` when calling `estimate_push_campaign_recipients`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/campaigns/estimate",
        pick(args, ["targetLists", "platforms", "includeTimingCoverage"]),
        companyId
      );
      break;
    case "send_push_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/send`,
        pick(args, ["scheduledAt", ...TIMING_KEYS]),
        companyId
      );
      break;
    case "unschedule_push_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/unschedule`,
        undefined,
        companyId
      );
      break;
    case "cancel_push_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/cancel`,
        undefined,
        companyId
      );
      break;
    case "translate_push_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/translate`,
        pick(args, ["locales", "overwrite"]),
        companyId
      );
      break;
    case "translate_push_content":
      if (!args.title && !args.body) {
        throw new Error(
          "Provide `title` and/or `body` when calling `translate_push_content`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/translate",
        pick(args, ["title", "body", "localizations", "locales", "overwrite"]),
        companyId
      );
      break;
    case "duplicate_push_campaign":
      result = await apiRequest(
        "POST",
        `${campaignPath(name)}/duplicate`,
        pick(args, ["name"]),
        companyId
      );
      break;
    case "get_push_campaign_stats":
      result = await apiRequest(
        "GET",
        `${campaignPath(name)}/stats`,
        undefined,
        companyId
      );
      break;
    case "list_live_activities":
      result = await apiRequest(
        "GET",
        `/api/v1/push/live-activities${query(args, [
          "email",
          "subscriberId",
          "platform",
          "activityType",
          "activityId",
          "kind",
          "status",
          "limit",
          "cursor",
        ])}`,
        undefined,
        companyId
      );
      break;
    case "start_live_activity":
      if (
        !args.email &&
        !args.subscriberId &&
        !args.segmentId &&
        !args.listId &&
        !args.tag
      ) {
        throw new Error(
          "Provide `email` or `subscriberId` (one contact), or one of `segmentId`, `listId` or `tag` (an audience) when calling `start_live_activity`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/live-activities/start",
        pick(args, [
          "email",
          "subscriberId",
          "segmentId",
          "listId",
          "tag",
          "activityType",
          "activityId",
          "attributes",
          "contentState",
          "alert",
          ...LIVE_ACTIVITY_DELIVERY_KEYS,
        ]),
        companyId
      );
      break;
    case "update_live_activity":
      if (!args.email && !args.subscriberId && args.broadcast !== true) {
        throw new Error(
          "Provide `email` or `subscriberId` when calling `update_live_activity`, or `broadcast: true` for every signed-in device running the activity."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/live-activities/update",
        pick(args, [
          "email",
          "subscriberId",
          "broadcast",
          "activityId",
          "contentState",
          "alert",
          "priority",
          ...LIVE_ACTIVITY_DELIVERY_KEYS,
        ]),
        companyId
      );
      break;
    case "end_live_activity":
      if (!args.email && !args.subscriberId && args.broadcast !== true) {
        throw new Error(
          "Provide `email` or `subscriberId` when calling `end_live_activity`, or `broadcast: true` for every signed-in device running the activity."
        );
      }
      if (!args.contentState || typeof args.contentState !== "object") {
        throw new Error(
          "Provide the final `contentState` when calling `end_live_activity`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/live-activities/end",
        pick(args, [
          "email",
          "subscriberId",
          "broadcast",
          "activityId",
          "contentState",
          "alert",
          "priority",
          "dismissalDate",
          ...LIVE_ACTIVITY_DELIVERY_KEYS,
        ]),
        companyId
      );
      break;
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
