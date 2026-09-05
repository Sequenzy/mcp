import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

export async function handleEmailAiStyleTools(
  name: string,
  args: Record<string, unknown>
) {
  if (
    ![
      "get_email_ai_style",
      "save_email_ai_style",
      "clear_email_ai_style",
    ].includes(name)
  )
    return { handled: false, result: undefined };
  let body: Record<string, unknown> | undefined;
  if (name !== "get_email_ai_style") {
    const revision = args.expectedStyleId;
    if (
      !(name === "save_email_ai_style" && revision === null) &&
      (typeof revision !== "string" || !revision.trim())
    )
      throw new Error(
        "Pass expectedStyleId from get_email_ai_style; null is allowed only for an initial save."
      );
    body = { expectedStyleId: revision };
    if (name === "save_email_ai_style") {
      body["emailId"] = requiredString(name, args, "emailId");
      if (args.canvas !== undefined) body["canvas"] = args.canvas;
      if (args.layoutRuleIds !== undefined) {
        if (
          !Array.isArray(args.layoutRuleIds) ||
          args.layoutRuleIds.some((id) => typeof id !== "string" || !id.trim())
        )
          throw new Error(
            "layoutRuleIds must be an array of rule IDs from a saved style's layout.rules; pass [] to keep none."
          );
        body["layoutRuleIds"] = args.layoutRuleIds;
      }
      if (args.notes !== undefined) {
        if (typeof args.notes !== "string" || args.notes.length > 500)
          throw new Error("notes must be a string of at most 500 characters.");
        body["notes"] = args.notes;
      }
    }
  }
  return {
    handled: true,
    result: await apiRequest(
      name === "get_email_ai_style"
        ? "GET"
        : name === "save_email_ai_style"
          ? "PUT"
          : "DELETE",
      "/api/v1/email-ai-style",
      body,
      optionalString(args, "companyId")
    ),
  };
}
