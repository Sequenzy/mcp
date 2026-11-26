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
  // Repeated across analytics read tools.
  [
    /^If true, include machine-classified bot\/scanner opens and clicks\. Defaults to false, so metrics and activity are human-only\.$/,
    "Include machine-classified bot opens/clicks (default false).",
  ],
  // Repeated on every sequence step schema (4 copies).
  [
    literal(
      "Wait until a date from the trigger event or a contact attribute before this step. Use this for renewal reminders, appointment follow-ups, trial-expiry nudges, due-date or anniversary timelines, and other subscriber-specific dates. The field value must be an ISO date string or Unix timestamp. For a per-contact timeline that contacts can join late (e.g. emails at 20, 12 and 4 weeks before a dueDate attribute), use source attribute with pastAction skip on every wait so late joiners only get the steps still ahead, and pastAction continue on a final wait that everyone should reach."
    ),
    "Wait until an ISO date/Unix timestamp from a trigger event property or contact attribute before this step (use source 'attribute' + pastAction 'skip' for late-joiner timelines).",
  ],
  [
    literal(
      "Wait until the next occurrence of a weekday inside a local-time window before this step, e.g. { day: 'sunday', startTime: '09:00', endTime: '12:00', timezone: 'America/Los_Angeles' }. timezoneSource: 'subscriber' uses each contact's own timezone. Continues immediately when the step is reached inside the window, so a Sunday-morning enrollment is not pushed a full week. Add minimumWait: { days: 6 } to wait at least that long first and then release at the next window: one step instead of a fixed delay followed by a separate weekday wait. Place it immediately before the email when the send day matters - it controls when the flow resumes, so any step between it and the email shifts the send off the window (a sequence-level sendingWindow only holds emails at send time; it does not reschedule the graph)."
    ),
    "Wait until a weekday local-time window before this step, e.g. { day: 'sunday', startTime: '09:00', endTime: '12:00', timezone: 'America/Los_Angeles' }; supports timezoneSource: 'subscriber' and minimumWait. Place directly before the email.",
  ],
  [
    literal(
      "Fixed delay before this step. For a dynamic wait-until-date delay, either set mode:'until_date' plus untilDateField here, or use waitUntil. For a wait-until-weekday-window delay, either set mode:'until_weekday' plus untilDays/untilStartTime/untilTimezone here, or use waitUntilWeekday (use waitUntilWeekday.minimumWait to wait a few days first; days/hours/minutes here are ignored in that mode)."
    ),
    "Fixed delay before this step (or mode:'until_date' / mode:'until_weekday'; prefer waitUntil / waitUntilWeekday).",
  ],
  [
    literal(
      "Where field is read from. event (default) reads the trigger event properties and needs an event trigger. attribute reads the contact's custom attributes when the step is reached, so it works with any trigger. If the date moves later while a contact is waiting, the contact waits for the new date; moving it earlier does not release them sooner, and a date removed while waiting follows missingAction."
    ),
    "Date source: 'event' (default, trigger event properties) or 'attribute' (contact custom attributes; works with any trigger).",
  ],
  [
    literal(
      "Wait relative to one of the sequence's key dates before this step, e.g. { key: 'black_friday_starts', days: 7, direction: 'before' } or { key: 'black_friday_ends', hours: 1 }. The key must exist in the sequence's keyDates. pastAction decides what a late enrollee does when the moment already passed: skip (default) skips the following steps until the next wait, continue sends immediately, exit ends the enrollment. Use with a manual trigger for one-time countdown campaigns."
    ),
    "Wait relative to a sequence keyDates entry before this step, e.g. { key: 'black_friday_starts', days: 7, direction: 'before' }. pastAction: skip (default), continue, or exit.",
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
