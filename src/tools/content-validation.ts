import {
  validateHtmlOrBlocksArgs,
  validateLabelsArg,
} from "./argument-validation.js";
import { isRecord, optionalString } from "./common-primitives.js";
import {
  discountMergeTagsHint,
  sequenceEmailBlocksDescription,
  sequenceWaitUntilSchema,
  sequenceWaitUntilWeekdaySchema,
  sequenceDelaySchema,
} from "./descriptions.js";

export function validateCreateCampaignContentArgs(
  args: Record<string, unknown>
): void {
  validateHtmlOrBlocksArgs("create_campaign", args);
  validateLabelsArg("create_campaign", args);

  const hasPrompt = optionalString(args, "prompt") !== undefined;
  const hasHtml = args.html !== undefined;
  const hasBlocks = args.blocks !== undefined;
  const hasTemplate = args.templateId !== undefined;

  if (args.prompt !== undefined && !hasPrompt) {
    throw new Error("`prompt` cannot be empty when calling `create_campaign`.");
  }

  if (hasPrompt && (hasHtml || hasBlocks || hasTemplate)) {
    throw new Error(
      "Provide either `prompt`, `html`, `blocks`, or `templateId` when calling `create_campaign`, not multiple content sources."
    );
  }

  if (!hasPrompt && (args.style !== undefined || args.tone !== undefined)) {
    throw new Error(
      "`style` and `tone` can only be used with `prompt` when calling `create_campaign`."
    );
  }

  if (!hasPrompt && optionalString(args, "subject") === undefined) {
    throw new Error(
      "`subject` is required unless `prompt` is provided when calling `create_campaign`."
    );
  }
}

export function validateCreateTemplateContentArgs(
  args: Record<string, unknown>
): void {
  validateHtmlOrBlocksArgs("create_template", args);
  validateLabelsArg("create_template", args);
  const hasPrompt = optionalString(args, "prompt") !== undefined;
  const sources = [
    hasPrompt,
    args.html !== undefined,
    args.blocks !== undefined,
  ].filter(Boolean).length;
  if (args.prompt !== undefined && !hasPrompt) {
    throw new Error("`prompt` cannot be empty when calling `create_template`.");
  }
  if (sources !== 1) {
    throw new Error(
      "Provide exactly one of `prompt`, `html`, or `blocks` when calling `create_template`."
    );
  }
  if (!hasPrompt && (args.style !== undefined || args.tone !== undefined)) {
    throw new Error(
      "`style` and `tone` can only be used with `prompt` when calling `create_template`."
    );
  }
  if (!hasPrompt && optionalString(args, "subject") === undefined) {
    throw new Error(
      "`subject` is required unless `prompt` is provided when calling `create_template`."
    );
  }
}

export function validateScheduleCampaignArgs(
  args: Record<string, unknown>
): void {
  if (optionalString(args, "scheduledAt") === undefined) {
    throw new Error(
      "`scheduledAt` is required when calling `schedule_campaign`."
    );
  }

  if (args.targetLists !== undefined && !isRecord(args.targetLists)) {
    throw new Error(
      "`targetLists` must be an object when calling `schedule_campaign`."
    );
  }

  if (args.sendTimeOptimization !== undefined) {
    if (typeof args.sendTimeOptimization !== "boolean") {
      throw new Error(
        "`sendTimeOptimization` must be a boolean when calling `schedule_campaign`."
      );
    }
  }

  if (args.spreadOverHours !== undefined) {
    if (
      typeof args.spreadOverHours !== "number" ||
      !Number.isInteger(args.spreadOverHours) ||
      args.spreadOverHours < 1 ||
      args.spreadOverHours > 72
    ) {
      throw new Error(
        "`spreadOverHours` must be an integer between 1 and 72 when calling `schedule_campaign`."
      );
    }
  }

  if (
    args.recurringInterval !== undefined &&
    args.recurringInterval !== "weekly" &&
    args.recurringInterval !== "monthly"
  ) {
    throw new Error(
      "`recurringInterval` must be 'weekly' or 'monthly' when calling `schedule_campaign`."
    );
  }
}

export function buildLandingPageUpdateBody(
  toolName: string,
  args: Record<string, unknown>,
  options: { requireUpdate: boolean }
): Record<string, unknown> {
  const allowedKeys = new Set([
    "companyId",
    "landingPageId",
    "name",
    "slug",
    "content",
  ]);
  const unsupportedKeys = Object.keys(args).filter(
    (key) => !allowedKeys.has(key)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `\`${toolName}\` accepts only \`name\`, \`slug\`, and \`content\` update fields. Unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
    );
  }

  if (
    options.requireUpdate &&
    args.name === undefined &&
    args.slug === undefined &&
    args.content === undefined
  ) {
    throw new Error(
      `Provide at least one of \`name\`, \`slug\`, or \`content\` when calling \`${toolName}\`.`
    );
  }

  return {
    ...(args.name !== undefined && { name: args.name }),
    ...(args.slug !== undefined && { slug: args.slug }),
    ...(args.content !== undefined && { content: args.content }),
  };
}

export function buildLandingPageDomainSettingsBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const allowedKeys = new Set(["companyId", "domain", "verify"]);
  const unsupportedKeys = Object.keys(args).filter(
    (key) => !allowedKeys.has(key)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `\`update_landing_page_domain_settings\` accepts only \`domain\` and \`verify\`. Unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
    );
  }

  if (args.domain === undefined && args.verify !== true) {
    throw new Error(
      "Provide `domain` or `verify: true` when calling `update_landing_page_domain_settings`."
    );
  }

  return {
    ...(args.domain !== undefined && { domain: args.domain }),
    ...(typeof args.verify === "boolean" && { verify: args.verify }),
  };
}

export function validateCreateTransactionalContentArgs(
  args: Record<string, unknown>
): void {
  validateHtmlOrBlocksArgs("create_transactional_email", args);

  const hasPrompt = optionalString(args, "prompt") !== undefined;
  const hasHtml = args.html !== undefined;
  const hasBlocks = args.blocks !== undefined;

  if (args.prompt !== undefined && !hasPrompt) {
    throw new Error(
      "`prompt` cannot be empty when calling `create_transactional_email`."
    );
  }

  if (hasPrompt && (hasHtml || hasBlocks)) {
    throw new Error(
      "Provide either `prompt`, `html`, or `blocks` when calling `create_transactional_email`, not multiple content sources."
    );
  }

  if (!hasPrompt && (args.style !== undefined || args.tone !== undefined)) {
    throw new Error(
      "`style` and `tone` can only be used with `prompt` when calling `create_transactional_email`."
    );
  }

  if (!hasPrompt && !hasHtml && !hasBlocks) {
    throw new Error(
      "Provide either `prompt`, `html`, or `blocks` when calling `create_transactional_email`."
    );
  }

  if (!hasPrompt && optionalString(args, "subject") === undefined) {
    throw new Error(
      "`subject` is required unless `prompt` is provided when calling `create_transactional_email`."
    );
  }
}

export const subscriberUpdateConfigSchema = {
  type: "object",
  description:
    "Update Subscriber config. firstName, lastName, and customAttributeUpdates values may use trigger-event merge tags such as {{event.plan}}. Number and boolean values must be a literal or one standalone merge tag and are coerced after resolution.",
  properties: {
    label: { type: "string" },
    firstName: {
      type: ["string", "null"],
      description: "First name literal or merge tag; null clears the field.",
    },
    lastName: {
      type: ["string", "null"],
      description: "Last name literal or merge tag; null clears the field.",
    },
    status: {
      type: "string",
      enum: ["active", "unsubscribed", "bounced"],
    },
    customAttributeUpdates: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          value: {
            type: ["string", "number", "boolean", "null"],
            description:
              "Literal scalar, null to delete, or a standalone merge tag such as {{event.plan}}, {{event.amount}}, or {{event.active}}.",
          },
          valueType: {
            type: "string",
            enum: ["text", "number", "boolean"],
          },
        },
        required: ["name", "value"],
      },
    },
  },
  additionalProperties: true,
};

export const sequencePathStepConfigSchema = {
  type: "object",
  description:
    "Config for advanced nodeType steps. Required fields depend on nodeType: action_add_tag and action_remove_tag need tagId or tagName; action_add_to_list and action_remove_from_list need listId; action_update_attributes uses the Update Subscriber fields (firstName, lastName, status, customAttributeUpdates) and may use trigger-event merge tags; logic_wait_for_event needs eventName plus optional timeoutDays and timeoutAction; logic_condition needs conditionType plus that condition's resource field; action_webhook needs an HTTPS url plus optional method, headers, body, resultKey, and onError; action_ai needs prompt, resultKey, and outputFields plus optional includeTags, includeEventProperties, includeAttributes, and onError; logic_delay uses delayDays/delayHours/delayMinutes. Fields that do not apply to the node type are dropped.",
  properties: {
    ...subscriberUpdateConfigSchema.properties,
    tagId: {
      type: "string",
      description:
        "action_add_tag / action_remove_tag: tag ID. Pass a name in tagName instead, because tag actions resolve tagId by ID only. has_tag / does_not_have_tag also accept a tag name here. Missing tag definitions are created automatically.",
    },
    tagName: {
      type: "string",
      description:
        "action_add_tag / action_remove_tag / has_tag / does_not_have_tag: tag name. Use instead of tagId when you only know the name.",
    },
    listId: {
      type: "string",
      description:
        "action_add_to_list / action_remove_from_list / in_list: list ID. It must match an existing list in this company; listName is filled in for you.",
    },
    listName: {
      type: "string",
      description: "Optional cached list display name for list actions.",
    },
    eventName: {
      type: "string",
      description:
        "logic_wait_for_event and event_received conditions: event to wait for or check, for example email.replied.",
    },
    timeoutDays: {
      type: "number",
      description:
        "logic_wait_for_event: maximum wait in whole days from 1 to 365. Defaults to 7.",
    },
    timeoutAction: {
      type: "string",
      enum: ["continue", "exit"],
      description:
        "logic_wait_for_event: continue to the next node or exit the sequence when the timeout is reached. Defaults to continue.",
    },
    conditionType: {
      type: "string",
      enum: [
        "has_tag",
        "does_not_have_tag",
        "in_list",
        "in_segment",
        "event_received",
        "link_clicked",
        "field_equals",
        "field_contains",
        "field_greater_than",
        "field_less_than",
        "has_phone",
        "sms_subscribed",
      ],
      description:
        "logic_condition: condition evaluated before continuing. has_phone and sms_subscribed need no resource fields.",
    },
    segmentId: {
      type: "string",
      description: "logic_condition: segment ID for in_segment.",
    },
    segmentName: {
      type: "string",
      description: "Optional cached segment display name.",
    },
    linkUrl: {
      type: "string",
      description:
        "logic_condition: optional URL substring for link_clicked. Omit to match any tracked click.",
    },
    activityScope: {
      type: "string",
      enum: ["ever", "this_sequence", "previous_email"],
      description:
        "logic_condition: scope for event_received and link_clicked. Use this_sequence to restrict activity to the current enrollment.",
    },
    fieldName: {
      type: "string",
      description:
        "logic_condition: subscriber attribute name/path for field comparisons.",
    },
    fieldValue: {
      type: "string",
      description: "logic_condition: comparison value for field comparisons.",
    },
    url: {
      type: "string",
      description:
        "action_webhook: destination HTTPS URL called when a subscriber reaches this step. Supports merge tags like {{email}} and {{event.order_id}} resolved at execution time.",
    },
    method: {
      type: "string",
      enum: ["POST", "GET", "PUT", "PATCH", "DELETE"],
      description: "action_webhook: HTTP method. Defaults to POST.",
    },
    headers: {
      type: "object",
      description:
        "action_webhook: optional string-valued request headers. Values support merge tags. Secret values are redacted on sequence reads.",
      additionalProperties: { type: "string" },
    },
    body: {
      type: "string",
      description:
        'action_webhook: optional JSON body template for POST/PUT/PATCH. Must be valid JSON as written, with merge tags inside quoted string values ({"email": "{{email}}"}); a tag in a bare value position is rejected. Tags are resolved at execution time; when omitted, the default payload with subscriber and sequence context is sent.',
    },
    resultKey: {
      type: "string",
      description:
        "action_webhook / action_ai: where the result is saved. Later steps reference it via {{webhooks.KEY.data.field}} (webhook) or {{ai.KEY.field}} (AI) merge tags. Required for action_ai. Must start with a letter; letters, numbers, underscores; max 64 chars.",
    },
    onError: {
      type: "string",
      enum: ["continue", "exit", "fail"],
      description:
        "action_webhook / action_ai: behavior when the step fails. continue proceeds to the next step, exit ends the sequence for the subscriber, fail marks the enrollment failed. Defaults to fail for webhooks and continue for AI steps (fallbacks fill the output fields).",
    },
    prompt: {
      type: "string",
      description:
        "action_ai: prompt template sent to the model, resolved per contact at execution time. Supports merge tags like {{first_name}}, {{event.plan}}, and {{webhooks.KEY.data.field}}. Max 8000 chars.",
    },
    outputFields: {
      type: "array",
      description:
        "action_ai: named values the model must return (1-10). Each key becomes a {{ai.KEY.<key>}} merge tag for later steps. fallback is used when generation fails, so emails still send with sensible copy. Combined field maxLength values must fit the step's 2000-token response budget (roughly 3 characters per token plus JSON overhead).",
      items: {
        type: "object",
        properties: {
          key: {
            type: "string",
            description:
              "Field key, e.g. subject_line. Must start with a letter; letters, numbers, underscores; max 64 chars; unique within the step.",
          },
          description: {
            type: "string",
            description:
              "What the model should produce for this field, e.g. 'A subject line under 50 characters'. Max 300 chars.",
          },
          maxLength: {
            type: "number",
            description:
              "Hard cap on stored characters (1-4000). Defaults to 500. Output beyond it is cut.",
          },
          fallback: {
            type: "string",
            description:
              "Text used verbatim when generation fails or the model omits the field.",
          },
        },
        required: ["key"],
        additionalProperties: false,
      },
    },
    includeTags: {
      type: "boolean",
      description:
        "action_ai: include the contact's tags in the prompt context.",
    },
    includeEventProperties: {
      type: "boolean",
      description:
        "action_ai: include the enrollment's trigger event name and properties in the prompt context.",
    },
    includeAttributes: {
      type: "array",
      items: { type: "string" },
      description:
        "action_ai: custom attribute keys to include in the prompt context (max 30). Only the listed keys are sent.",
    },
    delayDays: {
      type: "number",
      description: "logic_delay: whole days to wait.",
    },
    delayHours: {
      type: "number",
      description: "logic_delay: hours to wait.",
    },
    delayMinutes: {
      type: "number",
      description: "logic_delay: minutes to wait.",
    },
  },
  additionalProperties: true,
} as const;

export const sequenceEmailStepIdentityProperties = {
  senderProfileId: {
    type: "string",
    description:
      "Sender profile for this step's From identity. Mutually exclusive with fromEmail.",
  },
  fromEmail: {
    type: "string",
    description:
      "From address for this step. Its domain must be configured and verified. Mutually exclusive with senderProfileId.",
  },
  fromName: {
    type: "string",
    description:
      "Display name override for this step. Alone it only changes the visible name; with fromEmail it also names a newly created sender profile.",
  },
  replyProfileId: {
    type: "string",
    description:
      "Reply profile for this step's Reply-To. Mutually exclusive with replyTo.",
  },
  replyTo: {
    type: "string",
    description:
      "Reply-To address for this step. Mutually exclusive with replyProfileId.",
  },
  replyToName: {
    type: "string",
    description:
      "Reply-To display name override for this step. Requires replyTo; omit it when using replyProfileId, which already carries its own display name.",
  },
} as const;

export const sequencePathStepSchema = {
  type: "object",
  description:
    "A typed step to create inside a sequence path, including email, SMS, delay, discount, subscriber actions, conditions, waits, webhooks, and AI steps.",
  properties: {
    type: {
      type: "string",
      enum: [
        "email",
        "sms",
        "delay",
        "create_discount",
        "discount",
        "update_subscriber",
        "condition",
        "webhook",
        "ai",
      ],
      description:
        "Sequence path step type. Omit for email steps; use delay for fixed/date waits or update_subscriber for action_update_attributes. For an event gate, use nodeType:'logic_wait_for_event' with an explicit config object.",
    },
    nodeType: {
      type: "string",
      enum: [
        "logic_delay",
        "action_email",
        "action_sms",
        "action_create_discount",
        "action_add_tag",
        "action_remove_tag",
        "action_add_to_list",
        "action_remove_from_list",
        "action_update_attributes",
        "logic_wait_for_event",
        "logic_condition",
        "action_webhook",
        "action_ai",
      ],
      description:
        "Advanced sequence path node type. Prefer type unless creating a non-email action. Tag, list, subscriber-update, wait, condition, webhook, and AI node types carry their fields in config, for example nodeType:'action_add_tag' with config:{ tagName:'newsletter-confirmed' }. SMS steps still use the step-level text/imageUrls/ineligibleAction, discount steps the step-level discount fields, and delays the step-level delay/delayMs/waitUntil.",
    },
    config: sequencePathStepConfigSchema,
    subject: {
      type: "string",
      description: "Email subject. Required for email steps.",
    },
    previewText: {
      type: "string",
      description: "Email preview text.",
    },
    blocks: {
      type: "array",
      description: sequenceEmailBlocksDescription,
      items: { type: "object" },
    },
    html: {
      type: "string",
      description:
        "HTML content for email steps. Stored as one raw HTML block. Use this for imported provider HTML.",
    },
    isTransactional: {
      type: "boolean",
      description: "Email only: omit the marketing unsubscribe footer.",
    },
    ccEmails: {
      type: "array",
      items: { type: "string" },
      description: "Email only: addresses CC'd on this step.",
    },
    bccEmails: {
      type: "array",
      items: { type: "string" },
      description:
        "Email only: addresses BCC'd on this step in addition to sequence BCC.",
    },
    attachments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          filename: { type: "string" },
          path: { type: "string" },
        },
        required: ["filename", "path"],
      },
      description:
        "Email only: URL-backed file attachments (max 10, 7MB total per email). path may be a public HTTPS URL or an {{event.*}} URL template resolved from the enrollment event at send time.",
    },
    text: {
      type: "string",
      description: "SMS only: plain-text message body.",
    },
    imageUrls: {
      type: "array",
      items: { type: "string" },
      description: "SMS only: up to two public MMS image URLs.",
    },
    ineligibleAction: {
      type: "string",
      enum: ["skip", "exit"],
      description: "SMS only: behavior when the contact cannot receive SMS.",
    },
    delay: sequenceDelaySchema,
    delayMs: {
      type: "number",
      description:
        "Delay in milliseconds. Useful for standalone type:'delay' steps.",
    },
    waitUntil: sequenceWaitUntilSchema,
    waitUntilWeekday: sequenceWaitUntilWeekdaySchema,
    name: {
      type: "string",
      description: "Email template name for email steps.",
    },
    senderProfileId: {
      type: "string",
      description:
        "Sender profile for this email step. Omit to inherit the effective identity of the nearest sequence email. After a branch merge, only fields shared by every incoming path are inherited; conflicting fields use sequence or company defaults.",
    },
    fromEmail: {
      type: "string",
      description:
        "From address for this email step. Its domain must be verified. Mutually exclusive with senderProfileId.",
    },
    fromName: {
      type: "string",
      description:
        "Display name override for this email step. With fromEmail, also names a newly created sender profile.",
    },
    replyProfileId: {
      type: "string",
      description:
        "Reply profile for this email step. Omit to inherit the effective Reply-To of the nearest sequence email. After a branch merge, only fields shared by every incoming path are inherited; conflicting fields use sequence or company defaults.",
    },
    replyTo: {
      type: "string",
      description:
        "Reply-To address for this email step. Mutually exclusive with replyProfileId.",
    },
    replyToName: {
      type: "string",
      description:
        "Reply-To display name override for this email step. Requires replyTo; omit it when using replyProfileId, which already carries its own display name.",
    },
    discount: {
      type: "object",
      description: `Discount configuration for create_discount steps. Same shape as create_sequence steps.${discountMergeTagsHint}`,
      additionalProperties: true,
    },
    label: {
      type: "string",
      description: "Node label for discount or advanced node steps.",
    },
    provider: {
      type: "string",
      enum: ["stripe", "shopify"],
      description:
        "Discount provider. Use stripe to dynamically create a Stripe coupon plus promotion code, or shopify to dynamically create a Shopify Admin discount code.",
    },
    discountType: {
      type: "string",
      enum: ["percent", "amount"],
    },
    percentOff: { type: "number" },
    amountOff: { type: "number" },
    currency: { type: "string" },
    duration: {
      type: "string",
      enum: ["once", "forever", "repeating"],
    },
    durationInMonths: { type: "number" },
    appliesToAllPlans: { type: "boolean" },
    planIds: { type: "array", items: { type: "string" } },
    codePrefix: { type: "string" },
    maxRedemptions: { type: "number" },
    lockToSubscriber: { type: "boolean" },
    expiresAt: { type: "string" },
    expiresInHours: { type: "number" },
  },
  additionalProperties: false,
} as const;

export const sequenceBranchConditionSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description:
        "Optional stable path ID. Defaults to branch-0, branch-1, and so on. The value 'else' is reserved.",
    },
    label: {
      type: "string",
      description: "Display label, for example 'Replied in this sequence'.",
    },
    conditionType: {
      type: "string",
      enum: [
        "has_tag",
        "does_not_have_tag",
        "in_list",
        "in_segment",
        "event_received",
        "link_clicked",
        "field_equals",
        "field_contains",
        "field_greater_than",
        "field_less_than",
        "has_phone",
        "sms_subscribed",
      ],
      description:
        "Condition for this path. has_phone and sms_subscribed need no resource fields.",
    },
    tagName: {
      type: "string",
      description:
        "Tag name for has_tag and does_not_have_tag. This can be used instead of tagId.",
    },
    tagId: {
      type: "string",
      description: "Tag ID or tag name for has_tag and does_not_have_tag.",
    },
    listId: {
      type: "string",
      description: "List ID for in_list.",
    },
    segmentId: {
      type: "string",
      description: "Segment ID for in_segment.",
    },
    segmentName: {
      type: "string",
      description: "Optional display name for in_segment.",
    },
    eventName: {
      type: "string",
      description: "Event name for event_received, for example email.replied.",
    },
    linkUrl: {
      type: "string",
      description:
        "Optional URL substring for link_clicked. Omit to match any tracked click.",
    },
    activityScope: {
      type: "string",
      enum: ["ever", "this_sequence", "previous_email"],
      description:
        "Scope for event_received and link_clicked. Use this_sequence to restrict activity to the current enrollment.",
    },
    fieldName: {
      type: "string",
      description: "Subscriber attribute name/path for field conditions.",
    },
    fieldValue: {
      type: "string",
      description: "Comparison value for field conditions.",
    },
    targetNodeId: {
      type: "string",
      description:
        "Optional existing node to route this branch path to. Use a node ID from get_sequence, including the sequence completion node when this path should stop. If steps are also provided, they run before this target.",
    },
    steps: {
      type: "array",
      description:
        "Optional new steps for this path. When targetNodeId is also set, the last new step connects to that existing node.",
      items: sequencePathStepSchema,
    },
  },
  required: ["conditionType"],
  additionalProperties: false,
} as const;

export function extractResultError(result: unknown): Error | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const record = result as Record<string, unknown>;

  if (record.success !== false) {
    return null;
  }

  if (typeof record.error === "string") {
    return new Error(record.error);
  }

  if (
    record.error &&
    typeof record.error === "object" &&
    typeof (record.error as { message?: unknown }).message === "string"
  ) {
    return new Error((record.error as { message: string }).message);
  }

  if (typeof record.message === "string") {
    return new Error(record.message);
  }

  return new Error("The tool returned an unsuccessful response.");
}
