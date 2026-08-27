import { isRecord } from "./common-primitives.js";
import {
  getSegmentFilterValidationError,
  collectSegmentFilterValidationErrors,
} from "./segment-validation.js";

export function validateHtmlOrBlocksArgs(
  toolName: string,
  args: Record<string, unknown>,
  options?: {
    requireContent?: boolean | undefined;
  }
): void {
  if (args.html !== undefined && args.blocks !== undefined) {
    throw new Error(
      `Provide either \`html\` or \`blocks\` when calling \`${toolName}\`, not both.`
    );
  }

  if (args.blocks !== undefined && !Array.isArray(args.blocks)) {
    throw new Error(
      `\`blocks\` must be an array when calling \`${toolName}\`.`
    );
  }

  if (
    options?.requireContent &&
    args.html === undefined &&
    args.blocks === undefined
  ) {
    throw new Error(
      `Provide either \`html\` or \`blocks\` when calling \`${toolName}\`.`
    );
  }
}

export function validateLabelsArg(
  toolName: string,
  args: Record<string, unknown>
): void {
  if (args.labels === undefined) {
    return;
  }

  if (!Array.isArray(args.labels)) {
    throw new Error(
      `\`labels\` must be an array when calling \`${toolName}\`.`
    );
  }

  if (
    args.labels.some(
      (label) => typeof label !== "string" || label.trim().length === 0
    )
  ) {
    throw new Error(
      `\`labels\` must contain only non-empty strings when calling \`${toolName}\`.`
    );
  }
}

export function validateSequenceListScopeArgs(
  toolName: string,
  args: Record<string, unknown>,
  options: { defaultTrigger?: string | undefined } = {}
): void {
  validateSequenceAudienceArgs(toolName, args, options);

  if (args.listScope === undefined) {
    return;
  }

  if (args.listId !== undefined || args.listIds !== undefined) {
    throw new Error(
      `Provide either listId/listIds or listScope when calling ${toolName}, not both.`
    );
  }

  const trigger = args.trigger ?? options.defaultTrigger;
  if (trigger !== "contact_added") {
    throw new Error(
      `listScope only applies to a contact_added trigger when calling ${toolName}.`
    );
  }
}

/**
 * Reject audience arrays aimed at the wrong trigger type, and empty entries.
 * Caught here rather than server-side so the model gets a corrective error it
 * can act on instead of a sequence that silently triggers on nothing.
 */
function validateSequenceAudienceArgs(
  toolName: string,
  args: Record<string, unknown>,
  options: { defaultTrigger?: string | undefined } = {}
): void {
  const trigger = args.trigger ?? options.defaultTrigger;

  for (const [field, expectedTrigger] of [
    ["listIds", "contact_added"],
    ["tagNames", "tag_added"],
  ] as const) {
    const value = args[field];
    if (value === undefined) continue;

    if (!Array.isArray(value) || value.length === 0) {
      throw new Error(
        `\`${field}\` must be a non-empty array of strings when calling \`${toolName}\`.`
      );
    }
    if (
      value.some((entry) => typeof entry !== "string" || entry.trim() === "")
    ) {
      throw new Error(
        `\`${field}\` must contain only non-empty strings when calling \`${toolName}\`.`
      );
    }
    if (trigger !== undefined && trigger !== expectedTrigger) {
      throw new Error(
        `\`${field}\` only applies to a ${expectedTrigger} trigger when calling \`${toolName}\`.`
      );
    }
  }
}

export function validateCreateSegmentArgs(args: Record<string, unknown>): void {
  const hasFilters = args.filters !== undefined;
  const hasRoot = args.root !== undefined;

  if (hasFilters && hasRoot) {
    throw new Error(
      "Provide either `filters` or `root` when calling `create_segment`, not both."
    );
  }

  if (!hasFilters && !hasRoot) {
    throw new Error(
      "Provide either `filters` or `root` when calling `create_segment`."
    );
  }

  if (hasFilters) {
    if (!Array.isArray(args.filters)) {
      throw new Error(
        "`filters` must be an array when calling `create_segment`."
      );
    }

    if (args.filters.length === 0) {
      throw new Error(
        "`filters` must include at least one filter when calling `create_segment`."
      );
    }
  }

  if (hasRoot && (typeof args.root !== "object" || args.root === null)) {
    throw new Error("`root` must be an object when calling `create_segment`.");
  }

  const validationErrors = hasFilters
    ? (args.filters as unknown[]).flatMap((filter) => {
        const error = getSegmentFilterValidationError(filter);
        return error ? [error] : [];
      })
    : collectSegmentFilterValidationErrors(args.root);

  if (validationErrors.length > 0) {
    throw new Error(
      validationErrors[0] ?? "Invalid segment filter in `create_segment`."
    );
  }
}

export function validateUpdateSegmentArgs(args: Record<string, unknown>): void {
  const hasFilters = args.filters !== undefined;
  const hasRoot = args.root !== undefined;

  if (hasFilters && hasRoot) {
    throw new Error(
      "Provide either `filters` or `root` when calling `update_segment`, not both."
    );
  }

  if (
    args.name === undefined &&
    args.filterJoinOperator === undefined &&
    !hasFilters &&
    !hasRoot
  ) {
    throw new Error(
      "Provide at least one of `name`, `filters`, `root`, or `filterJoinOperator` when calling `update_segment`."
    );
  }

  if (hasFilters) {
    if (!Array.isArray(args.filters)) {
      throw new Error(
        "`filters` must be an array when calling `update_segment`."
      );
    }

    if (args.filters.length === 0) {
      throw new Error(
        "`filters` must include at least one filter when calling `update_segment`."
      );
    }
  }

  if (hasRoot && (typeof args.root !== "object" || args.root === null)) {
    throw new Error("`root` must be an object when calling `update_segment`.");
  }

  const validationErrors = hasFilters
    ? (args.filters as unknown[]).flatMap((filter) => {
        const error = getSegmentFilterValidationError(filter);
        return error ? [error] : [];
      })
    : hasRoot
      ? collectSegmentFilterValidationErrors(args.root)
      : [];

  if (validationErrors.length > 0) {
    throw new Error(
      validationErrors[0] ?? "Invalid segment filter in `update_segment`."
    );
  }
}

export const COMPANY_UPDATE_FIELDS = [
  "name",
  "description",
  "logoUrl",
  "founderName",
  "primaryColor",
  "brandColors",
  "valueProps",
  "testimonials",
  "toneVoice",
  "companyContext",
  "emailDesignPrompt",
  "emailLengthPreference",
  "socialLinks",
  "privacyPolicyUrl",
  "termsUrl",
  "address",
  "language",
  "pricing",
  "fontFamily",
  "emailTheme",
  "emailDirection",
  "senderProfileId",
  "fromEmail",
  "fromName",
  "replyProfileId",
  "replyTo",
  "replyToName",
  "replyTrackingEnabled",
  "replyTrackingDomainMode",
  "forwardReplies",
  "defaultSubscriberListIds",
] as const;

export function validateOptionalObjectArg(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): void {
  if (args[key] !== undefined && !isRecord(args[key])) {
    throw new Error(
      `\`${key}\` must be an object when calling \`${toolName}\`.`
    );
  }
}

export function validateOptionalArrayArg(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): void {
  if (args[key] !== undefined && !Array.isArray(args[key])) {
    throw new Error(
      `\`${key}\` must be an array when calling \`${toolName}\`.`
    );
  }
}

export function buildUpdateCompanyBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const allowedKeys = new Set(["companyId", ...COMPANY_UPDATE_FIELDS]);
  const unsupportedKeys = Object.keys(args).filter(
    (key) => !allowedKeys.has(key)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `\`update_company\` accepts only editable company settings. Unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
    );
  }

  const body: Record<string, unknown> = {};
  for (const key of COMPANY_UPDATE_FIELDS) {
    if (args[key] !== undefined) {
      body[key] = args[key];
    }
  }

  if (Object.keys(body).length === 0) {
    throw new Error(
      `Provide at least one of ${COMPANY_UPDATE_FIELDS.map((key) => `\`${key}\``).join(", ")} when calling \`update_company\`.`
    );
  }

  for (const key of [
    "name",
    "description",
    "logoUrl",
    "founderName",
    "primaryColor",
    "toneVoice",
    "companyContext",
    "emailDesignPrompt",
    "emailLengthPreference",
    "privacyPolicyUrl",
    "termsUrl",
    "address",
    "language",
    "fontFamily",
    "emailDirection",
    "senderProfileId",
    "fromEmail",
    "fromName",
    "replyProfileId",
    "replyTo",
    "replyToName",
    "replyTrackingDomainMode",
  ]) {
    if (args[key] !== undefined && typeof args[key] !== "string") {
      throw new Error(
        `\`${key}\` must be a string when calling \`update_company\`.`
      );
    }
  }

  validateOptionalObjectArg("update_company", args, "brandColors");
  validateOptionalObjectArg("update_company", args, "socialLinks");
  validateOptionalObjectArg("update_company", args, "pricing");

  // emailTheme is nullable: null resets the company to the platform default
  // theme, so it cannot use validateOptionalObjectArg.
  if (
    args.emailTheme !== undefined &&
    args.emailTheme !== null &&
    !isRecord(args.emailTheme)
  ) {
    throw new Error(
      "`emailTheme` must be an object or null when calling `update_company`."
    );
  }
  validateOptionalArrayArg("update_company", args, "valueProps");
  validateOptionalArrayArg("update_company", args, "testimonials");

  // defaultSubscriberListIds is nullable and the three states are distinct:
  // null = every list, [] = no list, populated = exactly those lists. It
  // therefore cannot use validateOptionalArrayArg, which would reject null.
  if (
    args.defaultSubscriberListIds !== undefined &&
    args.defaultSubscriberListIds !== null
  ) {
    if (!Array.isArray(args.defaultSubscriberListIds)) {
      throw new Error(
        "`defaultSubscriberListIds` must be an array of list IDs, null for every list, or [] for no list when calling `update_company`."
      );
    }
    if (
      args.defaultSubscriberListIds.some(
        (listId) => typeof listId !== "string" || listId.trim() === ""
      )
    ) {
      throw new Error(
        "`defaultSubscriberListIds` must contain non-empty list IDs when calling `update_company`."
      );
    }
  }

  for (const key of ["replyTrackingEnabled", "forwardReplies"] as const) {
    if (args[key] !== undefined && typeof args[key] !== "boolean") {
      throw new Error(
        `\`${key}\` must be a boolean when calling \`update_company\`.`
      );
    }
  }

  if (
    args.replyTrackingDomainMode !== undefined &&
    args.replyTrackingDomainMode !== "sequenzy" &&
    args.replyTrackingDomainMode !== "custom"
  ) {
    throw new Error(
      "`replyTrackingDomainMode` must be `sequenzy` or `custom` when calling `update_company`."
    );
  }

  if (
    typeof args.primaryColor === "string" &&
    !/^#[0-9a-f]{6}$/i.test(args.primaryColor.trim())
  ) {
    throw new Error(
      "`primaryColor` must be a 6-digit hex color such as #f97316 when calling `update_company`."
    );
  }

  for (const key of ["fromEmail", "replyTo"] as const) {
    const value = args[key];
    if (
      typeof value === "string" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ) {
      throw new Error(
        `\`${key}\` must be a valid email address when calling \`update_company\`.`
      );
    }
  }
  // `fromName`/`replyToName` are valid on their own: without an address or a
  // profile ID they rename the company's existing default profile. The server
  // rejects the case where no such profile exists yet, and the case where an
  // address carries several display names and the target is ambiguous.

  return body;
}

export const TRACKING_SETTINGS_UPDATE_FIELDS = [
  "openTrackingEnabled",
  "clickTrackingEnabled",
  "strictBotFilteringEnabled",
  "unsubscribeTrackingEnabled",
  "defaultAttributionWindowHours",
  "doubleOptInEnabled",
  "doubleOptInRedirectUrl",
  "autoUtmEnabled",
  "autoUtmSettings",
] as const;

const AUTO_UTM_FIELDS = [
  "source",
  "medium",
  "campaign",
  "content",
  "term",
] as const;

export function buildUpdateTrackingSettingsBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const allowedKeys = new Set([
    "companyId",
    ...TRACKING_SETTINGS_UPDATE_FIELDS,
  ]);
  const unsupportedKeys = Object.keys(args).filter(
    (key) => !allowedKeys.has(key)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `\`update_tracking_settings\` accepts only tracking settings. Unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}. Reply tracking is set with \`update_company\`.`
    );
  }

  const body: Record<string, unknown> = {};
  for (const key of TRACKING_SETTINGS_UPDATE_FIELDS) {
    if (args[key] !== undefined) {
      body[key] = args[key];
    }
  }

  if (Object.keys(body).length === 0) {
    throw new Error(
      `Provide at least one of ${TRACKING_SETTINGS_UPDATE_FIELDS.map((key) => `\`${key}\``).join(", ")} when calling \`update_tracking_settings\`.`
    );
  }

  for (const key of [
    "openTrackingEnabled",
    "clickTrackingEnabled",
    "strictBotFilteringEnabled",
    "unsubscribeTrackingEnabled",
    "doubleOptInEnabled",
    "autoUtmEnabled",
  ] as const) {
    if (args[key] !== undefined && typeof args[key] !== "boolean") {
      throw new Error(
        `\`${key}\` must be a boolean when calling \`update_tracking_settings\`.`
      );
    }
  }

  if (
    args.defaultAttributionWindowHours !== undefined &&
    (typeof args.defaultAttributionWindowHours !== "number" ||
      !Number.isInteger(args.defaultAttributionWindowHours) ||
      args.defaultAttributionWindowHours < 1 ||
      args.defaultAttributionWindowHours > 720)
  ) {
    throw new Error(
      "`defaultAttributionWindowHours` must be a whole number of hours between 1 and 720 when calling `update_tracking_settings`."
    );
  }

  // doubleOptInRedirectUrl is nullable: null clears the redirect, keeping
  // subscribers on the branded confirmation page.
  if (
    args.doubleOptInRedirectUrl !== undefined &&
    args.doubleOptInRedirectUrl !== null &&
    typeof args.doubleOptInRedirectUrl !== "string"
  ) {
    throw new Error(
      "`doubleOptInRedirectUrl` must be a URL string or null when calling `update_tracking_settings`."
    );
  }

  // autoUtmSettings is nullable: null resets every UTM parameter to the
  // platform defaults, so it cannot use validateOptionalObjectArg.
  if (
    args.autoUtmSettings !== undefined &&
    args.autoUtmSettings !== null &&
    !isRecord(args.autoUtmSettings)
  ) {
    throw new Error(
      "`autoUtmSettings` must be an object or null when calling `update_tracking_settings`."
    );
  }

  if (isRecord(args.autoUtmSettings)) {
    const settings = args.autoUtmSettings;
    const unsupportedUtmKeys = Object.keys(settings).filter(
      (key) => !(AUTO_UTM_FIELDS as readonly string[]).includes(key)
    );
    if (unsupportedUtmKeys.length > 0) {
      throw new Error(
        `\`autoUtmSettings\` accepts only ${AUTO_UTM_FIELDS.map((key) => `\`${key}\``).join(", ")}. Unsupported: ${unsupportedUtmKeys.map((key) => `\`${key}\``).join(", ")}.`
      );
    }
    for (const key of AUTO_UTM_FIELDS) {
      const value = settings[key];
      if (value !== undefined && value !== null && typeof value !== "string") {
        throw new Error(
          `\`autoUtmSettings.${key}\` must be a string or null when calling \`update_tracking_settings\`.`
        );
      }
    }
  }

  return body;
}

type SendingIdentityPair = {
  profileKey: string;
  emailKey: string;
  nameKey: string;
  addressLabel: string;
};

const SENDER_IDENTITY_PAIR: SendingIdentityPair = {
  profileKey: "senderProfileId",
  emailKey: "fromEmail",
  nameKey: "fromName",
  addressLabel: "From",
};

const REPLY_IDENTITY_PAIR: SendingIdentityPair = {
  profileKey: "replyProfileId",
  emailKey: "replyTo",
  nameKey: "replyToName",
  addressLabel: "Reply-To",
};

/**
 * The remedy the caller wanted. Rejecting a name that sits beside a profile is
 * only half an answer: the caller asked for a display name, and telling them to
 * drop `senderProfileId` trades away an already-resolved, send-ready profile to
 * get one. A sequence keeps a display-name override on every email step, so
 * there the name moves down a level and the profile stays. Campaigns and
 * account defaults have no such slot, so they keep the address-swap remedy.
 */
function getSendingIdentityRemedy(input: {
  pair: SendingIdentityPair;
  nameHasStepOverride?: boolean | undefined;
}): string {
  const { profileKey, emailKey, nameKey } = input.pair;
  if (input.nameHasStepOverride) {
    return `To keep \`${profileKey}\` and still change the display name, send \`${profileKey}\` on its own and set \`${nameKey}\` on each email step, where it applies as a per-step display-name override. To change the address instead, omit \`${profileKey}\` and send \`${emailKey}\` (optionally with \`${nameKey}\`).`;
  }
  return `To use a different address or display name, omit \`${profileKey}\` and send \`${emailKey}\` (optionally with \`${nameKey}\`) instead.`;
}

/**
 * A saved profile carries both the address and the display name, so pairing it
 * with the address/name fields has no meaning. Callers used to learn that one
 * rejection at a time - `senderProfileId` plus `fromName` asked for
 * `fromEmail`, and supplying `fromEmail` then said not to send both - so every
 * rejection here states the whole rule and how to get the intended result.
 */
function validateSendingIdentityPair(input: {
  toolName: string;
  args: Record<string, unknown>;
  pair: SendingIdentityPair;
  location?: string | undefined;
  /** Preserves each call site's established field order in the message. */
  profileFirst?: boolean | undefined;
  /** Sequence steps keep the name as a per-step override, not profile data. */
  nameIsOverride?: boolean | undefined;
  /**
   * Set by sequence-level tools, whose email steps accept `nameKey` as a
   * per-step override. It changes only the suggested remedy, never what is
   * accepted here.
   */
  nameHasStepOverride?: boolean | undefined;
}): void {
  const { profileKey, emailKey, nameKey, addressLabel } = input.pair;
  const hasProfile = input.args[profileKey] !== undefined;
  const hasEmail = input.args[emailKey] !== undefined;
  const hasName = input.args[nameKey] !== undefined;
  const callSuffix = input.location
    ? `for ${input.location} when calling \`${input.toolName}\``
    : `when calling \`${input.toolName}\``;
  const profileRule = `\`${profileKey}\` already sets both the ${addressLabel} address and the display name, so send it without \`${emailKey}\`${
    input.nameIsOverride ? "" : ` and \`${nameKey}\``
  }.`;
  const remedy = getSendingIdentityRemedy({
    pair: input.pair,
    nameHasStepOverride: input.nameHasStepOverride,
  });
  const stepOverrideHint = `For a per-email display name, set \`${nameKey}\` on the email steps instead.`;

  if (hasProfile && hasEmail) {
    const [first, second] = input.profileFirst
      ? [profileKey, emailKey]
      : [emailKey, profileKey];
    // A caller who also sent the name is one retry away from the name conflict
    // below, so answer both halves now rather than one rejection at a time.
    const nameHint =
      hasName && input.nameHasStepOverride ? ` ${stepOverrideHint}` : "";
    throw new Error(
      `Provide either \`${first}\` or \`${second}\` ${callSuffix}, not both. ${profileRule}${nameHint}`
    );
  }
  if (hasProfile && hasName && !input.nameIsOverride) {
    throw new Error(
      `\`${nameKey}\` cannot be combined with \`${profileKey}\` ${callSuffix}. ${profileRule} ${remedy}`
    );
  }
  if (hasName && !hasEmail && !input.nameIsOverride) {
    throw new Error(
      `\`${nameKey}\` requires \`${emailKey}\` ${callSuffix}. Send \`${nameKey}\` with the \`${emailKey}\` it names, or send \`${profileKey}\` on its own to use an existing profile's address and name.${
        input.nameHasStepOverride ? ` ${stepOverrideHint}` : ""
      }`
    );
  }
}

/**
 * Validates the campaign/sequence-level sending identity fields, where the
 * display name belongs to the sender or reply profile rather than the record.
 */
export function validateSendingIdentityArgs(
  toolName: string,
  args: Record<string, unknown>,
  options?: {
    /** `replyFirst` keeps `update_campaign` reporting reply conflicts first. */
    replyFirst?: boolean;
    /**
     * Set by sequence tools so a rejected `fromName` points at the per-step
     * override. Only the sender pair has one; an address carries a single
     * Reply-To name company-wide, so `replyToName` has nowhere to go.
     */
    hasEmailSteps?: boolean;
  }
): void {
  const pairs = options?.replyFirst
    ? [REPLY_IDENTITY_PAIR, SENDER_IDENTITY_PAIR]
    : [SENDER_IDENTITY_PAIR, REPLY_IDENTITY_PAIR];
  for (const pair of pairs) {
    validateSendingIdentityPair({
      toolName,
      args,
      pair,
      nameHasStepOverride:
        options?.hasEmailSteps === true && pair === SENDER_IDENTITY_PAIR,
    });
  }
}

export const sequenceEmailStepIdentityKeys = [
  "senderProfileId",
  "fromEmail",
  "fromName",
  "replyProfileId",
  "replyTo",
  "replyToName",
] as const;

export function hasSequenceEmailStepIdentityArgs(
  step: Record<string, unknown>
): boolean {
  return sequenceEmailStepIdentityKeys.some((key) => step[key] !== undefined);
}

export function isSequenceEmailPathStep(
  step: Record<string, unknown>
): boolean {
  if (typeof step.nodeType === "string") {
    return step.nodeType === "action_email";
  }

  return step.type === undefined || step.type === "email";
}

export function validateSequenceEmailStepIdentityArgs(
  toolName: string,
  location: string,
  step: Record<string, unknown>
): void {
  for (const key of sequenceEmailStepIdentityKeys) {
    const value = step[key];
    if (value !== undefined && typeof value !== "string") {
      throw new Error(
        `\`${key}\` must be a string for ${location} when calling \`${toolName}\`.`
      );
    }
  }
  // A step-level `fromName` is a display-name override the send path applies on
  // top of whichever profile the step resolves to, so it may stand alone or sit
  // beside `senderProfileId`. `replyToName` has no such override.
  validateSendingIdentityPair({
    toolName,
    args: step,
    pair: SENDER_IDENTITY_PAIR,
    location,
    profileFirst: true,
    nameIsOverride: true,
  });
  validateSendingIdentityPair({
    toolName,
    args: step,
    pair: REPLY_IDENTITY_PAIR,
    location,
    profileFirst: true,
  });
}

export function validateSequencePathStepIdentityArgs(
  toolName: string,
  location: string,
  step: Record<string, unknown>
): void {
  if (
    hasSequenceEmailStepIdentityArgs(step) &&
    !isSequenceEmailPathStep(step)
  ) {
    throw new Error(
      `Sender identity fields are only supported for email steps at ${location} when calling \`${toolName}\`.`
    );
  }

  validateSequenceEmailStepIdentityArgs(toolName, location, step);
}

export function validateSequenceEmailStepIdentityArray(
  toolName: string,
  location: string,
  value: unknown
): void {
  if (!Array.isArray(value)) return;
  value.forEach((step, index) => {
    if (isRecord(step)) {
      validateSequenceEmailStepIdentityArgs(
        toolName,
        `${location}[${index}]`,
        step
      );
    }
  });
}

export function validateSequencePathStepIdentityArray(
  toolName: string,
  location: string,
  value: unknown
): void {
  if (!Array.isArray(value)) return;
  value.forEach((step, index) => {
    if (isRecord(step)) {
      validateSequencePathStepIdentityArgs(
        toolName,
        `${location}[${index}]`,
        step
      );
    }
  });
}

export function validateUpdateSequenceStepIdentities(
  args: Record<string, unknown>
): void {
  const toolName = "update_sequence";
  validateSequenceEmailStepIdentityArray(toolName, "emails", args.emails);
  validateSequenceEmailStepIdentityArray(toolName, "steps", args.steps);

  if (isRecord(args.insertSteps)) {
    validateSequencePathStepIdentityArray(
      toolName,
      "insertSteps.steps",
      args.insertSteps.steps
    );
  }

  if (!isRecord(args.branch)) return;
  if (Array.isArray(args.branch.branches)) {
    args.branch.branches.forEach((branch, branchIndex) => {
      if (isRecord(branch)) {
        validateSequencePathStepIdentityArray(
          toolName,
          `branch.branches[${branchIndex}].steps`,
          branch.steps
        );
      }
    });
  }
  validateSequencePathStepIdentityArray(
    toolName,
    "branch.elseSteps",
    args.branch.elseSteps
  );
}

export function buildUpdateSequenceBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  validateLabelsArg("update_sequence", args);
  const triggerFields = [
    "listId",
    "listIds",
    "listScope",
    "tagName",
    "tagNames",
    "segmentId",
    "stopOnSegmentExit",
    "eventName",
    "propertyFilters",
    "integrationSlug",
    "integrationEventKey",
    "customIntegration",
    "inactiveDays",
    "inactivityBaseline",
    "minCount",
    "timeWindowDays",
  ];
  if (
    args.trigger === undefined &&
    triggerFields.some((field) => args[field] !== undefined)
  ) {
    throw new Error(
      "Provide `trigger` when replacing sequence trigger configuration with `update_sequence`."
    );
  }
  validateSequenceListScopeArgs("update_sequence", args);
  validateSendingIdentityArgs("update_sequence", args, { hasEmailSteps: true });
  if (
    args.clearEnrollmentFieldPath === true &&
    args.enrollmentFieldPath !== undefined
  ) {
    throw new Error(
      "Provide either `enrollmentFieldPath` or `clearEnrollmentFieldPath` when calling `update_sequence`, not both."
    );
  }
  if (args.clearSendingWindow === true && args.sendingWindow !== undefined) {
    throw new Error(
      "Provide either `sendingWindow` or `clearSendingWindow` when calling `update_sequence`, not both."
    );
  }
  if (args.clearBccEmails === true && args.bccEmails !== undefined) {
    throw new Error(
      "Provide either `bccEmails` or `clearBccEmails` when calling `update_sequence`, not both."
    );
  }
  if (args.branch !== undefined && args.insertSteps !== undefined) {
    throw new Error(
      "Provide either `branch` or `insertSteps` when calling `update_sequence`, not both."
    );
  }
  validateUpdateSequenceStepIdentities(args);

  const body = { ...args };
  delete body.clearEnrollmentFieldPath;
  delete body.clearSendingWindow;
  delete body.clearBccEmails;

  if (args.clearEnrollmentFieldPath === true) {
    body.enrollmentFieldPath = null;
  }
  if (args.clearSendingWindow === true) {
    body.sendingWindow = null;
  }
  if (args.clearBccEmails === true) {
    body.bccEmails = null;
  }

  return body;
}

function validateGoalTriggerArgs(
  toolName: "create_sequence_goal" | "create_campaign_goal",
  args: Record<string, unknown>
): void {
  const triggerType = args.triggerType ?? "event";
  if (triggerType === "event") {
    if (
      typeof args.triggerEventName !== "string" ||
      args.triggerEventName.trim().length === 0
    ) {
      throw new Error(
        `\`triggerEventName\` is required when calling \`${toolName}\` with an event goal (the default \`triggerType\`).`
      );
    }
    return;
  }

  if (triggerType === "tag_added") {
    if (
      typeof args.triggerTagName !== "string" ||
      args.triggerTagName.trim().length === 0
    ) {
      throw new Error(
        `\`triggerTagName\` is required when calling \`${toolName}\` with \`triggerType: "tag_added"\`.`
      );
    }
    return;
  }

  if (
    typeof args.attributePath !== "string" ||
    args.attributePath.trim().length === 0
  ) {
    throw new Error(
      `\`attributePath\` is required when calling \`${toolName}\` with \`triggerType: "attribute_change"\`.`
    );
  }
  const attributeCondition = args.attributeCondition ?? "changed";
  const hasAttributeValue =
    typeof args.attributeValue === "string" &&
    args.attributeValue.trim().length > 0;
  const hasAttributePreviousValue =
    typeof args.attributePreviousValue === "string" &&
    args.attributePreviousValue.trim().length > 0;
  if (
    (attributeCondition === "changed_to" ||
      attributeCondition === "changed_from_to") &&
    !hasAttributeValue
  ) {
    throw new Error(
      `\`attributeValue\` is required when calling \`${toolName}\` with \`attributeCondition\` \`changed_to\` or \`changed_from_to\`.`
    );
  }
  if (attributeCondition === "changed_from_to" && !hasAttributePreviousValue) {
    throw new Error(
      `\`attributePreviousValue\` is required when calling \`${toolName}\` with \`attributeCondition: "changed_from_to"\`.`
    );
  }
}

export function validateCreateSequenceGoalArgs(
  args: Record<string, unknown>
): void {
  validateGoalTriggerArgs("create_sequence_goal", args);
}

export function validateCreateCampaignGoalArgs(
  args: Record<string, unknown>
): void {
  validateGoalTriggerArgs("create_campaign_goal", args);
}

export function validateUpdateSequenceGoalArgs(
  args: Record<string, unknown>
): void {
  validateUpdateGoalTriggerArgs("update_sequence_goal", args);
}

export function validateUpdateCampaignGoalArgs(
  args: Record<string, unknown>
): void {
  validateUpdateGoalTriggerArgs("update_campaign_goal", args);
}

function validateUpdateGoalTriggerArgs(
  toolName: "update_sequence_goal" | "update_campaign_goal",
  args: Record<string, unknown>
): void {
  // Partial updates are allowed: when the trigger type is unchanged, the API
  // preserves the goal's stored trigger fields, so omitted fields must not be
  // required here. Only explicitly provided empty values are rejected locally.
  if (
    typeof args.triggerEventName === "string" &&
    args.triggerEventName.trim().length === 0
  ) {
    throw new Error(
      `\`triggerEventName\` must be a non-empty string when provided to \`${toolName}\`.`
    );
  }
  if (
    typeof args.attributePath === "string" &&
    args.attributePath.trim().length === 0
  ) {
    throw new Error(
      `\`attributePath\` must be a non-empty string when provided to \`${toolName}\`.`
    );
  }
  if (
    typeof args.triggerTagName === "string" &&
    args.triggerTagName.trim().length === 0
  ) {
    throw new Error(
      `\`triggerTagName\` must be a non-empty string when provided to \`${toolName}\`.`
    );
  }
}
