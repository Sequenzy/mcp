import { apiRequest } from "../../runtime.js";
import { optionalString } from "../internal.js";

/** Pass-through to /references; the API validates input. */
export async function handleEmailReferenceTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name !== "list_email_references") {
    return { handled: false, result: undefined };
  }
  const params = new URLSearchParams({
    kind: optionalString(args, "kind") ?? "",
  });
  const scope = optionalString(args, "scope");
  if (scope) params.set("scope", scope);
  const search = optionalString(args, "search");
  if (search) params.set("q", search);
  if (typeof args["page"] === "number") {
    params.set("page", String(args["page"]));
  }
  const subtype = optionalString(args, "subtype");
  if (subtype) params.set("subtype", subtype);
  if (typeof args["limit"] === "number") {
    params.set("limit", String(args["limit"]));
  }
  return {
    handled: true,
    result: await apiRequest(
      "GET",
      `/api/v1/references?${params.toString()}`,
      undefined,
      optionalString(args, "companyId")
    ),
  };
}
