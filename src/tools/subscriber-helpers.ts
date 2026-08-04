import { apiRequest } from "../runtime.js";

import { optionalString, requiredString } from "./common-primitives.js";
import {
  ADD_SUBSCRIBERS_TO_LIST_EMAIL_LIMIT,
  SEQUENCE_ENROLLMENT_TARGET_LIMIT,
  emailEventTypes,
  OUTBOUND_WEBHOOK_EVENT_TYPES,
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
    total: number;
    totalPages: number;
    fetchedPages: number;
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

export function buildSubscriberSearchParams(input: {
  query?: unknown;
  tags?: unknown;
  list?: unknown;
  listId?: unknown;
  listName?: unknown;
  segmentId?: unknown;
  status?: unknown;
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
  const requestedLimit =
    typeof args.limit === "number" && Number.isFinite(args.limit)
      ? Math.max(1, Math.trunc(args.limit))
      : undefined;
  const pageSize = Math.min(
    SUBSCRIBER_SEARCH_MAX_PAGE_SIZE,
    Math.max(1, requestedLimit ?? SUBSCRIBER_SEARCH_MAX_PAGE_SIZE)
  );
  const subscribers: unknown[] = [];

  let page = 1;
  let cursor: string | undefined;
  let total = 0;
  let totalPages = 0;
  let fetchedPages = 0;

  while (true) {
    const searchParams = buildSubscriberSearchParams({
      query: args.query,
      tags: args.tags,
      list: args.list,
      listId: args.listId,
      listName: args.listName,
      segmentId: args.segmentId,
      status: args.status,
      page,
      pageSize,
      cursor,
    });

    const response = await apiRequest<SubscriberSearchResult>(
      "GET",
      `/api/v1/subscribers?${searchParams.toString()}`,
      undefined,
      companyId
    );

    // Only the first request carries a count; cursor responses report
    // `total: null` because they skip the count query entirely.
    if (fetchedPages === 0) {
      total = response.pagination?.total ?? response.subscribers.length;
      totalPages = response.pagination?.totalPages ?? 1;
    }

    fetchedPages += 1;
    subscribers.push(...(response.subscribers ?? []));

    const pageCount = (response.subscribers ?? []).length;
    const nextCursor = response.pagination?.nextCursor ?? undefined;
    const reachedLimit =
      requestedLimit !== undefined && subscribers.length >= requestedLimit;

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
      reachedEnd = pageCount < pageSize;
    }

    if (
      reachedLimit ||
      reachedEnd ||
      pageCount === 0 ||
      fetchedPages >= SUBSCRIBER_SEARCH_MAX_REQUESTS
    ) {
      break;
    }

    if (nextCursor) {
      cursor = nextCursor;
    } else {
      page += 1;
    }
  }

  if (total === 0 && subscribers.length > 0) {
    total = subscribers.length;
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
