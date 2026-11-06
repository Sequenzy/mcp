import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

/**
 * Resolve the single target the caller asked for. Three ids map to three
 * endpoints, so ambiguity has to fail loudly rather than silently picking one
 * and rendering (or checking) the wrong email.
 */
function resolveEmailTargetPath(
  toolName: "render_email" | "check_email",
  action: "render" | "check",
  args: Record<string, unknown>
): string {
  const campaignId = optionalString(args, "campaignId");
  const sequenceId = optionalString(args, "sequenceId");
  const templateId = optionalString(args, "templateId");

  const targets = [campaignId, sequenceId, templateId].filter(
    (value) => value !== undefined
  );

  if (targets.length === 0) {
    throw new Error(
      `${toolName} requires one of campaignId, sequenceId plus nodeId, or templateId.`
    );
  }

  if (targets.length > 1) {
    throw new Error(
      `${toolName} accepts exactly one of campaignId, sequenceId, or templateId.`
    );
  }

  if (campaignId !== undefined) {
    return `/api/v1/campaigns/${encodeURIComponent(campaignId)}/${action}`;
  }

  if (sequenceId !== undefined) {
    const nodeId = requiredString(toolName, args, "nodeId");
    return `/api/v1/sequences/${encodeURIComponent(
      sequenceId
    )}/nodes/${encodeURIComponent(nodeId)}/${action}`;
  }

  return `/api/v1/templates/${encodeURIComponent(
    templateId as string
  )}/${action}`;
}

const RENDER_BODY_KEYS = [
  "subscriberId",
  "subscriber",
  "variables",
  "locale",
  "variantId",
  "variationId",
  "tracking",
] as const;

const CHECK_BODY_KEYS = [
  "subscriberId",
  "subscriber",
  "variables",
  "locale",
  "variantId",
  "variationId",
  "links",
] as const;

export async function handleRenderTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name !== "render_email" && name !== "check_email") {
    return { handled: false, result: undefined };
  }

  const isCheck = name === "check_email";
  const path = resolveEmailTargetPath(name, isCheck ? "check" : "render", args);
  const body: Record<string, unknown> = {};
  for (const key of isCheck ? CHECK_BODY_KEYS : RENDER_BODY_KEYS) {
    if (args[key] !== undefined) {
      body[key] = args[key];
    }
  }

  const result = await apiRequest(
    "POST",
    path,
    body,
    optionalString(args, "companyId")
  );

  return { handled: true, result };
}
