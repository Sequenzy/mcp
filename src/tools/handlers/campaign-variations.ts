import { apiRequest } from "../../runtime.js";
import {
  optionalIntegerInRange,
  requiredString,
  validateHtmlOrBlocksArgs,
} from "../internal.js";
import { withVariationsWidget } from "../variations-widget.js";

const VARIATION_TOOLS = new Set([
  "list_campaign_variations",
  "get_campaign_variation",
  "generate_campaign_variations",
  "create_campaign_variation",
  "update_campaign_variation",
  "discard_campaign_variation",
  "restore_campaign_variation",
  "use_campaign_variation",
  "generate_campaign_variation_section_options",
  "edit_campaign_variation",
]);

const STYLES = ["close", "fresh", "bold"];

function optionalStyle(name: string, args: Record<string, unknown>) {
  if (args.style !== undefined && !STYLES.includes(args.style as string)) {
    throw new Error(
      `\`style\` must be one of ${STYLES.join(", ")} when calling \`${name}\`.`
    );
  }
}

function optionalPosition(name: string, args: Record<string, unknown>) {
  const position = args.position;
  if (position === undefined || position === null) return;
  const { x, y } = position as { x?: unknown; y?: unknown };
  if (
    typeof position !== "object" ||
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    throw new Error(
      `\`position\` must be {x, y} numbers or null when calling \`${name}\`.`
    );
  }
}

/** The request body: every argument except the ones that go in the path. */
function bodyOf(args: Record<string, unknown>) {
  const body = { ...args };
  delete body.companyId;
  delete body.campaignId;
  delete body.variationId;
  return body;
}

export async function handleCampaignVariationTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (!VARIATION_TOOLS.has(name)) return { handled: false, result: undefined };

  const companyId = args.companyId as string | undefined;
  const campaignId = encodeURIComponent(
    requiredString(name, args, "campaignId")
  );
  const base = `/api/v1/campaigns/${campaignId}/variations`;
  const widget = {
    target: "campaign" as const,
    campaignId: args.campaignId as string,
  };
  const variationPath = () =>
    `${base}/${encodeURIComponent(requiredString(name, args, "variationId"))}`;

  switch (name) {
    case "list_campaign_variations":
      return {
        handled: true,
        result: withVariationsWidget(
          await apiRequest("GET", base, undefined, companyId),
          widget,
          args
        ),
      };
    case "get_campaign_variation":
      return {
        handled: true,
        result: await apiRequest("GET", variationPath(), undefined, companyId),
      };
    case "generate_campaign_variations":
      requiredString(name, args, "prompt");
      optionalIntegerInRange(name, args, "count", 1, 4);
      optionalStyle(name, args);
      return {
        handled: true,
        result: withVariationsWidget(
          await apiRequest("POST", `${base}/generate`, bodyOf(args), companyId),
          widget,
          args,
          true
        ),
      };
    case "create_campaign_variation":
      requiredString(name, args, "name");
      validateHtmlOrBlocksArgs(name, args, { requireContent: true });
      return {
        handled: true,
        result: await apiRequest("POST", base, bodyOf(args), companyId),
      };
    case "update_campaign_variation":
      validateHtmlOrBlocksArgs(name, args);
      optionalPosition(name, args);
      return {
        handled: true,
        result: await apiRequest(
          "PATCH",
          variationPath(),
          bodyOf(args),
          companyId
        ),
      };
    case "discard_campaign_variation":
      return {
        handled: true,
        result: await apiRequest(
          "DELETE",
          variationPath(),
          undefined,
          companyId
        ),
      };
    case "restore_campaign_variation":
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          `${variationPath()}/restore`,
          undefined,
          companyId
        ),
      };
    case "use_campaign_variation":
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          `${variationPath()}/use`,
          undefined,
          companyId
        ),
      };
    case "edit_campaign_variation":
      requiredString(name, args, "prompt");
      if (args.sectionIds !== undefined && !Array.isArray(args.sectionIds)) {
        throw new Error(
          `\`sectionIds\` must be an array when calling \`${name}\`.`
        );
      }
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          `${variationPath()}/edit`,
          bodyOf(args),
          companyId
        ),
      };
    default: {
      requiredString(name, args, "prompt");
      optionalStyle(name, args);
      if (!Array.isArray(args.sectionIds) || args.sectionIds.length === 0) {
        throw new Error(
          `\`sectionIds\` must be a non-empty array when calling \`${name}\`.`
        );
      }
      optionalIntegerInRange(name, args, "count", 1, 4);
      const body = { ...args };
      delete body.companyId;
      delete body.campaignId;
      return {
        handled: true,
        result: await apiRequest(
          "POST",
          `${base}/section-options`,
          body,
          companyId
        ),
      };
    }
  }
}
