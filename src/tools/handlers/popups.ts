import { apiRequest } from "../../runtime.js";
import { isRecord, requiredString } from "../internal.js";

function popupMutationBody(
  toolName: string,
  args: Record<string, unknown>,
  requireUpdate: boolean
): Record<string, unknown> {
  if (args.content !== undefined && !isRecord(args.content)) {
    throw new Error(
      `\`content\` must be an object when calling \`${toolName}\`.`
    );
  }

  const body = {
    ...(args.name !== undefined && { name: args.name }),
    ...(args.content !== undefined && { content: args.content }),
  };
  if (requireUpdate && Object.keys(body).length === 0) {
    throw new Error(
      `Provide at least one of \`name\` or \`content\` when calling \`${toolName}\`.`
    );
  }
  return body;
}

export async function handleSavedPopupTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  let result: unknown;

  switch (name) {
    case "list_popups":
      result = await apiRequest("GET", "/api/v1/popups", undefined, companyId);
      break;

    case "get_popup": {
      const popupId = requiredString(name, args, "popupId");
      result = await apiRequest(
        "GET",
        `/api/v1/popups/${encodeURIComponent(popupId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_popup": {
      const popupName = requiredString(name, args, "name");
      if (args.template !== undefined && args.content !== undefined) {
        throw new Error(
          "Provide either `template` or `content` when calling `create_popup`, not both."
        );
      }
      if (args.content !== undefined && !isRecord(args.content)) {
        throw new Error(
          "`content` must be an object when calling `create_popup`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/popups",
        {
          name: popupName,
          ...(args.template !== undefined && { template: args.template }),
          ...(args.content !== undefined && { content: args.content }),
        },
        companyId
      );
      break;
    }

    case "update_popup": {
      const popupId = requiredString(name, args, "popupId");
      result = await apiRequest(
        "PATCH",
        `/api/v1/popups/${encodeURIComponent(popupId)}`,
        popupMutationBody(name, args, true),
        companyId
      );
      break;
    }

    case "publish_popup":
    case "unpublish_popup": {
      const popupId = requiredString(name, args, "popupId");
      const action = name === "publish_popup" ? "publish" : "unpublish";
      result = await apiRequest(
        "POST",
        `/api/v1/popups/${encodeURIComponent(popupId)}/${action}`,
        popupMutationBody(name, args, false),
        companyId
      );
      break;
    }

    case "delete_popup": {
      const popupId = requiredString(name, args, "popupId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/popups/${encodeURIComponent(popupId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_popup_embed": {
      const popupId = requiredString(name, args, "popupId");
      result = await apiRequest(
        "GET",
        `/api/v1/popups/embed/${encodeURIComponent(popupId)}`,
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
