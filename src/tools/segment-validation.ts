import { isRecord } from "./common-primitives.js";
import { pollRespondentFilterHint } from "./descriptions.js";

export const segmentOperatorsByField = {
  status: ["is", "is_not"],
  phone: ["is_not_empty", "is_empty"],
  smsStatus: ["is", "is_not"],
  tag: ["contains", "not_contains", "is_empty", "is_not_empty"],
  email: ["contains", "not_contains", "is", "is_not"],
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
  pollResponse: ["is"],
  segment: ["is", "is_not"],
  stripeProduct: ["is", "is_not", "at_least", "less_than_count"],
  stripeCurrentProduct: ["is", "is_not", "gte", "lte", "gt", "lt"],
  stripeTrialProduct: ["is", "is_not", "gte", "lte", "gt", "lt"],
  commerceProduct: ["is", "is_not", "at_least", "less_than_count"],
  commerceCollection: ["is", "is_not", "at_least", "less_than_count"],
} as const satisfies Record<string, readonly string[]>;

export const segmentFilterOperatorHelp = Object.entries(segmentOperatorsByField)
  .map(([field, operators]) => `${field}: ${operators.join(", ")}`)
  .join("; ");

export const segmentFilterItemSchema = {
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
        "phone",
        "smsStatus",
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
        "pollResponse",
        "segment",
        "stripeProduct",
        "stripeCurrentProduct",
        "stripeTrialProduct",
        "commerceProduct",
        "commerceCollection",
      ],
      description: `Filter field. Use \`email\` with is/is_not for exact, case-insensitive address matching (allowlists and exclusions) and with contains/not_contains for domain or substring matching. Use \`phone\` with is_not_empty/is_empty to check whether a subscriber has a phone number, and \`smsStatus\` (is/is_not one of \`subscribed\`, \`unsubscribed\`, \`not_subscribed\`) for SMS marketing consent. Use \`event\` for custom subscriber events, \`segment\` for saved segment membership, \`stripeProduct\`/\`stripeCurrentProduct\`/\`stripeTrialProduct\` for Stripe product-based segments, and \`commerceProduct\` for products purchased through commerce orders - the value is \`provider:productId\` (provider one of \`shopify\`, \`woocommerce\`, \`api\`; product ids are provider-scoped), optionally with an order-count threshold (\`provider:productId:count\`) for at_least/less_than_count; a bare product id matches the id on any provider. Use \`commerceCollection\` to segment on anyone who bought ANY product in a store collection - the value is the collection id or handle (e.g. \`skincare\`), optionally provider-prefixed and/or with an order-count threshold (\`shopify:skincare:2\`); collection membership is resolved from the synced catalog as it stands now, and only Shopify collections and WooCommerce categories are synced. Engagement fields (\`emailSent\`, \`emailDelivered\`, \`emailOpened\`, \`emailClicked\`, \`emailBounced\`, \`emailComplained\`) accept a time range as the value, a specific campaign via \`campaign:<campaign_id>\`, an email-type scope via \`marketing:<timeRange>\` (marketing-policy campaign, automation, and Send API traffic) or \`transactional:<timeRange>\` (transactional-policy sends), or \`count:timeRange\` (e.g. \`10:30d\`, \`10:all\`) with at_least/less_than_count to segment by number of opens/clicks. ${pollRespondentFilterHint}`,
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
      description: `Filter value. For custom attribute empty checks, use \`attributeName:\` such as \`last_logged_in:\`. Array-of-object attributes use wildcard paths such as \`history_events[].eventvenue_id:2103\`; AND-ing two such positive filters on the same \`foo[]\` prefix matches one shared element (negative filters like is_not/not_contains/is_empty stay independent). Event examples: \`saas.purchase:30d\`, \`saas.purchase:all\`, or \`saas.purchase:5:30d\` for thresholds. Segment values are segment IDs. Stripe product examples: \`prod_123\` for bought/didn't buy/current/trialing, \`prod_123:3\` for payment thresholds, \`prod_123:is_canceled\` for products set to cancel, \`prod_123:cancels_at:2026-05-26\`, \`prod_123:end_at:2026-05-26\`, or \`prod_123:start_at:7 days ago\` for product-scoped dates. Engagement examples: \`7d\`, \`30d\`, \`90d\`, \`180d\`, \`all\` for rolling time windows, \`campaign:<campaign_id>\` to scope to a specific sent campaign (use \`list_campaigns\` to find IDs), \`marketing:7d\` / \`transactional:30d\` to scope by email type (marketing includes marketing-policy campaign, automation, and Send API traffic; policy scopes require a send-time policy snapshot, so ambiguous older events remain unscoped; email-type values work with is/is_not and the emailBounced subtype operators, e.g. emailSent is_not \`marketing:7d\` = no captured marketing email in the last 7 days), or \`count:timeRange\` like \`10:30d\` / \`10:all\` with at_least/less_than_count operators (e.g. emailClicked at_least \`10:all\` = clicked 10 or more times ever). ${pollRespondentFilterHint}`,
    },
  },
  required: ["field", "operator", "value"],
  additionalProperties: false,
} as const;

export const segmentFilterGroupSchema = {
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

export function normalizeSegmentFilters(filters: unknown): unknown {
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

export function normalizeSegmentRoot(root: unknown): unknown {
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

export function hasSegmentAttributeName(value: string): boolean {
  const colonIndex = value.indexOf(":");
  return colonIndex !== -1 && value.substring(0, colonIndex).trim().length > 0;
}

export function hasSegmentAttributeValue(value: string): boolean {
  const colonIndex = value.indexOf(":");
  return colonIndex !== -1 && value.substring(colonIndex + 1).trim().length > 0;
}

export function isSegmentTimeRange(value: string): boolean {
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

const segmentEngagementFields = new Set([
  "emailSent",
  "emailDelivered",
  "emailOpened",
  "emailClicked",
  "emailBounced",
  "emailComplained",
]);

export function getSegmentEngagementValueValidationError(
  operator: string,
  rawValue: string
): string | null {
  const value = rawValue.trim();
  const isCountOperator =
    operator === "at_least" || operator === "less_than_count";

  if (value.startsWith("campaign:")) {
    if (isCountOperator) {
      return "Campaign-specific engagement values cannot be combined with count operators.";
    }
    return value.slice("campaign:".length).trim()
      ? null
      : 'Campaign-specific engagement filters must use "campaign:<campaignId>".';
  }

  if (value.startsWith("marketing:") || value.startsWith("transactional:")) {
    if (isCountOperator) {
      return "Email-type engagement values cannot be combined with count operators.";
    }
    const colonIndex = value.indexOf(":");
    return isSegmentTimeRange(value.slice(colonIndex + 1).trim())
      ? null
      : 'Email-type engagement filters must use "marketing:<timeRange>" or "transactional:<timeRange>", like "marketing:7d".';
  }

  if (isCountOperator) {
    if (isSegmentTimeRange(value)) {
      return null;
    }
    const colonIndex = value.indexOf(":");
    const thresholdValue = value.slice(0, colonIndex).trim();
    const threshold = Number.parseInt(thresholdValue, 10);
    const timeRange = value.slice(colonIndex + 1).trim();
    return colonIndex > 0 &&
      /^\d+$/.test(thresholdValue) &&
      Number.isInteger(threshold) &&
      threshold > 0 &&
      isSegmentTimeRange(timeRange)
      ? null
      : 'Engagement count filters must use "count:timeRange", like "10:30d" or "10:all".';
  }

  return isSegmentTimeRange(value)
    ? null
    : 'Engagement filters must use a time range like "30d" or "all", "campaign:<campaignId>", or an email-type scope like "marketing:7d" or "transactional:7d".';
}

export function getSegmentEventValueValidationError(
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

export function splitSegmentStripeValue(value: string): {
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

export function normalizeSegmentStripeSubfilter(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, "_");
}

export function isSegmentStripeCancelFlag(subfilter: string): boolean {
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

export function isSegmentStripeDateSubfilter(
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

export function isSegmentStripeDateOperator(operator: string): boolean {
  return ["is", "is_not", "gte", "lte", "gt", "lt"].includes(operator);
}

export function getSegmentStripeValueValidationError(
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

export const COMMERCE_PRODUCT_PROVIDERS = new Set([
  "shopify",
  "woocommerce",
  "api",
]);

export function getSegmentCommerceProductValueValidationError(
  operator: string,
  value: string
): string | null {
  // Format: [provider:]productId[:count] - product ids are provider-scoped
  let remainder = value.trim();
  const providerColonIndex = remainder.indexOf(":");
  if (
    providerColonIndex !== -1 &&
    COMMERCE_PRODUCT_PROVIDERS.has(
      remainder.substring(0, providerColonIndex).trim()
    )
  ) {
    remainder = remainder.substring(providerColonIndex + 1).trim();
  }

  if (!remainder) {
    return 'Purchased Product filters must include a product ID, like "shopify:42".';
  }

  if (operator !== "at_least" && operator !== "less_than_count") {
    return null;
  }

  const colonIndex = remainder.lastIndexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const productId = remainder.substring(0, colonIndex).trim();
  const threshold = Number.parseInt(
    remainder.substring(colonIndex + 1).trim(),
    10
  );

  return productId && Number.isInteger(threshold) && threshold >= 1
    ? null
    : 'Purchased Product threshold filters must use "provider:productId:count" with a count of at least 1.';
}

/**
 * Collections use the same "[provider:]key[:count]" shape as products, so the
 * only difference is the wording of the error.
 */
export function getSegmentCommerceCollectionValueValidationError(
  operator: string,
  value: string
): string | null {
  let remainder = value.trim();
  const providerColonIndex = remainder.indexOf(":");
  if (
    providerColonIndex !== -1 &&
    COMMERCE_PRODUCT_PROVIDERS.has(
      remainder.substring(0, providerColonIndex).trim()
    )
  ) {
    remainder = remainder.substring(providerColonIndex + 1).trim();
  }

  if (!remainder) {
    return 'Purchased Collection filters must include a collection, like "shopify:summer-sale".';
  }

  if (operator !== "at_least" && operator !== "less_than_count") {
    return null;
  }

  const colonIndex = remainder.lastIndexOf(":");
  if (colonIndex === -1) {
    return null;
  }

  const collectionKey = remainder.substring(0, colonIndex).trim();
  const threshold = Number.parseInt(
    remainder.substring(colonIndex + 1).trim(),
    10
  );

  return collectionKey && Number.isInteger(threshold) && threshold >= 1
    ? null
    : 'Purchased Collection threshold filters must use "provider:collection:count" with a count of at least 1.';
}

export function getSegmentPollResponseValueValidationError(
  value: string
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return `Poll response filters must use valid JSON. ${pollRespondentFilterHint}`;
  }

  if (
    !isRecord(parsed) ||
    parsed["v"] !== 1 ||
    typeof parsed["campaignId"] !== "string" ||
    !parsed["campaignId"].trim() ||
    typeof parsed["blockId"] !== "string" ||
    !parsed["blockId"].trim() ||
    !isRecord(parsed["match"])
  ) {
    return `Poll response filter context is invalid. ${pollRespondentFilterHint}`;
  }

  const match = parsed["match"];
  if (
    match["kind"] === "answer" &&
    typeof match["value"] === "string" &&
    match["value"].length > 0
  ) {
    return null;
  }

  if (
    match["kind"] === "npsBucket" &&
    (match["bucket"] === "promoters" ||
      match["bucket"] === "passives" ||
      match["bucket"] === "detractors")
  ) {
    return null;
  }

  return `Poll response filter match is invalid. ${pollRespondentFilterHint}`;
}

export function getSegmentFilterValidationError(
  filter: unknown
): string | null {
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

  if (field === "attribute") {
    // Attribute filters carry the attribute name inside the value, so even
    // is_empty/is_not_empty need one (`attributeName:`).
    if (typeof value !== "string") {
      return 'Attribute filters must include a value: "attributeName:value", or "attributeName:" for empty checks.';
    }

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

  if (segmentEngagementFields.has(field) && typeof value === "string") {
    const engagementValueError = getSegmentEngagementValueValidationError(
      operator,
      value
    );
    if (engagementValueError) {
      return engagementValueError;
    }
  }

  if (field === "pollResponse" && typeof value === "string") {
    const pollResponseValueError =
      getSegmentPollResponseValueValidationError(value);
    if (pollResponseValueError) {
      return pollResponseValueError;
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

  if (field === "commerceProduct" && typeof value === "string") {
    const commerceValueError = getSegmentCommerceProductValueValidationError(
      operator,
      value
    );
    if (commerceValueError) {
      return commerceValueError;
    }
  }

  if (field === "commerceCollection" && typeof value === "string") {
    const collectionValueError =
      getSegmentCommerceCollectionValueValidationError(operator, value);
    if (collectionValueError) {
      return collectionValueError;
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

export function collectSegmentFilterValidationErrors(input: unknown): string[] {
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
