import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { buildSequenzyAppUrls, type AppUrlInput } from "../app-urls.js";
import { formatMcpError } from "../error-output.js";
import {
  apiRequest,
  getSelectedCompanyId,
  setSelectedCompanyId,
} from "../runtime.js";

const emailBlocksDescription =
  "Sequenzy email blocks. Use `styles` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as `backgroundColor`, `backgroundOpacity`, `borderColor`, `borderWidth`, and `borderRadius` are also accepted and saved under `styles`. Use this for editor-compatible content, including conditional and repeat blocks. Repeat blocks use { type: 'repeat', source: 'items', itemAlias: 'item', children: [...] }.";

const replacementEmailBlocksDescription =
  "Replacement Sequenzy email blocks. Use `styles` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as `backgroundColor`, `backgroundOpacity`, `borderColor`, `borderWidth`, and `borderRadius` are also accepted and saved under `styles`.";

const sequenceEmailBlocksDescription =
  "Sequenzy email blocks. Provide blocks or html for email steps. Use `styles` for per-block background, background opacity, text color, padding, border radius, border width, and border color. Top-level style aliases such as `backgroundColor`, `backgroundOpacity`, `borderColor`, `borderWidth`, and `borderRadius` are also accepted and saved under `styles`. Blocks can include repeat blocks over array variables such as items.";

const ADD_SUBSCRIBERS_TO_LIST_CHUNK_SIZE = 100;

const segmentOperatorsByField = {
  status: ["is", "is_not"],
  tag: ["contains", "not_contains", "is_empty", "is_not_empty"],
  email: ["contains", "not_contains"],
  emailProvider: ["is", "is_not", "is_empty", "is_not_empty"],
  added: ["less_than", "more_than"],
  firstName: ["contains", "not_contains", "is_empty", "is_not_empty"],
  lastName: ["contains", "not_contains", "is_empty", "is_not_empty"],
  list: ["is", "is_not", "is_empty", "is_not_empty"],
  emailSent: ["is", "is_not", "at_least", "less_than_count"],
  emailDelivered: ["is", "is_not", "at_least", "less_than_count"],
  emailOpened: ["is", "is_not", "at_least", "less_than_count"],
  emailClicked: ["is", "is_not", "at_least", "less_than_count"],
  emailBounced: [
    "is",
    "is_temporary_bounce",
    "is_permanent_bounce",
    "is_not",
    "at_least",
    "less_than_count",
  ],
  emailComplained: ["is", "is_not", "at_least", "less_than_count"],
  attribute: [
    "is",
    "is_not",
    "is_empty",
    "is_not_empty",
    "gte",
    "lte",
    "gt",
    "lt",
    "contains",
    "not_contains",
  ],
  event: ["is", "is_not", "at_least", "less_than_count"],
  segment: ["is", "is_not"],
  stripeProduct: ["is", "is_not", "at_least", "less_than_count"],
  stripeCurrentProduct: ["is", "is_not", "gte", "lte", "gt", "lt"],
  stripeTrialProduct: ["is", "is_not", "gte", "lte", "gt", "lt"],
} as const satisfies Record<string, readonly string[]>;

const segmentFilterOperatorHelp = Object.entries(segmentOperatorsByField)
  .map(([field, operators]) => `${field}: ${operators.join(", ")}`)
  .join("; ");

const segmentFilterItemSchema = {
  type: "object",
  properties: {
    id: {
      type: "string",
      description:
        "Optional filter ID. Any stable string works; one will be generated if omitted.",
    },
    field: {
      type: "string",
      enum: [
        "status",
        "tag",
        "email",
        "emailProvider",
        "added",
        "firstName",
        "lastName",
        "list",
        "emailSent",
        "emailDelivered",
        "emailOpened",
        "emailClicked",
        "emailBounced",
        "emailComplained",
        "attribute",
        "event",
        "segment",
        "stripeProduct",
        "stripeCurrentProduct",
        "stripeTrialProduct",
      ],
      description:
        "Filter field. Use `event` for custom subscriber events, `segment` for saved segment membership, and `stripeProduct`/`stripeCurrentProduct`/`stripeTrialProduct` for Stripe product-based segments. Engagement fields (`emailSent`, `emailDelivered`, `emailOpened`, `emailClicked`, `emailBounced`, `emailComplained`) accept a time range as the value or a specific campaign via `campaign:<campaign_id>`.",
    },
    operator: {
      type: "string",
      enum: [
        "is",
        "is_not",
        "is_empty",
        "is_not_empty",
        "contains",
        "not_contains",
        "less_than",
        "more_than",
        "is_temporary_bounce",
        "is_permanent_bounce",
        "at_least",
        "less_than_count",
        "gte",
        "lte",
        "gt",
        "lt",
      ],
      description: `Filter operator. Allowed operators by field: ${segmentFilterOperatorHelp}.`,
    },
    value: {
      type: "string",
      description:
        "Filter value. For custom attribute empty checks, use `attributeName:` such as `last_logged_in:`. Event examples: `saas.purchase:30d`, `saas.purchase:all`, or `saas.purchase:5:30d` for thresholds. Segment values are segment IDs. Stripe product examples: `prod_123` for bought/didn't buy/current/trialing, `prod_123:3` for payment thresholds, `prod_123:is_canceled` for products set to cancel, `prod_123:cancels_at:2026-05-26`, `prod_123:end_at:2026-05-26`, or `prod_123:start_at:7 days ago` for product-scoped dates. Engagement examples: `7d`, `30d`, `90d`, `180d`, `all` for rolling time windows, or `campaign:<campaign_id>` to scope to a specific sent campaign (use `list_campaigns` to find IDs).",
    },
  },
  required: ["field", "operator", "value"],
  additionalProperties: false,
} as const;

const segmentFilterGroupSchema = {
  type: "object",
  properties: {
    kind: { type: "string", enum: ["group"] },
    id: {
      type: "string",
      description:
        "Stable group ID. Any string works; one will be generated if omitted.",
    },
    joinOperator: {
      type: "string",
      enum: ["and", "or"],
      description: "How children in this group combine.",
    },
    children: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        description:
          'Either a filter leaf (`kind: "filter"`) or another group (`kind: "group"`).',
      },
    },
  },
  required: ["kind", "joinOperator", "children"],
  additionalProperties: true,
} as const;

function normalizeSegmentFilters(filters: unknown): unknown {
  if (!Array.isArray(filters)) {
    return filters;
  }

  return filters.map((filter) => {
    if (typeof filter !== "object" || filter === null) {
      return filter;
    }

    const record = filter as Record<string, unknown>;
    if (typeof record.id === "string" && record.id.trim() !== "") {
      return record;
    }

    return {
      ...record,
      id: crypto.randomUUID(),
    };
  });
}

function normalizeSegmentRoot(root: unknown): unknown {
  if (typeof root !== "object" || root === null) {
    return root;
  }

  const record = root as Record<string, unknown>;
  if (
    record.kind === "filter" ||
    "field" in record ||
    "operator" in record ||
    "value" in record
  ) {
    const normalized = normalizeSegmentFilters([record]);
    return Array.isArray(normalized) ? normalized[0] : record;
  }

  if (record.kind !== "group") {
    return root;
  }

  return {
    ...record,
    id:
      typeof record.id === "string" && record.id.trim() !== ""
        ? record.id
        : crypto.randomUUID(),
    children: Array.isArray(record.children)
      ? record.children.map(normalizeSegmentRoot)
      : [],
  };
}

function hasSegmentAttributeName(value: string): boolean {
  const colonIndex = value.indexOf(":");
  return colonIndex !== -1 && value.substring(0, colonIndex).trim().length > 0;
}

function hasSegmentAttributeValue(value: string): boolean {
  const colonIndex = value.indexOf(":");
  return colonIndex !== -1 && value.substring(colonIndex + 1).trim().length > 0;
}

function isSegmentTimeRange(value: string): boolean {
  if (value === "all") {
    return true;
  }

  const match = value.match(/^(\d+)d$/);
  if (!match?.[1]) {
    return false;
  }

  const days = Number.parseInt(match[1], 10);
  return Number.isInteger(days) && days > 0;
}

function getSegmentEventValueValidationError(
  operator: string,
  value: string
): string | null {
  const parts = value.split(":");

  if (operator === "at_least" || operator === "less_than_count") {
    if (parts.length < 3) {
      return 'Event count filters must use "eventName:count:timeRange", like "saas.purchase:2:30d".';
    }

    const eventName = parts.slice(0, -2).join(":").trim();
    const thresholdValue = parts.at(-2);
    const timeRangeValue = parts.at(-1);
    const threshold =
      thresholdValue === undefined
        ? Number.NaN
        : Number.parseInt(thresholdValue, 10);

    return eventName &&
      Number.isInteger(threshold) &&
      threshold > 0 &&
      timeRangeValue !== undefined &&
      isSegmentTimeRange(timeRangeValue)
      ? null
      : 'Event count filters must use "eventName:count:timeRange", like "saas.purchase:2:30d".';
  }

  if (parts.length < 2) {
    return 'Event filters must use "eventName:timeRange", like "saas.purchase:30d".';
  }

  const eventName = parts.slice(0, -1).join(":").trim();
  const timeRangeValue = parts.at(-1);

  return eventName &&
    timeRangeValue !== undefined &&
    isSegmentTimeRange(timeRangeValue)
    ? null
    : 'Event filters must use "eventName:timeRange", like "saas.purchase:30d".';
}

function splitSegmentStripeValue(value: string): {
  productId: string;
  subfilter: string | null;
  rawValue: string | null;
} {
  const firstColonIndex = value.indexOf(":");
  if (firstColonIndex === -1) {
    return { productId: value, subfilter: null, rawValue: null };
  }

  const productId = value.substring(0, firstColonIndex);
  const remainder = value.substring(firstColonIndex + 1);
  const secondColonIndex = remainder.indexOf(":");

  if (secondColonIndex === -1) {
    return { productId, subfilter: remainder, rawValue: null };
  }

  return {
    productId,
    subfilter: remainder.substring(0, secondColonIndex),
    rawValue: remainder.substring(secondColonIndex + 1),
  };
}

function normalizeSegmentStripeSubfilter(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

function isSegmentStripeCancelFlag(subfilter: string): boolean {
  return [
    "is_canceled",
    "is_cancelled",
    "canceled",
    "cancelled",
    "will_cancel",
    "cancel_at_period_end",
    "is_not_canceled",
    "is_not_cancelled",
    "not_canceled",
    "not_cancelled",
    "will_not_cancel",
  ].includes(subfilter);
}

function isSegmentStripeDateSubfilter(
  field: string,
  subfilter: string
): boolean {
  if (
    subfilter === "cancels_at" ||
    subfilter === "cancel_at" ||
    subfilter === "cancellation_at"
  ) {
    return true;
  }

  if (field === "stripeCurrentProduct") {
    return [
      "end_at",
      "ends_at",
      "period_end",
      "period_ends_at",
      "current_period_end",
    ].includes(subfilter);
  }

  return [
    "start_at",
    "started_at",
    "trial_start",
    "trial_started_at",
    "end_at",
    "ends_at",
    "trial_end",
    "trial_ends_at",
  ].includes(subfilter);
}

function isSegmentStripeDateOperator(operator: string): boolean {
  return ["is", "is_not", "gte", "lte", "gt", "lt"].includes(operator);
}

function getSegmentStripeValueValidationError(
  field: string,
  operator: string,
  value: string
): string | null {
  if (field === "stripeProduct") {
    if (operator !== "at_least" && operator !== "less_than_count") {
      return null;
    }

    const colonIndex = value.indexOf(":");
    if (colonIndex === -1) {
      return null;
    }

    const productId = value.substring(0, colonIndex).trim();
    const threshold = Number.parseInt(
      value.substring(colonIndex + 1).trim(),
      10
    );

    return productId && Number.isInteger(threshold) && threshold >= 1
      ? null
      : 'Stripe Product threshold filters must use "productId:count" with a count of at least 1.';
  }

  if (field !== "stripeCurrentProduct" && field !== "stripeTrialProduct") {
    return null;
  }

  const { productId, subfilter, rawValue } = splitSegmentStripeValue(value);
  if (!productId.trim()) {
    return "Stripe product filters must include a product ID.";
  }

  if (!subfilter) {
    return operator === "is" || operator === "is_not"
      ? null
      : 'Stripe current/trial date filters must use "productId:dateField:value".';
  }

  const normalizedSubfilter = normalizeSegmentStripeSubfilter(subfilter);
  if (isSegmentStripeCancelFlag(normalizedSubfilter)) {
    return operator === "is" || operator === "is_not"
      ? null
      : "Stripe cancellation flag filters only support is and is_not operators.";
  }

  if (!isSegmentStripeDateSubfilter(field, normalizedSubfilter)) {
    return `Unsupported Stripe product subfilter "${subfilter}".`;
  }

  if (!isSegmentStripeDateOperator(operator)) {
    return "Stripe date filters only support is, is_not, gte, lte, gt, and lt operators.";
  }

  return rawValue?.trim()
    ? null
    : 'Stripe date filters must include a value like "productId:end_at:2026-05-26".';
}

function getSegmentFilterValidationError(filter: unknown): string | null {
  if (typeof filter !== "object" || filter === null) {
    return "Segment filters must be objects.";
  }

  const record = filter as Record<string, unknown>;
  const field = record.field;
  const operator = record.operator;
  const value = record.value;

  if (typeof field !== "string" || !(field in segmentOperatorsByField)) {
    return `Unsupported segment filter field "${String(field)}".`;
  }

  if (typeof operator !== "string") {
    return `Segment filter "${field}" must include an operator.`;
  }

  const allowedOperators =
    segmentOperatorsByField[field as keyof typeof segmentOperatorsByField];
  if (!(allowedOperators as readonly string[]).includes(operator)) {
    return `Operator "${operator}" is not supported for ${field} filters. Use one of: ${allowedOperators.join(", ")}.`;
  }

  if (
    operator !== "is_empty" &&
    operator !== "is_not_empty" &&
    (typeof value !== "string" || value.trim().length === 0)
  ) {
    return `Segment filter "${field}" must include a value.`;
  }

  if (field === "attribute" && typeof value === "string") {
    if (!hasSegmentAttributeName(value)) {
      return 'Attribute filters must use "attributeName:value" or "attributeName:" for empty checks.';
    }

    if (
      operator !== "is_empty" &&
      operator !== "is_not_empty" &&
      !hasSegmentAttributeValue(value)
    ) {
      return 'Attribute filters must include a value after "attributeName:".';
    }
  }

  if (field === "event" && typeof value === "string") {
    const eventValueError = getSegmentEventValueValidationError(
      operator,
      value
    );
    if (eventValueError) {
      return eventValueError;
    }
  }

  if (
    (field === "stripeProduct" ||
      field === "stripeCurrentProduct" ||
      field === "stripeTrialProduct") &&
    typeof value === "string"
  ) {
    const stripeValueError = getSegmentStripeValueValidationError(
      field,
      operator,
      value
    );
    if (stripeValueError) {
      return stripeValueError;
    }
  }

  if (
    field === "tag" &&
    (operator === "contains" || operator === "not_contains")
  ) {
    const hasTagValue =
      typeof value === "string" &&
      value
        .split(",")
        .map((tag) => tag.trim())
        .some(Boolean);

    if (!hasTagValue) {
      return "Tag filters must include at least one tag name.";
    }
  }

  return null;
}

function collectSegmentFilterValidationErrors(input: unknown): string[] {
  if (typeof input !== "object" || input === null) {
    return [];
  }

  const record = input as Record<string, unknown>;
  if (
    record.kind === "filter" ||
    "field" in record ||
    "operator" in record ||
    "value" in record
  ) {
    const error = getSegmentFilterValidationError(record);
    return error ? [error] : [];
  }

  if (Array.isArray(record.children)) {
    return record.children.flatMap(collectSegmentFilterValidationErrors);
  }

  return [];
}

function validateHtmlOrBlocksArgs(
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

function validateLabelsArg(
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

function validateCreateSegmentArgs(args: Record<string, unknown>): void {
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

function buildUpdateSequenceBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  if (
    args.clearEnrollmentFieldPath === true &&
    args.enrollmentFieldPath !== undefined
  ) {
    throw new Error(
      "Provide either `enrollmentFieldPath` or `clearEnrollmentFieldPath` when calling `update_sequence`, not both."
    );
  }

  const body = { ...args };
  delete body.clearEnrollmentFieldPath;

  if (args.clearEnrollmentFieldPath === true) {
    body.enrollmentFieldPath = null;
  }

  return body;
}

function buildCancelSequenceEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const subscriberId = optionalString(args, "subscriberId");
  const fieldValuesValue = args.fieldValues;
  const fieldValues =
    fieldValuesValue === undefined
      ? undefined
      : Array.isArray(fieldValuesValue)
        ? fieldValuesValue
        : undefined;

  if (fieldValuesValue !== undefined && fieldValues === undefined) {
    throw new Error(
      "`fieldValues` must be an array when calling `cancel_sequence_enrollments`."
    );
  }

  const normalizedFieldValues =
    fieldValues
      ?.map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value.length > 0) ?? [];

  if (
    fieldValues?.some((value) => typeof value !== "string") ||
    (fieldValues !== undefined && normalizedFieldValues.length === 0)
  ) {
    throw new Error(
      "`fieldValues` must contain at least one non-empty string when calling `cancel_sequence_enrollments`."
    );
  }

  if ((subscriberId !== undefined) === normalizedFieldValues.length > 0) {
    throw new Error(
      "Provide exactly one target when calling `cancel_sequence_enrollments`: `subscriberId` or `fieldValues`."
    );
  }

  const fieldPath = optionalString(args, "fieldPath");
  const reason = optionalString(args, "reason");

  return {
    ...(subscriberId !== undefined && { subscriberId }),
    ...(fieldPath !== undefined && { fieldPath }),
    ...(normalizedFieldValues.length > 0 && {
      fieldValues: normalizedFieldValues,
    }),
    ...(typeof args.dryRun === "boolean" && { dryRun: args.dryRun }),
    ...(reason !== undefined && { reason }),
  };
}

function validateCreateCampaignContentArgs(
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

function validateScheduleCampaignArgs(args: Record<string, unknown>): void {
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
}

function validateCreateTransactionalContentArgs(
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

const sequenceBranchPathStepSchema = {
  type: "object",
  description:
    "A step to create inside a branch path. Use type:'delay' for a standalone delay, type:'email' for an email, or type:'create_discount' for a discount action.",
  properties: {
    type: {
      type: "string",
      enum: ["email", "delay", "create_discount", "discount", "webhook"],
      description:
        "Branch path step type. Omit for email steps; use delay for standalone waits.",
    },
    nodeType: {
      type: "string",
      enum: [
        "logic_delay",
        "action_email",
        "action_create_discount",
        "action_add_tag",
        "action_remove_tag",
        "action_add_to_list",
        "action_remove_from_list",
        "action_update_attributes",
        "logic_wait_for_event",
        "action_webhook",
      ],
      description:
        "Advanced branch path node type. Prefer type unless creating a non-email action.",
    },
    config: {
      type: "object",
      description:
        "Config for advanced nodeType steps such as tag/list/webhook/wait-for-event actions.",
      additionalProperties: true,
    },
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
      description: "HTML content for email steps.",
    },
    delay: {
      type: "object",
      description:
        "Delay before this step, or the delay duration when type is delay.",
      properties: {
        days: { type: "number" },
        hours: { type: "number" },
        minutes: { type: "number" },
      },
    },
    delayMs: {
      type: "number",
      description:
        "Delay in milliseconds. Useful for standalone type:'delay' steps.",
    },
    name: {
      type: "string",
      description: "Email template name for email steps.",
    },
    discount: {
      type: "object",
      description:
        "Discount configuration for create_discount steps. Same shape as create_sequence steps.",
      additionalProperties: true,
    },
    label: {
      type: "string",
      description: "Node label for discount or advanced node steps.",
    },
    provider: {
      type: "string",
      enum: ["stripe", "shopify"],
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

function extractResultError(result: unknown): Error | null {
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

interface SubscriberSearchResult {
  success: boolean;
  subscribers: unknown[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AggregatedSubscriberSearchResult {
  success: true;
  subscribers: unknown[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    fetchedPages: number;
  };
  returned: number;
  truncated: boolean;
}

interface DetailedSubscriberResult {
  success: boolean;
  subscriber: {
    email: string;
    tags?: string[];
    customAttributes?: Record<string, unknown> | null;
    emailStats?: unknown;
    activity?: unknown[];
    sequenceEnrollments?: unknown[];
  };
}

interface AddSubscribersToListResponse {
  success: boolean;
  listId: string;
  total: number;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  addedToList: number;
  failed: number;
  duplicateInputCount: number;
  ignoredBlankCount: number;
  results: unknown[];
}

interface GeneratedEmailResult {
  success: boolean;
  html?: string;
  blocks?: unknown[];
  subject?: string;
  previewText?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSubscriberTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

function buildSubscriberSearchParams(input: {
  query?: unknown;
  tags?: unknown;
  segmentId?: unknown;
  status?: unknown;
  page: number;
  pageSize: number;
}): URLSearchParams {
  const params = new URLSearchParams();

  if (typeof input.query === "string" && input.query.trim() !== "") {
    params.set("query", input.query.trim());
  }

  if (Array.isArray(input.tags) && input.tags.length > 0) {
    params.set(
      "tags",
      input.tags
        .filter(
          (tag): tag is string => typeof tag === "string" && tag.trim() !== ""
        )
        .join(",")
    );
  }

  if (typeof input.segmentId === "string" && input.segmentId.trim() !== "") {
    params.set("segmentId", input.segmentId);
  }

  if (typeof input.status === "string" && input.status.trim() !== "") {
    params.set("status", input.status.trim());
  }

  params.set("page", String(input.page));
  params.set("limit", String(input.pageSize));

  return params;
}

async function fetchAllSubscribers(
  args: Record<string, unknown>,
  companyId: string | undefined
): Promise<AggregatedSubscriberSearchResult> {
  const requestedLimit =
    typeof args.limit === "number" && Number.isFinite(args.limit)
      ? Math.max(1, Math.trunc(args.limit))
      : undefined;
  const pageSize = Math.min(100, Math.max(1, requestedLimit ?? 100));
  const subscribers: unknown[] = [];

  let page = 1;
  let total = 0;
  let totalPages = 0;
  let fetchedPages = 0;

  while (true) {
    const searchParams = buildSubscriberSearchParams({
      query: args.query,
      tags: args.tags,
      segmentId: args.segmentId,
      status: args.status,
      page,
      pageSize,
    });

    const response = await apiRequest<SubscriberSearchResult>(
      "GET",
      `/api/v1/subscribers?${searchParams.toString()}`,
      undefined,
      companyId
    );

    total = response.pagination?.total ?? response.subscribers.length;
    totalPages = response.pagination?.totalPages ?? 1;
    fetchedPages += 1;
    subscribers.push(...(response.subscribers ?? []));

    const reachedLimit =
      requestedLimit !== undefined && subscribers.length >= requestedLimit;
    const reachedEnd = response.pagination
      ? page >= response.pagination.totalPages
      : (response.subscribers ?? []).length < pageSize;

    if (reachedLimit || reachedEnd) {
      break;
    }

    page += 1;
  }

  const returnedSubscribers =
    requestedLimit !== undefined
      ? subscribers.slice(0, requestedLimit)
      : subscribers;

  return {
    success: true,
    subscribers: returnedSubscribers,
    pagination: {
      page: 1,
      limit: pageSize,
      total,
      totalPages,
      fetchedPages,
    },
    returned: returnedSubscribers.length,
    truncated:
      requestedLimit !== undefined &&
      total > 0 &&
      returnedSubscribers.length < total,
  };
}

function getSubscriberIdentifier(args: Record<string, unknown>): {
  email?: string;
  externalId?: string;
} {
  const email =
    typeof args.email === "string" && args.email.trim() !== ""
      ? args.email.trim()
      : undefined;
  const externalId =
    typeof args.externalId === "string" && args.externalId.trim() !== ""
      ? args.externalId.trim()
      : undefined;

  return {
    ...(email ? { email } : {}),
    ...(externalId ? { externalId } : {}),
  };
}

function requireSubscriberIdentifier(
  toolName: string,
  args: Record<string, unknown>
): { email?: string; externalId?: string } {
  const identifier = getSubscriberIdentifier(args);
  if (!identifier.email && !identifier.externalId) {
    throw new Error(
      `Provide either \`email\` or \`externalId\` when calling \`${toolName}\`.`
    );
  }

  return identifier;
}

function getSubscriberDetailPath(identifier: {
  email?: string;
  externalId?: string;
}): string {
  if (identifier.email) {
    return `/api/v1/subscribers/${encodeURIComponent(identifier.email)}`;
  }

  return `/api/v1/subscribers/external?externalId=${encodeURIComponent(
    String(identifier.externalId)
  )}`;
}

async function fetchDetailedSubscriberByIdentifier(
  identifier: { email?: string; externalId?: string },
  companyId: string | undefined
): Promise<DetailedSubscriberResult> {
  return apiRequest<DetailedSubscriberResult>(
    "GET",
    getSubscriberDetailPath(identifier),
    undefined,
    companyId
  );
}

function optionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function requiredString(
  toolName: string,
  record: Record<string, unknown>,
  key: string
): string {
  const value = optionalString(record, key);
  if (value === undefined) {
    throw new Error(`\`${key}\` is required when calling \`${toolName}\`.`);
  }

  return value;
}

function optionalAllowedString(
  toolName: string,
  record: Record<string, unknown>,
  key: string,
  allowedValues: readonly string[]
): string | undefined {
  const value = optionalString(record, key);
  if (value === undefined) {
    return undefined;
  }

  if (!allowedValues.includes(value)) {
    throw new Error(
      `\`${key}\` must be one of ${allowedValues.join(", ")} when calling \`${toolName}\`.`
    );
  }

  return value;
}

function requireEmailArray(
  toolName: string,
  args: Record<string, unknown>
): string[] {
  if (!Array.isArray(args.emails)) {
    throw new Error(
      `\`emails\` must be an array when calling \`${toolName}\`.`
    );
  }

  const emails: string[] = [];

  args.emails.forEach((email, index) => {
    if (typeof email !== "string") {
      throw new Error(
        `\`emails\` item ${index + 1} must be a string when calling \`${toolName}\`.`
      );
    }

    const trimmed = email.trim();
    if (trimmed.length > 0) {
      emails.push(trimmed);
    }
  });

  if (emails.length === 0) {
    throw new Error(
      `\`emails\` must include at least one email address when calling \`${toolName}\`.`
    );
  }

  return emails;
}

function chunkSubscriberEmails(emails: string[]): string[][] {
  const chunks: string[][] = [];
  for (
    let index = 0;
    index < emails.length;
    index += ADD_SUBSCRIBERS_TO_LIST_CHUNK_SIZE
  ) {
    chunks.push(emails.slice(index, index + ADD_SUBSCRIBERS_TO_LIST_CHUNK_SIZE));
  }
  return chunks;
}

function combineAddSubscribersToListResponses(
  listId: string,
  responses: AddSubscribersToListResponse[]
): AddSubscribersToListResponse {
  return responses.reduce<AddSubscribersToListResponse>(
    (combined, response) => ({
      success: combined.success && response.success,
      listId,
      total: combined.total + response.total,
      processed: combined.processed + response.processed,
      created: combined.created + response.created,
      updated: combined.updated + response.updated,
      skipped: combined.skipped + response.skipped,
      addedToList: combined.addedToList + response.addedToList,
      failed: combined.failed + response.failed,
      duplicateInputCount:
        combined.duplicateInputCount + response.duplicateInputCount,
      ignoredBlankCount:
        combined.ignoredBlankCount + response.ignoredBlankCount,
      results: [...combined.results, ...response.results],
    }),
    {
      success: true,
      listId,
      total: 0,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      addedToList: 0,
      failed: 0,
      duplicateInputCount: 0,
      ignoredBlankCount: 0,
      results: [],
    }
  );
}

async function resolveCompanyIdForAppUrls(
  args: Record<string, unknown>
): Promise<string | undefined> {
  const explicitCompanyId = optionalString(args, "companyId");
  if (explicitCompanyId) {
    return explicitCompanyId;
  }

  const selectedCompanyId = getSelectedCompanyId();
  if (selectedCompanyId) {
    return selectedCompanyId;
  }

  try {
    const account = await apiRequest<{ currentCompanyId: string | null }>(
      "GET",
      "/api/v1/account"
    );
    return account.currentCompanyId ?? undefined;
  } catch {
    return undefined;
  }
}

function addUrlToRecord(value: unknown, url: string | undefined): unknown {
  if (!isRecord(value) || !url) {
    return value;
  }

  return {
    ...value,
    url,
  };
}

function addCampaignUrlsToRecord(
  value: unknown,
  urls: { campaign?: string; campaignPreview?: string }
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    ...(urls.campaign !== undefined && { url: urls.campaign }),
    ...(urls.campaignPreview !== undefined && {
      previewUrl: urls.campaignPreview,
    }),
  };
}

function addListItemUrls(
  value: unknown,
  companyId: string | undefined,
  kind: "campaign" | "sequence" | "template" | "transactional"
): unknown {
  if (!Array.isArray(value) || !companyId) {
    return value;
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      return item;
    }

    const id = optionalString(item, "id");
    if (!id) {
      return item;
    }

    const appUrls = buildSequenzyAppUrls({
      companyId,
      ...(kind === "campaign" && { campaignId: id }),
      ...(kind === "sequence" && { sequenceId: id }),
      ...(kind === "template" && { emailId: id }),
      ...(kind === "transactional" && { transactionalId: id }),
    });

    if (kind === "campaign") {
      return addCampaignUrlsToRecord(item, appUrls.urls);
    }

    const url =
      kind === "sequence"
        ? appUrls.urls.sequence
        : kind === "template"
          ? appUrls.urls.email
          : appUrls.urls.transactionalEmail;

    return addUrlToRecord(item, url);
  });
}

function addCompanyUrls(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      return item;
    }

    const id = optionalString(item, "id");
    if (!id) {
      return item;
    }

    const appUrls = buildSequenzyAppUrls({ companyId: id });

    return {
      ...item,
      url: appUrls.urls.dashboard,
      settingsUrl: appUrls.urls.settings,
    };
  });
}

const dashboardUrlToolNames = new Set([
  "get_account",
  "select_company",
  "create_company",
  "get_company",
  "list_campaigns",
  "get_campaign",
  "get_email_send",
  "create_campaign",
  "update_campaign",
  "schedule_campaign",
  "send_test_email",
  "list_sequences",
  "get_sequence",
  "create_sequence",
  "update_sequence",
  "enable_sequence",
  "disable_sequence",
  "cancel_sequence_enrollments",
  "list_ab_tests",
  "get_ab_test",
  "get_ab_test_stats",
  "update_ab_test_variant",
  "list_templates",
  "get_template",
  "create_template",
  "update_template",
  "list_transactional_emails",
  "get_transactional_email",
  "create_transactional_email",
  "update_transactional_email",
]);

async function addAppUrlsToToolResult(
  name: string,
  args: Record<string, unknown>,
  result: unknown
): Promise<unknown> {
  if (!isRecord(result) || !dashboardUrlToolNames.has(name)) {
    return result;
  }

  const companyRecord = isRecord(result.company) ? result.company : undefined;
  const companyIdFromResult =
    optionalString(result, "selectedCompanyId") ??
    optionalString(result, "currentCompanyId") ??
    optionalString(result, "companyId") ??
    (companyRecord ? optionalString(companyRecord, "id") : undefined) ??
    (companyRecord ? optionalString(companyRecord, "companyId") : undefined);
  const companyId =
    companyIdFromResult ?? (await resolveCompanyIdForAppUrls(args));

  if (!companyId) {
    return result;
  }

  const campaignRecord = isRecord(result.campaign)
    ? result.campaign
    : undefined;
  const sequenceRecord = isRecord(result.sequence)
    ? result.sequence
    : undefined;
  const templateRecord = isRecord(result.template)
    ? result.template
    : undefined;
  const transactionalRecord =
    isRecord(result.transactional) && !Array.isArray(result.transactional)
      ? result.transactional
      : undefined;

  const urlInput: AppUrlInput = {
    companyId,
    campaignId:
      optionalString(args, "campaignId") ??
      optionalString(result, "campaignId") ??
      (campaignRecord ? optionalString(campaignRecord, "id") : undefined),
    sequenceId:
      optionalString(args, "sequenceId") ??
      optionalString(result, "sequenceId") ??
      (sequenceRecord ? optionalString(sequenceRecord, "id") : undefined),
    emailId:
      optionalString(result, "templateId") ??
      (templateRecord ? optionalString(templateRecord, "id") : undefined) ??
      (transactionalRecord
        ? optionalString(transactionalRecord, "emailId")
        : undefined) ??
      optionalString(args, "templateId"),
    transactionalId:
      optionalString(args, "transactionalId") ??
      (transactionalRecord
        ? optionalString(transactionalRecord, "id")
        : undefined) ??
      optionalString(args, "idOrSlug"),
    emailSendId:
      optionalString(args, "emailSendId") ??
      optionalString(result, "emailSendId") ??
      (isRecord(result.emailSend)
        ? optionalString(result.emailSend, "id")
        : undefined),
    status: optionalString(args, "status"),
  };
  const appUrls = buildSequenzyAppUrls(urlInput);
  const companyAppUrls = companyRecord
    ? buildSequenzyAppUrls({ companyId })
    : undefined;

  return {
    ...result,
    ...(Array.isArray(result.companies) && {
      companies: addCompanyUrls(result.companies),
    }),
    ...(Array.isArray(result.campaigns) && {
      campaigns: addListItemUrls(result.campaigns, companyId, "campaign"),
    }),
    ...(Array.isArray(result.sequences) && {
      sequences: addListItemUrls(result.sequences, companyId, "sequence"),
    }),
    ...(Array.isArray(result.templates) && {
      templates: addListItemUrls(result.templates, companyId, "template"),
    }),
    ...(Array.isArray(result.transactional) && {
      transactional: addListItemUrls(
        result.transactional,
        companyId,
        "transactional"
      ),
    }),
    ...(companyRecord &&
      companyAppUrls !== undefined && {
        company: {
          ...companyRecord,
          url: companyAppUrls.urls.dashboard,
          settingsUrl: companyAppUrls.urls.settings,
        },
      }),
    ...(campaignRecord &&
      appUrls.urls.campaign !== undefined && {
        campaign: addCampaignUrlsToRecord(campaignRecord, appUrls.urls),
      }),
    ...(sequenceRecord &&
      appUrls.urls.sequence !== undefined && {
        sequence: addUrlToRecord(sequenceRecord, appUrls.urls.sequence),
      }),
    ...(templateRecord &&
      appUrls.urls.email !== undefined && {
        template: addUrlToRecord(templateRecord, appUrls.urls.email),
      }),
    ...(transactionalRecord &&
      appUrls.urls.transactionalEmail !== undefined && {
        transactional: addUrlToRecord(
          transactionalRecord,
          appUrls.urls.transactionalEmail
        ),
      }),
    ...(isRecord(result.emailSend) &&
      appUrls.urls.emailSend !== undefined && {
        emailSend: addUrlToRecord(result.emailSend, appUrls.urls.emailSend),
      }),
    appUrls: appUrls.urls,
  };
}

// Tool definitions
export const tools: Tool[] = [
  // ============================================================================
  // Account & Setup
  // ============================================================================
  {
    name: "get_account",
    description: `Get current account information including available companies. IMPORTANT: If you have access to multiple companies, you MUST either:
1. Call select_company first to choose which company to work with, OR
2. Pass companyId explicitly in each tool call

The response shows 'companies' (all available) and 'selectedCompanyId' (currently active). All subsequent operations will use the selected company unless you pass a companyId override.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "select_company",
    description:
      "Select which company to operate on (for user-scoped API keys with access to multiple companies). Use get_account to see available companies. After selecting, all subsequent operations will use this company unless you pass a companyId override.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "The company ID to select (from get_account's companies list)",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "get_app_urls",
    description:
      "Generate Sequenzy dashboard URLs for known resource IDs. Use this when the user asks where to review or edit a generated sequence, campaign, template, or company settings. If companyId is omitted, the selected/current company is used when available.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If omitted, uses the selected/current company when available.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID for the campaign editor URL.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID for the sequence editor URL.",
        },
        templateId: {
          type: "string",
          description: "Template/email ID for the email editor URL.",
        },
        emailId: {
          type: "string",
          description: "Email ID for the email editor URL.",
        },
        transactionalId: {
          type: "string",
          description: "Transactional email ID.",
        },
        emailSendId: {
          type: "string",
          description: "Email send ID for the sent email detail URL.",
        },
        domainId: {
          type: "string",
          description: "Sending domain ID.",
        },
        status: {
          type: "string",
          description: "Status for campaign/sequence list URLs.",
        },
        settingsTab: {
          type: "string",
          description:
            "Settings tab slug, e.g. integrations, domain, tracking, api-keys, team.",
        },
      },
    },
  },
  {
    name: "create_company",
    description:
      "Create a new company/brand. This will parse your website to extract brand information. The tool polls every 20 seconds until the company is fully processed (typically 30-60 seconds).",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Company name (optional, will be extracted from domain if not provided)",
        },
        domain: {
          type: "string",
          description: "The company's website domain (e.g., example.com)",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_company",
    description:
      "Get company details, processing status, and effective email localization settings",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "The company ID to check",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "create_api_key",
    description:
      "Create a new API key for a company. Use this when setting up Sequenzy integration in a project. The returned key should be saved to the project's .env file as SEQUENZY_API_KEY. The key can only be retrieved once at creation time.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID to create the key for",
        },
        name: {
          type: "string",
          description:
            "Optional name for the API key (e.g., 'Production', 'Development')",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "list_websites",
    description: "List all configured sender websites/domains",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        label: {
          type: "string",
          description:
            "Optional label name filter. Only templates assigned this label are returned.",
        },
      },
    },
  },
  {
    name: "add_website",
    description: "Add a new sender website. Takes ~30 seconds to process.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        domain: {
          type: "string",
          description: "The domain to add (e.g., example.com)",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "check_website",
    description: "Check if a website has been processed and is ready to use",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        domain: {
          type: "string",
          description: "The domain to check",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_integration_guide",
    description: `Get code examples for integrating Sequenzy into your project.

CRITICAL - FOR SAAS/SUBSCRIPTION APPS:
If the app uses Stripe, Polar, Paddle, Dodo, or Creem - tell the user to connect it in Sequenzy dashboard (Settings → Integrations).
The native integration automatically handles all payment events and customer tags - no code needed!

Only provide manual event tracking code if the user explicitly asks for it.

Use cases:
- 'transactional': Sending one-off emails (welcome, password reset, receipts)
- 'subscribe_form': Adding subscribers from signup forms
- 'event_tracking': Tracking CUSTOM events only (not payment events - those come from the integration)

Before implementing, use create_api_key to generate an API key and save it to .env as SEQUENZY_API_KEY.`,
    inputSchema: {
      type: "object",
      properties: {
        framework: {
          type: "string",
          description: "Framework/language (nextjs, express, python, etc.)",
        },
        use_case: {
          type: "string",
          description:
            "Use case: 'transactional' (sending emails), 'subscribe_form' (adding subscribers), 'event_tracking' (tracking CUSTOM events only - payment events should come from Stripe/Polar/etc integration)",
        },
      },
    },
  },

  // ============================================================================
  // Subscribers
  // ============================================================================
  {
    name: "add_subscriber",
    description: "Add a new subscriber to your list",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to add subscriber to. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide this with email when creating, or instead of email for an existing subscriber.",
        },
        attributes: {
          type: "object",
          description: "Custom attributes (name, plan, etc.)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to apply to the subscriber",
        },
        listIds: {
          type: "array",
          items: { type: "string" },
          description: "List IDs to add subscriber to",
        },
        status: {
          type: "string",
          description:
            "Initial subscriber status: active, unsubscribed, or bounced. Defaults to active.",
        },
        optInMode: {
          type: "string",
          description:
            "Consent mode: confirmed creates active immediately when consent is verified, double_opt_in sends a confirmation email before activation, and default obeys company double opt-in settings.",
        },
      },
      required: [],
    },
  },
  {
    name: "update_subscriber",
    description: "Update an existing subscriber's attributes or tags",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description:
            "Subscriber email address. Provide email or externalId to identify the subscriber.",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide email or externalId to identify the subscriber.",
        },
        attributes: {
          type: "object",
          description: "Attributes to update",
        },
        addTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add",
        },
        removeTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to remove",
        },
      },
      required: [],
    },
  },
  {
    name: "remove_subscriber",
    description: "Unsubscribe or delete a subscriber",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description:
            "Subscriber email address. Provide email or externalId to identify the subscriber.",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide email or externalId to identify the subscriber.",
        },
        hardDelete: {
          type: "boolean",
          description:
            "If true, permanently deletes. If false, just unsubscribes.",
        },
      },
      required: [],
    },
  },
  {
    name: "get_subscriber",
    description:
      "Get the full subscriber profile, including tags, list memberships, sequence enrollments, email stats, and recent activity",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description:
            "Subscriber email address. Provide email or externalId to identify the subscriber.",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide email or externalId to identify the subscriber.",
        },
      },
      required: [],
    },
  },
  {
    name: "search_subscribers",
    description:
      "Search subscribers by free-text query, tags, or segment. If you omit limit, the tool fetches all pages and returns every match.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        query: {
          type: "string",
          description: "Search query (email or name)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        segmentId: {
          type: "string",
          description: "Filter by segment ID",
        },
        status: {
          type: "string",
          description:
            "Filter by subscriber status: active, unsubscribed, or bounced.",
        },
        limit: {
          type: "number",
          description:
            "Maximum results to return. If omitted, the tool returns all matches across pages.",
        },
      },
    },
  },

  // ============================================================================
  // Tags, Lists, Segments
  // ============================================================================
  {
    name: "list_tags",
    description: "List all tags in the account",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list tags for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "list_lists",
    description: "List all subscriber lists",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list lists for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_list",
    description: "Create a new subscriber list",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the list in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "List name",
        },
        description: {
          type: "string",
          description: "List description",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "add_subscribers_to_list",
    description:
      "Bulk add existing or new subscribers to a subscriber list from an email array. Existing subscribers are added to the list without requiring a per-subscriber update call.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        listId: {
          type: "string",
          description: "Subscriber list ID to add subscribers to.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses to add to the list. Larger batches are automatically chunked into 100-email API requests.",
        },
        duplicateStrategy: {
          type: "string",
          description:
            "Duplicate strategy for existing subscribers: skip, merge, or overwrite. Defaults to skip.",
        },
        enrollInSequences: {
          type: "boolean",
          description:
            "Whether newly created subscribers should enroll in matching sequences. Defaults to false.",
        },
        optInMode: {
          type: "string",
          description:
            "Consent mode for newly created subscribers: default, confirmed, or double_opt_in. Defaults to default.",
        },
      },
      required: ["listId", "emails"],
    },
  },
  {
    name: "list_segments",
    description: "List all segments",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list segments for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_segment",
    description:
      'Create a new segment from explicit filter rules. Use `filters` plus `filterJoinOperator` for flat legacy rules, or `root` for nested AND/OR groups such as `{ "kind": "group", "joinOperator": "and", "children": [{ "kind": "filter", "field": "attribute", "operator": "gte", "value": "mrr:50" }, { "kind": "group", "joinOperator": "or", "children": [{ "kind": "filter", "field": "tag", "operator": "contains", "value": "vip" }, { "kind": "filter", "field": "event", "operator": "is_not", "value": "saas.purchase:30d" }] }] }`. Supports `event` and `segment` fields, Stripe product purchase/current/trial/date filters, and campaign-specific engagement filters.',
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the segment in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Segment name",
        },
        filterJoinOperator: {
          type: "string",
          enum: ["and", "or"],
          description:
            'How top-level filters combine. Use `"and"` to require every filter or `"or"` to match any filter.',
        },
        filters: {
          type: "array",
          items: segmentFilterItemSchema,
          minItems: 1,
          description:
            'Array of segment filters. Example custom attribute empty check: [{"id":"filter-1","field":"attribute","operator":"is_empty","value":"last_logged_in:"}]. Example Stripe purchase filter: [{"id":"filter-1","field":"stripeProduct","operator":"is","value":"prod_123"}]. Example threshold filter: [{"id":"filter-1","field":"stripeProduct","operator":"at_least","value":"prod_123:3"}]. Example trial cancellation filter: [{"id":"filter-1","field":"stripeTrialProduct","operator":"is","value":"prod_123:is_canceled"}]. Example trial end filter: [{"id":"filter-1","field":"stripeTrialProduct","operator":"is","value":"prod_123:end_at:2026-05-26"}]. Example campaign-specific engagement combo: [{"id":"filter-1","field":"emailBounced","operator":"is","value":"campaign:cmp_abc"},{"id":"filter-2","field":"emailBounced","operator":"is_not","value":"campaign:cmp_xyz"}]. Combine them with `filterJoinOperator: "or"` to match any filter.',
        },
        root: {
          ...segmentFilterGroupSchema,
          description:
            "Nested filter root. Mutually exclusive with `filters` and `filterJoinOperator`.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "get_segment_count",
    description: "Get the number of subscribers in a segment",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        segmentId: {
          type: "string",
          description: "Segment ID",
        },
      },
      required: ["segmentId"],
    },
  },

  // ============================================================================
  // Templates
  // ============================================================================
  {
    name: "list_templates",
    description:
      "List all email templates, including per-locale localization sync status",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "get_template",
    description:
      "Get a template's details, content, and all localized variants with sync status",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
      },
      required: ["templateId"],
    },
  },
  {
    name: "create_template",
    description: "Create a new email template",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        html: {
          type: "string",
          description: "Email HTML content. Mutually exclusive with `blocks`.",
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        labels: {
          type: "array",
          description:
            "Optional label names to assign. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["name", "subject"],
    },
  },
  {
    name: "update_template",
    description:
      "Update an existing template. At least one of `name`, `subject`, `html`, `blocks`, or `labels` is required, and only those update fields are accepted.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
        name: {
          type: "string",
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        html: {
          type: "string",
          description: "Email HTML content. Mutually exclusive with `blocks`.",
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        labels: {
          type: "array",
          description:
            "Replacement label names. Send an empty array to clear labels. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_template",
    description: "Delete a template",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
      },
      required: ["templateId"],
    },
  },

  // ============================================================================
  // A/B Tests
  // ============================================================================
  {
    name: "list_ab_tests",
    description: "List A/B tests and their variants",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Optional sequence ID to filter automation A/B tests.",
        },
      },
    },
  },
  {
    name: "get_ab_test",
    description:
      "Get A/B test details, variants, and per-locale localization sync status",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
      },
      required: ["abTestId"],
    },
  },
  {
    name: "get_ab_test_stats",
    description:
      "Get A/B test aggregate stats and per-variant stats. Supports period or custom start/end ranges.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        period: {
          type: "string",
          description: "Optional period: 1h, 24h, 7d, 30d, or 90d.",
        },
        start: {
          type: "string",
          description: "Custom range start as ISO 8601. Requires end.",
        },
        end: {
          type: "string",
          description: "Custom range end as ISO 8601. Requires start.",
        },
      },
      required: ["abTestId"],
    },
  },
  {
    name: "restart_ab_test",
    description:
      "Run another sequence A/B test after a winner is selected. By default the winner becomes the new control; pass sourceVariantId to use another variant as the control email.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID to restart",
        },
        sourceVariantId: {
          type: "string",
          description:
            "Optional variant ID to use as the new control email. Defaults to the selected winner.",
        },
        testType: {
          type: "string",
          description: "Optional test type: subject or content.",
        },
        winnerThreshold: {
          type: "number",
          description:
            "Optional number of subscribers before selecting a winner. Must be from 10 to 1000.",
        },
        variantCount: {
          type: "number",
          description:
            "Optional total variants including the control. Must be from 2 to 4.",
        },
      },
      required: ["abTestId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_ab_test_variant",
    description:
      "Update a draft A/B test variant. Provide at least one of subject, previewText, html, or blocks. Use either html or blocks, not both.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        variantId: {
          type: "string",
          description: "A/B test variant ID",
        },
        subject: {
          type: "string",
          description: "Variant subject line",
        },
        previewText: {
          type: "string",
          description:
            "Variant preview text. Pass an empty string to clear it.",
        },
        html: {
          type: "string",
          description: "Replacement HTML body. Mutually exclusive with blocks.",
        },
        blocks: {
          type: "array",
          description: `${replacementEmailBlocksDescription} Mutually exclusive with html.`,
          items: {
            type: "object",
          },
        },
      },
      required: ["abTestId", "variantId"],
      additionalProperties: false,
    },
  },

  // ============================================================================
  // Campaigns
  // ============================================================================
  {
    name: "list_campaigns",
    description: "List all campaigns",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list campaigns for. If not provided, uses the currently selected company.",
        },
        status: {
          type: "string",
          description: "Filter by status (draft, scheduled, sent)",
        },
        label: {
          type: "string",
          description:
            "Optional label name filter. Only campaigns assigned this label are returned.",
        },
      },
    },
  },
  {
    name: "get_campaign",
    description: "Get campaign details and stats",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_email_send",
    description:
      "Get a sent email by emailSendId, including the stored HTML body when available and the ClickHouse event timeline. If the short-lived email send row has been cleaned up, returns the retained ClickHouse events and a sparse summary.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        emailSendId: {
          type: "string",
          description: "Email send ID to inspect.",
        },
      },
      required: ["emailSendId"],
    },
  },
  {
    name: "create_campaign",
    description: "Create a new campaign (as draft)",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the campaign in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Campaign name",
        },
        subject: {
          type: "string",
          description:
            "Email subject line. Optional when `prompt` is provided because the generated subject will be used.",
        },
        trackingCode: {
          type: "string",
          description:
            "Optional campaign tracking code for UTM templates. Use only when explicitly requested.",
        },
        html: {
          type: "string",
          description: "Email HTML content. Mutually exclusive with `blocks`.",
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        prompt: {
          type: "string",
          description:
            "Generate campaign blocks from a prompt. Mutually exclusive with `html`, `blocks`, and `templateId`.",
        },
        style: {
          type: "string",
          description:
            "Prompt generation style: minimal, branded, promotional. Only used with `prompt`.",
        },
        tone: {
          type: "string",
          description:
            "Prompt generation tone: professional, casual, friendly. Only used with `prompt`.",
        },
        templateId: {
          type: "string",
          description: "Use a template instead of html",
        },
        segmentId: {
          type: "string",
          description: "Target segment ID",
        },
        campaignData: {
          type: "object",
          description:
            "Optional campaign-scoped JSON data for repeat blocks and personalization.",
        },
        computedLists: {
          type: "array",
          description:
            "Optional computed list definitions derived from campaignData at send time.",
          items: {
            type: "object",
          },
        },
        labels: {
          type: "array",
          description:
            "Optional label names to assign. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_campaign",
    description: "Update a draft campaign",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
        name: {
          type: "string",
          description: "Campaign name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        trackingCode: {
          type: "string",
          description:
            "Optional campaign tracking code for UTM templates. Use only when explicitly requested. Send an empty string to clear it.",
        },
        html: {
          type: "string",
          description: "Email HTML content. Mutually exclusive with `blocks`.",
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        replyTo: {
          type: "string",
          description:
            "Set reply-to using an existing reply profile email address for this company.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Set reply-to using a reply profile ID for this company.",
        },
        campaignData: {
          type: "object",
          description:
            "Set campaign-scoped JSON data for repeat blocks and personalization.",
        },
        computedLists: {
          type: "array",
          description:
            "Set computed list definitions derived from campaignData at send time.",
          items: {
            type: "object",
          },
        },
        labels: {
          type: "array",
          description:
            "Replacement label names. Send an empty array to clear labels. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "schedule_campaign",
    description:
      "Schedule a draft or already scheduled campaign. Returns dashboard edit and preview URLs.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
        scheduledAt: {
          type: "string",
          description:
            "Future ISO 8601 timestamp for the send, for example 2026-06-01T14:00:00Z.",
        },
        targetLists: {
          type: "object",
          description:
            "Optional campaign targeting object. Omit to use saved targeting or all active subscribers. Examples: {type:'all'}, {type:'lists', listIds:['list_123']}, {type:'segment', segmentId:'seg_123'}, or {type:'filtered', filters:[...], filterJoinOperator:'and'}.",
          additionalProperties: true,
        },
        sendTimeOptimization: {
          type: "boolean",
          description: "Whether to use send-time optimization.",
        },
        spreadOverHours: {
          type: "number",
          description:
            "Spread delivery over an integer number of hours from 1 to 72. When set, spread delivery takes precedence over send-time optimization.",
        },
      },
      required: ["campaignId", "scheduledAt"],
      additionalProperties: false,
    },
  },
  {
    name: "send_test_email",
    description: "Send a test email to a single address",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to test",
        },
        to: {
          type: "string",
          description: "Email address to send test to",
        },
      },
      required: ["campaignId", "to"],
    },
  },

  // ============================================================================
  // Sequences
  // ============================================================================
  {
    name: "list_sequences",
    description: "List all email sequences (automations)",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list sequences for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "get_sequence",
    description:
      "Get sequence details plus editable step content. The response includes sequence.emails with each step's nodeId, linked emailId, subject, previewText, and blocks.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_sequence",
    description: `Create a new email sequence. Provide either a goal for AI generation or explicit steps. Explicit steps can include email content and create_discount actions; emails after a discount action can use merge tags such as {{discount.code}} and {{discount.percentOff}}. For AI-generated sequences, the tool polls until emails are generated (typically 30-60 seconds).

IMPORTANT GUIDELINES:

1. NEVER ENABLE SEQUENCES AUTOMATICALLY:
   - Sequences are created in DRAFT/PAUSED state
   - NEVER call enable_sequence unless the user EXPLICITLY asks to enable/activate
   - The user must review the AI-generated content before going live
   - Sequences send real emails to real people - enabling without review is dangerous

2. KEEP IT SIMPLE: Only suggest sequences that are straightforward to implement:
   - Prefer 3-5 emails per sequence (not 10+)
   - Use simple, achievable triggers that the app already tracks
   - Avoid complex multi-step sequences that require extensive app changes

2. MATCH THE BUSINESS MODEL:
   - If the app has NO trial period, do NOT create trial-related sequences
   - If the app is FREE (no paid plans), do NOT create upgrade/pricing sequences
   - If the app is a one-time purchase (not SaaS), do NOT create subscription sequences
   - Match sequences to events and features that ACTUALLY exist in the app

3. EVENT TRACKING: When you use a custom event (not a built-in event), you MUST:
   - The event will be auto-created in Sequenzy
   - The response includes eventTrackingCode showing exactly what code to add to the app
   - Tell the user what specific user action should trigger each event
   - Be specific: "Track 'project.created' when user creates their first project"

4. MATCHING FIELD ENROLLMENT:
   - Use enrollmentMode: "matching_field" only with trigger: "event_received".
   - Use enrollmentFieldPath for custom event payload fields, for example "order.id" or "product.providerVariantId".
   - This blocks duplicate active runs for the same subscriber + field value, but still allows separate active runs for different products, variants, orders, or other event-scoped objects.
   - Leave enrollmentFieldPath empty for Shopify back-in-stock and replenishment events so Sequenzy uses its built-in product/variant matching defaults.

5. SEQUENCE TRIGGER RECIPES - USE THESE EXACT CONFIGURATIONS:

   TRIAL CONVERSION:
   - trigger: tag_added, tagName: "trial"
   - Auto-stops when: user gets "customer" tag
   - Goal: Convert trial users to paying customers

   PAYMENT RECOVERY / DUNNING:
   - trigger: tag_added, tagName: "past-due"
   - Auto-stops when: user no longer has "past-due" tag (they paid)
   - Goal: Recover failed payments before churn

   CANCELLATION RECOVERY / WIN-BACK:
   - trigger: tag_added, tagName: "cancelled"
   - Auto-stops when: user gets "customer" tag again
   - Goal: Win back users who cancelled

   CHURN RECOVERY:
   - trigger: tag_added, tagName: "churned"
   - Auto-stops when: user gets "customer" tag again
   - Goal: Re-engage churned users

   UPGRADE / UPSELL:
   - trigger: tag_added, tagName: "customer"
   - Auto-stops when: user triggers "saas.upgrade" event
   - Goal: Encourage customers to upgrade to higher plans

	   ONBOARDING:
	   - trigger: event_received, eventName: "signup.completed"
	   - Auto-stops when: "onboarding.completed" event fires
	   - Goal: Guide new users through product setup

	   PRODUCT / ORDER-SCOPED EVENT SEQUENCE:
	   - trigger: event_received, eventName: "ecommerce.order_placed"
	   - enrollmentMode: "matching_field", enrollmentFieldPath: "order.id"
	   - Goal: Run one active sequence per specific order without duplicate active runs for the same order

   WELCOME SERIES:
   - trigger: contact_added (optionally with listId)
   - No auto-stop (runs to completion)
   - Goal: Introduce new subscribers to your brand

   SEGMENT ENTRY:
   - trigger: segment_entered, segmentId: "segment-id"
   - No auto-stop by default
   - Goal: Start a sequence when contacts newly qualify for a saved segment

   RE-ENGAGEMENT:
   - trigger: inactivity, eventName: "login", inactiveDays: 14
   - Auto-stops when: user logs in again
   - Goal: Bring back inactive users

IMPORTANT - PAYMENT PROVIDER INTEGRATION:
If the app uses Stripe, Polar, Paddle, Dodo, or Creem - tell the user to connect it in Sequenzy dashboard (Settings → Integrations).
Once connected, the native integration automatically handles:
- All saas.* events (purchase, cancelled, churn, payment_failed, etc.)
- All status tags (customer, trial, cancelled, churned, past-due, etc.)
- Subscription attributes (MRR, plan name, billing interval)

Only offer manual tracking if the user explicitly asks for it.

DISCOUNT ACTION STEPS:
- Use explicit steps with { "type": "create_discount", "discount": { "discountType": "percent", "percentOff": 20, "duration": "once", "appliesToAllPlans": true, "maxRedemptions": 1, "codePrefix": "SAVE" } }.
- Optionally add "lockToSubscriber": true for Stripe discounts only when the subscriber is expected to have a matching Stripe customer.
- Discount actions currently require Stripe; connect Stripe before enabling the sequence.
- Put the discount action before the email that references it with {{discount.code}}.

CUSTOM EVENTS (these DO require manual tracking):
- onboarding.completed - User finished setup wizard
- feature.used - User engaged with a key feature
- project.created - User created their first project
- team.invited - User invited a team member
- milestone.reached - User hit a usage milestone
For custom events, provide the tracking code snippet from get_integration_guide.

BUILT-IN TAGS (auto-applied by payment integrations):
- "customer" = PAYING customer with active subscription (use this for upgrade sequences, customer-only content)
- "trial" = Currently on free trial (use for trial conversion sequences)
- "lead" = Signed up but never paid (use for nurture sequences)
- "cancelled" = Cancelled but still has access until period ends (use for win-back sequences)
- "churned" = Subscription ended, no longer paying (use for re-engagement)
- "past-due" = Payment failed, at risk of churning (use for dunning/recovery sequences)
- "refunded" = Received a refund
- "saas.monthly" / "saas.yearly" = Billing interval

BUILT-IN EVENTS (auto-fired by payment integrations):
- saas.purchase, saas.purchase.monthly, saas.purchase.yearly - New subscription
- saas.cancelled - User cancelled (still has access)
- saas.churn - Subscription ended
- saas.payment_failed - Card declined/expired
- saas.upgrade, saas.downgrade - Plan changes
- saas.trial_started, saas.trial_will_end, saas.trial_ended - Trial lifecycle
- saas.refund - Refund issued

OTHER BUILT-IN EVENTS:
- email.opened, email.clicked, email.replied, email.bounced, email.unsubscribed
- contact.subscribed, contact.unsubscribed`,
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the sequence in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description:
            "Sequence name (e.g., 'User Onboarding', 'Welcome Series')",
        },
        trigger: {
          type: "string",
          enum: [
            "contact_added",
            "tag_added",
            "segment_entered",
            "event_received",
            "inactivity",
            "frequency",
          ],
          description:
            "Trigger type: 'contact_added' (when added to a list), 'tag_added' (when tag is applied), 'segment_entered' (when a contact newly enters a saved segment), 'event_received' (when custom event fires), 'inactivity' (when subscriber hasn't performed an event for X days), 'frequency' (when subscriber performs event X times in Y days)",
        },
        // contact_added trigger options
        listId: {
          type: "string",
          description:
            "List ID to trigger on (for contact_added trigger). If not provided, triggers on any list.",
        },
        // tag_added trigger options
        tagName: {
          type: "string",
          description:
            "Tag name to trigger on (required for tag_added trigger)",
        },
        // segment_entered trigger options
        segmentId: {
          type: "string",
          description:
            "Segment ID to trigger on (required for segment_entered trigger). Use list_segments first to choose a saved segment.",
        },
        // event_received, inactivity, frequency trigger options
        eventName: {
          type: "string",
          description:
            "Event name to trigger on (required for event_received, inactivity, and frequency triggers)",
        },
        // inactivity trigger options
        inactiveDays: {
          type: "number",
          description:
            "Number of days of inactivity (required for inactivity trigger, must be >= 1)",
        },
        // frequency trigger options
        minCount: {
          type: "number",
          description:
            "Minimum event count (required for frequency trigger, must be >= 1)",
        },
        timeWindowDays: {
          type: "number",
          description:
            "Time window in days for frequency trigger (required for frequency trigger, must be >= 1)",
        },
        // General options
        emailCount: {
          type: "number",
          description: "Number of emails in the sequence (default: 5, max: 10)",
        },
        goal: {
          type: "string",
          description:
            "What this sequence should accomplish for AI generation. Be specific to the app's actual features and user journey. Avoid generic goals that don't match the app's business model.",
        },
        enrollmentMode: {
          type: "string",
          enum: ["unlimited", "one_time", "matching_field"],
          description:
            "Sequence re-entry mode. Use 'matching_field' only for event_received triggers when duplicate active runs should be blocked per event field value.",
        },
        enrollmentFieldPath: {
          type: "string",
          description:
            "Dot-path event property used by enrollmentMode='matching_field', such as 'order.id' or 'product.providerVariantId'. Leave omitted for Shopify back-in-stock/replenishment product-variant defaults.",
        },
        stopCondition: {
          type: "object",
          description:
            "Optional explicit auto-stop condition. Use { type: 'has_tag', value: 'customer' } to end the sequence when a subscriber gets a tag, { type: 'does_not_have_tag', value: 'trial' } when a tag is removed, { type: 'removed_from_list', value: 'list_123' } when they leave a list, { type: 'event_received', value: 'onboarding.completed' } when an event is tracked, or { type: 'none', value: null } for no auto-stop.",
          properties: {
            type: {
              type: "string",
              enum: [
                "none",
                "has_tag",
                "does_not_have_tag",
                "added_to_list",
                "removed_from_list",
                "event_received",
              ],
              description: "Stop condition type.",
            },
            value: {
              type: ["string", "null"],
              description:
                "Tag name, list ID, or event name for the stop condition. Use null or omit for type 'none'.",
            },
          },
          required: ["type"],
        },
        steps: {
          type: "array",
          description:
            "Explicit sequence steps. Omit type for email steps, or use type: 'create_discount' for a Stripe discount action. Later email steps can reference the most recent discount with {{discount.code}}, {{discount.percentOff}}, {{discount.amountOff}}, and {{discount.expiresAt}}.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["email", "create_discount", "discount"],
                description:
                  "Step type. Omit or use 'email' for email content. Use 'create_discount' to generate a discount code before later emails.",
              },
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
                  "HTML content for email steps. Will be converted to Sequenzy blocks.",
              },
              delay: {
                type: "object",
                description: "Delay before this step.",
                properties: {
                  days: { type: "number" },
                  hours: { type: "number" },
                  minutes: { type: "number" },
                },
              },
              name: {
                type: "string",
                description: "Email template name for email steps.",
              },
              discount: {
                type: "object",
                description:
                  "Discount configuration for create_discount steps. Prefer this nested shape for new integrations; legacy top-level discount fields are still accepted.",
                properties: {
                  label: {
                    type: "string",
                    description: "Builder label for the discount step.",
                  },
                  provider: {
                    type: "string",
                    enum: ["stripe"],
                    description: "Discount provider. Currently only 'stripe'.",
                  },
                  discountType: {
                    type: "string",
                    enum: ["percent", "amount"],
                    description: "Discount type.",
                  },
                  percentOff: {
                    type: "number",
                    description:
                      "Percent discount from 1 to 100. Required when discountType is percent.",
                  },
                  amountOff: {
                    type: "number",
                    description:
                      "Fixed amount discount in the smallest currency unit, for example 500 for $5. Required when discountType is amount.",
                  },
                  currency: {
                    type: "string",
                    description:
                      "ISO currency for amount discounts. Defaults to usd.",
                  },
                  duration: {
                    type: "string",
                    enum: ["once", "forever", "repeating"],
                    description: "Stripe coupon duration. Defaults to once.",
                  },
                  durationInMonths: {
                    type: "number",
                    description: "Required for repeating discounts.",
                  },
                  appliesToAllPlans: {
                    type: "boolean",
                    description:
                      "Whether the discount applies to all plans. Defaults to true.",
                  },
                  planIds: {
                    type: "array",
                    description:
                      "Stripe product IDs, such as prod_abc123, when appliesToAllPlans is false.",
                    items: { type: "string" },
                  },
                  codePrefix: {
                    type: "string",
                    description:
                      "Optional prefix for generated promotion codes.",
                  },
                  maxRedemptions: {
                    type: "number",
                    description:
                      "Maximum promotion code redemptions. Use 1 for subscriber-specific codes.",
                  },
                  lockToSubscriber: {
                    type: "boolean",
                    description:
                      "Stripe-only. Restrict each generated promotion code to the matched subscriber's Stripe customer.",
                  },
                  expiresAt: {
                    type: "string",
                    description:
                      "Optional future expiration date or ISO timestamp.",
                  },
                  expiresInHours: {
                    type: "number",
                    description:
                      "Optional relative expiration in hours, resolved when each subscriber's code is created (e.g., 48 for a 48-hour window per subscriber). Takes precedence over expiresAt.",
                  },
                  name: {
                    type: "string",
                    description: "Optional provider coupon name.",
                  },
                },
              },
              label: {
                type: "string",
                description:
                  "Legacy top-level discount label. Prefer discount.label.",
              },
              provider: {
                type: "string",
                enum: ["stripe"],
                description:
                  "Legacy top-level discount provider. Prefer discount.provider.",
              },
              discountType: {
                type: "string",
                enum: ["percent", "amount"],
                description:
                  "Legacy top-level discount type. Prefer discount.discountType.",
              },
              percentOff: {
                type: "number",
                description:
                  "Percent discount from 1 to 100. Required when discountType is percent.",
              },
              amountOff: {
                type: "number",
                description:
                  "Fixed amount discount in the smallest currency unit, for example 500 for $5. Required when discountType is amount.",
              },
              currency: {
                type: "string",
                description:
                  "ISO currency for amount discounts. Defaults to usd.",
              },
              duration: {
                type: "string",
                enum: ["once", "forever", "repeating"],
                description: "Stripe coupon duration. Defaults to once.",
              },
              durationInMonths: {
                type: "number",
                description: "Required for repeating discounts.",
              },
              appliesToAllPlans: {
                type: "boolean",
                description:
                  "Whether the discount applies to all plans. Defaults to true.",
              },
              planIds: {
                type: "array",
                description:
                  "Stripe product IDs, such as prod_abc123, when appliesToAllPlans is false.",
                items: { type: "string" },
              },
              codePrefix: {
                type: "string",
                description: "Optional prefix for generated promotion codes.",
              },
              maxRedemptions: {
                type: "number",
                description:
                  "Maximum promotion code redemptions. Use 1 for subscriber-specific codes.",
              },
              lockToSubscriber: {
                type: "boolean",
                description:
                  "Legacy top-level Stripe-only flag. Prefer discount.lockToSubscriber.",
              },
              expiresAt: {
                type: "string",
                description:
                  "Optional future expiration date or ISO timestamp.",
              },
              expiresInHours: {
                type: "number",
                description:
                  "Optional relative expiration in hours, resolved when each subscriber's code is created (e.g., 48 for a 48-hour window per subscriber). Takes precedence over expiresAt.",
              },
            },
          },
        },
      },
      required: ["name", "trigger"],
    },
  },
  {
    name: "update_sequence",
    description:
      "Update an existing sequence. To target a specific step, use the emailId or nodeId returned in get_sequence.sequence.emails. You can also update enrollmentMode and enrollmentFieldPath for event-triggered matching-field enrollment. When inserting an if/else branch, include steps for every branch arm and elseSteps so the branch is usable immediately. Branch conditions support tags, lists, saved segments, custom events, clicked links, and subscriber field comparisons.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
        name: {
          type: "string",
          description: "Sequence name",
        },
        enrollmentMode: {
          type: "string",
          enum: ["unlimited", "one_time", "matching_field"],
          description:
            "Updated sequence re-entry mode. 'matching_field' is only valid for event-based sequence triggers.",
        },
        enrollmentFieldPath: {
          type: "string",
          description:
            "Dot-path event property used by enrollmentMode='matching_field', such as 'order.id' or 'product.providerVariantId'. Omit to leave unchanged. Use clearEnrollmentFieldPath to clear it.",
        },
        clearEnrollmentFieldPath: {
          type: "boolean",
          description:
            "Set true to clear enrollmentFieldPath without sending a nullable schema value.",
        },
        stopCondition: {
          type: "object",
          description:
            "Update the sequence auto-stop condition. Example: { type: 'has_tag', value: 'customer' } ends the sequence when the subscriber has that tag. Use { type: 'removed_from_list', value: 'list_123' } to stop when they leave a list, or { type: 'none', value: null } to clear it.",
          properties: {
            type: {
              type: "string",
              enum: [
                "none",
                "has_tag",
                "does_not_have_tag",
                "added_to_list",
                "removed_from_list",
                "event_received",
              ],
            },
            value: {
              type: ["string", "null"],
              description:
                "Tag name, list ID, or event name for the stop condition.",
            },
          },
          required: ["type"],
        },
        branch: {
          type: "object",
          description:
            "Insert an if/else branch into an existing sequence. The branch is inserted after afterNodeId and creates an if path plus an else fallback path. Use get_sequence first to choose afterNodeId. Each branch condition should include steps, and elseSteps is required unless allowEmptyPaths is true. Conditions support tags, lists, saved segments, events, clicked links, and field comparisons. Use activityScope for event_received and link_clicked checks.",
          properties: {
            afterNodeId: {
              type: "string",
              description:
                "Existing node ID to insert the branch after. Use a nodeId from get_sequence.sequence.nodes or get_sequence.sequence.emails.",
            },
            label: {
              type: "string",
              description: "Optional branch node label.",
            },
            branches: {
              type: "array",
              description:
                "Conditional branches evaluated in order. An else fallback is created automatically.",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description:
                      "Optional stable branch ID. Defaults to branch-0, branch-1, etc.",
                  },
                  label: {
                    type: "string",
                    description: "Display label, e.g. 'If has customer tag'.",
                  },
                  conditionType: {
                    type: "string",
                    enum: [
                      "has_tag",
                      "in_list",
                      "in_segment",
                      "event_received",
                      "link_clicked",
                      "field_equals",
                      "field_contains",
                      "field_greater_than",
                      "field_less_than",
                    ],
                    description: "Condition type for this branch.",
                  },
                  tagName: {
                    type: "string",
                    description:
                      "Tag name for has_tag conditions. This can be used instead of tagId.",
                  },
                  tagId: {
                    type: "string",
                    description: "Tag ID or tag name for has_tag conditions.",
                  },
                  listId: {
                    type: "string",
                    description: "List ID for in_list conditions.",
                  },
                  segmentId: {
                    type: "string",
                    description: "Segment ID for in_segment conditions.",
                  },
                  segmentName: {
                    type: "string",
                    description:
                      "Optional display name for in_segment conditions.",
                  },
                  eventName: {
                    type: "string",
                    description:
                      "Event name for event_received conditions, such as project.invite.accepted.",
                  },
                  linkUrl: {
                    type: "string",
                    description:
                      "Optional URL substring for link_clicked conditions. Omit to match any clicked link.",
                  },
                  activityScope: {
                    type: "string",
                    enum: ["ever", "this_sequence", "previous_email"],
                    description:
                      "Scope for event_received and link_clicked conditions. Omit to check ever.",
                  },
                  fieldName: {
                    type: "string",
                    description:
                      "Subscriber attribute name for field conditions.",
                  },
                  fieldValue: {
                    type: "string",
                    description: "Comparison value for field conditions.",
                  },
                  steps: {
                    type: "array",
                    description:
                      "Steps to create inside this branch path. Required by default so the branch is not an empty placeholder.",
                    items: sequenceBranchPathStepSchema,
                  },
                },
                required: ["conditionType"],
              },
            },
            elseSteps: {
              type: "array",
              description:
                "Steps to create inside the else fallback path. Required by default so the else arm is usable.",
              items: sequenceBranchPathStepSchema,
            },
            allowEmptyPaths: {
              type: "boolean",
              description:
                "Set true only when intentionally creating empty UI placeholders. Normal API/MCP use should omit this and provide branch steps plus elseSteps.",
            },
          },
          required: ["afterNodeId", "branches"],
        },
        emails: {
          type: "array",
          description:
            "Updated sequence emails. If you omit emailId/nodeId, items are matched by existing step order.",
          items: {
            type: "object",
            properties: {
              emailId: {
                type: "string",
                description:
                  "Optional target linked email template ID for a step. Use the emailId returned in get_sequence.sequence.emails.",
              },
              nodeId: {
                type: "string",
                description:
                  "Optional target action_email node ID for a step. Use the nodeId returned in get_sequence.sequence.emails.",
              },
              name: {
                type: "string",
                description: "Updated step/template name",
              },
              subject: {
                type: "string",
                description: "Updated email subject",
              },
              previewText: {
                type: "string",
                description: "Updated preview text",
              },
              html: {
                type: "string",
                description:
                  "Updated HTML content. Will be converted to Sequenzy blocks.",
              },
              htmlContent: {
                type: "string",
                description:
                  "Alias for html. Use this when updating HTML content for a step.",
              },
              blocks: {
                type: "array",
                description: replacementEmailBlocksDescription,
                items: { type: "object" },
              },
            },
          },
        },
        steps: {
          type: "array",
          description:
            "Alias for emails. Supports the same fields and matching rules.",
          items: {
            type: "object",
            properties: {
              emailId: {
                type: "string",
                description:
                  "Optional target linked email template ID for a step. Use the emailId returned in get_sequence.sequence.emails.",
              },
              nodeId: {
                type: "string",
                description:
                  "Optional target action_email node ID for a step. Use the nodeId returned in get_sequence.sequence.emails.",
              },
              name: {
                type: "string",
                description: "Updated step/template name",
              },
              subject: {
                type: "string",
                description: "Updated email subject",
              },
              previewText: {
                type: "string",
                description: "Updated preview text",
              },
              html: {
                type: "string",
                description:
                  "Updated HTML content. Will be converted to Sequenzy blocks.",
              },
              htmlContent: {
                type: "string",
                description:
                  "Alias for html. Use this when updating HTML content for a step.",
              },
              blocks: {
                type: "array",
                description: replacementEmailBlocksDescription,
                items: { type: "object" },
              },
            },
          },
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "enable_sequence",
    description:
      "Enable/activate a sequence. IMPORTANT: Only call this when the user EXPLICITLY asks to enable or activate a sequence. Never enable sequences automatically after creation - the user must review the content first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "disable_sequence",
    description: "Disable/pause a sequence",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "cancel_sequence_enrollments",
    description:
      "Cancel active/waiting enrollments in one sequence. Provide sequenceId and exactly one target: subscriberId for one subscriber, or fieldValues to match stored entry event properties. For fieldValues, fieldPath is optional when the sequence has enrollmentFieldPath configured; otherwise provide a dot path such as order.id.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID whose enrollments should be cancelled.",
        },
        subscriberId: {
          type: "string",
          description:
            "Subscriber ID to cancel in this sequence. Provide subscriberId or fieldValues, not both.",
        },
        fieldPath: {
          type: "string",
          description:
            "Dot-path inside the token's stored entry event properties, such as order.id or event.id. Optional when the sequence has enrollmentFieldPath configured.",
        },
        fieldValues: {
          type: "array",
          items: { type: "string" },
          description:
            "Entry field values to match. Cancels all active/waiting enrollments in the sequence whose entry field value is in this list. Provide fieldValues or subscriberId, not both.",
        },
        dryRun: {
          type: "boolean",
          description:
            "When true, returns matching enrollments without cancelling them. Field-value cancellation defaults to dryRun on the API unless explicitly false.",
        },
        reason: {
          type: "string",
          description:
            "Optional cancellation reason stored on matched enrollment tokens.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_sequence",
    description: "Delete a sequence",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
      },
      required: ["sequenceId"],
    },
  },

  // ============================================================================
  // Transactional Email
  // ============================================================================
  {
    name: "list_transactional_emails",
    description:
      "List transactional email templates, including their API slugs and linked email IDs",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "get_transactional_email",
    description:
      "Get a transactional email by ID or slug, including subject, preview text, blocks, variables, and linked dashboard URLs",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        idOrSlug: {
          type: "string",
          description:
            "Transactional email ID or API slug, for example `welcome-email`.",
        },
      },
      required: ["idOrSlug"],
    },
  },
  {
    name: "create_transactional_email",
    description:
      "Create a saved transactional email template with an API slug. Provide `prompt` to generate the email with AI, or provide either `html` or Sequenzy `blocks` for the email body.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Transactional email name.",
        },
        slug: {
          type: "string",
          description:
            "Optional API slug used when sending by slug, for example `password-reset`. If omitted, Sequenzy generates one from the name.",
        },
        subject: {
          type: "string",
          description:
            "Email subject line. Optional when `prompt` is provided because the generated subject will be used.",
        },
        previewText: {
          type: ["string", "null"],
          description: "Email preview text.",
        },
        html: {
          type: "string",
          description: "Email HTML content. Mutually exclusive with `blocks`.",
        },
        blocks: {
          type: "array",
          description: `${emailBlocksDescription} Mutually exclusive with \`html\`.`,
          items: {
            type: "object",
          },
        },
        prompt: {
          type: "string",
          description:
            "Generate transactional email blocks from a prompt. Mutually exclusive with `html` and `blocks`.",
        },
        style: {
          type: "string",
          description:
            "Prompt generation style: minimal, branded, promotional. Only used with `prompt`.",
        },
        tone: {
          type: "string",
          description:
            "Prompt generation tone: professional, casual, friendly. Only used with `prompt`.",
        },
        enabled: {
          type: "boolean",
          description:
            "Whether this transactional email can be sent immediately. Defaults to true.",
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_transactional_email",
    description:
      "Update a transactional email by ID or slug. At least one of `name`, `enabled`, `subject`, `previewText`, `html`, or `blocks` is required. Use `html` or `blocks` to replace the linked email body.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        idOrSlug: {
          type: "string",
          description:
            "Transactional email ID or API slug, for example `welcome-email`.",
        },
        name: {
          type: "string",
          description: "Transactional email name.",
        },
        enabled: {
          type: "boolean",
          description: "Whether this transactional email can be sent.",
        },
        subject: {
          type: "string",
          description: "Email subject line.",
        },
        previewText: {
          type: ["string", "null"],
          description: "Email preview text.",
        },
        html: {
          type: "string",
          description: "Email HTML content. Mutually exclusive with `blocks`.",
        },
        blocks: {
          type: "array",
          description: `${replacementEmailBlocksDescription} Mutually exclusive with \`html\`.`,
          items: {
            type: "object",
          },
        },
      },
      required: ["idOrSlug"],
      additionalProperties: false,
    },
  },
  {
    name: "send_email",
    description: "Send a transactional email to a single recipient",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        to: {
          type: "string",
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject (required if not using templateId)",
        },
        html: {
          type: "string",
          description: "Email HTML content (required if not using templateId)",
        },
        templateId: {
          type: "string",
          description: "Template ID to use (alternative to html)",
        },
        variables: {
          type: "object",
          description:
            "Variables for template personalization. Nested objects and arrays are supported for repeat blocks, for example { items: [...] }.",
        },
        subscriberExternalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID for attaching analytics/localization on single-recipient sends.",
        },
      },
      required: ["to"],
    },
  },

  // ============================================================================
  // Analytics
  // ============================================================================
  {
    name: "get_stats",
    description: "Get overview statistics for a time period",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        period: {
          type: "string",
          description: "Time period: 7d, 30d, or 90d (default: 7d)",
        },
      },
    },
  },
  {
    name: "get_campaign_stats",
    description: "Get detailed statistics for a campaign",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_sequence_stats",
    description:
      "Get statistics for a sequence, including per-step failed subscribers and failure reasons",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "get_subscriber_activity",
    description:
      "Get recent activity, email stats, and current sequence enrollments for a subscriber",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description:
            "Subscriber email address. Provide email or externalId to identify the subscriber.",
        },
        externalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID. Provide email or externalId to identify the subscriber.",
        },
      },
      required: [],
    },
  },

  // ============================================================================
  // AI Generation
  // ============================================================================
  {
    name: "generate_email",
    description: "Generate email blocks from a prompt",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        prompt: {
          type: "string",
          description: "Description of the email to generate",
        },
        style: {
          type: "string",
          description: "Style: minimal, branded, promotional",
        },
        tone: {
          type: "string",
          description: "Tone: professional, casual, friendly",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_sequence",
    description:
      "[DEPRECATED - Use create_sequence instead] Generate a multi-email sequence from a goal. Note: create_sequence now handles AI generation automatically.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        goal: {
          type: "string",
          description:
            "Goal of the sequence (e.g., 'onboard new SaaS trial users')",
        },
        emailCount: {
          type: "number",
          description: "Number of emails in the sequence (default: 5, max: 10)",
        },
        durationDays: {
          type: "number",
          description: "Total duration in days (default: 14)",
        },
      },
      required: ["goal"],
    },
  },
  {
    name: "generate_subject_lines",
    description: "Generate A/B test subject line variants",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        topic: {
          type: "string",
          description: "Topic or context for the subject lines",
        },
        count: {
          type: "number",
          description: "Number of variants to generate (default: 5)",
        },
      },
      required: ["topic"],
    },
  },
];

// Tool call handler
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}> {
  try {
    let result: unknown;

    switch (name) {
      // Account
      case "get_account": {
        const accountData = await apiRequest<Record<string, unknown>>(
          "GET",
          "/api/v1/account"
        );
        // Include the locally selected company ID in the response
        const locallySelectedCompanyId = getSelectedCompanyId();
        result = {
          ...accountData,
          selectedCompanyId:
            locallySelectedCompanyId ?? accountData.currentCompanyId,
        };
        break;
      }

      case "select_company": {
        const companyId = args.companyId as string;
        // Verify the company exists by fetching account info first
        const accountInfo = await apiRequest<{
          success: boolean;
          companies?: Array<{ id: string; name: string }>;
        }>("GET", "/api/v1/account");

        const company = accountInfo.companies?.find((c) => c.id === companyId);
        if (!company) {
          throw new Error(
            `Company not found. Available companies: ${accountInfo.companies?.map((c) => `${c.name} (${c.id})`).join(", ") ?? "none"}`
          );
        }

        setSelectedCompanyId(companyId);
        result = {
          success: true,
          message: `Switched to company: ${company.name}`,
          companyId: company.id,
          companyName: company.name,
        };
        break;
      }

      case "get_app_urls": {
        const companyId = await resolveCompanyIdForAppUrls(args);
        const appUrls = buildSequenzyAppUrls({
          companyId,
          campaignId: optionalString(args, "campaignId"),
          sequenceId: optionalString(args, "sequenceId"),
          emailId:
            optionalString(args, "emailId") ??
            optionalString(args, "templateId"),
          transactionalId: optionalString(args, "transactionalId"),
          emailSendId: optionalString(args, "emailSendId"),
          domainId: optionalString(args, "domainId"),
          status: optionalString(args, "status"),
          settingsTab: optionalString(args, "settingsTab"),
        });

        result = {
          ...appUrls,
          ...(companyId === undefined && {
            note: "No company ID is selected. Call get_account, select_company, or pass companyId to get concrete dashboard URLs.",
          }),
        };
        break;
      }

      case "create_company": {
        // Create the company
        const createResult = await apiRequest<{
          success: boolean;
          company: { id: string; name: string; status: string };
          message?: string;
        }>("POST", "/api/v1/companies", {
          name: args.name,
          domain: args.domain,
        });

        if (!createResult.success) {
          throw new Error("Failed to create company");
        }

        const newCompanyId = createResult.company.id;
        const maxPolls = 6; // 6 polls * 20 seconds = 2 minutes max
        let pollCount = 0;
        let finalStatus = createResult.company.status;

        // Poll until processed or max polls reached
        while (finalStatus === "processing" && pollCount < maxPolls) {
          // Wait 20 seconds before polling
          await new Promise((resolve) => setTimeout(resolve, 20000));
          pollCount++;

          const statusResult = await apiRequest<{
            success: boolean;
            company: {
              id: string;
              name: string;
              status: string;
              logoUrl?: string;
            };
          }>("GET", `/api/v1/companies/${newCompanyId}`);

          if (statusResult.success) {
            finalStatus = statusResult.company.status;
          }
        }

        // Auto-select the new company
        setSelectedCompanyId(newCompanyId);

        // Get final company details
        const finalResult = await apiRequest<{
          success: boolean;
          company: {
            id: string;
            name: string;
            status: string;
            websiteUrl?: string;
            logoUrl?: string;
          };
        }>("GET", `/api/v1/companies/${newCompanyId}`);

        result = {
          success: true,
          company: finalResult.company,
          message:
            finalStatus === "processing"
              ? "Company created but still processing. You can continue using it while processing completes."
              : `Company '${finalResult.company.name}' created and ready to use.`,
          autoSelected: true,
        };
        break;
      }

      case "get_company": {
        const companyId = args.companyId as string;
        result = await apiRequest("GET", `/api/v1/companies/${companyId}`);
        break;
      }

      case "create_api_key": {
        const companyId = args.companyId as string;
        result = await apiRequest(
          "POST",
          "/api/v1/api-keys",
          { name: args.name },
          companyId
        );
        break;
      }

      case "list_websites": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/websites",
          undefined,
          companyId
        );
        break;
      }

      case "add_website": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/websites",
          { domain: args.domain },
          companyId
        );
        break;
      }

      case "check_website": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/websites/${args.domain}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_integration_guide":
        result = await apiRequest("POST", "/api/v1/integration-guide", args);
        break;

      // Subscribers
      case "add_subscriber": {
        const companyId = args.companyId as string | undefined;
        const identifier = requireSubscriberIdentifier("add_subscriber", args);
        result = await apiRequest(
          "POST",
          "/api/v1/subscribers",
          {
            ...identifier,
            customAttributes: args.attributes,
            tags: args.tags,
            lists: args.listIds,
            ...(args.status !== undefined && { status: args.status }),
            ...(args.optInMode !== undefined && {
              optInMode: args.optInMode,
            }),
          },
          companyId
        );
        break;
      }

      case "update_subscriber": {
        const companyId = args.companyId as string | undefined;
        const identifier = requireSubscriberIdentifier(
          "update_subscriber",
          args
        );
        const detail = await fetchDetailedSubscriberByIdentifier(
          identifier,
          companyId
        );
        const currentTags = Array.isArray(detail.subscriber.tags)
          ? detail.subscriber.tags.filter(
              (tag): tag is string => typeof tag === "string"
            )
          : [];
        const addTags = Array.isArray(args.addTags)
          ? args.addTags
              .filter(
                (tag): tag is string =>
                  typeof tag === "string" && tag.trim() !== ""
              )
              .map(normalizeSubscriberTag)
          : [];
        const removeTags = new Set(
          Array.isArray(args.removeTags)
            ? args.removeTags
                .filter(
                  (tag): tag is string =>
                    typeof tag === "string" && tag.trim() !== ""
                )
                .map(normalizeSubscriberTag)
            : []
        );
        const nextTags = currentTags.filter((tag) => !removeTags.has(tag));
        for (const tag of addTags) {
          if (!nextTags.includes(tag)) {
            nextTags.push(tag);
          }
        }

        const body: Record<string, unknown> = {};
        if (identifier.email && identifier.externalId) {
          body.externalId = identifier.externalId;
        }
        if (isRecord(args.attributes)) {
          body.customAttributes = {
            ...(isRecord(detail.subscriber.customAttributes)
              ? detail.subscriber.customAttributes
              : {}),
            ...args.attributes,
          };
        }
        if (args.addTags || args.removeTags) {
          body.tags = nextTags;
        }

        result = await apiRequest(
          "PATCH",
          getSubscriberDetailPath(identifier),
          body,
          companyId
        );
        break;
      }

      case "remove_subscriber": {
        const companyId = args.companyId as string | undefined;
        const identifier = requireSubscriberIdentifier(
          "remove_subscriber",
          args
        );
        const path = getSubscriberDetailPath(identifier);
        if (args.hardDelete === true) {
          result = await apiRequest("DELETE", path, undefined, companyId);
        } else {
          result = await apiRequest(
            "PATCH",
            path,
            { status: "unsubscribed" },
            companyId
          );
        }
        break;
      }

      case "get_subscriber": {
        const companyId = args.companyId as string | undefined;
        const identifier = requireSubscriberIdentifier("get_subscriber", args);
        result = await fetchDetailedSubscriberByIdentifier(
          identifier,
          companyId
        );
        break;
      }

      case "search_subscribers": {
        const companyId = args.companyId as string | undefined;
        result = await fetchAllSubscribers(args, companyId);
        break;
      }

      // Tags, Lists, Segments
      case "list_tags": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("GET", "/api/v1/tags", undefined, companyId);
        break;
      }

      case "list_lists": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("GET", "/api/v1/lists", undefined, companyId);
        break;
      }

      case "create_list": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("POST", "/api/v1/lists", args, companyId);
        break;
      }

      case "add_subscribers_to_list": {
        const companyId = args.companyId as string | undefined;
        const listId = requiredString(
          "add_subscribers_to_list",
          args,
          "listId"
        );
        const emails = requireEmailArray("add_subscribers_to_list", args);
        const duplicateStrategy =
          optionalAllowedString(
            "add_subscribers_to_list",
            args,
            "duplicateStrategy",
            ["skip", "merge", "overwrite"]
          ) ?? "skip";
        const optInMode =
          optionalAllowedString("add_subscribers_to_list", args, "optInMode", [
            "default",
            "confirmed",
            "double_opt_in",
          ]) ?? "default";

        const responses: AddSubscribersToListResponse[] = [];
        for (const emailChunk of chunkSubscriberEmails(emails)) {
          responses.push(
            await apiRequest<AddSubscribersToListResponse>(
              "POST",
              `/api/v1/lists/${encodeURIComponent(listId)}/subscribers`,
              {
                emails: emailChunk,
                duplicateStrategy,
                enrollInSequences: args.enrollInSequences === true,
                optInMode,
              },
              companyId
            )
          );
        }

        result = combineAddSubscribersToListResponses(listId, responses);
        break;
      }

      case "list_segments": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/segments",
          undefined,
          companyId
        );
        break;
      }

      case "create_segment": {
        validateCreateSegmentArgs(args);

        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/segments",
          {
            ...args,
            ...(args.filters !== undefined
              ? { filters: normalizeSegmentFilters(args.filters) }
              : {}),
            ...(args.root !== undefined
              ? { root: normalizeSegmentRoot(args.root) }
              : {}),
          },
          companyId
        );
        break;
      }

      case "get_segment_count": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/segments/${args.segmentId}/count`,
          undefined,
          companyId
        );
        break;
      }

      // Templates
      case "list_templates": {
        const companyId = args.companyId as string | undefined;
        const templateParams = new URLSearchParams();
        const label = optionalString(args, "label");
        if (label) templateParams.set("label", label);
        result = await apiRequest(
          "GET",
          `/api/v1/templates${templateParams.size > 0 ? `?${templateParams}` : ""}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_template": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/templates/${args.templateId}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_template": {
        const companyId = args.companyId as string | undefined;
        validateHtmlOrBlocksArgs("create_template", args, {
          requireContent: true,
        });
        validateLabelsArg("create_template", args);
        result = await apiRequest("POST", "/api/v1/templates", args, companyId);
        break;
      }

      case "update_template": {
        const companyId = args.companyId as string | undefined;
        const allowedTemplateUpdateKeys = new Set([
          "companyId",
          "templateId",
          "name",
          "subject",
          "html",
          "blocks",
          "labels",
        ]);
        const unsupportedTemplateUpdateKeys = Object.keys(args).filter(
          (key) => !allowedTemplateUpdateKeys.has(key)
        );

        if (unsupportedTemplateUpdateKeys.length > 0) {
          throw new Error(
            `\`update_template\` accepts only \`name\`, \`subject\`, \`html\`, \`blocks\`, and \`labels\` update fields. Unsupported field${unsupportedTemplateUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedTemplateUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        validateHtmlOrBlocksArgs("update_template", args);
        validateLabelsArg("update_template", args);

        if (
          args.name === undefined &&
          args.subject === undefined &&
          args.html === undefined &&
          args.blocks === undefined &&
          args.labels === undefined
        ) {
          throw new Error(
            "Provide at least one of `name`, `subject`, `html`, `blocks`, or `labels` when calling `update_template`."
          );
        }

        result = await apiRequest(
          "PUT",
          `/api/v1/templates/${args.templateId}`,
          args,
          companyId
        );
        break;
      }

      case "delete_template": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "DELETE",
          `/api/v1/templates/${args.templateId}`,
          undefined,
          companyId
        );
        break;
      }

      // A/B Tests
      case "list_ab_tests": {
        const companyId = args.companyId as string | undefined;
        const abTestParams = new URLSearchParams();
        const sequenceId = optionalString(args, "sequenceId");
        if (sequenceId) abTestParams.set("sequenceId", sequenceId);

        result = await apiRequest(
          "GET",
          `/api/v1/ab-tests${abTestParams.size > 0 ? `?${abTestParams}` : ""}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_ab_test": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/ab-tests/${args.abTestId}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_ab_test_stats": {
        const companyId = args.companyId as string | undefined;
        const abTestStatsParams = new URLSearchParams();
        const period = optionalString(args, "period");
        const start = optionalString(args, "start");
        const end = optionalString(args, "end");
        if (period) abTestStatsParams.set("period", period);
        if (start) abTestStatsParams.set("start", start);
        if (end) abTestStatsParams.set("end", end);

        result = await apiRequest(
          "GET",
          `/api/v1/ab-tests/${args.abTestId}/stats${abTestStatsParams.size > 0 ? `?${abTestStatsParams}` : ""}`,
          undefined,
          companyId
        );
        break;
      }

      case "restart_ab_test": {
        const companyId = args.companyId as string | undefined;
        const allowedRestartKeys = new Set([
          "companyId",
          "abTestId",
          "sourceVariantId",
          "testType",
          "winnerThreshold",
          "variantCount",
        ]);
        const unsupportedRestartKeys = Object.keys(args).filter(
          (key) => !allowedRestartKeys.has(key)
        );

        if (unsupportedRestartKeys.length > 0) {
          throw new Error(
            `\`restart_ab_test\` accepts only \`sourceVariantId\`, \`testType\`, \`winnerThreshold\`, and \`variantCount\` option fields. Unsupported field${unsupportedRestartKeys.length === 1 ? "" : "s"}: ${unsupportedRestartKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        const testType = optionalString(args, "testType");
        if (
          testType !== undefined &&
          testType !== "subject" &&
          testType !== "content"
        ) {
          throw new Error(
            "`restart_ab_test` testType must be `subject` or `content`."
          );
        }

        const winnerThreshold =
          args.winnerThreshold === undefined
            ? undefined
            : Number(args.winnerThreshold);
        if (
          winnerThreshold !== undefined &&
          (!Number.isInteger(winnerThreshold) ||
            winnerThreshold < 10 ||
            winnerThreshold > 1000)
        ) {
          throw new Error(
            "`restart_ab_test` winnerThreshold must be an integer from 10 to 1000."
          );
        }

        const variantCount =
          args.variantCount === undefined
            ? undefined
            : Number(args.variantCount);
        if (
          variantCount !== undefined &&
          (!Number.isInteger(variantCount) ||
            variantCount < 2 ||
            variantCount > 4)
        ) {
          throw new Error(
            "`restart_ab_test` variantCount must be an integer from 2 to 4."
          );
        }

        result = await apiRequest(
          "POST",
          `/api/v1/ab-tests/${args.abTestId}/restart`,
          {
            sourceVariantId: optionalString(args, "sourceVariantId"),
            testType,
            winnerThreshold,
            variantCount,
          },
          companyId
        );
        break;
      }

      case "update_ab_test_variant": {
        const companyId = args.companyId as string | undefined;
        const allowedAbTestUpdateKeys = new Set([
          "companyId",
          "abTestId",
          "variantId",
          "subject",
          "previewText",
          "html",
          "blocks",
        ]);
        const unsupportedAbTestUpdateKeys = Object.keys(args).filter(
          (key) => !allowedAbTestUpdateKeys.has(key)
        );

        if (unsupportedAbTestUpdateKeys.length > 0) {
          throw new Error(
            `\`update_ab_test_variant\` accepts only \`subject\`, \`previewText\`, \`html\`, and \`blocks\` update fields. Unsupported field${unsupportedAbTestUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedAbTestUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        validateHtmlOrBlocksArgs("update_ab_test_variant", args);

        if (
          args.subject === undefined &&
          args.previewText === undefined &&
          args.html === undefined &&
          args.blocks === undefined
        ) {
          throw new Error(
            "Provide at least one of `subject`, `previewText`, `html`, or `blocks` when calling `update_ab_test_variant`."
          );
        }

        result = await apiRequest(
          "PATCH",
          `/api/v1/ab-tests/${args.abTestId}/variants/${args.variantId}`,
          args,
          companyId
        );
        break;
      }

      // Campaigns
      case "list_campaigns": {
        const companyId = args.companyId as string | undefined;
        const campaignParams = new URLSearchParams();
        if (args.status) campaignParams.set("status", String(args.status));
        const label = optionalString(args, "label");
        if (label) campaignParams.set("label", label);
        result = await apiRequest(
          "GET",
          `/api/v1/campaigns?${campaignParams}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_campaign": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/campaigns/${args.campaignId}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_email_send": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/email-sends/${encodeURIComponent(String(args.emailSendId))}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_campaign": {
        const companyId = args.companyId as string | undefined;
        validateCreateCampaignContentArgs(args);

        const prompt = optionalString(args, "prompt");
        if (prompt !== undefined) {
          const generated = await apiRequest<GeneratedEmailResult>(
            "POST",
            "/api/v1/generate/email",
            {
              prompt,
              ...(args.style !== undefined && { style: args.style }),
              ...(args.tone !== undefined && { tone: args.tone }),
            },
            companyId
          );
          const subject =
            optionalString(args, "subject") ??
            (typeof generated.subject === "string" &&
            generated.subject.trim() !== ""
              ? generated.subject.trim()
              : undefined);

          if (!subject) {
            throw new Error(
              "`create_campaign` prompt generation did not return a subject. Provide `subject` explicitly."
            );
          }

          const generatedBlocks =
            Array.isArray(generated.blocks) && generated.blocks.length > 0
              ? generated.blocks
              : undefined;
          const generatedHtml =
            typeof generated.html === "string" && generated.html.trim() !== ""
              ? generated.html
              : undefined;

          if (generatedBlocks === undefined && generatedHtml === undefined) {
            throw new Error(
              "`create_campaign` prompt generation did not return email blocks. Try again or provide `html` or `blocks` explicitly."
            );
          }

          result = await apiRequest(
            "POST",
            "/api/v1/campaigns",
            {
              name: args.name,
              subject,
              ...(generatedBlocks !== undefined
                ? { blocks: generatedBlocks }
                : { html: generatedHtml }),
              ...(args.segmentId !== undefined && {
                segmentId: args.segmentId,
              }),
              ...(args.trackingCode !== undefined && {
                trackingCode: args.trackingCode,
              }),
              ...(args.campaignData !== undefined && {
                campaignData: args.campaignData,
              }),
              ...(args.computedLists !== undefined && {
                computedLists: args.computedLists,
              }),
              ...(args.labels !== undefined && {
                labels: args.labels,
              }),
            },
            companyId
          );
          break;
        }

        result = await apiRequest("POST", "/api/v1/campaigns", args, companyId);
        break;
      }

      case "update_campaign": {
        const companyId = args.companyId as string | undefined;
        const allowedCampaignUpdateKeys = new Set([
          "companyId",
          "campaignId",
          "name",
          "subject",
          "trackingCode",
          "html",
          "blocks",
          "replyTo",
          "replyProfileId",
          "campaignData",
          "computedLists",
          "labels",
        ]);
        const unsupportedCampaignUpdateKeys = Object.keys(args).filter(
          (key) => !allowedCampaignUpdateKeys.has(key)
        );

        if (unsupportedCampaignUpdateKeys.length > 0) {
          throw new Error(
            `\`update_campaign\` accepts only \`name\`, \`subject\`, \`trackingCode\`, \`html\`, \`blocks\`, \`replyTo\`, \`replyProfileId\`, \`campaignData\`, \`computedLists\`, and \`labels\` update fields. Unsupported field${unsupportedCampaignUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedCampaignUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        validateHtmlOrBlocksArgs("update_campaign", args);
        validateLabelsArg("update_campaign", args);

        if (args.replyTo !== undefined && args.replyProfileId !== undefined) {
          throw new Error(
            "Provide either `replyTo` or `replyProfileId` when calling `update_campaign`, not both."
          );
        }

        if (
          args.name === undefined &&
          args.subject === undefined &&
          args.trackingCode === undefined &&
          args.html === undefined &&
          args.blocks === undefined &&
          args.replyTo === undefined &&
          args.replyProfileId === undefined &&
          args.campaignData === undefined &&
          args.computedLists === undefined &&
          args.labels === undefined
        ) {
          throw new Error(
            "Provide at least one of `name`, `subject`, `trackingCode`, `html`, `blocks`, `replyTo`, `replyProfileId`, `campaignData`, `computedLists`, or `labels` when calling `update_campaign`."
          );
        }

        result = await apiRequest(
          "PUT",
          `/api/v1/campaigns/${args.campaignId}`,
          args,
          companyId
        );
        break;
      }

      case "schedule_campaign": {
        const companyId = args.companyId as string | undefined;
        const allowedCampaignScheduleKeys = new Set([
          "companyId",
          "campaignId",
          "scheduledAt",
          "targetLists",
          "sendTimeOptimization",
          "spreadOverHours",
        ]);
        const unsupportedCampaignScheduleKeys = Object.keys(args).filter(
          (key) => !allowedCampaignScheduleKeys.has(key)
        );

        if (unsupportedCampaignScheduleKeys.length > 0) {
          throw new Error(
            `\`schedule_campaign\` accepts only \`campaignId\`, \`scheduledAt\`, \`targetLists\`, \`sendTimeOptimization\`, and \`spreadOverHours\`. Unsupported field${unsupportedCampaignScheduleKeys.length === 1 ? "" : "s"}: ${unsupportedCampaignScheduleKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        validateScheduleCampaignArgs(args);

        result = await apiRequest(
          "POST",
          `/api/v1/campaigns/${args.campaignId}/schedule`,
          {
            scheduledAt: args.scheduledAt,
            ...(args.targetLists !== undefined && {
              targetLists: args.targetLists,
            }),
            ...(args.sendTimeOptimization !== undefined && {
              sendTimeOptimization: args.sendTimeOptimization,
            }),
            ...(args.spreadOverHours !== undefined && {
              spreadOverHours: args.spreadOverHours,
            }),
          },
          companyId
        );
        break;
      }

      case "send_test_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          `/api/v1/campaigns/${args.campaignId}/test`,
          { to: args.to },
          companyId
        );
        break;
      }

      // Sequences
      case "list_sequences": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/sequences",
          undefined,
          companyId
        );
        break;
      }

      case "get_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/sequences/${args.sequenceId}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_sequence": {
        const companyId = args.companyId as string | undefined;
        const hasExplicitSteps =
          Array.isArray(args.steps) && args.steps.length > 0;
        // Create the sequence - this queues AI enrichment
        const createSeqResult = await apiRequest<{
          success: boolean;
          sequence: {
            id: string;
            name: string;
            status: string;
            trigger?: string;
            emailCount: number;
            discountCount?: number;
            nodeCount?: number;
            enrichmentStatus?: string;
          };
          message: string;
        }>("POST", "/api/v1/sequences", args, companyId);

        if (!createSeqResult.success) {
          result = createSeqResult;
          break;
        }

        const sequenceId = createSeqResult.sequence.id;

        if (hasExplicitSteps) {
          const finalResult = await apiRequest<{
            success: boolean;
            sequence: {
              id: string;
              name: string;
              status: string;
              enrichmentStatus: string;
              emailCount: number;
              discountCount?: number;
              enrichedCount: number;
              nodes: unknown[];
            };
          }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

          if (finalResult.success) {
            result = {
              success: true,
              sequence: finalResult.sequence,
              message: `Sequence "${finalResult.sequence.name}" created with explicit steps. Review it before enabling.`,
            };
          } else {
            result = finalResult;
          }
          break;
        }

        // Poll for enrichment completion (20 second intervals, max 6 polls = 2 minutes)
        const maxPolls = 6;
        let pollCount = 0;
        let enrichmentStatus = "pending";

        while (enrichmentStatus !== "complete" && pollCount < maxPolls) {
          // Wait 20 seconds before polling
          await new Promise((resolve) => setTimeout(resolve, 20000));
          pollCount++;

          const statusResult = await apiRequest<{
            success: boolean;
            sequence: {
              id: string;
              name: string;
              status: string;
              enrichmentStatus: string;
              emailCount: number;
              enrichedCount: number;
            };
          }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

          if (statusResult.success) {
            enrichmentStatus = statusResult.sequence.enrichmentStatus;
          }
        }

        // Return final status
        const finalResult = await apiRequest<{
          success: boolean;
          sequence: {
            id: string;
            name: string;
            status: string;
            enrichmentStatus: string;
            emailCount: number;
            enrichedCount: number;
            nodes: unknown[];
          };
        }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

        if (finalResult.success) {
          result = {
            success: true,
            sequence: finalResult.sequence,
            message:
              finalResult.sequence.enrichmentStatus === "complete"
                ? `Sequence "${finalResult.sequence.name}" created with ${finalResult.sequence.emailCount} AI-generated emails. The sequence is ready to review and enable.`
                : `Sequence "${finalResult.sequence.name}" created. Email enrichment is still in progress (${finalResult.sequence.enrichedCount}/${finalResult.sequence.emailCount} emails generated). You can check status with get_sequence.`,
          };
        } else {
          result = finalResult;
        }
        break;
      }

      case "update_sequence": {
        const companyId = args.companyId as string | undefined;
        const body = buildUpdateSequenceBody(args);
        result = await apiRequest(
          "PUT",
          `/api/v1/sequences/${args.sequenceId}`,
          body,
          companyId
        );
        break;
      }

      case "enable_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          `/api/v1/sequences/${args.sequenceId}/enable`,
          undefined,
          companyId
        );
        break;
      }

      case "disable_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          `/api/v1/sequences/${args.sequenceId}/disable`,
          undefined,
          companyId
        );
        break;
      }

      case "cancel_sequence_enrollments": {
        const companyId = args.companyId as string | undefined;
        const body = buildCancelSequenceEnrollmentBody(args);
        result = await apiRequest(
          "POST",
          `/api/v1/sequences/${args.sequenceId}/enrollments/cancel`,
          body,
          companyId
        );
        break;
      }

      case "delete_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "DELETE",
          `/api/v1/sequences/${args.sequenceId}`,
          undefined,
          companyId
        );
        break;
      }

      // Transactional
      case "list_transactional_emails": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/transactional",
          undefined,
          companyId
        );
        break;
      }

      case "get_transactional_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/transactional/${args.idOrSlug}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_transactional_email": {
        const companyId = args.companyId as string | undefined;
        const allowedTransactionalCreateKeys = new Set([
          "companyId",
          "name",
          "slug",
          "subject",
          "previewText",
          "html",
          "blocks",
          "prompt",
          "style",
          "tone",
          "enabled",
        ]);
        const unsupportedTransactionalCreateKeys = Object.keys(args).filter(
          (key) => !allowedTransactionalCreateKeys.has(key)
        );

        if (unsupportedTransactionalCreateKeys.length > 0) {
          throw new Error(
            `\`create_transactional_email\` accepts only \`name\`, \`slug\`, \`subject\`, \`previewText\`, \`html\`, \`blocks\`, \`prompt\`, \`style\`, \`tone\`, and \`enabled\` fields. Unsupported field${unsupportedTransactionalCreateKeys.length === 1 ? "" : "s"}: ${unsupportedTransactionalCreateKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        validateCreateTransactionalContentArgs(args);

        const prompt = optionalString(args, "prompt");
        if (prompt !== undefined) {
          const promptLogContext = {
            companyId: companyId ?? getSelectedCompanyId() ?? "",
            name:
              typeof args.name === "string" && args.name.trim() !== ""
                ? args.name.trim()
                : "",
            slug:
              typeof args.slug === "string" && args.slug.trim() !== ""
                ? args.slug.trim()
                : "",
            promptLength: prompt.length,
            style: typeof args.style === "string" ? args.style : "",
            tone: typeof args.tone === "string" ? args.tone : "",
          };

          try {
            console.error(
              "[mcp:create_transactional_email] generating from prompt",
              promptLogContext
            );
            const generated = await apiRequest<GeneratedEmailResult>(
              "POST",
              "/api/v1/generate/email",
              {
                prompt,
                ...(args.style !== undefined && { style: args.style }),
                ...(args.tone !== undefined && { tone: args.tone }),
              },
              companyId
            );
            console.error(
              "[mcp:create_transactional_email] prompt generation complete",
              {
                ...promptLogContext,
                subject: generated.subject ?? "",
                previewTextLength:
                  typeof generated.previewText === "string"
                    ? generated.previewText.length
                    : 0,
                blockCount: Array.isArray(generated.blocks)
                  ? generated.blocks.length
                  : 0,
                htmlLength:
                  typeof generated.html === "string"
                    ? generated.html.length
                    : 0,
              }
            );
            const subject =
              optionalString(args, "subject") ??
              (typeof generated.subject === "string" &&
              generated.subject.trim() !== ""
                ? generated.subject.trim()
                : undefined);

            if (!subject) {
              throw new Error(
                "`create_transactional_email` prompt generation did not return a subject. Provide `subject` explicitly."
              );
            }

            const generatedBlocks =
              Array.isArray(generated.blocks) && generated.blocks.length > 0
                ? generated.blocks
                : undefined;
            const generatedHtml =
              typeof generated.html === "string" && generated.html.trim() !== ""
                ? generated.html
                : undefined;
            const previewText =
              optionalString(args, "previewText") ??
              (typeof generated.previewText === "string"
                ? generated.previewText.trim()
                : undefined);

            if (generatedBlocks === undefined && generatedHtml === undefined) {
              throw new Error(
                "`create_transactional_email` prompt generation did not return email blocks. Try again or provide `html` or `blocks` explicitly."
              );
            }

            console.error(
              "[mcp:create_transactional_email] creating generated transactional",
              {
                ...promptLogContext,
                subject,
                contentSource:
                  generatedBlocks !== undefined ? "blocks" : "html",
                blockCount: generatedBlocks?.length ?? 0,
                htmlLength: generatedHtml?.length ?? 0,
              }
            );
            result = await apiRequest(
              "POST",
              "/api/v1/transactional",
              {
                name: args.name,
                ...(args.slug !== undefined && { slug: args.slug }),
                subject,
                ...(previewText !== undefined && { previewText }),
                ...(generatedBlocks !== undefined
                  ? { blocks: generatedBlocks }
                  : { html: generatedHtml }),
                ...(args.enabled !== undefined && { enabled: args.enabled }),
              },
              companyId
            );
            console.error(
              "[mcp:create_transactional_email] generated transactional created",
              promptLogContext
            );
          } catch (error) {
            console.error(
              "[mcp:create_transactional_email] prompt-based create failed",
              {
                ...promptLogContext,
                error: error instanceof Error ? error.message : String(error),
              }
            );
            throw error;
          }
          break;
        }

        const createBody = Object.fromEntries(
          Object.entries(args).filter(([key]) => key !== "companyId")
        );

        result = await apiRequest(
          "POST",
          "/api/v1/transactional",
          createBody,
          companyId
        );
        break;
      }

      case "update_transactional_email": {
        const companyId = args.companyId as string | undefined;
        const allowedTransactionalUpdateKeys = new Set([
          "companyId",
          "idOrSlug",
          "name",
          "enabled",
          "subject",
          "previewText",
          "html",
          "blocks",
        ]);
        const unsupportedTransactionalUpdateKeys = Object.keys(args).filter(
          (key) => !allowedTransactionalUpdateKeys.has(key)
        );

        if (unsupportedTransactionalUpdateKeys.length > 0) {
          throw new Error(
            `\`update_transactional_email\` accepts only \`name\`, \`enabled\`, \`subject\`, \`previewText\`, \`html\`, and \`blocks\` update fields. Unsupported field${unsupportedTransactionalUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedTransactionalUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
          );
        }

        validateHtmlOrBlocksArgs("update_transactional_email", args);

        if (
          args.name === undefined &&
          args.enabled === undefined &&
          args.subject === undefined &&
          args.previewText === undefined &&
          args.html === undefined &&
          args.blocks === undefined
        ) {
          throw new Error(
            "Provide at least one of `name`, `enabled`, `subject`, `previewText`, `html`, or `blocks` when calling `update_transactional_email`."
          );
        }

        const updateBody = Object.fromEntries(
          Object.entries(args).filter(
            ([key]) => key !== "companyId" && key !== "idOrSlug"
          )
        );

        result = await apiRequest(
          "PATCH",
          `/api/v1/transactional/${args.idOrSlug}`,
          updateBody,
          companyId
        );
        break;
      }

      case "send_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/transactional/send",
          args,
          companyId
        );
        break;
      }

      // Analytics
      case "get_stats": {
        const companyId = args.companyId as string | undefined;
        const period = args.period ?? "7d";
        result = await apiRequest(
          "GET",
          `/api/v1/metrics?period=${period}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_campaign_stats": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/metrics/campaigns/${args.campaignId}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_sequence_stats": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/metrics/sequences/${args.sequenceId}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_subscriber_activity": {
        const companyId = args.companyId as string | undefined;
        const identifier = requireSubscriberIdentifier(
          "get_subscriber_activity",
          args
        );
        const detail = await fetchDetailedSubscriberByIdentifier(
          identifier,
          companyId
        );
        result = {
          success: detail.success,
          email: detail.subscriber.email,
          emailStats: detail.subscriber.emailStats ?? null,
          activity: detail.subscriber.activity ?? [],
          sequenceEnrollments: detail.subscriber.sequenceEnrollments ?? [],
        };
        break;
      }

      // AI Generation
      case "generate_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/generate/email",
          args,
          companyId
        );
        break;
      }

      case "generate_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/generate/sequence",
          args,
          companyId
        );
        break;
      }

      case "generate_subject_lines": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/generate/subjects",
          args,
          companyId
        );
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    const resultError = extractResultError(result);
    if (resultError) {
      throw resultError;
    }

    result = await addAppUrlsToToolResult(name, args, result);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: formatMcpError(error),
        },
      ],
    };
  }
}
