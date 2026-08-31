import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

function readAttioListMap(
  value: unknown,
  fieldPath: string,
  toolName: string
): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `\`${fieldPath}\` must be an object when calling \`${toolName}\`.`
    );
  }

  const listMap: Record<string, string> = {};
  for (const [listId, target] of Object.entries(value)) {
    if (!listId.trim() || typeof target !== "string" || !target.trim()) {
      throw new Error(
        `\`${fieldPath}\` must map non-empty Sequenzy list IDs to non-empty Attio list IDs or slugs when calling \`${toolName}\`.`
      );
    }
    listMap[listId] = target;
  }
  return listMap;
}

/**
 * Integration inspection and management tools.
 *
 * Every case is a thin pass-through to `/api/v1/integrations*` so the MCP,
 * CLI, and REST surfaces cannot disagree about what a provider does.
 */
export async function handleIntegrationTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  let result: unknown;

  switch (name) {
    case "connect_integration": {
      const provider = requiredString("connect_integration", args, "provider");
      // Attio is outbound-only and has no webhook secret. Every other
      // connectable provider still needs one so the agent fails locally
      // instead of round-tripping a 400.
      if (provider !== "attio") {
        requiredString("connect_integration", args, "webhookSecret");
      }
      if (provider === "attio") {
        requiredString("connect_integration", args, "apiKey");
      }
      const webhookSecret =
        typeof args.webhookSecret === "string" ? args.webhookSecret : undefined;
      const settings =
        args.settings !== undefined &&
        typeof args.settings === "object" &&
        args.settings !== null &&
        !Array.isArray(args.settings)
          ? (args.settings as Record<string, unknown>)
          : undefined;
      const attioListMap = readAttioListMap(
        settings?.listMap,
        "settings.listMap",
        "connect_integration"
      );
      result = await apiRequest(
        "POST",
        "/api/v1/integrations/connect",
        {
          provider,
          ...(webhookSecret ? { webhookSecret } : {}),
          ...(typeof args.apiKey === "string" && args.apiKey
            ? { apiKey: args.apiKey }
            : {}),
          ...(typeof args.providerAccountId === "string" &&
          args.providerAccountId
            ? { providerAccountId: args.providerAccountId }
            : {}),
          ...(settings
            ? {
                settings: {
                  ...(typeof settings.syncAllEvents === "boolean"
                    ? { syncAllEvents: settings.syncAllEvents }
                    : {}),
                  ...(Array.isArray(settings.eventAllowlist)
                    ? {
                        eventAllowlist: settings.eventAllowlist.filter(
                          (name): name is string => typeof name === "string"
                        ),
                      }
                    : {}),
                  ...(attioListMap !== undefined
                    ? { listMap: attioListMap }
                    : {}),
                  ...(typeof settings.syncCompanyFromDomain === "boolean"
                    ? {
                        syncCompanyFromDomain: settings.syncCompanyFromDomain,
                      }
                    : {}),
                },
              }
            : {}),
          ...(args.historyImport !== undefined
            ? { historyImport: args.historyImport }
            : {}),
        },
        companyId
      );
      break;
    }

    case "get_integration": {
      const integrationId = requiredString(
        "get_integration",
        args,
        "integrationId"
      );
      result = await apiRequest(
        "GET",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_integration_capabilities": {
      const params = new URLSearchParams();
      if (typeof args.provider === "string" && args.provider) {
        params.set("provider", args.provider);
      }
      if (typeof args.category === "string" && args.category) {
        params.set("category", args.category);
      }
      const queryString = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/integrations/catalog${queryString ? `?${queryString}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_integration_activity": {
      const params = new URLSearchParams();
      if (typeof args.integrationId === "string" && args.integrationId) {
        params.set("integrationId", args.integrationId);
      }
      if (typeof args.provider === "string" && args.provider) {
        params.set("provider", args.provider);
      }
      if (typeof args.status === "string" && args.status) {
        params.set("status", args.status);
      }
      if (typeof args.limit === "number") {
        params.set("limit", String(args.limit));
      }
      const queryString = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/integrations/activity${queryString ? `?${queryString}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "set_integration_sync_enabled": {
      const integrationId = requiredString(
        "set_integration_sync_enabled",
        args,
        "integrationId"
      );
      if (typeof args.syncEnabled !== "boolean") {
        throw new Error(
          "`syncEnabled` must be a boolean when calling `set_integration_sync_enabled`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
        { syncEnabled: args.syncEnabled },
        companyId
      );
      break;
    }

    case "set_integration_list_targeting": {
      const integrationId = requiredString(
        "set_integration_list_targeting",
        args,
        "integrationId"
      );

      // `null` is a real instruction here (fall back to the workspace default
      // lists), so it must survive both the missing-argument check and the
      // check that rejects a malformed value.
      if (args.listIds === undefined) {
        throw new Error(
          "`listIds` is required when calling `set_integration_list_targeting`. Pass an array of list IDs, `[]` to join no list, or null to fall back to the workspace default lists."
        );
      }
      if (args.listIds !== null && !Array.isArray(args.listIds)) {
        throw new Error(
          "`listIds` must be an array of list IDs, or null to fall back to the workspace default lists."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}`,
        { listIds: args.listIds },
        companyId
      );
      break;
    }

    case "get_integration_pixel": {
      const integrationId = requiredString(
        "get_integration_pixel",
        args,
        "integrationId"
      );
      result = await apiRequest(
        "GET",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/pixel`,
        undefined,
        companyId
      );
      break;
    }

    case "activate_integration_pixel": {
      const integrationId = requiredString(
        "activate_integration_pixel",
        args,
        "integrationId"
      );
      result = await apiRequest(
        "POST",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/pixel`,
        undefined,
        companyId
      );
      break;
    }

    case "sync_integration": {
      const integrationId = requiredString(
        "sync_integration",
        args,
        "integrationId"
      );
      result = await apiRequest(
        "POST",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/sync`,
        undefined,
        companyId
      );
      break;
    }

    case "get_attio_mapping": {
      const integrationId = requiredString(
        "get_attio_mapping",
        args,
        "integrationId"
      );
      result = await apiRequest(
        "GET",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/attio`,
        undefined,
        companyId
      );
      break;
    }

    case "update_attio_settings": {
      const integrationId = requiredString(
        "update_attio_settings",
        args,
        "integrationId"
      );
      const listMap = readAttioListMap(
        args.listMap,
        "listMap",
        "update_attio_settings"
      );
      if (
        listMap === undefined &&
        typeof args.syncCompanyFromDomain !== "boolean"
      ) {
        throw new Error(
          "Provide at least one of `listMap` or `syncCompanyFromDomain` when calling `update_attio_settings`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/attio`,
        {
          ...(listMap !== undefined ? { listMap } : {}),
          ...(typeof args.syncCompanyFromDomain === "boolean"
            ? { syncCompanyFromDomain: args.syncCompanyFromDomain }
            : {}),
        },
        companyId
      );
      break;
    }

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
