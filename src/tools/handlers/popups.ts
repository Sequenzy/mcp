import { apiRequest } from "../../runtime.js";
import { optionalAllowedString, requiredString } from "../internal.js";

/** Fields forwarded verbatim on both create and update. */
const SHARED_POPUP_BODY_KEYS = [
  "listIds",
  "tagIds",
  "headline",
  "description",
  "buttonText",
  "successMessage",
  "redirectUrl",
  "presentation",
  "placement",
  "trigger",
  "targeting",
  "schedule",
  "frequency",
  "visual",
  "theme",
  "blocks",
] as const;

export async function handleSavedPopupTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_popups": {
      const companyId = args.companyId as string | undefined;
      const includeContent = args.includeContent === true;
      result = await apiRequest(
        "GET",
        includeContent
          ? "/api/v1/popups?includeContent=true"
          : "/api/v1/popups",
        undefined,
        companyId
      );
      break;
    }

    case "get_popup": {
      const companyId = args.companyId as string | undefined;
      const popupId = requiredString("get_popup", args, "popupId");
      result = await apiRequest(
        "GET",
        `/api/v1/popups/${encodeURIComponent(popupId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_popup": {
      const companyId = args.companyId as string | undefined;
      const nameValue = requiredString("create_popup", args, "name");
      const duplicateStrategy = optionalAllowedString(
        "create_popup",
        args,
        "duplicateStrategy",
        ["skip", "merge", "overwrite"]
      );
      const status = optionalAllowedString("create_popup", args, "status", [
        "draft",
        "published",
      ]);
      const template = args.template as string | undefined;

      const body: Record<string, unknown> = { name: nameValue };

      for (const key of SHARED_POPUP_BODY_KEYS) {
        if (args[key] !== undefined) {
          body[key] = args[key];
        }
      }
      if (duplicateStrategy !== undefined) {
        body["duplicateStrategy"] = duplicateStrategy;
      }
      if (status !== undefined) {
        body["status"] = status;
      }
      if (template !== undefined) {
        body["template"] = template;
      }

      result = await apiRequest("POST", "/api/v1/popups", body, companyId);
      break;
    }

    case "update_popup": {
      const companyId = args.companyId as string | undefined;
      const popupId = requiredString("update_popup", args, "popupId");
      const duplicateStrategy = optionalAllowedString(
        "update_popup",
        args,
        "duplicateStrategy",
        ["skip", "merge", "overwrite"]
      );
      const status = optionalAllowedString("update_popup", args, "status", [
        "draft",
        "published",
      ]);

      const body: Record<string, unknown> = {};

      if (args.name !== undefined) {
        body["name"] = args.name;
      }
      for (const key of SHARED_POPUP_BODY_KEYS) {
        if (args[key] !== undefined) {
          body[key] = args[key];
        }
      }
      if (duplicateStrategy !== undefined) {
        body["duplicateStrategy"] = duplicateStrategy;
      }
      if (status !== undefined) {
        body["status"] = status;
      }
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Provide at least one field to change when calling `update_popup`."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/popups/${encodeURIComponent(popupId)}`,
        body,
        companyId
      );
      break;
    }

    case "get_popup_embed": {
      const companyId = args.companyId as string | undefined;
      const popupId = requiredString("get_popup_embed", args, "popupId");
      result = await apiRequest(
        "GET",
        `/api/v1/popups/embed/${encodeURIComponent(popupId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "duplicate_popup": {
      const companyId = args.companyId as string | undefined;
      const popupId = requiredString("duplicate_popup", args, "popupId");
      const body: Record<string, unknown> = {};
      if (args.name !== undefined) {
        body["name"] = args.name;
      }
      result = await apiRequest(
        "POST",
        `/api/v1/popups/${encodeURIComponent(popupId)}/duplicate`,
        body,
        companyId
      );
      break;
    }

    case "delete_popup": {
      const companyId = args.companyId as string | undefined;
      const popupId = requiredString("delete_popup", args, "popupId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/popups/${encodeURIComponent(popupId)}`,
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
