import {
  blockConditionsHint,
  pollBlockHint,
  videoBlockHint,
} from "./descriptions.js";

/**
 * OpenAI rejects a tools/list over 1 MB, and every `blocks` parameter repeats
 * the same block guidance (about 20 copies). This surface lists shorter
 * versions that keep the shapes and rules an agent needs to write a valid
 * block and point to `get_email_block_schema` for the rest: per-field
 * condition operators and poll styling. Standard MCP keeps the full text.
 * Accepted inputs are unchanged; only descriptions shrink.
 */
export const openAiBlockConditionsHint =
  ' Any block accepts a `conditions` array so it only renders for matching recipients. To branch on a value passed in transactional `variables` or an automation `event` payload, use { "id": "c1", "field": "variable", "operator": "is", "value": "plan:pro" }; "attribute" uses the same "name:value" form. Live subscriber fields (such as "tag", "segment", "list", "event", and email engagement) use their segment-filter values and operators, e.g. { "id": "c2", "field": "tag", "operator": "contains", "value": "vip" }; call `get_email_block_schema` with conditionFields: true for each field\'s operators and value shape. Recipients without a stored subscriber match use the OTHERWISE branch or hide a conditionally displayed block. For if/else, use a { type: "conditional-group", conditions: [...], ifBranch: { children: [...] }, elseBranch: { children: [...] } } block.';

export const openAiPollBlockHint =
  ' Polls and NPS surveys use a native poll block: { "type": "poll", "variant": "options", "question": "What did you think?", "options": [{ "label": "Loved it", "value": "loved" }], "attributeKey": "email_feedback" }, or "variant": "nps" with "options": []. `attributeKey` stores the latest response for segmentation. `allowMultiple: true` on a text-only options poll lets recipients pick several answers and stores the list (filter with attribute `contains`). Call `get_email_block_schema` with blockType "poll" for appearances, side-by-side answer layout, colors, typography, and the thank-you page.';

export const openAiVideoBlockHint =
  " A YouTube video block takes `videoUrl` and an optional `thumbnailUrl` still; replacing the blocks array without `thumbnailUrl` restores YouTube's own thumbnail.";

function literal(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
}

export const OPENAI_SIZE_TEXT_REWRITES: ReadonlyArray<
  readonly [pattern: RegExp, replacement: string]
> = [
  [literal(blockConditionsHint), openAiBlockConditionsHint],
  [literal(pollBlockHint), openAiPollBlockHint],
  [literal(videoBlockHint), openAiVideoBlockHint],
  // About 320 tools carry this companyId description.
  [
    /^Company ID\. If not provided, uses the currently selected company\.$/,
    "Company ID. Defaults to the selected company.",
  ],
];

/**
 * Tools whose `blocks` are a variant, translation or reusable piece of an
 * email. They point at create_template's `blocks` guidance instead of
 * repeating it; the main authoring tools keep it in full.
 */
export const OPENAI_SHARED_BLOCK_GUIDANCE_TOOLS: ReadonlySet<string> = new Set([
  "add_ab_test_variant",
  "create_ab_test",
  "create_campaign_variation",
  "create_email_component",
  "preview_default_email_component",
  "set_default_email_component",
  "set_template_localization",
  "update_ab_test_variant",
  "update_campaign_variation",
  "update_email_component",
]);

const SHARED_GUIDANCE_POINTER =
  " The rest of the block guidance (merge tags, conditions, button colors, polls, images, video, and core examples) is the same as for the `blocks` field of create_template; call `get_email_block_schema` for any block type's fields.";

const REPEATED_GUIDANCE_POINTER =
  " The rest of the block guidance (merge tags, conditions, button colors, polls, images, video, and core examples) is the same as for the first `blocks` field in this tool; call `get_email_block_schema` for any block type's fields.";

/**
 * Lists `guidance` (the OpenAI text of emailBlockGuidanceHint) once: in full
 * on the first `blocks` field of a main authoring tool, as a pointer
 * everywhere else. Only description text changes.
 */
export function shareOpenAiBlockGuidance<T>(
  toolName: string,
  schema: T,
  guidance: string
): T {
  let seen = OPENAI_SHARED_BLOCK_GUIDANCE_TOOLS.has(toolName);
  const pointer = seen ? SHARED_GUIDANCE_POINTER : REPEATED_GUIDANCE_POINTER;

  const visit = (value: unknown): unknown => {
    if (typeof value === "string") {
      if (!value.includes(guidance)) return value;
      if (!seen) {
        seen = true;
        return value;
      }
      return value.replace(guidance, () => pointer);
    }
    if (Array.isArray(value)) return value.map(visit);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, visit(nested)])
    );
  };

  return visit(schema) as T;
}
