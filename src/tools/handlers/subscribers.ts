import { apiRequest } from "../../runtime.js";
import {
  isRecord,
  normalizeSubscriberTag,
  fetchAllSubscribers,
  getSubscriberIdentifier,
  requireSubscriberIdentifier,
  getSubscriberDetailPath,
  getSubscriberNotesPath,
  fetchDetailedSubscriberByIdentifier,
  optionalAllowedString,
  requiredString,
} from "../internal.js";

function requireStringArray(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): string[] | undefined {
  const value = args[key];
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    throw new Error(
      `\`${key}\` must be an array of strings when calling \`${toolName}\`.`
    );
  }

  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (normalized.length !== value.length) {
    throw new Error(
      `\`${key}\` must contain only non-empty strings when calling \`${toolName}\`.`
    );
  }

  return normalized;
}

export function buildBulkSubscriberTagBody(
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const tags = requireStringArray(toolName, args, "tags");
  if (tags === undefined || tags.length === 0) {
    throw new Error(
      `\`tags\` must contain at least one tag when calling \`${toolName}\`.`
    );
  }

  const emails = requireStringArray(toolName, args, "emails");
  const externalIds = requireStringArray(toolName, args, "externalIds");
  const subscriberIds = requireStringArray(toolName, args, "subscriberIds");

  if (
    (emails?.length ?? 0) +
      (externalIds?.length ?? 0) +
      (subscriberIds?.length ?? 0) ===
    0
  ) {
    throw new Error(
      `Provide \`emails\`, \`externalIds\`, or \`subscriberIds\` when calling \`${toolName}\`.`
    );
  }

  return {
    tags,
    ...(emails?.length ? { emails } : {}),
    ...(externalIds?.length ? { externalIds } : {}),
    ...(subscriberIds?.length ? { subscriberIds } : {}),
    ...(toolName === "bulk_add_subscriber_tags" &&
    typeof args.triggerAutomations === "boolean"
      ? { triggerAutomations: args.triggerAutomations }
      : {}),
  };
}

export async function handleSubscriberTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "add_subscriber": {
      const companyId = args.companyId as string | undefined;
      const phone =
        typeof args.phone === "string" && args.phone.trim() !== ""
          ? args.phone.trim()
          : undefined;
      // A phone alone is a valid identity: it creates or matches a
      // phone-only (SMS) contact.
      const identifier = phone
        ? getSubscriberIdentifier(args)
        : requireSubscriberIdentifier("add_subscriber", args);
      const status = optionalAllowedString("add_subscriber", args, "status", [
        "active",
        "unsubscribed",
        "bounced",
      ] as const);
      const optInMode = optionalAllowedString(
        "add_subscriber",
        args,
        "optInMode",
        ["default", "confirmed", "double_opt_in"] as const
      );
      result = await apiRequest(
        "POST",
        "/api/v1/subscribers",
        {
          ...identifier,
          ...(phone !== undefined && { phone }),
          ...(typeof args.smsConsent === "boolean" && {
            smsConsent: args.smsConsent,
          }),
          ...(args.firstName !== undefined && { firstName: args.firstName }),
          ...(args.lastName !== undefined && { lastName: args.lastName }),
          customAttributes: args.attributes,
          tags: args.tags,
          lists: args.listIds,
          ...(status !== undefined && { status }),
          ...(optInMode !== undefined && { optInMode }),
          ...(args.createdAt !== undefined && { createdAt: args.createdAt }),
        },
        companyId
      );

      if (
        status !== undefined &&
        isRecord(result) &&
        isRecord(result.subscriber) &&
        result.subscriber.skipped === true &&
        result.subscriber.status !== status
      ) {
        throw new Error(
          `Existing subscriber was not changed to status '${status}'. Use update_subscriber to change an existing contact's status.`
        );
      }
      break;
    }

    case "create_subscriber_import": {
      const companyId = args.companyId as string | undefined;
      if (!Array.isArray(args.subscribers) || args.subscribers.length === 0) {
        throw new Error(
          "`subscribers` must be a non-empty array when calling `create_subscriber_import`."
        );
      }
      if (args.subscribers.length > 5000) {
        throw new Error(
          "`create_subscriber_import` accepts at most 5000 subscriber records per call."
        );
      }
      for (let index = 0; index < args.subscribers.length; index += 1) {
        const subscriber = args.subscribers[index];
        const hasEmail =
          isRecord(subscriber) &&
          typeof subscriber.email === "string" &&
          subscriber.email.trim() !== "";
        const hasPhone =
          isRecord(subscriber) &&
          typeof subscriber.phone === "string" &&
          subscriber.phone.trim() !== "";
        if (!hasEmail && !hasPhone) {
          throw new Error(
            `Subscriber record ${index} must include an email or a phone number.`
          );
        }
      }

      const duplicateStrategy = optionalAllowedString(
        "create_subscriber_import",
        args,
        "duplicateStrategy",
        ["skip", "merge", "overwrite"] as const
      );
      const optInMode = optionalAllowedString(
        "create_subscriber_import",
        args,
        "optInMode",
        ["default", "confirmed", "double_opt_in"] as const
      );
      result = await apiRequest(
        "POST",
        "/api/v1/subscribers/imports",
        {
          subscribers: args.subscribers,
          ...(duplicateStrategy !== undefined && { duplicateStrategy }),
          ...(args.fileName !== undefined && { fileName: args.fileName }),
          ...(args.listIds !== undefined && { listIds: args.listIds }),
          ...(args.enrollInSequences !== undefined && {
            enrollInSequences: args.enrollInSequences,
          }),
          ...(args.defaultPhoneCountry !== undefined && {
            defaultPhoneCountry: args.defaultPhoneCountry,
          }),
          ...(args.smsConsent !== undefined && {
            smsConsent: args.smsConsent,
          }),
          ...(optInMode !== undefined && { optInMode }),
        },
        companyId
      );
      break;
    }

    case "get_subscriber_import": {
      const companyId = args.companyId as string | undefined;
      const importId = requiredString(
        "get_subscriber_import",
        args,
        "importId"
      );
      result = await apiRequest(
        "GET",
        `/api/v1/subscribers/imports/${encodeURIComponent(importId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "update_subscriber": {
      const companyId = args.companyId as string | undefined;
      const identifier = requireSubscriberIdentifier("update_subscriber", args);
      const status = optionalAllowedString(
        "update_subscriber",
        args,
        "status",
        ["active", "unsubscribed", "bounced"] as const
      );
      const needsCurrentProfile =
        isRecord(args.attributes) ||
        args.addTags !== undefined ||
        args.removeTags !== undefined;
      const detail = needsCurrentProfile
        ? await fetchDetailedSubscriberByIdentifier(identifier, companyId)
        : null;
      const currentTags = Array.isArray(detail?.subscriber.tags)
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
      if (args.firstName !== undefined) {
        body.firstName = args.firstName;
      }
      if (args.lastName !== undefined) {
        body.lastName = args.lastName;
      }
      if (status !== undefined) {
        body.status = status;
      }
      if (isRecord(args.attributes)) {
        body.customAttributes = {
          ...(isRecord(detail?.subscriber.customAttributes)
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
      const identifier = requireSubscriberIdentifier("remove_subscriber", args);
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
        companyId,
        {
          includeMachineEngagement: args.includeMachineEngagement === true,
        }
      );
      break;
    }

    case "list_subscriber_notes": {
      const companyId = args.companyId as string | undefined;
      const identifier = requireSubscriberIdentifier(
        "list_subscriber_notes",
        args
      );
      result = await apiRequest(
        "GET",
        getSubscriberNotesPath(identifier),
        undefined,
        companyId
      );
      break;
    }

    case "add_subscriber_note": {
      const companyId = args.companyId as string | undefined;
      const identifier = requireSubscriberIdentifier(
        "add_subscriber_note",
        args
      );
      const body = typeof args.body === "string" ? args.body.trim() : undefined;
      if (!body) {
        throw new Error(
          "`body` is required when calling `add_subscriber_note`."
        );
      }
      if (body.length > 5000) {
        throw new Error(
          "`body` must be 5000 characters or fewer when calling `add_subscriber_note`."
        );
      }
      result = await apiRequest(
        "POST",
        getSubscriberNotesPath(identifier),
        { body },
        companyId
      );
      break;
    }

    case "delete_subscriber_note": {
      const companyId = args.companyId as string | undefined;
      const noteId = typeof args.noteId === "string" ? args.noteId.trim() : "";
      if (!noteId) {
        throw new Error(
          "`noteId` is required when calling `delete_subscriber_note`."
        );
      }
      result = await apiRequest(
        "DELETE",
        `/api/v1/subscribers/notes/${encodeURIComponent(noteId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "trigger_subscriber_event": {
      const companyId = args.companyId as string | undefined;
      const identifier = requireSubscriberIdentifier(
        "trigger_subscriber_event",
        args
      );
      const event = requiredString("trigger_subscriber_event", args, "event");
      if (args.properties !== undefined && !isRecord(args.properties)) {
        throw new Error(
          "`properties` must be an object when calling `trigger_subscriber_event`."
        );
      }

      result = await apiRequest(
        "POST",
        "/api/v1/subscribers/events",
        {
          ...identifier,
          event,
          ...(args.properties !== undefined && { properties: args.properties }),
          ...(args.firstName !== undefined && { firstName: args.firstName }),
          ...(args.lastName !== undefined && { lastName: args.lastName }),
          ...(args.attributes !== undefined && {
            customAttributes: args.attributes,
          }),
          ...(args.occurredAt !== undefined && { occurredAt: args.occurredAt }),
          ...(args.eventId !== undefined && { eventId: args.eventId }),
        },
        companyId
      );
      break;
    }

    case "trigger_subscriber_events": {
      const companyId = args.companyId as string | undefined;
      const identifier = requireSubscriberIdentifier(
        "trigger_subscriber_events",
        args
      );
      if (!Array.isArray(args.events) || args.events.length === 0) {
        throw new Error(
          "`events` must be a non-empty array when calling `trigger_subscriber_events`."
        );
      }
      if (args.events.length > 500) {
        throw new Error(
          "`trigger_subscriber_events` accepts at most 500 events per call. Split a larger history import into several calls."
        );
      }
      for (let index = 0; index < args.events.length; index += 1) {
        const event = args.events[index];
        if (
          !isRecord(event) ||
          typeof event.name !== "string" ||
          event.name.trim() === ""
        ) {
          throw new Error(
            `Event ${index} must include a non-empty \`name\` string.`
          );
        }
      }

      result = await apiRequest(
        "POST",
        "/api/v1/subscribers/events/bulk",
        {
          ...identifier,
          events: args.events,
          ...(args.firstName !== undefined && { firstName: args.firstName }),
          ...(args.lastName !== undefined && { lastName: args.lastName }),
          ...(args.attributes !== undefined && {
            customAttributes: args.attributes,
          }),
        },
        companyId
      );
      break;
    }

    case "bulk_add_subscriber_tags":
    case "bulk_remove_subscriber_tags": {
      const companyId = args.companyId as string | undefined;
      const body = buildBulkSubscriberTagBody(name, args);
      result = await apiRequest(
        "POST",
        `/api/v1/subscribers/bulk/tags/${
          name === "bulk_add_subscriber_tags" ? "add" : "remove"
        }`,
        body,
        companyId
      );
      break;
    }

    case "search_subscribers": {
      const companyId = args.companyId as string | undefined;
      result = await fetchAllSubscribers(args, companyId);
      break;
    }

    // Products & Digital Delivery
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
