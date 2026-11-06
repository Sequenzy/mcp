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
  if (name === "preview_cart_items") {
    const result = await apiRequest(
      "POST",
      "/api/v1/email-blocks/line-items/assist",
      {
        items: args.items === undefined ? [] : args.items,
        ...(args.priceUnit !== undefined ? { priceUnit: args.priceUnit } : {}),
        ...(args.itemFields !== undefined
          ? { itemFields: args.itemFields }
          : {}),
        ...(args.scenario !== undefined ? { scenario: args.scenario } : {}),
      }
    );
    return { handled: true, result };
  }
  if (name !== "get_email_block_schema") {
    return { handled: false, result: undefined };
  }

  const blockType = optionalString(args, "blockType");

  if (blockType !== undefined) {
    // The condition table is ~9.7KB, which is over four times the size of a
    // single block type's reference, so a targeted lookup does not pay for it
    // unless it asked or unless conditions are the point of the type. The
    // response says the table exists either way.
    const conditionFields =
      args.conditionFields === true ? "?conditionFields=true" : "";
    const result = await apiRequest(
      "GET",
      `/api/v1/email-blocks/${encodeURIComponent(blockType)}${conditionFields}`
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
