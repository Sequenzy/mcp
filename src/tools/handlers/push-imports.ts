import { apiRequest } from "../../runtime.js";
import { requiredString } from "../internal.js";

const CREATE_KEYS = [
  "source",
  "apiKey",
  "onesignalAppId",
  "brazeRestEndpoint",
  "brazeSegmentId",
  "customerIoRegion",
  "customerIoSegmentId",
  "platforms",
  "importAttributes",
  "appIds",
  "csv",
  "csvParts",
] as const;

/** Push subscription imports: pass-throughs to /api/v1/push/imports. */
export async function handlePushImportTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  const companyId = args.companyId as string | undefined;
  const importPath = (tool: string) =>
    `/api/v1/push/imports/${encodeURIComponent(
      requiredString(tool, args, "importId")
    )}`;
  let result: unknown;

  switch (name) {
    case "get_push_import_preflight": {
      const search = new URLSearchParams({
        source: requiredString(name, args, "source"),
      });
      if (Array.isArray(args.platforms) && args.platforms.length > 0) {
        search.set("platforms", args.platforms.map(String).join(","));
      }
      result = await apiRequest(
        "GET",
        `/api/v1/push/imports/preflight?${search.toString()}`,
        undefined,
        companyId
      );
      break;
    }
    case "list_push_imports":
      result = await apiRequest(
        "GET",
        `/api/v1/push/imports${
          typeof args.limit === "number" ? `?limit=${args.limit}` : ""
        }`,
        undefined,
        companyId
      );
      break;
    case "get_push_import":
      result = await apiRequest("GET", importPath(name), undefined, companyId);
      break;
    case "create_push_import": {
      requiredString(name, args, "source");
      const body: Record<string, unknown> = {};
      for (const key of CREATE_KEYS) {
        if (args[key] !== undefined) body[key] = args[key];
      }
      result = await apiRequest(
        "POST",
        "/api/v1/push/imports",
        body,
        companyId
      );
      break;
    }
    case "add_push_import_rows":
      result = await apiRequest(
        "POST",
        `${importPath(name)}/rows`,
        { csv: requiredString(name, args, "csv") },
        companyId
      );
      break;
    case "start_push_import":
      result = await apiRequest(
        "POST",
        `${importPath(name)}/start`,
        undefined,
        companyId
      );
      break;
    case "cancel_push_import":
      result = await apiRequest(
        "POST",
        `${importPath(name)}/cancel`,
        undefined,
        companyId
      );
      break;
    default:
      return { handled: false, result: undefined };
  }
  return { handled: true, result };
}
