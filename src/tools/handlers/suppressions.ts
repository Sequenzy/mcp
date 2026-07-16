import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

export async function handleSuppressionTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
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
