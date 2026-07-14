import { apiRequest } from "../../runtime.js";
import {
  AVAILABLE_TAG_COLORS,
  normalizeSegmentFilters,
  normalizeSegmentRoot,
  validateCreateSegmentArgs,
  validateUpdateSegmentArgs,
  optionalString,
  requiredString,
  optionalAllowedString,
  requiredAllowedString,
  requireEmailArray,
} from "../internal.js";

export async function handleAudienceTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_tags": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest("GET", "/api/v1/tags", undefined, companyId);
      break;
    }

    case "create_tag": {
      const companyId = args.companyId as string | undefined;
      const name = requiredString("create_tag", args, "name");
      const color = optionalAllowedString(
        "create_tag",
        args,
        "color",
        AVAILABLE_TAG_COLORS
      );
      result = await apiRequest(
        "POST",
        "/api/v1/tags",
        {
          name,
          ...(color !== undefined && { color }),
        },
        companyId
      );
      break;
    }

    case "update_tag": {
      const companyId = args.companyId as string | undefined;
      const tagId = requiredString("update_tag", args, "tagId");
      const color = requiredAllowedString(
        "update_tag",
        args,
        "color",
        AVAILABLE_TAG_COLORS
      );
      result = await apiRequest(
        "PATCH",
        `/api/v1/tags/${encodeURIComponent(tagId)}`,
        { color },
        companyId
      );
      break;
    }

    case "delete_tag": {
      const companyId = args.companyId as string | undefined;
      const tagId = requiredString("delete_tag", args, "tagId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/tags/${encodeURIComponent(tagId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_lists": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest("GET", "/api/v1/lists", undefined, companyId);
      break;
    }

    case "create_list": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest("POST", "/api/v1/lists", args, companyId);
      break;
    }

    case "update_list": {
      const companyId = args.companyId as string | undefined;
      const listId = requiredString("update_list", args, "listId");

      if (
        args.name === undefined &&
        args.description === undefined &&
        args.isPrivate === undefined
      ) {
        throw new Error(
          "Provide at least one of `name`, `description`, or `isPrivate` when calling `update_list`."
        );
      }

      if (
        args.name !== undefined &&
        optionalString(args, "name") === undefined
      ) {
        throw new Error("`name` cannot be empty when calling `update_list`.");
      }

      if (
        args.description !== undefined &&
        args.description !== null &&
        typeof args.description !== "string"
      ) {
        throw new Error(
          "`description` must be a string or null when calling `update_list`."
        );
      }

      if (args.isPrivate !== undefined && typeof args.isPrivate !== "boolean") {
        throw new Error(
          "`isPrivate` must be a boolean when calling `update_list`."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/lists/${encodeURIComponent(listId)}`,
        {
          ...(args.name !== undefined && {
            name: optionalString(args, "name"),
          }),
          ...(args.description !== undefined && {
            description: args.description,
          }),
          ...(args.isPrivate !== undefined && { isPrivate: args.isPrivate }),
        },
        companyId
      );
      break;
    }

    case "delete_list": {
      const companyId = args.companyId as string | undefined;
      const listId = requiredString("delete_list", args, "listId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/lists/${encodeURIComponent(listId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "add_subscribers_to_list": {
      const companyId = args.companyId as string | undefined;
      const listId = requiredString("add_subscribers_to_list", args, "listId");
      const emails = requireEmailArray("add_subscribers_to_list", args);
      const duplicateStrategy =
        optionalAllowedString(
          "add_subscribers_to_list",
          args,
          "duplicateStrategy",
          ["skip", "merge", "overwrite"]
        ) ?? "skip";
      const optInMode =
        optionalAllowedString("add_subscribers_to_list", args, "optInMode", [
          "default",
          "confirmed",
          "double_opt_in",
        ]) ?? "default";

      result = await apiRequest(
        "POST",
        `/api/v1/lists/${encodeURIComponent(listId)}/subscribers`,
        {
          emails,
          duplicateStrategy,
          enrollInSequences: args.enrollInSequences === true,
          optInMode,
        },
        companyId
      );
      break;
    }

    case "remove_subscribers_from_list": {
      const companyId = args.companyId as string | undefined;
      const listId = requiredString(
        "remove_subscribers_from_list",
        args,
        "listId"
      );
      const emails = requireEmailArray("remove_subscribers_from_list", args);
      result = await apiRequest(
        "POST",
        `/api/v1/lists/${encodeURIComponent(listId)}/subscribers/remove`,
        { emails },
        companyId
      );
      break;
    }

    case "list_segments": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/segments",
        undefined,
        companyId
      );
      break;
    }

    case "create_segment": {
      validateCreateSegmentArgs(args);

      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/segments",
        {
          ...args,
          ...(args.filters !== undefined
            ? { filters: normalizeSegmentFilters(args.filters) }
            : {}),
          ...(args.root !== undefined
            ? { root: normalizeSegmentRoot(args.root) }
            : {}),
        },
        companyId
      );
      break;
    }

    case "update_segment": {
      validateUpdateSegmentArgs(args);

      const companyId = args.companyId as string | undefined;
      const segmentId = requiredString("update_segment", args, "segmentId");
      const name = optionalString(args, "name");
      const filterJoinOperator = optionalAllowedString(
        "update_segment",
        args,
        "filterJoinOperator",
        ["and", "or"]
      );

      result = await apiRequest(
        "PATCH",
        `/api/v1/segments/${encodeURIComponent(segmentId)}`,
        {
          ...(name !== undefined && { name }),
          ...(filterJoinOperator !== undefined && { filterJoinOperator }),
          ...(args.filters !== undefined
            ? { filters: normalizeSegmentFilters(args.filters) }
            : {}),
          ...(args.root !== undefined
            ? { root: normalizeSegmentRoot(args.root) }
            : {}),
        },
        companyId
      );
      break;
    }

    case "delete_segment": {
      const companyId = args.companyId as string | undefined;
      const segmentId = requiredString("delete_segment", args, "segmentId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/segments/${encodeURIComponent(segmentId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_segment_count": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/segments/${args.segmentId}/count`,
        undefined,
        companyId
      );
      break;
    }

    // Audience Syncs
    case "list_audience_syncs": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/audience-syncs",
        undefined,
        companyId
      );
      break;
    }

    case "list_ad_accounts": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/ad-accounts",
        undefined,
        companyId
      );
      break;
    }

    case "create_audience_sync": {
      const companyId = args.companyId as string | undefined;
      const segmentId = optionalString(args, "segmentId");
      const predefinedSegmentId = optionalString(args, "predefinedSegmentId");

      if (segmentId && predefinedSegmentId) {
        throw new Error(
          "Provide either `segmentId` or `predefinedSegmentId` when calling `create_audience_sync`, not both."
        );
      }
      if (!segmentId && !predefinedSegmentId) {
        throw new Error(
          "Provide either `segmentId` or `predefinedSegmentId` when calling `create_audience_sync`."
        );
      }

      result = await apiRequest(
        "POST",
        "/api/v1/audience-syncs",
        {
          segmentId,
          predefinedSegmentId,
          adAccountId: requiredString(
            "create_audience_sync",
            args,
            "adAccountId"
          ),
          audienceName: requiredString(
            "create_audience_sync",
            args,
            "audienceName"
          ),
          ...(args.frequency !== undefined
            ? { frequency: args.frequency }
            : {}),
        },
        companyId
      );
      break;
    }

    case "update_audience_sync": {
      const companyId = args.companyId as string | undefined;
      const syncId = requiredString("update_audience_sync", args, "syncId");
      result = await apiRequest(
        "PATCH",
        `/api/v1/audience-syncs/${encodeURIComponent(syncId)}`,
        {
          ...(args.frequency !== undefined
            ? { frequency: args.frequency }
            : {}),
          ...(args.isActive !== undefined ? { isActive: args.isActive } : {}),
        },
        companyId
      );
      break;
    }

    case "delete_audience_sync": {
      const companyId = args.companyId as string | undefined;
      const syncId = requiredString("delete_audience_sync", args, "syncId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/audience-syncs/${encodeURIComponent(syncId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "sync_audience_now": {
      const companyId = args.companyId as string | undefined;
      const syncId = requiredString("sync_audience_now", args, "syncId");
      result = await apiRequest(
        "POST",
        `/api/v1/audience-syncs/${encodeURIComponent(syncId)}/sync`,
        undefined,
        companyId
      );
      break;
    }

    // Templates
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
