import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

const SETTINGS_FIELDS = ["enabled", "autonomy"] as const;

/** Pass-through to /account-health; the API validates input. */
export async function handleAccountHealthTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = optionalString(args, "companyId");
  if (name === "get_account_health") {
    return {
      handled: true,
      result: await apiRequest(
        "GET",
        "/api/v1/account-health",
        undefined,
        companyId
      ),
    };
  }
  if (name === "update_account_health_settings") {
    const body: Record<string, unknown> = {};
    for (const field of SETTINGS_FIELDS) {
      if (args[field] !== undefined) body[field] = args[field];
    }
    return {
      handled: true,
      result: await apiRequest(
        "PATCH",
        "/api/v1/account-health/settings",
        body,
        companyId
      ),
    };
  }
  if (name === "run_account_health_check") {
    return {
      handled: true,
      result: await apiRequest(
        "POST",
        "/api/v1/account-health/runs",
        undefined,
        companyId
      ),
    };
  }
  if (name === "update_account_health_insight") {
    const insightId = requiredString(name, args, "insightId");
    return {
      handled: true,
      result: await apiRequest(
        "PATCH",
        `/api/v1/account-health/insights/${encodeURIComponent(insightId)}`,
        {
          action: requiredString(name, args, "action"),
          ...(args["snoozeDays"] !== undefined
            ? { snoozeDays: args["snoozeDays"] }
            : {}),
        },
        companyId
      ),
    };
  }
  if (name === "submit_account_health_feedback") {
    const insightId = requiredString(name, args, "insightId");
    return {
      handled: true,
      result: await apiRequest(
        "POST",
        `/api/v1/account-health/insights/${encodeURIComponent(insightId)}/feedback`,
        {
          rating: requiredString(name, args, "rating"),
          ...(args["comment"] !== undefined
            ? { comment: args["comment"] }
            : {}),
        },
        companyId
      ),
    };
  }
  if (name === "create_account_health_fix") {
    const insightId = requiredString(name, args, "insightId");
    return {
      handled: true,
      result: await apiRequest(
        "POST",
        `/api/v1/account-health/insights/${encodeURIComponent(insightId)}/fix`,
        undefined,
        companyId
      ),
    };
  }
  return { handled: false, result: undefined };
}
