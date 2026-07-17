export const blockConditionsHint =
  ' Any block accepts a `conditions` array so it only renders for matching recipients. To branch on a value passed in transactional `variables` or an automation `event` payload, use { "id": "c1", "field": "variable", "operator": "is", "value": "plan:pro" }; "attribute" uses the same "name:value" form, while "email"/"firstName"/"lastName" use a plain comparison value. Live subscriber fields are "status", "tag", "list", "segment", "event", "emailProvider", "phone", "smsStatus", "added", "stripeProduct", "stripeCurrentProduct", "stripeTrialProduct", "commerceProduct", "emailSent", "emailDelivered", "emailOpened", "emailClicked", "emailBounced", and "emailComplained". They use the same field-specific values and operators as segment filters, for example { "id": "c2", "field": "segment", "operator": "is", "value": "seg_123" }, { "id": "c3", "field": "tag", "operator": "contains", "value": "vip" }, or { "id": "c4", "field": "event", "operator": "at_least", "value": "purchase:3:30d" }. Supported operators across fields are is, is_not, contains, not_contains, gt, gte, lt, lte, less_than, more_than, at_least, less_than_count, is_empty, is_not_empty, is_temporary_bounce, and is_permanent_bounce; each field accepts only its segment-filter operators. Recipients without a stored subscriber match use the OTHERWISE branch or hide a conditionally displayed block. For if/else, use a { type: "conditional-group", conditions: [...], ifBranch: { children: [...] }, elseBranch: { children: [...] } } block.';

export const pollBlockHint =
  ' Polls and NPS surveys use a native poll block. For answer buttons use { "type": "poll", "variant": "options", "question": "What did you think?", "options": [{ "label": "Loved it", "value": "loved" }, { "label": "Not for me", "value": "not_for_me" }], "attributeKey": "email_feedback" }. For NPS use { "type": "poll", "variant": "nps", "question": "How likely are you to recommend us?", "options": [], "attributeKey": "nps_score", "npsLowLabel": "Not likely", "npsHighLabel": "Very likely" }. `attributeKey` stores the latest response for segmentation. Optional `appearance` picks the answer style: "soft" (default), "pill", "outline", "filled", "pop" (hard-shadow boxes), "brutal" (square uppercase slabs), "quiz" (A/B/C letter badges), or "minimal" (bare ruled rows). Optional `confirmationMessage` customizes the hosted thank-you page; set `redirectUrl` only when respondents should land on another page.';

export const imageBlockHint =
  ' For a new image, call `upload_image_asset` first and insert its returned `imageBlock`. A responsive fixed-height screenshot crop uses { "type": "image", "src": "https://...", "alt": "Product dashboard", "width": 100, "widthType": "percent", "height": 320, "objectFit": "cover", "align": "center" }.';

export const pollRespondentFilterHint =
  'For exact historical Poll/NPS respondents, use field `pollResponse`, operator `is`, and a JSON value shaped like {"v":1,"campaignId":"camp_123","blockId":"poll_1","match":{"kind":"answer","value":"loved"}}. For NPS buckets, use match {"kind":"npsBucket","bucket":"promoters"}; bucket may be `promoters`, `passives`, or `detractors`.';

export const emailBlocksDescription = `Sequenzy email blocks. Use this for editor-compatible content, including conditional and repeat blocks. For provider-migrated HTML from another email platform, prefer the \`html\` field instead; Sequenzy stores it as one raw HTML block to preserve the original design. Use \`styles\` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as \`backgroundColor\`, \`backgroundOpacity\`, \`borderColor\`, \`borderWidth\`, and \`borderRadius\` are also accepted and saved under \`styles\`. Repeat blocks use { type: 'repeat', source: 'items', itemAlias: 'item', children: [...] }.${
  blockConditionsHint
}${pollBlockHint}${imageBlockHint}`;

export const replacementEmailBlocksDescription = `Replacement Sequenzy email blocks. Use \`styles\` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as \`backgroundColor\`, \`backgroundOpacity\`, \`borderColor\`, \`borderWidth\`, and \`borderRadius\` are also accepted and saved under \`styles\`.${
  blockConditionsHint
}${pollBlockHint}${imageBlockHint}`;

export const sequenceEmailBlocksDescription = `Sequenzy email blocks. Provide blocks or html for email steps. For migrated provider HTML, prefer \`html\`; Sequenzy stores it as one raw HTML block and does not recreate it as native blocks. Use \`styles\` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as \`backgroundColor\`, \`backgroundOpacity\`, \`borderColor\`, \`borderWidth\`, and \`borderRadius\` are also accepted and saved under \`styles\`. Blocks can include repeat blocks over array variables such as items.${
  blockConditionsHint
}${pollBlockHint}${imageBlockHint}`;

export const landingPageContentDescription =
  "Complete Sequenzy landing page content JSON. Use this when replacing the page structure. The content must be the editor-compatible landing page schema with version, template, seo, theme, and blocks. Landing pages must include exactly one footer block and at most one form block.";

export const landingPageTemplateDescription =
  "Optional template key for default content, such as from-scratch, waitlist, lead-magnet, launch, demo-request, webinar, newsletter, product-hunt, pricing-offer, agency-lead-gen, or feature-announcement.";

export const ADD_SUBSCRIBERS_TO_LIST_EMAIL_LIMIT = 500;
export const SEQUENCE_ENROLLMENT_TARGET_LIMIT = 500;

export const includeMachineEngagementToolProperty = {
  type: "boolean",
  description:
    "If true, include machine-classified bot/scanner opens and clicks. Defaults to false, so metrics and activity are human-only.",
};

export const emailEventTypes = [
  "send",
  "delivery",
  "bounce",
  "complaint",
  "open",
  "click",
  "unsubscribe",
  "delivery_delay",
] as const;

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
        "Latest local send cutoff in 24-hour HH:mm format, e.g. 20:00. Must be later than startTime.",
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

export const sequenceDelaySchema = {
  type: "object",
  description:
    "Fixed delay before this step. For a dynamic wait-until-date delay, either set mode:'until_date' plus untilDateField here, or use waitUntil.",
  properties: {
    days: { type: "number" },
    hours: { type: "number" },
    minutes: { type: "number" },
    mode: {
      type: "string",
      enum: ["duration", "until_date"],
      description:
        "Use duration for a fixed wait, or until_date to resolve a date from the trigger event.",
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
  description:
    "Type-aware patch for the existing node. Start from get_sequence.sequence.nodes[].config. For logic_delay, set exactly one of delay ({ days, hours, minutes }), delayMs, or waitUntil; optional label is also accepted. For action_email, use name/label, subject, previewText, html/htmlContent or blocks, emailPreset, isTransactional, and sender/reply identity fields. For action_sms, use text, blocks, imageUrls, label, or ineligibleAction. Other node types accept their editable config keys. Managed IDs, nodeType conversion, and branch path IDs/count are not editable here; use edit_sequence_graph for topology. Webhook header patches are merged, and redacted values from get_sequence must be omitted or replaced with a real new value.",
  properties: {
    emailPreset: {
      type: "string",
      enum: ["branded", "minimal"],
      description:
        "For an action_email node with native Sequenzy blocks, set the linked email's per-email Style > Format. Native block emails may include supported custom HTML blocks. Use minimal for a direct text-forward note without the company logo and with the simple footer, or branded to restore branded chrome. This does not change the company-wide default. A standalone raw HTML email does not support this field, and emailPreset must not be combined with html/htmlContent.",
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
  "subscriber.updated",
  "subscriber.unsubscribed",
  "subscriber.list_subscribed",
  "subscriber.list_unsubscribed",
  "sequence.finished",
  "sequence.failed",
  "poll.answered",
] as const;
