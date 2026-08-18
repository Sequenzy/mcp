import { apiRequest } from "../../runtime.js";
import { optionalString } from "../internal.js";

/**
 * Served from the API rather than bundled, so the reference an agent reads is
 * the one the deployed validator enforces. A copy compiled into this package
 * would drift the moment a block type gained a field.
 */
export async function handleEmailBlockTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name !== "get_email_block_schema") {
    return { handled: false, result: undefined };
  }

  const blockType = optionalString(args, "blockType");

  if (blockType !== undefined) {
    const result = await apiRequest(
      "GET",
      `/api/v1/email-blocks/${encodeURIComponent(blockType)}`
    );

    return { handled: true, result };
  }

  const path =
    args.creatableOnly === true
      ? "/api/v1/email-blocks?creatableOnly=true"
      : "/api/v1/email-blocks";

  const result = await apiRequest("GET", path);

  return { handled: true, result };
}
