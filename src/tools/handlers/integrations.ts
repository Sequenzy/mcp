import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

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
      const webhookSecret = requiredString(
        "connect_integration",
        args,
        "webhookSecret"
      );
      result = await apiRequest(
        "POST",
        "/api/v1/integrations/connect",
        {
          provider,
          webhookSecret,
          ...(typeof args.apiKey === "string" && args.apiKey
            ? { apiKey: args.apiKey }
            : {}),
          ...(typeof args.providerAccountId === "string" &&
          args.providerAccountId
            ? { providerAccountId: args.providerAccountId }
            : {}),
          ...(args.settings !== undefined ? { settings: args.settings } : {}),
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

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
