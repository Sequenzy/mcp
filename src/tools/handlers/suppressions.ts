import { apiRequest } from "../../runtime.js";
import {
  optionalIntegerInRange,
  optionalString,
  requiredString,
} from "../internal.js";

export async function handleSuppressionTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name === "list_recipient_suppressions") {
    const companyId = optionalString(args, "companyId");
    const search = optionalString(args, "search");
    const page = optionalIntegerInRange(
      name,
      args,
      "page",
      1,
      Number.MAX_SAFE_INTEGER
    );
    const limit = optionalIntegerInRange(name, args, "limit", 1, 100);
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (page !== undefined) query.set("page", String(page));
    if (limit !== undefined) query.set("limit", String(limit));
    const listPath = `/api/v1/suppressions${query.size > 0 ? `?${query}` : ""}`;

    return {
      handled: true,
      result: await apiRequest("GET", listPath, undefined, companyId),
    };
  }

  if (
    name !== "get_recipient_suppression" &&
    name !== "remove_recipient_suppression"
  ) {
    return { handled: false, result: undefined };
  }

  const companyId = optionalString(args, "companyId");
  const email = requiredString(name, args, "email");
  const region = optionalString(args, "region");
  const query = new URLSearchParams();
  if (region) query.set("region", region);
  const path = `/api/v1/suppressions/${encodeURIComponent(email)}${query.size > 0 ? `?${query}` : ""}`;
  const result = await apiRequest(
    name === "get_recipient_suppression" ? "GET" : "DELETE",
    path,
    undefined,
    companyId
  );

  return { handled: true, result };
}
