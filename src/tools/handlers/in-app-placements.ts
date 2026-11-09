import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

const EDITABLE_FIELDS = ["name", "description", "width", "height"] as const;

function pickFields(
  args: Record<string, unknown>,
  fields: readonly string[]
): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const field of fields) {
    if (args[field] !== undefined) body[field] = args[field];
  }
  return body;
}

/**
 * In-app placement tools: thin pass-throughs to /api/v1/in-app/placements
 * and /api/v1/in-app/placement-feed so MCP, CLI and REST share validation,
 * limits and error wording.
 */
export async function handleInAppPlacementTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  const placementPath = (tool: string) =>
    `/api/v1/in-app/placements/${encodeURIComponent(
      requiredString(tool, args, "key")
    )}`;
  let result: unknown;

  switch (name) {
    case "list_in_app_placements":
      result = await apiRequest(
        "GET",
        "/api/v1/in-app/placements",
        undefined,
        companyId
      );
      break;
    case "get_in_app_placement":
      result = await apiRequest(
        "GET",
        placementPath(name),
        undefined,
        companyId
      );
      break;
    case "create_in_app_placement":
      result = await apiRequest(
        "POST",
        "/api/v1/in-app/placements",
        {
          key: requiredString(name, args, "key"),
          name: requiredString(name, args, "name"),
          ...pickFields(args, ["description", "width", "height"]),
        },
        companyId
      );
      break;
    case "update_in_app_placement": {
      const path = placementPath(name);
      const body = pickFields(args, EDITABLE_FIELDS);
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Provide at least one of `name`, `description`, `width` or `height` when calling `update_in_app_placement`."
        );
      }
      result = await apiRequest("PATCH", path, body, companyId);
      break;
    }
    case "delete_in_app_placement":
      result = await apiRequest(
        "DELETE",
        placementPath(name),
        undefined,
        companyId
      );
      break;
    case "get_in_app_placement_content": {
      if (!args.email && !args.externalId && !args.subscriberId) {
        throw new Error(
          "Provide `email`, `externalId` or `subscriberId` when calling `get_in_app_placement_content`."
        );
      }
      const placements = Array.isArray(args.placements)
        ? args.placements.map(String)
        : [];
      if (placements.length === 0) {
        throw new Error(
          "Provide `placements` (up to 10 placement keys) when calling `get_in_app_placement_content`."
        );
      }
      const search = new URLSearchParams();
      for (const field of ["email", "externalId", "subscriberId", "actions"]) {
        const value = args[field];
        if (typeof value === "string" && value !== "") search.set(field, value);
      }
      search.set("placements", placements.join(","));
      result = await apiRequest(
        "GET",
        `/api/v1/in-app/placement-feed?${search.toString()}`,
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
