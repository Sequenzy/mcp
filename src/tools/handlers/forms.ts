import { apiRequest } from "../../runtime.js";
import { optionalAllowedString, requiredString } from "../internal.js";

export async function handleSavedFormTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_capture_submissions": {
      const sourceId = requiredString(name, args, "sourceId");
      const sourceType = requiredString(name, args, "sourceType");
      if (!["form", "popup", "landing_page"].includes(sourceType))
        throw new Error("Invalid sourceType");
      const query = new URLSearchParams();
      for (const key of ["cursor", "field", "value", "format"] as const) {
        if (args[key] !== undefined) {
          if (typeof args[key] !== "string")
            throw new Error(`${key} must be a string`);
          query.set(key, args[key]);
        }
      }
      if (args.limit !== undefined) {
        if (
          typeof args.limit !== "number" ||
          !Number.isInteger(args.limit) ||
          args.limit < 1 ||
          args.limit > 100
        )
          throw new Error("limit must be an integer from 1 to 100");
        query.set("limit", String(args.limit));
      }
      if ((args.field === undefined) !== (args.value === undefined))
        throw new Error("Provide both field and value");
      if (
        args.format !== undefined &&
        args.format !== "json" &&
        args.format !== "csv"
      )
        throw new Error("format must be json or csv");
      result = await apiRequest(
        "GET",
        `/api/v1/submissions/${sourceType}/${encodeURIComponent(sourceId)}?${query}`,
        undefined,
        args.companyId as string | undefined
      );
      break;
    }

    case "list_forms": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest("GET", "/api/v1/forms", undefined, companyId);
      break;
    }

    case "create_form": {
      const companyId = args.companyId as string | undefined;
      const nameValue = requiredString("create_form", args, "name");
      const listIds = Array.isArray(args.listIds)
        ? args.listIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
        : [];
      if (listIds.length === 0) {
        throw new Error(
          "`listIds` must contain at least one list ID when calling `create_form`."
        );
      }
      const duplicateStrategy = optionalAllowedString(
        "create_form",
        args,
        "duplicateStrategy",
        ["skip", "merge", "overwrite"]
      );
      const resubscribeBehavior = optionalAllowedString(
        "create_form",
        args,
        "resubscribeBehavior",
        ["reactivate", "double_opt_in"]
      );
      const body: Record<string, unknown> = {
        name: nameValue,
        listIds,
      };

      for (const key of [
        "tagIds",
        "buttonText",
        "headline",
        "description",
        "successMessage",
        "redirectUrl",
        "showFirstName",
        "showLastName",
        "botProtection",
        "theme",
      ]) {
        if (args[key] !== undefined) {
          body[key] = args[key];
        }
      }
      if (duplicateStrategy !== undefined) {
        body["duplicateStrategy"] = duplicateStrategy;
      }
      if (resubscribeBehavior !== undefined) {
        body["resubscribeBehavior"] = resubscribeBehavior;
      }

      result = await apiRequest("POST", "/api/v1/forms", body, companyId);
      break;
    }

    case "update_form": {
      const companyId = args.companyId as string | undefined;
      const formId = requiredString("update_form", args, "formId");
      const duplicateStrategy = optionalAllowedString(
        "update_form",
        args,
        "duplicateStrategy",
        ["skip", "merge", "overwrite"]
      );
      const resubscribeBehavior = optionalAllowedString(
        "update_form",
        args,
        "resubscribeBehavior",
        ["reactivate", "double_opt_in"]
      );
      const body: Record<string, unknown> = {};

      for (const key of [
        "name",
        "listIds",
        "tagIds",
        "buttonText",
        "headline",
        "description",
        "successMessage",
        "redirectUrl",
        "botProtection",
        "theme",
        "blocks",
      ]) {
        if (args[key] !== undefined) {
          body[key] = args[key];
        }
      }
      if (duplicateStrategy !== undefined) {
        body["duplicateStrategy"] = duplicateStrategy;
      }
      if (resubscribeBehavior !== undefined) {
        body["resubscribeBehavior"] = resubscribeBehavior;
      }
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Provide at least one field to change when calling `update_form`."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/forms/${encodeURIComponent(formId)}`,
        body,
        companyId
      );
      break;
    }

    case "get_form_embed": {
      const companyId = args.companyId as string | undefined;
      const formId = requiredString("get_form_embed", args, "formId");
      result = await apiRequest(
        "GET",
        `/api/v1/forms/embed/${encodeURIComponent(formId)}`,
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
