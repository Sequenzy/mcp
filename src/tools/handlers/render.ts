import { apiRequest } from "../../runtime.js";
import { optionalString, requiredString } from "../internal.js";

/**
 * Resolve the single render target the caller asked for. Three ids map to
 * three endpoints, so ambiguity has to fail loudly rather than silently
 * picking one and rendering the wrong email.
 */
function resolveRenderPath(args: Record<string, unknown>): string {
  const campaignId = optionalString(args, "campaignId");
  const sequenceId = optionalString(args, "sequenceId");
  const templateId = optionalString(args, "templateId");

  const targets = [campaignId, sequenceId, templateId].filter(
    (value) => value !== undefined
  );

  if (targets.length === 0) {
    throw new Error(
      "render_email requires one of campaignId, sequenceId plus nodeId, or templateId."
    );
  }

  if (targets.length > 1) {
    throw new Error(
      "render_email accepts exactly one of campaignId, sequenceId, or templateId."
    );
  }

  if (campaignId !== undefined) {
    return `/api/v1/campaigns/${encodeURIComponent(campaignId)}/render`;
  }

  if (sequenceId !== undefined) {
    const nodeId = requiredString("render_email", args, "nodeId");
    return `/api/v1/sequences/${encodeURIComponent(
      sequenceId
    )}/nodes/${encodeURIComponent(nodeId)}/render`;
  }

  return `/api/v1/templates/${encodeURIComponent(templateId as string)}/render`;
}

const RENDER_BODY_KEYS = [
  "subscriberId",
  "subscriber",
  "variables",
  "locale",
  "variantId",
  "tracking",
] as const;

export async function handleRenderTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name !== "render_email") {
    return { handled: false, result: undefined };
  }

  const path = resolveRenderPath(args);
  const body: Record<string, unknown> = {};
  for (const key of RENDER_BODY_KEYS) {
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
