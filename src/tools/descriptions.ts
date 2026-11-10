import { coreEmailBlockExamples } from "./email-block-examples.generated.js";

export const blockConditionsHint =
  ' Any block accepts a `conditions` array so it only renders for matching recipients; conditions must all match unless the block sets `conditionsMatch: "any"`, and a numeric path segment reads one list item (`goals.0:bias`). To branch on a value passed in transactional `variables` or an automation `event` payload, use { "id": "c1", "field": "variable", "operator": "is", "value": "plan:pro" }; "attribute" uses the same "name:value" form, while "email"/"firstName"/"lastName" use a plain comparison value. Live subscriber fields are "status", "tag", "list", "segment", "event", "emailProvider", "phone", "phoneCountry", "smsStatus", "added", "stripeProduct", "stripeCurrentProduct", "stripeTrialProduct", "commerceProduct", "commerceCollection", "emailSent", "emailDelivered", "emailOpened", "emailClicked", "emailBounced", and "emailComplained". They use the same field-specific values and operators as segment filters, for example { "id": "c2", "field": "segment", "operator": "is", "value": "seg_123" }, { "id": "c3", "field": "tag", "operator": "contains", "value": "vip" }, or { "id": "c4", "field": "event", "operator": "at_least", "value": "purchase:3:30d" }. Supported operators across fields are is, is_not, contains, not_contains, starts_with, not_starts_with, gt, gte, lt, lte, less_than, more_than, at_least, less_than_count, is_empty, is_not_empty, is_temporary_bounce, and is_permanent_bounce; each field accepts only its segment-filter operators. Recipients without a stored subscriber match use the OTHERWISE branch or hide a conditionally displayed block. For if/else, use a { type: "conditional-group", conditions: [...], ifBranch: { children: [...] }, elseBranch: { children: [...] } } block.';

export const pollBlockHint =
  ' Polls and NPS surveys use a native poll block. For answer buttons use { "type": "poll", "variant": "options", "question": "What did you think?", "options": [{ "label": "Loved it", "value": "loved" }, { "label": "Not for me", "value": "not_for_me" }], "attributeKey": "email_feedback" }. For NPS use { "type": "poll", "variant": "nps", "question": "How likely are you to recommend us?", "options": [], "attributeKey": "nps_score", "npsLowLabel": "Not likely", "npsHighLabel": "Very likely" }. `attributeKey` stores the latest response for segmentation. Set `allowMultiple: true` on a text-only options poll to let recipients pick several answers: answer links then open a hosted selection page where the recipient checks any number of options and saves them in one submit, and `attributeKey` stores the list of selected values (filter with attribute `contains`). Multi-select polls cannot use option images or configurations whose encoded signed links exceed the delivery-safe size limit. Optional `appearance` picks the answer style: "soft" (default), "pill", "outline", "filled", "pop" (hard-shadow boxes), "brutal" (square uppercase slabs), "quiz" (A/B/C letter badges), or "minimal" (bare ruled rows). `accentColor` recolors every appearance, including "brutal". `optionRadius` sets answer-button corners in px (0 is square) independently of `styles.borderRadius`, while `questionColor` recolors only the question. `fontFamily` applies to the poll; `optionFontSize`, `optionFontWeight`, `optionLetterSpacing`, and `optionTextTransform` style answers, and the matching `questionFontSize`, `questionFontWeight`, `questionLetterSpacing`, and `questionTextTransform` fields style the question. Sizes and spacing are px, weights are 100-900, and transforms are "none" or "uppercase". Optional `confirmationMessage` customizes the hosted thank-you page; set `redirectUrl` only when respondents should land on another page.';

export const imageBlockHint =
  ' For a new image, call `upload_image_asset` first and insert its returned `imageBlock`. A responsive fixed-height screenshot crop uses { "type": "image", "src": "https://...", "alt": "Product dashboard", "width": 100, "widthType": "percent", "height": 320, "objectFit": "cover", "align": "center" }.';

export const videoBlockHint =
  ' A YouTube video block can override its still with { "type": "video", "videoUrl": "https://www.youtube.com/watch?v=...", "thumbnailUrl": "https://cdn.example.com/cover.jpg", "alt": "Watch the product tour" }. Replacing the blocks array without `thumbnailUrl` restores YouTube\'s own thumbnail; the video destination remains `videoUrl`.';

export const rawHtmlContentWarning =
  "Raw HTML is stored as one opaque block. Sequenzy preserves that markup but does not add a company logo, branded native sections, or theme-driven block design. Use blocks for editor-native design, or a drafting prompt when you want Sequenzy to compose a new branded email.";

/**
 * A guessed opt-out (`| raw`, triple braces) renders escaped rather than
 * failing, so every content-authoring surface has to state the real one.
 */
export const rawHtmlMergeTagHint =
  " Merge tags resolve in this content but are always HTML-escaped; prefix a tag with 'html.' - e.g. {{html.subscriber.body_html}} - to insert a trusted subscriber attribute or variable holding prebuilt HTML unescaped. Injected HTML is sanitized (scripts, event handlers, and dangerous URLs stripped), must be final HTML, and renders raw only in HTML text position, never inside attributes.";

/** For `html`-content fields: the storage warning plus the merge-tag hint. */
export const rawHtmlContentDescription = `${rawHtmlContentWarning}${rawHtmlMergeTagHint}`;

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
 * Shared across every `blocks` parameter so the alias list cannot drift.
 * `textColor` is listed because agents otherwise recolor copy with an inline
 * `style` on `<p>`/`<span>` after reading live HTML, which is not the field
 * the editor and theme use.
 */
export const blockStylesHint =
  "Use `styles` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Recolor body copy with `styles.textColor` (or the top-level `textColor` alias), not with an inline `style` on `<p>` or `<span>`. Top-level style aliases such as `backgroundColor`, `backgroundOpacity`, `textColor`, `textAlign`, `borderColor`, `borderWidth`, and `borderRadius` are also accepted and saved under `styles`.";

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

/**
 * The guidance every `blocks` parameter ends with, after its own opening. The
 * OpenAI surface lists it once per tool family (openai-size-rewrites.ts).
 */
export const emailBlockGuidanceHint = `${rawHtmlMergeTagHint}${blockConditionsHint}${buttonColorHint}${blockFieldWarningsHint}${pollBlockHint}${imageBlockHint}${videoBlockHint}${coreEmailBlockExamples}`;

export const emailBlocksDescription = `Sequenzy email blocks. Use this for editor-compatible content, including conditional and repeat blocks. For provider-migrated HTML from another email platform, prefer the \`html\` field instead; Sequenzy stores it as one raw HTML block to preserve the original design. ${blockStylesHint} Repeat blocks use { type: 'repeat', source: 'items', itemAlias: 'item', children: [...] }.${emailBlockGuidanceHint}`;

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

export const replacementEmailBlocksDescription = `Replacement Sequenzy email blocks. ${blockStylesHint}${emailBlockGuidanceHint}`;

export const sequenceEmailBlocksDescription = `Sequenzy email blocks. Provide blocks or html for email steps. For migrated provider HTML, prefer \`html\`; Sequenzy stores it as one raw HTML block and does not recreate it as native blocks. ${blockStylesHint} Blocks can include repeat blocks over array variables such as items.${emailBlockGuidanceHint}`;

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
  "Complete Sequenzy landing page content JSON. Use this when replacing the page structure. The content must be the editor-compatible landing page schema with version, template, seo, theme, and blocks. Landing pages must include exactly one footer block and at most one form block. Each block carries a `slot`, and slots render in order: `top` (full-width band above the hero, for announcement bars or banner images), `hero`, `form` (the card beside the hero), `body`, `footer`. A `video` block embeds a pasted YouTube URL with `url`, `title`, and an optional `aspectRatio` of 16:9, 4:3, 1:1, or 9:16 - other providers and direct video files are not supported. Button and pricing CTA URLs accept an external https URL or an in-page anchor: `#form` scrolls to the page's form block, `#section-<sectionId>` and `#block-<blockId>` scroll to any section or block, and `#top` returns to the top. Anchor CTAs stay in the same tab, so one form plus repeated CTAs is the way to build a single opt-in page. Scroll reveal is set on `theme`: `sectionAnimation` is one of none, fade, slide-up, zoom-in (default none) and `sectionAnimationSpeed` is one of slow, normal, fast (default normal). The reveal plays on the published page and is skipped for visitors who prefer reduced motion.";

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

/**
 * Send Time Optimization is campaign-only. Agents looking at get_company or
 * get_sequence for an account-level toggle will otherwise open the dashboard.
 */
export const campaignStoNotCompanyOrSequenceHint =
  "Send Time Optimization is not a company or sequence setting. It is campaign-only: audit with list_campaigns or get_campaign (sendTimeOptimization, sendTimeWindowHours, default 12h window). Change a draft with update_campaign, or apply it when calling schedule_campaign. Sequences use sendingWindow (allowed local hours/days), which is a shared gate, not per-subscriber predicted send times.";

export const campaignSendTimeOptimizationFieldDescription =
  "Deliver each recipient at their predicted best open hour within sendTimeWindowHours of scheduledAt (default 12h). Campaign-only: there is no company or sequence STO toggle. Sequences use sendingWindow instead. spreadOverHours takes precedence and turns STO off; sendInRecipientTimezone also turns it off.";

export const campaignMaxRecipientsFieldDescription =
  "Send to at most this many audience members: an integer from 1 to 10,000,000, or null to remove the limit. The first N matching subscribers (by subscriber id) receive the campaign after every audience and suppression rule is applied, and recipients already reached count against the cap when a paused send resumes. Use it to ramp up a new domain or to soft-launch an offer; duplicate the campaign and exclude contacts who already received it to send the next batch. Applies to email campaigns.";

export const campaignSendTimeWindowHoursFieldDescription =
  "STO delivery window in hours from scheduledAt (integer 1-24, default 12). Only used when sendTimeOptimization is true. Recipients whose predicted hour falls outside the window are snapped to the nearest edge. Sequences have no equivalent.";

export const campaignStoListFieldsHint =
  "Each item also carries delivery pacing so an account-wide STO audit does not need one get_campaign call each: sendTimeOptimization, sendTimeWindowHours, spreadOverHours, sendInRecipientTimezone, and scheduledTimezone. STO is campaign-only; sequences use sendingWindow.";

export const campaignStoOutputHint =
  "Delivery pacing: sendTimeOptimization is per-campaign Send Time Optimization (not a company or sequence setting). sendTimeWindowHours is that window in hours (default 12, max 24). spreadOverHours is a linear spread that turns STO off. sendInRecipientTimezone is a third mutually exclusive mode. Sequences use sendingWindow, which is an allowed-hours gate, not per-subscriber optimization.";

export const sequenceSendingWindowSchema = {
  type: "object",
  description:
    "Optional send window for every email step in the sequence. This is not Send Time Optimization: it is a shared allowed-hours gate, not per-subscriber predicted send times. STO is campaign-only (list_campaigns, get_campaign, update_campaign, schedule_campaign). When set, email actions that become due outside the window wait until the next allowed local time. Omit days to allow every day. Changing the window does not move contacts already waiting on a delay step - they keep their existing wait time, and narrowing the window can defer them to the next allowed day. Call realign_sequence_enrollments after the change to pull those waits back to the new opening.",
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

export const sequenceKeyDatesSchema = {
  type: "object",
  description:
    'Named absolute moments the sequence counts down to, e.g. Black Friday. Delay steps use waitUntilKeyDate to wait relative to one of them, so the whole countdown is re-timed by editing these dates. Keys default to a slug of the label ("Black Friday starts" -> black_friday_starts). Changing a key date on a live sequence re-schedules contacts already waiting on it. Pass null (update_sequence: clearKeyDates) to remove all key dates.',
  properties: {
    timezone: {
      type: "string",
      description:
        "IANA timezone the dates are shown and edited in, e.g. America/New_York.",
    },
    dates: {
      type: "array",
      description: "Up to 20 key dates.",
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Stable identifier used by waitUntilKeyDate.key (lowercase letters, digits, underscores). Defaults to a slug of the label.",
          },
          label: {
            type: "string",
            description: "Human label, e.g. Black Friday starts.",
          },
          at: {
            type: "string",
            description:
              "ISO 8601 date-time with offset or Z, e.g. 2026-11-27T00:00:00-05:00.",
          },
        },
        required: ["label", "at"],
        additionalProperties: false,
      },
    },
    sendWindow: {
      type: "object",
      description:
        "How sends timed from these moments are spread out so a whole audience is not emailed in the same second. Each contact gets their own stable send time within spreadOverHours: after the moment for steps at or after it, and in the hours leading up to the step's time for steps timed before it, so a deadline email always arrives before the deadline. Omit to keep the current spread (new sequences use 4 hours).",
      properties: {
        spreadOverHours: {
          type: "number",
          minimum: 0,
          maximum: 24,
          description:
            "Spread each email over this many hours. 0 sends everyone at the exact time. Default 4.",
        },
      },
      additionalProperties: false,
    },
  },
  required: ["dates"],
  additionalProperties: false,
} as const;

export const sequenceWaitUntilKeyDateSchema = {
  type: "object",
  description:
    "Wait relative to one of the sequence's key dates before this step, e.g. { key: 'black_friday_starts', days: 7, direction: 'before' } or { key: 'black_friday_ends', hours: 1 }. The key must exist in the sequence's keyDates. pastAction decides what a late enrollee does when the moment already passed: skip (default) skips the following steps until the next wait, continue sends immediately, exit ends the enrollment. Use with a manual trigger for one-time countdown campaigns.",
  properties: {
    key: {
      type: "string",
      description: "Key date identifier from keyDates.",
    },
    untilKeyDate: { type: "string", description: "Alias for key." },
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
        "Whether the offset applies before or after the key date. Defaults to before.",
    },
    untilOffsetDirection: {
      type: "string",
      enum: ["before", "after"],
      description: "Alias for direction.",
    },
    pastAction: {
      type: "string",
      enum: ["continue", "skip", "exit"],
      description:
        "What late enrollees do when the moment already passed. Defaults to skip.",
    },
    untilPastAction: {
      type: "string",
      enum: ["continue", "skip", "exit"],
      description: "Alias for pastAction.",
    },
    missingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description:
        "What to do if the key date no longer exists. Defaults to exit.",
    },
    untilMissingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description: "Alias for missingAction.",
    },
  },
  additionalProperties: false,
} as const;

export const sequenceAudienceSchema = {
  type: "object",
  description:
    "Who to enroll. { type: 'all' } for every active contact with an email, { type: 'lists', listIds: [...] }, { type: 'segment', segmentId: '...' }, { type: 'filtered', filters: [...] } with subscriber filters, or { type: 'rules', include: [...], exclude: [...] } combining several. For hand-picked contacts beyond the 500 cap of enroll_subscribers_in_sequence, use { type: 'rules', include: [], includedSubscriberIds: [...] }. Same shape as campaign targetLists.",
  properties: {
    type: {
      type: "string",
      enum: ["all", "lists", "segment", "filtered", "rules"],
    },
    listIds: { type: "array", items: { type: "string" } },
    segmentId: { type: "string" },
    filters: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    filterJoinOperator: { type: "string", enum: ["and", "or"] },
    include: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    exclude: {
      type: "array",
      items: { type: "object", additionalProperties: true },
    },
    excludedSubscriberIds: {
      type: "array",
      items: { type: "string" },
      description:
        "Contacts removed from the include rules. Does not remove includedSubscriberIds.",
    },
    includedSubscriberIds: {
      type: "array",
      items: { type: "string" },
      description:
        "Specific contacts to enroll in addition to the include rules. Unsubscribed, bounced and email-less contacts are skipped.",
    },
    excludedCampaignOpenerIds: {
      type: "array",
      items: { type: "string" },
      description: "Exclude contacts who opened any of these campaigns.",
    },
  },
  required: ["type"],
  additionalProperties: false,
} as const;

export const sequenceWaitUntilSchema = {
  type: "object",
  description:
    "Wait until a date from the trigger event or a contact attribute before this step. Use this for renewal reminders, appointment follow-ups, trial-expiry nudges, due-date or anniversary timelines, and other subscriber-specific dates. The field value must be an ISO date string or Unix timestamp. For a per-contact timeline that contacts can join late (e.g. emails at 20, 12 and 4 weeks before a dueDate attribute), use source attribute with pastAction skip on every wait so late joiners only get the steps still ahead, and pastAction continue on a final wait that everyone should reach.",
  properties: {
    field: {
      type: "string",
      description:
        "Dot-path into the trigger event properties (source event) or the contact's custom attributes (source attribute), e.g. renews_at, booking.startsAt or dueDate.",
    },
    untilDateField: {
      type: "string",
      description: "Alias for field.",
    },
    source: {
      type: "string",
      enum: ["event", "attribute"],
      description:
        "Where field is read from. event (default) reads the trigger event properties and needs an event trigger. attribute reads the contact's custom attributes when the step is reached, so it works with any trigger. If the date moves later while a contact is waiting, the contact waits for the new date; moving it earlier does not release them sooner, and a date removed while waiting follows missingAction.",
    },
    untilDateSource: {
      type: "string",
      enum: ["event", "attribute"],
      description: "Alias for source.",
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
        "What to do if the date field is missing or invalid. Defaults to continue.",
    },
    untilMissingAction: {
      type: "string",
      enum: ["continue", "exit"],
      description: "Alias for missingAction.",
    },
    pastAction: {
      type: "string",
      enum: ["continue", "skip", "exit"],
      description:
        "What to do when the date (after the offset) already passed when the contact reaches this wait. continue (default) moves on immediately, skip skips the following email and action steps until the next wait, condition or branch, exit ends the enrollment. Omitted waitUntil fields reset to their defaults when updating a step, so resend source and pastAction.",
    },
    untilPastAction: {
      type: "string",
      enum: ["continue", "skip", "exit"],
      description: "Alias for pastAction.",
    },
  },
  additionalProperties: false,
} as const;

export const sequenceWaitUntilWeekdaySchema = {
  type: "object",
  description:
    "Wait until the next occurrence of a weekday inside a local-time window before this step, e.g. { day: 'sunday', startTime: '09:00', endTime: '12:00', timezone: 'America/Los_Angeles' }. timezoneSource: 'subscriber' uses each contact's own timezone. Continues immediately when the step is reached inside the window, so a Sunday-morning enrollment is not pushed a full week. Add minimumWait: { days: 6 } to wait at least that long first and then release at the next window: one step instead of a fixed delay followed by a separate weekday wait. Place it immediately before the email when the send day matters - it controls when the flow resumes, so any step between it and the email shifts the send off the window (a sequence-level sendingWindow only holds emails at send time; it does not reschedule the graph).",
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
        "IANA timezone the window is evaluated in, e.g. America/Los_Angeles. Required; the fallback for timezoneSource 'subscriber'.",
    },
    timezoneSource: {
      type: "string",
      enum: ["fixed", "subscriber"],
      description:
        "fixed (default): timezone for everyone. subscriber: each contact's timezone, else timezone; re-read on resume.",
    },
    untilStartTime: { type: "string", description: "Alias for startTime." },
    untilEndTime: { type: "string", description: "Alias for endTime." },
    untilTimezone: { type: "string", description: "Alias for timezone." },
    untilTimezoneSource: {
      type: "string",
      enum: ["fixed", "subscriber"],
      description: "Alias for timezoneSource.",
    },
    minimumWait: {
      type: "object",
      description:
        "Wait at least this long before looking for the window, e.g. { days: 6 }. Once it ends, the contact continues at that moment if it falls inside the window, otherwise at the next window opening. Omit for no minimum.",
      properties: {
        days: { type: "number", minimum: 0 },
        hours: { type: "number", minimum: 0 },
        minutes: { type: "number", minimum: 0 },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
} as const;

export const sequenceDelaySchema = {
  type: "object",
  description:
    "Fixed delay before this step. For a dynamic wait-until-date delay, either set mode:'until_date' plus untilDateField here, or use waitUntil. For a wait-until-weekday-window delay, either set mode:'until_weekday' plus untilDays/untilStartTime/untilTimezone here, or use waitUntilWeekday (use waitUntilWeekday.minimumWait to wait a few days first; days/hours/minutes here are ignored in that mode).",
  properties: {
    days: { type: "number" },
    hours: { type: "number" },
    minutes: { type: "number" },
    mode: {
      type: "string",
      enum: ["duration", "until_date", "until_weekday", "until_key_date"],
      description:
        "Use duration for a fixed wait, until_date to resolve a date from the trigger event or a contact attribute, until_weekday to wait for the next weekday/time window, or until_key_date to wait relative to a sequence key date (prefer waitUntilKeyDate).",
    },
    untilKeyDate: {
      type: "string",
      description: "For mode:'until_key_date', the key of a sequence key date.",
    },
    keyDate: { type: "string", description: "Alias for untilKeyDate." },
    untilPastAction: {
      type: "string",
      enum: ["continue", "skip", "exit"],
      description:
        "For mode:'until_key_date' or 'until_date', what late enrollees do when the moment already passed. Defaults to skip for until_key_date and continue for until_date.",
    },
    pastAction: {
      type: "string",
      enum: ["continue", "skip", "exit"],
      description: "Alias for untilPastAction.",
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
        "For mode:'until_weekday', IANA timezone the window is evaluated in (fallback for untilTimezoneSource subscriber).",
    },
    untilTimezoneSource: {
      type: "string",
      enum: ["fixed", "subscriber"],
      description:
        "For mode:'until_weekday': fixed (default) or subscriber (each contact's timezone, else untilTimezone).",
    },
    untilDateField: {
      type: "string",
      description:
        "For mode:'until_date', dot-path into the trigger event properties or, with untilDateSource attribute, the contact's custom attributes.",
    },
    field: {
      type: "string",
      description: "Alias for untilDateField.",
    },
    untilDateSource: {
      type: "string",
      enum: ["event", "attribute"],
      description:
        "For mode:'until_date', read untilDateField from the trigger event (event, default) or the contact's custom attributes (attribute).",
    },
    source: {
      type: "string",
      enum: ["event", "attribute"],
      description: "Alias for untilDateSource.",
    },
    untilOffsetDirection: {
      type: "string",
      enum: ["before", "after"],
      description:
        "For mode:'until_date', whether days/hours/minutes are before or after the resolved date. Defaults to after.",
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

/**
 * Sections of a partial `emailTheme` patch. Shared by every tool that writes a
 * stored theme - the company default on `update_company` and the per-email
 * override on sequence email steps - because the API validates all of them
 * with one rule set. A field accepted in one place must be described the same
 * way in the other.
 */
export const emailThemePatchProperties = {
  presetId: {
    type: "string",
    description:
      "Theme preset to base the theme on: default, soft, editorial, or bold.",
  },
  colors: {
    type: "object",
    description: "6-digit hex colors.",
    properties: {
      primary: { type: "string" },
      background: {
        type: "string",
        description: "Outer canvas behind the email.",
      },
      content: {
        type: "string",
        description:
          "Inner content card the blocks sit on. Omit to preserve its current value; when no content color is stored, the card follows background.",
      },
      surface: {
        type: "string",
        description: "Nested cards and tinted tiles.",
      },
      text: { type: "string" },
      mutedText: { type: "string" },
      heading: { type: "string" },
      border: { type: "string" },
      link: { type: "string" },
      buttonText: {
        type: "string",
        description:
          "Label color for solid buttons. Omit to auto-derive a readable color from the button background.",
      },
    },
    additionalProperties: false,
  },
  typography: {
    type: "object",
    description: "Type settings; numbers except the font-family stacks.",
    properties: {
      baseFontSize: { type: "number" },
      leadFontSize: { type: "number" },
      baseLineHeight: { type: "number" },
      heading1Size: { type: "number" },
      heading2Size: { type: "number" },
      heading3Size: { type: "number" },
      buttonFontSize: { type: "number" },
      buttonFontWeight: {
        type: "number",
        description: "CTA label weight, 400-800.",
      },
      headingFontWeight: {
        type: "number",
        description:
          "Heading weight applied to all heading levels, 300-900. Omit for the per-level defaults.",
      },
      headingFontFamily: {
        type: "string",
        description:
          "Font stack for headings when it differs from the email body font. Omit so headings inherit the email font.",
      },
      headingLetterSpacing: {
        type: "number",
        description:
          "Heading letter spacing in pixels (negative = tighter), clamped to -2..4. Omit for natural tracking.",
      },
      footerFontFamily: {
        type: ["string", "null"],
        description:
          "Footer font stack, also used by the auto-added footer. null removes it.",
      },
      footerFontSize: {
        type: ["number", "null"],
        description: "Footer px, 10-16 (default 12).",
      },
      footerLineHeight: {
        type: ["number", "null"],
        description: "Footer line height, 1-2 (default 1.333).",
      },
    },
    additionalProperties: false,
  },
  buttonStyle: {
    type: "string",
    description:
      'How primary buttons are filled: "solid" (default) or "outline" (transparent fill with a brand-color border).',
  },
  layout: {
    type: "object",
    description:
      "Layout settings. Every field is a number except contentAlign.",
    properties: {
      contentWidth: { type: "number" },
      contentAlign: {
        type: "string",
        enum: ["center", "left"],
        description:
          'Where the content column sits in a wide email client: "center" (default) or "left" (flush left, like a plain personal email; buttons, the logo and footers move left too unless set to right, or kept centered with block `styles.keepAlign: true`). Phones show the column full width either way.',
      },
      containerPaddingX: { type: "number" },
      containerPaddingY: { type: "number" },
      blockSpacing: { type: "number" },
      baseRadius: { type: "number" },
      buttonRadius: { type: "number" },
      sectionPadding: { type: "number" },
      buttonPaddingX: { type: "number" },
      buttonPaddingY: { type: "number" },
      borderedBlockPadding: { type: "number" },
    },
    additionalProperties: false,
  },
} as const;

export const companyEmailThemeSchema = {
  type: ["object", "null"],
  description:
    "Default email theme applied to campaigns, sequences, and transactional email. Partial update: omitted fields keep their current value (or the preset default). Pass null to reset to the platform default theme. Numeric values are clamped to supported ranges.",
  properties: emailThemePatchProperties,
  additionalProperties: false,
} as const;

/**
 * Per-email theme override for one sequence email step. Distinct from
 * `update_company.emailTheme`, which moves the account-wide default.
 */
export const sequenceStepEmailThemeSchema = {
  type: ["object", "null"],
  description:
    "Visual theme override for this step's linked email only; the company-wide default is left untouched, as is every other email. Partial update: the patch merges into this email's current theme, so `{ colors: { background: '#f3f4f6' } }` repaints the outer canvas and keeps its fonts, spacing, and other colors; use colors.content for the inner card and colors.surface for nested cards. A step with no override merges into the company theme rather than the platform preset. Pass null to drop the override so the step follows the company theme again. Numeric values are clamped to supported ranges. Use update_company to change the account-wide default instead.",
  properties: emailThemePatchProperties,
  additionalProperties: false,
} as const;

export const sequenceEmailThemeSchema = sequenceStepEmailThemeSchema;

export const campaignEmailPresetSchema = {
  type: "string",
  enum: ["branded", "minimal"],
  description:
    "Per-email Style > Format for native Sequenzy blocks, including emails with supported custom HTML blocks. Use minimal for a direct text-forward note without the company logo and with the simple footer, or branded for branded chrome. This does not change the company-wide default and is not `style`, which is a prompt-generation hint valid only with `prompt`. Not a lossless toggle: minimal deletes standalone logo blocks, so switching back to branded generates a new logo block with a new id and the company name as alt text - send the authored logo block in `blocks` alongside the branded update to keep it. A standalone raw HTML email does not support this field, and emailPreset must not be combined with html.",
} as const;

export const sequenceNodeChangesSchema = {
  type: "object",
  description: `Type-aware patch for the existing node. Start from get_sequence.sequence.nodes[].config. For logic_delay, set exactly one of delay ({ days, hours, minutes }), delayMs, waitUntil, or waitUntilWeekday ({ day, startTime, endTime, timezone, timezoneSource, minimumWait } - hold until the next weekday window; timezoneSource 'subscriber' uses each contact's timezone; minimumWait { days, hours, minutes } waits at least that long first; waitUntilWeekday replaces the whole wait, so resend timezoneSource and minimumWait); optional label is also accepted. For action_email, use name/label, subject, previewText, html/htmlContent or blocks, emailPreset, emailTheme (per-email colors/typography/layout override - patch { colors: { background: '#ffffff' } } to repaint one step without touching the company default, or null to inherit it again), isTransactional, attachments ([{ filename, path }] URL-backed files fetched at send time; path may use {{event.*}} from the enrollment event; [] removes them), and sender/reply identity fields. For action_sms, use text, blocks, imageUrls, label, or ineligibleAction. For action_push, use title, body, url, imageUrl, iconUrl, platforms, label, ineligibleAction, or localizations (the step's versions in the workspace's other languages; the whole list is replaced, so start from the stored one; translate_push_content writes them with AI). For action_in_app, use the in-app step fields (format, title, body, buttons, style...); a custom HTML message takes format:'html' with html (the document, Braze Liquid converted) and showCloseButton. A placement item takes kind:'placement' with placement (the placement key), priority (high, medium or low) and layout (card, banner or hero). Other node types accept their editable config keys. For an existing random logic_branch, randomPercentages may be updated with one non-negative value per branch summing to 100. splitMode cannot be converted in place because condition and random splits have different graph topology; build a new random split with insert_sequence_step. Managed IDs, nodeType conversion, and branch path IDs/count are not editable here; use edit_sequence_graph for topology. Webhook header patches are merged, and redacted values from get_sequence must be omitted or replaced with a real new value.${sequenceStepBlocksFormatHintForNodeChanges}`,
  properties: {
    emailTheme: sequenceEmailThemeSchema,
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
  "email.received",
  "email.unsubscribed",
  "campaign.sent",
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
  "subscriber_import.completed",
  "sequence.finished",
  "sequence.failed",
  "poll.answered",
] as const;
