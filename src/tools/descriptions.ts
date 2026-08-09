import { coreEmailBlockExamples } from "./email-block-examples.generated.js";

export const blockConditionsHint =
  ' Any block accepts a `conditions` array so it only renders for matching recipients. To branch on a value passed in transactional `variables` or an automation `event` payload, use { "id": "c1", "field": "variable", "operator": "is", "value": "plan:pro" }; "attribute" uses the same "name:value" form, while "email"/"firstName"/"lastName" use a plain comparison value. Live subscriber fields are "status", "tag", "list", "segment", "event", "emailProvider", "phone", "smsStatus", "added", "stripeProduct", "stripeCurrentProduct", "stripeTrialProduct", "commerceProduct", "commerceCollection", "emailSent", "emailDelivered", "emailOpened", "emailClicked", "emailBounced", and "emailComplained". They use the same field-specific values and operators as segment filters, for example { "id": "c2", "field": "segment", "operator": "is", "value": "seg_123" }, { "id": "c3", "field": "tag", "operator": "contains", "value": "vip" }, or { "id": "c4", "field": "event", "operator": "at_least", "value": "purchase:3:30d" }. Supported operators across fields are is, is_not, contains, not_contains, gt, gte, lt, lte, less_than, more_than, at_least, less_than_count, is_empty, is_not_empty, is_temporary_bounce, and is_permanent_bounce; each field accepts only its segment-filter operators. Recipients without a stored subscriber match use the OTHERWISE branch or hide a conditionally displayed block. For if/else, use a { type: "conditional-group", conditions: [...], ifBranch: { children: [...] }, elseBranch: { children: [...] } } block.';

export const pollBlockHint =
  ' Polls and NPS surveys use a native poll block. For answer buttons use { "type": "poll", "variant": "options", "question": "What did you think?", "options": [{ "label": "Loved it", "value": "loved" }, { "label": "Not for me", "value": "not_for_me" }], "attributeKey": "email_feedback" }. For NPS use { "type": "poll", "variant": "nps", "question": "How likely are you to recommend us?", "options": [], "attributeKey": "nps_score", "npsLowLabel": "Not likely", "npsHighLabel": "Very likely" }. `attributeKey` stores the latest response for segmentation. Set `allowMultiple: true` on a text-only options poll to let recipients pick several answers: answer links then open a hosted selection page where the recipient checks any number of options and saves them in one submit, and `attributeKey` stores the list of selected values (filter with attribute `contains`). Multi-select polls cannot use option images or configurations whose encoded signed links exceed the delivery-safe size limit. Optional `appearance` picks the answer style: "soft" (default), "pill", "outline", "filled", "pop" (hard-shadow boxes), "brutal" (square uppercase slabs), "quiz" (A/B/C letter badges), or "minimal" (bare ruled rows). `accentColor` recolors every appearance, including "brutal". `optionRadius` sets answer-button corners in px (0 is square) independently of `styles.borderRadius`, while `questionColor` recolors only the question. `fontFamily` applies to the poll; `optionFontSize`, `optionFontWeight`, `optionLetterSpacing`, and `optionTextTransform` style answers, and the matching `questionFontSize`, `questionFontWeight`, `questionLetterSpacing`, and `questionTextTransform` fields style the question. Sizes and spacing are px, weights are 100-900, and transforms are "none" or "uppercase". Optional `confirmationMessage` customizes the hosted thank-you page; set `redirectUrl` only when respondents should land on another page.';

export const imageBlockHint =
  ' For a new image, call `upload_image_asset` first and insert its returned `imageBlock`. A responsive fixed-height screenshot crop uses { "type": "image", "src": "https://...", "alt": "Product dashboard", "width": 100, "widthType": "percent", "height": 320, "objectFit": "cover", "align": "center" }.';

export const rawHtmlContentWarning =
  "Raw HTML is stored as one opaque block. Sequenzy preserves that markup but does not add a company logo, branded native sections, or theme-driven block design. Use blocks for editor-native design, or a drafting prompt when you want Sequenzy to compose a new branded email.";

/**
 * The generated code has no discoverable name unless the schema states it, and
 * a guessed tag renders empty rather than failing, so every surface that
 * configures a create_discount step repeats this.
 */
export const discountMergeTagsHint =
  ' The code is minted per subscriber at run time and reaches every later email in the same sequence as {{discount.code}}. Also available: {{discount.value}} (pre-formatted, e.g. "20% off" or "$10 off"), {{discount.percentOff}}, {{discount.amountOff}}, {{discount.currency}}, and {{date.discount.expiresAt}} (locale-formatted expiry). Present the code with a { "type": "discount-code", "code": "{{discount.code}}", "label": "Your discount code" } block, or inline {{discount.code}} in any text block. These tags resolve only in emails downstream of the discount step; render_email substitutes a clearly fake sample code so the email can be previewed before anyone is enrolled, and lists anything it could not resolve under unresolvedMergeTags.';

export const pollRespondentFilterHint =
  'For exact historical Poll/NPS respondents, use field `pollResponse`, operator `is`, and a JSON value shaped like {"v":1,"campaignId":"camp_123","blockId":"poll_1","match":{"kind":"answer","value":"loved"}}. For NPS buckets, use match {"kind":"npsBucket","bucket":"promoters"}; bucket may be `promoters`, `passives`, or `detractors`.';

export const buttonColorHint =
  " `styles` applies to the block's own container, not to an inner rendered element. On a button block, `styles.backgroundColor` colors the band behind the button and `styles.textColor` does not reach the label - set the top-level `buttonColor` and `buttonTextColor` fields instead, or leave them unset to inherit the email theme's primary color.";

/**
 * Only append this to a tool whose route validates blocks through
 * `parseEmailBlocksPayload` / `resolveApiEmailBlocksInput`. On a route that
 * stores blocks as sent, nothing is discarded and nothing is reported, so
 * promising `warnings` there would let an agent read their absence as
 * confirmation.
 *
 * Sequence email steps used to be such a route. They now validate through
 * `parseEmailBlocksPayload` on create, update, branch paths, and inserted
 * steps, and report the same advisory `warnings`, so the sequence block
 * descriptions carry this hint too.
 */
export const blockFieldWarningsHint =
  " Unsupported fields are discarded and reported in the response `warnings` array rather than rejected.";

export const emailBlocksDescription = `Sequenzy email blocks. Use this for editor-compatible content, including conditional and repeat blocks. For provider-migrated HTML from another email platform, prefer the \`html\` field instead; Sequenzy stores it as one raw HTML block to preserve the original design. Use \`styles\` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as \`backgroundColor\`, \`backgroundOpacity\`, \`borderColor\`, \`borderWidth\`, and \`borderRadius\` are also accepted and saved under \`styles\`. Repeat blocks use { type: 'repeat', source: 'items', itemAlias: 'item', children: [...] }.${
  blockConditionsHint
}${buttonColorHint}${blockFieldWarningsHint}${pollBlockHint}${imageBlockHint}${coreEmailBlockExamples}`;

/**
 * Sequence email steps are the only blocks route that re-applies managed chrome
 * on update, so an agent authoring a targeted content edit has to be able to
 * read that contract before it sends one. Append this only to sequence step
 * blocks fields - campaign, template, and transactional routes store blocks as
 * sent.
 */
export const sequenceStepBlocksFormatHint =
  " Replacing a step's blocks keeps that step's existing Style > Format rather than the company default: a step that already had a logo or footer gets them back even if you omit them, and every block added that way is listed in the response `warnings`. Pass `emailPreset` to change the format. A step whose stored content is a single raw HTML block has no format, so replacing it with another single raw HTML block is stored exactly as sent; replacing it with native blocks converts the step and does add a footer.";

/**
 * `sequenceNodeChangesSchema` describes a patch for every node type, and
 * `action_sms` nodes accept a `blocks` field of their own. Scope the hint to
 * action_email there so an agent patching SMS content does not read the logo
 * and footer contract as applying to it.
 */
export const sequenceStepBlocksFormatHintForNodeChanges = ` For action_email:${sequenceStepBlocksFormatHint}`;

export const replacementEmailBlocksDescription = `Replacement Sequenzy email blocks. Use \`styles\` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as \`backgroundColor\`, \`backgroundOpacity\`, \`borderColor\`, \`borderWidth\`, and \`borderRadius\` are also accepted and saved under \`styles\`.${
  blockConditionsHint
}${buttonColorHint}${blockFieldWarningsHint}${pollBlockHint}${imageBlockHint}${coreEmailBlockExamples}`;

export const sequenceEmailBlocksDescription = `Sequenzy email blocks. Provide blocks or html for email steps. For migrated provider HTML, prefer \`html\`; Sequenzy stores it as one raw HTML block and does not recreate it as native blocks. Use \`styles\` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as \`backgroundColor\`, \`backgroundOpacity\`, \`borderColor\`, \`borderWidth\`, and \`borderRadius\` are also accepted and saved under \`styles\`. Blocks can include repeat blocks over array variables such as items.${
  blockConditionsHint
}${buttonColorHint}${blockFieldWarningsHint}${pollBlockHint}${imageBlockHint}${coreEmailBlockExamples}`;

/**
 * A mailbox may carry several From display names, so `fromName` selects one
 * rather than only seeding a profile the address has never had. Stating that
 * up front matters because the alternative reading - "the saved name wins" -
 * looks identical in a 2xx response until someone reads the echoed fromName.
 */
export const senderFromNameDescription =
  "Display name recipients see, e.g. 'Brennon at TradeTally'. Selects the sender identity of that name on fromEmail, creating it when the address has no identity by that name; the mailbox's other display names, and everything pinned to them, are untouched. Requires fromEmail; omit it when using senderProfileId, which already carries its own display name.";

/**
 * Reply-To has no equivalent: an address carries exactly one Reply-To name for
 * the whole company, so a conflicting name cannot be honored and is reported
 * instead of silently replaced.
 */
export const replyToNameDescription =
  "Display name for the Reply-To address. Requires replyTo; omit it when using replyProfileId, which already carries its own display name. An address carries one Reply-To name company-wide: if replyTo already has a saved profile under a different name, that saved name is kept and the response `warnings` array says so. Rename it with update_sender_profile (type 'reply') to change it everywhere.";

export const landingPageContentDescription =
  "Complete Sequenzy landing page content JSON. Use this when replacing the page structure. The content must be the editor-compatible landing page schema with version, template, seo, theme, and blocks. Landing pages must include exactly one footer block and at most one form block.";

export const landingPageTemplateDescription =
  "Optional template key for default content, such as from-scratch, waitlist, lead-magnet, launch, demo-request, webinar, newsletter, product-hunt, pricing-offer, agency-lead-gen, or feature-announcement.";

export const ADD_SUBSCRIBERS_TO_LIST_EMAIL_LIMIT = 500;
export const SEQUENCE_ENROLLMENT_TARGET_LIMIT = 500;

/**
 * Operators the subscriber list endpoint accepts for direct attribute
 * filtering. The remaining segment operators (`is_not`, `not_contains`,
 * `is_empty`) cannot be walked by cursor, so they stay segment-only.
 */
export const SUBSCRIBER_ATTRIBUTE_FILTER_OPERATORS = [
  "is",
  "contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "is_not_empty",
] as const;

export const includeMachineEngagementToolProperty = {
  type: "boolean",
  description:
    "If true, include machine-classified bot/scanner opens and clicks. Defaults to false, so metrics and activity are human-only.",
};

// Mirrors EMAIL_EVENT_TYPES in @emailer/shared (this package is a standalone
// client and cannot import it). Keep the two in sync: a value missing here is
// rejected by MCP validation before it ever reaches the API, breaking
// API/CLI/MCP parity.
export const emailEventTypes = [
  "send",
  "delivery",
  "bounce",
  "complaint",
  "open",
  "click",
  "unsubscribe",
  "delivery_delay",
  "transport_failure",
] as const;

/** Shared "Supported values" fragment so tool descriptions cannot drift. */
export const emailEventTypesList = emailEventTypes.join(", ");

export const sequenceSendingWindowSchema = {
  type: "object",
  description:
    "Optional send window for every email step in the sequence. When set, email actions that become due outside the window wait until the next allowed local time. Omit days to allow every day.",
  properties: {
    enabled: {
      type: "boolean",
      description:
        "Set false to disable the sending window when creating a sequence. For updates, prefer clearSendingWindow.",
    },
    timezone: {
      type: "string",
      description:
        "IANA timezone for the window, e.g. Europe/Kiev or America/New_York.",
    },
    startTime: {
      type: "string",
      description:
        "Earliest local send time in 24-hour HH:mm format, e.g. 08:00.",
    },
    endTime: {
      type: "string",
      description:
        "Latest local send cutoff in 24-hour HH:mm format, e.g. 20:00, or 24:00 for the end-of-day boundary. Must be later than startTime.",
    },
    days: {
      type: "array",
      description:
        "Allowed local days. Use full names or short names such as monday, tuesday, mon, tue. Omit for every day.",
      items: { type: "string" },
    },
  },
  additionalProperties: false,
};

export const sequenceDelayOffsetSchema = {
  type: "object",
  description: "Offset relative to a wait-until date.",
  properties: {
    days: { type: "number" },
    hours: { type: "number" },
    minutes: { type: "number" },
  },
  additionalProperties: false,
} as const;

export const sequenceWaitUntilSchema = {
  type: "object",
  description:
    "Wait until a date from the trigger event before this step. Use this for renewal reminders, appointment follow-ups, trial-expiry nudges, and other subscriber-specific dates. The field value must be an ISO date string or Unix timestamp.",
  properties: {
    field: {
      type: "string",
      description:
        "Dot-path into the trigger event properties, e.g. renews_at or booking.startsAt.",
    },
    untilDateField: {
      type: "string",
      description: "Alias for field.",
    },
    offset: sequenceDelayOffsetSchema,
    days: {
      type: "number",
      description: "Offset days shorthand. Ignored when offset is provided.",
    },
    hours: {
      type: "number",
      description: "Offset hours shorthand. Ignored when offset is provided.",
    },
    minutes: {
      type: "number",
      description: "Offset minutes shorthand. Ignored when offset is provided.",
    },
    direction: {
      type: "string",
      enum: ["before", "after"],
      description:
        "Whether the offset applies before or after the resolved date. Defaults to after.",
    },
    untilOffsetDirection: {
      type: "string",
      enum: ["before", "after"],
      description: "Alias for direction.",
    },
    missingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description:
        "What to do if the event field is missing or invalid. Defaults to continue.",
    },
    untilMissingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description: "Alias for missingAction.",
    },
  },
  additionalProperties: false,
} as const;

export const sequenceWaitUntilWeekdaySchema = {
  type: "object",
  description:
    "Wait until the next occurrence of a weekday inside a local-time window before this step, e.g. { day: 'sunday', startTime: '09:00', endTime: '12:00', timezone: 'America/Los_Angeles' }. Continues immediately when the step is reached inside the window, so a Sunday-morning enrollment is not pushed a full week. Place it immediately before the email when the send day matters - it controls when the flow resumes, so any step between it and the email shifts the send off the window (a sequence-level sendingWindow only holds emails at send time; it does not reschedule the graph).",
  properties: {
    day: {
      type: "string",
      description:
        "Single weekday convenience alias for days, e.g. sunday or sun.",
    },
    days: {
      type: "array",
      items: { type: "string" },
      description:
        "Weekdays the wait may release on. Full or short names such as sunday, sun. The nearest upcoming day wins.",
    },
    startTime: {
      type: "string",
      description:
        "Window start in 24-hour HH:mm local time, e.g. 09:00. Required.",
    },
    endTime: {
      type: "string",
      description:
        "Window end in 24-hour HH:mm local time. Defaults to the end-of-day boundary 24:00. If the wake-up is missed past endTime (rare operational failure), the wait rolls to the next configured day instead of releasing late.",
    },
    timezone: {
      type: "string",
      description:
        "IANA timezone the window is evaluated in, e.g. America/Los_Angeles. Required.",
    },
    untilStartTime: { type: "string", description: "Alias for startTime." },
    untilEndTime: { type: "string", description: "Alias for endTime." },
    untilTimezone: { type: "string", description: "Alias for timezone." },
  },
  additionalProperties: false,
} as const;

export const sequenceDelaySchema = {
  type: "object",
  description:
    "Fixed delay before this step. For a dynamic wait-until-date delay, either set mode:'until_date' plus untilDateField here, or use waitUntil. For a wait-until-weekday-window delay, either set mode:'until_weekday' plus untilDays/untilStartTime/untilTimezone here, or use waitUntilWeekday.",
  properties: {
    days: { type: "number" },
    hours: { type: "number" },
    minutes: { type: "number" },
    mode: {
      type: "string",
      enum: ["duration", "until_date", "until_weekday"],
      description:
        "Use duration for a fixed wait, until_date to resolve a date from the trigger event, or until_weekday to wait for the next weekday/time window.",
    },
    untilDays: {
      type: "array",
      items: { type: "string" },
      description:
        "For mode:'until_weekday', weekday names the wait may release on.",
    },
    untilStartTime: {
      type: "string",
      description:
        "For mode:'until_weekday', window start in 24-hour HH:mm local time.",
    },
    untilEndTime: {
      type: "string",
      description:
        "For mode:'until_weekday', window end in 24-hour HH:mm local time. Defaults to the end-of-day boundary 24:00.",
    },
    untilTimezone: {
      type: "string",
      description:
        "For mode:'until_weekday', IANA timezone the window is evaluated in.",
    },
    untilDateField: {
      type: "string",
      description:
        "For mode:'until_date', dot-path into the trigger event properties.",
    },
    field: {
      type: "string",
      description: "Alias for untilDateField.",
    },
    untilOffsetDirection: {
      type: "string",
      enum: ["before", "after"],
      description:
        "For mode:'until_date', whether days/hours/minutes are before or after the event date. Defaults to after.",
    },
    direction: {
      type: "string",
      enum: ["before", "after"],
      description: "Alias for untilOffsetDirection.",
    },
    untilMissingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description:
        "For mode:'until_date', what to do when the field is missing or invalid. Defaults to continue.",
    },
    missingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description: "Alias for untilMissingAction.",
    },
  },
  additionalProperties: false,
} as const;

export const sequenceNodeChangesSchema = {
  type: "object",
  description: `Type-aware patch for the existing node. Start from get_sequence.sequence.nodes[].config. For logic_delay, set exactly one of delay ({ days, hours, minutes }), delayMs, waitUntil, or waitUntilWeekday ({ day, startTime, endTime, timezone } - hold until the next weekday window); optional label is also accepted. For action_email, use name/label, subject, previewText, html/htmlContent or blocks, emailPreset, isTransactional, attachments ([{ filename, path }] URL-backed files fetched at send time; path may use {{event.*}} from the enrollment event; [] removes them), and sender/reply identity fields. For action_sms, use text, blocks, imageUrls, label, or ineligibleAction. Other node types accept their editable config keys. Managed IDs, nodeType conversion, and branch path IDs/count are not editable here; use edit_sequence_graph for topology. Webhook header patches are merged, and redacted values from get_sequence must be omitted or replaced with a real new value.${sequenceStepBlocksFormatHintForNodeChanges}`,
  properties: {
    emailPreset: {
      type: "string",
      enum: ["branded", "minimal"],
      description:
        "For an action_email node with native Sequenzy blocks, set the linked email's per-email Style > Format. Native block emails may include supported custom HTML blocks. Use minimal for a direct text-forward note without the company logo and with the simple footer, or branded to restore branded chrome. This does not change the company-wide default. Not a lossless toggle: minimal deletes standalone logo blocks, so switching back to branded generates a new logo block with a new id and the company name as alt text - send the authored logo block in `blocks` alongside the branded update to keep it. A standalone raw HTML email does not support this field, and emailPreset must not be combined with html/htmlContent.",
    },
  },
  additionalProperties: true,
} as const;

export const sequenceNodeUpdateItemSchema = {
  type: "object",
  properties: {
    nodeId: {
      type: "string",
      description: "Existing node ID from get_sequence.sequence.nodes[].id.",
    },
    changes: sequenceNodeChangesSchema,
    expectedUpdatedAt: {
      type: "string",
      description:
        "Required optimistic-concurrency value from get_sequence.sequence.nodes[].updatedAt. The update is rejected if that node or its linked email content changed after it was read.",
    },
  },
  required: ["nodeId", "changes", "expectedUpdatedAt"],
  additionalProperties: false,
} as const;

export const AVAILABLE_TAG_COLORS = [
  "gray",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

// Mirrors OUTBOUND_WEBHOOK_EVENT_TYPES in @emailer/shared.
export const OUTBOUND_WEBHOOK_EVENT_TYPES = [
  "email.sent",
  "email.delivered",
  "email.delivery_delayed",
  "email.bounced",
  "email.failed",
  "email.complained",
  "email.opened",
  "email.clicked",
  "email.replied",
  "email.unsubscribed",
  "sms.sent",
  "sms.delivered",
  "sms.failed",
  "sms.opted_out",
  "subscriber.invalid",
  "subscriber.created",
  "subscriber.updated",
  "subscriber.unsubscribed",
  "subscriber.list_subscribed",
  "subscriber.list_unsubscribed",
  "sequence.finished",
  "sequence.failed",
  "poll.answered",
] as const;
