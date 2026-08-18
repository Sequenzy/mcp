import { apiRequest } from "../../runtime.js";
import { optionalString } from "../internal.js";

/**
 * Thin pass-through to `/api/v1/events/schemas` so MCP, CLI, and REST cannot
 * disagree about what an event payload contains.
 */
export async function handleEventSchemaTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name !== "get_event_schema") {
    return { handled: false, result: undefined };
  }

  const params = new URLSearchParams();
  const eventName = optionalString(args, "eventName");
  if (eventName) {
    params.set("eventName", eventName);
  }
  const provider = optionalString(args, "provider");
  if (provider) {
    params.set("provider", provider);
  }

  const queryString = params.toString();
  const result = await apiRequest(
    "GET",
    `/api/v1/events/schemas${queryString ? `?${queryString}` : ""}`,
    undefined,
    optionalString(args, "companyId")
  );

  return { handled: true, result };
}
