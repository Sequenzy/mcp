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

/** SparkLoop list targeting: null resets to defaults; ids are never dropped. */
function readListIds(value: unknown): string[] | null | undefined {
  if (value === undefined || value === null) return value;
  if (
    !Array.isArray(value) ||
    value.some((id) => typeof id !== "string" || !id.trim())
  ) {
    throw new Error(
      "`settings.listIds` must be an array of list IDs, or null, when calling `connect_integration`."
    );
  }
  return value as string[];
}

function readAttioStringMap(
  value: unknown,
  fieldPath: string,
  keyLabel: string,
  valueLabel: string
): Record<string, string> | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(
      `\`${fieldPath}\` must be an object when calling \`update_attio_settings\`.`
    );
  }
  const map: Record<string, string> = {};
  for (const [key, target] of Object.entries(value)) {
    if (!key.trim() || typeof target !== "string" || !target.trim()) {
      throw new Error(
        `\`${fieldPath}\` must map non-empty ${keyLabel} to non-empty ${valueLabel} when calling \`update_attio_settings\`.`
      );
    }
    map[key] = target;
  }
  return map;
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
      // Attio registers its own webhook, so it has no webhook secret; Lemon
      // Squeezy and SparkLoop generate one when it is omitted. Every other
      // connectable provider still needs one so the agent fails locally
      // instead of round-tripping a 400.
      if (
        provider !== "attio" &&
        provider !== "lemon_squeezy" &&
        provider !== "sparkloop"
      ) {
        requiredString("connect_integration", args, "webhookSecret");
      }
      if (provider === "attio" || provider === "sparkloop") {
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
      const listIds = readListIds(settings?.listIds);
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
                  ...(typeof settings.skipInternalEvents === "boolean"
                    ? { skipInternalEvents: settings.skipInternalEvents }
                    : {}),
                  ...(provider === "posthog" &&
                  typeof settings.matchByDistinctId === "boolean"
                    ? { matchByDistinctId: settings.matchByDistinctId }
                    : {}),
                  ...(attioListMap !== undefined
                    ? { listMap: attioListMap }
                    : {}),
                  ...(typeof settings.syncCompanyFromDomain === "boolean"
                    ? {
                        syncCompanyFromDomain: settings.syncCompanyFromDomain,
                      }
                    : {}),
                  ...(listIds !== undefined ? { listIds } : {}),
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

    case "list_integration_suggestions": {
      result = await apiRequest(
        "GET",
        "/api/v1/integrations/suggestions",
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

    case "disconnect_integration": {
      const integrationId = requiredString(name, args, "integrationId");
      result = await apiRequest(
        "POST",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/disconnect`,
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

    case "update_amplitude_settings": {
      const integrationId = requiredString(
        "update_amplitude_settings",
        args,
        "integrationId"
      );
      if (
        args.eventAllowlist !== undefined &&
        (!Array.isArray(args.eventAllowlist) ||
          args.eventAllowlist.some((name) => typeof name !== "string"))
      ) {
        throw new Error(
          "`eventAllowlist` must be an array of event names when calling `update_amplitude_settings`."
        );
      }
      const patch = {
        ...(typeof args.syncAllEvents === "boolean"
          ? { syncAllEvents: args.syncAllEvents }
          : {}),
        ...(Array.isArray(args.eventAllowlist)
          ? { eventAllowlist: args.eventAllowlist as string[] }
          : {}),
        ...(typeof args.skipInternalEvents === "boolean"
          ? { skipInternalEvents: args.skipInternalEvents }
          : {}),
      };
      if (Object.keys(patch).length === 0) {
        throw new Error(
          "Provide at least one of `syncAllEvents`, `eventAllowlist`, or `skipInternalEvents` when calling `update_amplitude_settings`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/amplitude`,
        patch,
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
      const tagMap = readAttioStringMap(
        args.tagMap,
        "tagMap",
        "Sequenzy tags",
        "Attio list IDs or slugs"
      );
      const inboundListMap = readAttioStringMap(
        args.inboundListMap,
        "inboundListMap",
        "Attio list IDs or slugs",
        "Sequenzy list IDs"
      );
      const inboundTagMap = readAttioStringMap(
        args.inboundTagMap,
        "inboundTagMap",
        "Attio list IDs or slugs",
        "Sequenzy tags"
      );
      const patch = {
        ...(listMap !== undefined ? { listMap } : {}),
        ...(tagMap !== undefined ? { tagMap } : {}),
        ...(inboundListMap !== undefined ? { inboundListMap } : {}),
        ...(inboundTagMap !== undefined ? { inboundTagMap } : {}),
        ...(typeof args.syncRemovals === "boolean"
          ? { syncRemovals: args.syncRemovals }
          : {}),
        ...(typeof args.syncCompanyFromDomain === "boolean"
          ? { syncCompanyFromDomain: args.syncCompanyFromDomain }
          : {}),
      };
      if (Object.keys(patch).length === 0) {
        throw new Error(
          "Provide at least one of `listMap`, `tagMap`, `inboundListMap`, `inboundTagMap`, `syncRemovals`, or `syncCompanyFromDomain` when calling `update_attio_settings`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/integrations/${encodeURIComponent(integrationId)}/attio`,
        patch,
        companyId
      );
      break;
    }

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
