import { apiRequest } from "../runtime.js";

import {
  isRecord,
  optionalString,
  requiredString,
} from "./common-primitives.js";
import {
  ADD_SUBSCRIBERS_TO_LIST_EMAIL_LIMIT,
  SEQUENCE_ENROLLMENT_TARGET_LIMIT,
  emailEventTypes,
  OUTBOUND_WEBHOOK_EVENT_TYPES,
  SUBSCRIBER_ATTRIBUTE_FILTER_OPERATORS,
} from "./descriptions.js";

export interface SubscriberSearchResult {
  success: boolean;
  subscribers: unknown[];
  pagination?: {
    page: number;
    limit: number;
    total: number | null;
    totalPages: number | null;
    nextCursor?: string | null;
    hasMore?: boolean;
  };
}

export interface AggregatedSubscriberSearchResult {
  success: true;
  subscribers: unknown[];
  pagination: {
    page: number;
    limit: number;
    offset: number;
    /**
     * Null when the server skipped the count query, which it does for every
     * attribute-filtered search, and the walk stopped before the last match.
     */
    total: number | null;
    totalPages: number | null;
    fetchedPages: number;
    hasMore: boolean;
    nextOffset: number | null;
    /**
     * Keyset token for the next chunk. Cheaper than `nextOffset` on a large
     * audience because the server does not re-scan the rows already walked.
     */
    nextCursor: string | null;
  };
  returned: number;
  truncated: boolean;
}

/**
 * The list endpoint accepts up to 1000 rows per request. Pulling a 9k-subscriber
 * audience 100 rows at a time took ~90 sequential round trips and blew past the
 * MCP session timeout, so full pulls page as coarsely as the server allows.
 */
const SUBSCRIBER_SEARCH_MAX_PAGE_SIZE = 1_000;

/**
 * Backstop against an unbounded loop if a server ever keeps reporting more
 * pages. At the max page size this still covers a million subscribers.
 */
const SUBSCRIBER_SEARCH_MAX_REQUESTS = 1_000;
export const SUBSCRIBER_SEARCH_MAX_OFFSET =
  SUBSCRIBER_SEARCH_MAX_PAGE_SIZE * SUBSCRIBER_SEARCH_MAX_REQUESTS - 1;

export interface DetailedSubscriberResult {
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

export function normalizeSubscriberTag(tag: string): string {
  return tag.trim().toLowerCase().replace(/\s+/g, "-");
}

/**
 * REST names this map `customAttributes`; MCP historically used `attributes`.
 * Accept either so a published cURL example can be translated without a
 * rejected-field dead end, but not both in the same call. The source is kept
 * because update_subscriber intentionally gives the legacy spelling merge
 * semantics and the REST spelling replacement semantics.
 */
export function resolveSubscriberCustomAttributes(
  toolName: string,
  args: Record<string, unknown>
):
  | {
      value: Record<string, unknown>;
      source: "attributes" | "customAttributes";
    }
  | undefined {
  const fromAttributes = args.attributes;
  const fromCustomAttributes = args.customAttributes;
  const attributesProvided = fromAttributes !== undefined;
  const customAttributesProvided = fromCustomAttributes !== undefined;

  if (attributesProvided && customAttributesProvided) {
    throw new Error(
      `Provide either \`attributes\` or \`customAttributes\` when calling \`${toolName}\`, not both. They are the same field; the REST API names it customAttributes.`
    );
  }

  const value = attributesProvided ? fromAttributes : fromCustomAttributes;
  if (value === undefined) {
    return undefined;
  }
  if (!isRecord(value)) {
    throw new Error(
      `\`attributes\` (REST: customAttributes) must be an object when calling \`${toolName}\`.`
    );
  }
  return {
    value,
    source: attributesProvided ? "attributes" : "customAttributes",
  };
}

/**
 * The list endpoint takes the attribute filter as a single `name:value` string.
 * Agents consistently reach for separate name and value arguments, so accept
 * both shapes and normalize here.
 */
export function buildSubscriberAttributeFilter(
  toolName: string,
  args: Record<string, unknown>
): { attribute?: string; attributeOperator?: string } {
  const rawAttribute = optionalString(args, "attribute");
  const rawValue = optionalString(args, "attributeValue");
  const operator = optionalAllowedString(
    toolName,
    args,
    "attributeOperator",
    SUBSCRIBER_ATTRIBUTE_FILTER_OPERATORS
  );

  if (!rawAttribute) {
    if (rawValue !== undefined || operator !== undefined) {
      throw new Error(
        `\`attributeValue\` and \`attributeOperator\` require \`attribute\` when calling \`${toolName}\`.`
      );
    }
    return {};
  }

  const resolvedOperator = operator ?? "is";
  let attribute: string;

  if (rawValue !== undefined) {
    attribute = `${rawAttribute}:${rawValue}`;
  } else if (rawAttribute.includes(":")) {
    // Already in the wire format, e.g. `attribute: "plan:pro"`.
    attribute = rawAttribute;
  } else if (resolvedOperator === "is_not_empty") {
    // `is_not_empty` ignores the value, but the wire format still needs the
    // separator so the attribute name parses out.
    attribute = `${rawAttribute}:`;
  } else {
    throw new Error(
      `Provide \`attributeValue\` (or use \`attribute: "name:value"\`) when \`attributeOperator\` is \`${resolvedOperator}\` in \`${toolName}\`. Only \`is_not_empty\` may omit a value.`
    );
  }

  return { attribute, attributeOperator: resolvedOperator };
}

export function buildSubscriberSearchParams(input: {
  query?: unknown;
  tags?: unknown;
  list?: unknown;
  listId?: unknown;
  listName?: unknown;
  segmentId?: unknown;
  status?: unknown;
  unsubscribedAfter?: unknown;
  unsubscribedBefore?: unknown;
  attribute?: string | undefined;
  attributeOperator?: string | undefined;
  page: number;
  pageSize: number;
  cursor?: string | undefined;
  includeTotal?: boolean | undefined;
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

  if (typeof input.list === "string" && input.list.trim() !== "") {
    params.set("list", input.list.trim());
  }

  if (typeof input.listId === "string" && input.listId.trim() !== "") {
    params.set("listId", input.listId.trim());
  }

  if (typeof input.listName === "string" && input.listName.trim() !== "") {
    params.set("listName", input.listName.trim());
  }

  if (typeof input.segmentId === "string" && input.segmentId.trim() !== "") {
    params.set("segmentId", input.segmentId);
  }

  if (typeof input.status === "string" && input.status.trim() !== "") {
    params.set("status", input.status.trim());
  }

  if (
    typeof input.unsubscribedAfter === "string" &&
    input.unsubscribedAfter.trim() !== ""
  ) {
    params.set("unsubscribedAfter", input.unsubscribedAfter.trim());
  }

  if (
    typeof input.unsubscribedBefore === "string" &&
    input.unsubscribedBefore.trim() !== ""
  ) {
    params.set("unsubscribedBefore", input.unsubscribedBefore.trim());
  }

  if (input.attribute) {
    params.set("attribute", input.attribute);
    if (input.attributeOperator) {
      params.set("attributeOperator", input.attributeOperator);
    }
  }

  // `cursor` and `page` are mutually exclusive server-side.
  if (input.cursor) {
    params.set("cursor", input.cursor);
  } else {
    params.set("page", String(input.page));
  }

  params.set("limit", String(input.pageSize));

  if (input.includeTotal === false) {
    params.set("includeTotal", "false");
  }

  return params;
}

export async function fetchAllSubscribers(
  args: Record<string, unknown>,
  companyId: string | undefined
): Promise<AggregatedSubscriberSearchResult> {
  const toolName = "search_subscribers";
  const requestedLimit = optionalPositiveInteger(toolName, args, "limit");
  const startCursor = optionalString(args, "cursor");
  const offset = startCursor
    ? requireNoOffsetWithCursor(toolName, args)
    : getSubscriberSearchOffset(toolName, args, requestedLimit);
  // The window the caller asked for is `[offset, offset + limit)`, so the walk
  // has to reach `offset + limit` matches before it can slice.
  const windowEnd =
    requestedLimit === undefined ? undefined : offset + requestedLimit;
  const pageSize = Math.min(
    SUBSCRIBER_SEARCH_MAX_PAGE_SIZE,
    Math.max(1, windowEnd ?? SUBSCRIBER_SEARCH_MAX_PAGE_SIZE)
  );
  const attributeFilter = buildSubscriberAttributeFilter(toolName, args);
  const subscribers: unknown[] = [];

  let page = 1;
  let cursor: string | undefined = startCursor;
  let pendingCursor: string | undefined;
  let total: number | null = null;
  let fetchedPages = 0;
  let exhausted = false;
  let hitRequestBackstop = false;

  while (true) {
    const remainingWindow =
      windowEnd === undefined ? undefined : windowEnd - subscribers.length;
    const requestPageSize = cursor
      ? Math.min(pageSize, Math.max(1, remainingWindow ?? pageSize))
      : pageSize;
    const searchParams = buildSubscriberSearchParams({
      query: args.query,
      tags: args.tags,
      list: args.list,
      listId: args.listId,
      listName: args.listName,
      segmentId: args.segmentId,
      status: args.status,
      unsubscribedAfter: args.unsubscribedAfter,
      unsubscribedBefore: args.unsubscribedBefore,
      attribute: attributeFilter.attribute,
      attributeOperator: attributeFilter.attributeOperator,
      page,
      pageSize: requestPageSize,
      cursor,
    });

    const response = await apiRequest<SubscriberSearchResult>(
      "GET",
      `/api/v1/subscribers?${searchParams.toString()}`,
      undefined,
      companyId
    );

    // Only the first request carries a count, and attribute-filtered or cursor
    // responses report `total: null` because they skip the count query.
    if (fetchedPages === 0) {
      total = response.pagination?.total ?? null;
    }

    fetchedPages += 1;
    subscribers.push(...(response.subscribers ?? []));

    const pageCount = (response.subscribers ?? []).length;
    const nextCursor = response.pagination?.nextCursor ?? undefined;
    pendingCursor = nextCursor;
    const reachedLimit =
      windowEnd !== undefined && subscribers.length >= windowEnd;

    let reachedEnd: boolean;
    if (nextCursor) {
      reachedEnd = false;
    } else if (response.pagination?.hasMore !== undefined) {
      reachedEnd = !response.pagination.hasMore;
    } else if (
      response.pagination?.totalPages !== undefined &&
      response.pagination.totalPages !== null
    ) {
      // Older servers without cursor support still page by number.
      reachedEnd = page >= response.pagination.totalPages;
    } else {
      reachedEnd = pageCount < requestPageSize;
    }

    if (reachedEnd || (pageCount === 0 && !nextCursor)) {
      exhausted = true;
      break;
    }

    if (reachedLimit) {
      break;
    }
    if (fetchedPages >= SUBSCRIBER_SEARCH_MAX_REQUESTS) {
      hitRequestBackstop = true;
      break;
    }

    if (nextCursor) {
      cursor = nextCursor;
    } else if (cursor) {
      // Mid-cursor with no continuation token. `page` is ignored while a cursor
      // is set, so incrementing it would re-request the same cursor until the
      // request backstop trips, duplicating every row it collected.
      break;
    } else {
      page += 1;
    }
  }

  // Once the walk ran out of matches the fetched rows are the whole result set,
  // so a count-free response can still report an exact total.
  if (
    hitRequestBackstop &&
    (subscribers.length < offset ||
      (subscribers.length === offset && pendingCursor === undefined))
  ) {
    throw new Error(
      `Could not reach offset ${offset} within ${SUBSCRIBER_SEARCH_MAX_REQUESTS} requests because too few matches were returned per page. Start without \`offset\` and follow \`pagination.nextCursor\` instead.`
    );
  }
  if (total === null && exhausted && !startCursor) {
    total = subscribers.length;
  }

  const returnedSubscribers = subscribers.slice(offset, windowEnd);
  const hasMore = exhausted
    ? false
    : total !== null
      ? offset + returnedSubscribers.length < total
      : !exhausted || subscribers.length > offset + returnedSubscribers.length;
  const cursorIsAtWindowEnd =
    pendingCursor !== undefined &&
    subscribers.length === offset + returnedSubscribers.length;
  const nextOffset = offset + returnedSubscribers.length;

  return {
    success: true,
    subscribers: returnedSubscribers,
    pagination: {
      page:
        requestedLimit === undefined
          ? 1
          : Math.floor(offset / requestedLimit) + 1,
      limit: requestedLimit ?? pageSize,
      offset,
      total,
      totalPages:
        total === null ? null : Math.ceil(total / (requestedLimit ?? pageSize)),
      fetchedPages,
      hasMore,
      // A cursor-resumed window has no global offset, so only advertise an
      // offset when this walk began at the start of the result set.
      nextOffset:
        hasMore && !startCursor && nextOffset <= SUBSCRIBER_SEARCH_MAX_OFFSET
          ? nextOffset
          : null,
      nextCursor:
        hasMore && cursorIsAtWindowEnd ? (pendingCursor ?? null) : null,
    },
    returned: returnedSubscribers.length,
    truncated: hasMore,
  };
}

function requireNoOffsetWithCursor(
  toolName: string,
  args: Record<string, unknown>
): number {
  if (args.offset !== undefined || args.page !== undefined) {
    throw new Error(
      `\`cursor\` cannot be combined with \`offset\` or \`page\` when calling \`${toolName}\`. Keep following \`pagination.nextCursor\` instead.`
    );
  }

  return 0;
}

function getSubscriberSearchOffset(
  toolName: string,
  args: Record<string, unknown>,
  requestedLimit: number | undefined
): number {
  const offset = optionalNonNegativeInteger(toolName, args, "offset");
  const pageNumber = optionalPositiveInteger(toolName, args, "page");

  if (offset !== undefined && pageNumber !== undefined) {
    throw new Error(
      `Provide either \`offset\` or \`page\` when calling \`${toolName}\`, not both.`
    );
  }

  if (pageNumber !== undefined) {
    if (requestedLimit === undefined) {
      throw new Error(
        `\`page\` requires \`limit\` when calling \`${toolName}\` so the page size is defined. Omit both to fetch every match in one call.`
      );
    }
    return requireReachableSubscriberSearchOffset(
      toolName,
      (pageNumber - 1) * requestedLimit
    );
  }

  return requireReachableSubscriberSearchOffset(toolName, offset ?? 0);
}

function requireReachableSubscriberSearchOffset(
  toolName: string,
  offset: number
): number {
  if (offset > SUBSCRIBER_SEARCH_MAX_OFFSET) {
    throw new Error(
      `\`offset\` must be ${SUBSCRIBER_SEARCH_MAX_OFFSET} or less when calling \`${toolName}\`. Use \`cursor\` to continue beyond that point.`
    );
  }
  return offset;
}

function optionalNonNegativeInteger(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): number | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `\`${key}\` must be a non-negative integer when calling \`${toolName}\`.`
    );
  }

  return value;
}

function optionalPositiveInteger(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): number | undefined {
  const value = optionalNonNegativeInteger(toolName, args, key);
  if (value !== undefined && value < 1) {
    throw new Error(
      `\`${key}\` must be 1 or greater when calling \`${toolName}\`.`
    );
  }

  return value;
}

export function getSubscriberIdentifier(args: Record<string, unknown>): {
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

export function requireSubscriberIdentifier(
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

export function getSubscriberDetailPath(
  identifier: {
    email?: string;
    externalId?: string;
  },
  options?: { includeMachineEngagement?: boolean | undefined }
): string {
  const params = new URLSearchParams();
  if (options?.includeMachineEngagement) {
    params.set("includeMachineEngagement", "true");
  }
  const query = params.toString();
  const suffix = query ? `?${query}` : "";

  if (identifier.email) {
    return `/api/v1/subscribers/${encodeURIComponent(identifier.email)}${suffix}`;
  }

  params.set("externalId", String(identifier.externalId));
  return `/api/v1/subscribers/external?${params.toString()}`;
}

export function getSubscriberNotesPath(identifier: {
  email?: string;
  externalId?: string;
}): string {
  if (identifier.email) {
    return `/api/v1/subscribers/${encodeURIComponent(identifier.email)}/notes`;
  }

  const params = new URLSearchParams();
  params.set("externalId", String(identifier.externalId));
  return `/api/v1/subscribers/external/notes?${params.toString()}`;
}

export async function fetchDetailedSubscriberByIdentifier(
  identifier: { email?: string; externalId?: string },
  companyId: string | undefined,
  options?: { includeMachineEngagement?: boolean | undefined }
): Promise<DetailedSubscriberResult> {
  return apiRequest<DetailedSubscriberResult>(
    "GET",
    getSubscriberDetailPath(identifier, options),
    undefined,
    companyId
  );
}

export function optionalAllowedString(
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

export function requiredAllowedString(
  toolName: string,
  record: Record<string, unknown>,
  key: string,
  allowedValues: readonly string[]
): string {
  const value = requiredString(toolName, record, key);
  if (!allowedValues.includes(value)) {
    throw new Error(
      `\`${key}\` must be one of ${allowedValues.join(", ")} when calling \`${toolName}\`.`
    );
  }

  return value;
}

export function optionalIntegerInRange(
  toolName: string,
  record: Record<string, unknown>,
  key: string,
  min: number,
  max: number
): number | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new Error(
      `\`${key}\` must be an integer between ${min} and ${max} when calling \`${toolName}\`.`
    );
  }

  return value;
}

export function optionalEmailEventTypes(
  toolName: string,
  args: Record<string, unknown>
): string[] {
  const eventTypes: string[] = [];
  const eventType = optionalAllowedString(
    toolName,
    args,
    "eventType",
    emailEventTypes
  );

  if (eventType) {
    eventTypes.push(eventType);
  }

  if (args.eventTypes !== undefined) {
    if (!Array.isArray(args.eventTypes)) {
      throw new Error(
        `\`eventTypes\` must be an array when calling \`${toolName}\`.`
      );
    }

    args.eventTypes.forEach((value, index) => {
      if (typeof value !== "string") {
        throw new Error(
          `\`eventTypes\` item ${index + 1} must be a string when calling \`${toolName}\`.`
        );
      }

      const trimmed = value.trim();
      if (!(emailEventTypes as readonly string[]).includes(trimmed)) {
        throw new Error(
          `\`eventTypes\` item ${index + 1} must be one of ${emailEventTypes.join(", ")} when calling \`${toolName}\`.`
        );
      }

      eventTypes.push(trimmed);
    });
  }

  return [...new Set(eventTypes)];
}

export function buildEmailEventListParams(
  toolName: string,
  args: Record<string, unknown>
): URLSearchParams {
  const params = new URLSearchParams();
  const eventTypes = optionalEmailEventTypes(toolName, args);
  if (eventTypes.length > 0) {
    params.set("eventTypes", eventTypes.join(","));
  }

  const period = optionalAllowedString(toolName, args, "period", [
    "1h",
    "24h",
    "7d",
    "30d",
    "90d",
  ]);
  if (period) {
    params.set("period", period);
  }

  const start = optionalString(args, "start");
  if (start) {
    params.set("start", start);
  }

  const end = optionalString(args, "end");
  if (end) {
    params.set("end", end);
  }

  const page = optionalIntegerInRange(toolName, args, "page", 1, 1_000_000);
  if (page !== undefined) {
    params.set("page", String(page));
  }

  const limit = optionalIntegerInRange(toolName, args, "limit", 1, 500);
  if (limit !== undefined) {
    params.set("limit", String(limit));
  }

  if (args.includeMachineEngagement === true) {
    params.set("includeMachineEngagement", "true");
  }

  return params;
}

export function optionalWebhookEvents(
  toolName: string,
  args: Record<string, unknown>
): string[] | undefined {
  if (args.events === undefined) {
    return undefined;
  }

  if (!Array.isArray(args.events)) {
    throw new Error(
      `\`events\` must be an array when calling \`${toolName}\`.`
    );
  }

  const events = args.events.map((event, index) => {
    if (
      typeof event !== "string" ||
      !(OUTBOUND_WEBHOOK_EVENT_TYPES as readonly string[]).includes(event)
    ) {
      throw new Error(
        `\`events\` item ${index + 1} must be one of ${OUTBOUND_WEBHOOK_EVENT_TYPES.join(", ")} when calling \`${toolName}\`.`
      );
    }

    return event;
  });

  if (events.length === 0) {
    throw new Error(
      `\`events\` must include at least one event type when calling \`${toolName}\`.`
    );
  }

  return events;
}

export function requireEmailArray(
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

  if (emails.length > ADD_SUBSCRIBERS_TO_LIST_EMAIL_LIMIT) {
    throw new Error(
      `\`emails\` must include no more than ${ADD_SUBSCRIBERS_TO_LIST_EMAIL_LIMIT} email addresses when calling \`${toolName}\`. Split larger batches into multiple calls.`
    );
  }

  return emails;
}

export function optionalNonEmptyStringArray(
  toolName: string,
  args: Record<string, unknown>,
  key: string,
  itemLabel: string
): string[] | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `\`${key}\` must be an array when calling \`${toolName}\`.`
    );
  }

  const normalizedValues: string[] = [];
  value.forEach((item, index) => {
    if (typeof item !== "string") {
      throw new Error(
        `\`${key}\` item ${index + 1} must be a string when calling \`${toolName}\`.`
      );
    }

    const trimmed = item.trim();
    if (trimmed.length > 0) {
      normalizedValues.push(trimmed);
    }
  });

  if (normalizedValues.length === 0) {
    throw new Error(
      `\`${key}\` must include at least one ${itemLabel} when calling \`${toolName}\`.`
    );
  }

  return normalizedValues;
}

export function buildSequenceEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const toolName = "enroll_subscribers_in_sequence";
  const emails = optionalNonEmptyStringArray(
    toolName,
    args,
    "emails",
    "email address"
  );
  const subscriberIds = optionalNonEmptyStringArray(
    toolName,
    args,
    "subscriberIds",
    "subscriber ID"
  );
  const targetCount = (emails?.length ?? 0) + (subscriberIds?.length ?? 0);

  if (targetCount === 0) {
    throw new Error(
      "Provide `emails` or `subscriberIds` when calling `enroll_subscribers_in_sequence`."
    );
  }

  if (targetCount > SEQUENCE_ENROLLMENT_TARGET_LIMIT) {
    throw new Error(
      `\`emails\` and \`subscriberIds\` must include no more than ${SEQUENCE_ENROLLMENT_TARGET_LIMIT} total targets when calling \`enroll_subscribers_in_sequence\`. Split larger batches into multiple calls.`
    );
  }

  const targetNodeId = optionalString(args, "targetNodeId");

  return {
    ...(emails !== undefined && { emails }),
    ...(subscriberIds !== undefined && { subscriberIds }),
    ...(targetNodeId !== undefined && { targetNodeId }),
  };
}

/**
 * Content types allowed for product delivery files, by file extension.
 * Mirrors the server-side allowlist (no HTML/SVG/executables).
 */
