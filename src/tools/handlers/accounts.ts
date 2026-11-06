import { apiRequest } from "../../runtime.js";
import {
  optionalAllowedString,
  optionalString,
  requiredString,
} from "../internal.js";

const MEMBER_ROLES = ["owner", "admin", "member"] as const;
const RECIPIENT_RULES = ["owners", "admins", "all", "none"] as const;

function accountPath(externalId: string, suffix = ""): string {
  return `/api/v1/accounts/${encodeURIComponent(externalId)}${suffix}`;
}

const ORGANIZATION_IDS_PATH = "/api/v1/account-suggestions/organization-ids";

/** propertyKey plus optional source and nameKey, validated before the call. */
function organizationIdKey(
  name: string,
  args: Record<string, unknown>
): Record<string, string> {
  const key: Record<string, string> = {
    propertyKey: requiredString(name, args, "propertyKey"),
  };
  const source = args.source;
  if (source !== undefined) {
    if (source !== "event" && source !== "attribute") {
      throw new Error(`${name} source must be "event" or "attribute"`);
    }
    key.source = source;
  }
  if (typeof args.nameKey === "string" && args.nameKey.trim() !== "") {
    key.nameKey = args.nameKey.trim();
  }
  return key;
}

function optionalNumber(
  args: Record<string, unknown>,
  key: string
): number | undefined {
  const value = args[key];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function optionalRecord(
  args: Record<string, unknown>,
  key: string
): Record<string, unknown> | undefined {
  const value = args[key];
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** The schemas leave identity conditional, so require one field here. */
function memberIdentity(
  toolName: string,
  args: Record<string, unknown>,
  label = "the member"
) {
  const email = optionalString(args, "email");
  const externalId = optionalString(args, "subscriberExternalId");
  if (email === undefined && externalId === undefined) {
    throw new Error(
      `\`email\` or \`subscriberExternalId\` is required for ${label} when calling \`${toolName}\`.`
    );
  }
  return {
    ...(email !== undefined && { email }),
    ...(externalId !== undefined && { externalId }),
  };
}

export async function handleAccountTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;
  const companyId = args.companyId as string | undefined;

  switch (name) {
    case "list_accounts": {
      const params = new URLSearchParams();
      const search = optionalString(args, "search");
      if (search) params.set("search", search);
      const page = optionalNumber(args, "page");
      if (page !== undefined) params.set("page", String(page));
      const limit = optionalNumber(args, "limit");
      if (limit !== undefined) params.set("limit", String(limit));
      const sort = optionalString(args, "sort");
      if (sort) params.set("sort", sort);
      const order = optionalString(args, "order");
      if (order) params.set("order", order);
      const withoutEventRecipients = args["withoutEventRecipients"];
      if (
        withoutEventRecipients !== undefined &&
        typeof withoutEventRecipients !== "boolean"
      ) {
        throw new Error(
          "`withoutEventRecipients` must be a boolean when calling `list_accounts`."
        );
      }
      if (withoutEventRecipients) params.set("withoutEventRecipients", "true");
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/accounts${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_account_by_external_id": {
      const externalId = requiredString(name, args, "externalId");
      result = await apiRequest(
        "GET",
        accountPath(externalId),
        undefined,
        companyId
      );
      break;
    }

    case "upsert_account": {
      const externalId = requiredString(name, args, "externalId");
      const accountName = optionalString(args, "name");
      const domain = optionalString(args, "domain");
      const attributes = optionalRecord(args, "attributes");
      const members = Array.isArray(args.members)
        ? (args.members as unknown[]).map((entry, index) => {
            const member =
              entry !== null && typeof entry === "object"
                ? (entry as Record<string, unknown>)
                : {};
            return {
              ...memberIdentity(name, member, `members[${index}]`),
              ...(typeof member.role === "string" && { role: member.role }),
              ...(typeof member.firstName === "string" && {
                firstName: member.firstName,
              }),
              ...(typeof member.lastName === "string" && {
                lastName: member.lastName,
              }),
            };
          })
        : undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/accounts",
        {
          externalId,
          ...(accountName !== undefined && { name: accountName }),
          ...(domain !== undefined && { domain }),
          ...(attributes !== undefined && { attributes }),
          ...(args.replaceAttributes === true && { replaceAttributes: true }),
          ...(members !== undefined && { members }),
        },
        companyId
      );
      break;
    }

    case "delete_account": {
      const externalId = requiredString(name, args, "externalId");
      result = await apiRequest(
        "DELETE",
        accountPath(externalId),
        undefined,
        companyId
      );
      break;
    }

    case "list_account_members": {
      const externalId = requiredString(name, args, "externalId");
      const limit = optionalNumber(args, "limit");
      result = await apiRequest(
        "GET",
        accountPath(
          externalId,
          `/members${limit !== undefined ? `?limit=${limit}` : ""}`
        ),
        undefined,
        companyId
      );
      break;
    }

    case "add_account_member": {
      const externalId = requiredString(name, args, "externalId");
      const role = optionalAllowedString(name, args, "role", MEMBER_ROLES);
      const firstName = optionalString(args, "firstName");
      const lastName = optionalString(args, "lastName");
      result = await apiRequest(
        "POST",
        accountPath(externalId, "/members"),
        {
          ...memberIdentity(name, args),
          ...(role !== undefined && { role }),
          ...(firstName !== undefined && { firstName }),
          ...(lastName !== undefined && { lastName }),
        },
        companyId
      );
      break;
    }

    case "remove_account_member": {
      const externalId = requiredString(name, args, "externalId");
      result = await apiRequest(
        "DELETE",
        accountPath(externalId, "/members"),
        memberIdentity(name, args),
        companyId
      );
      break;
    }

    case "trigger_account_event": {
      const externalId = requiredString(name, args, "externalId");
      const event = requiredString(name, args, "event");
      const properties = optionalRecord(args, "properties");
      const recipients = optionalAllowedString(
        name,
        args,
        "recipients",
        RECIPIENT_RULES
      );
      const eventId = optionalString(args, "eventId");
      const occurredAt = optionalString(args, "occurredAt");
      result = await apiRequest(
        "POST",
        accountPath(externalId, "/events"),
        {
          event,
          ...(properties !== undefined && { properties }),
          ...(recipients !== undefined && { recipients }),
          ...(eventId !== undefined && { eventId }),
          ...(occurredAt !== undefined && { occurredAt }),
        },
        companyId
      );
      break;
    }

    case "list_account_events": {
      const externalId = requiredString(name, args, "externalId");
      const limit = optionalNumber(args, "limit");
      result = await apiRequest(
        "GET",
        accountPath(
          externalId,
          `/events${limit !== undefined ? `?limit=${limit}` : ""}`
        ),
        undefined,
        companyId
      );
      break;
    }

    case "list_account_suggestions": {
      const params = new URLSearchParams();
      const minContacts = optionalNumber(args, "minContacts");
      if (minContacts !== undefined) {
        params.set("minContacts", String(minContacts));
      }
      const limit = optionalNumber(args, "limit");
      if (limit !== undefined) params.set("limit", String(limit));
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/account-suggestions${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "accept_account_suggestions": {
      const domains = args.domains;
      if (
        !Array.isArray(domains) ||
        domains.length === 0 ||
        !domains.every((domain) => typeof domain === "string")
      ) {
        throw new Error(
          `${name} requires domains: a non-empty array of domain strings`
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/account-suggestions",
        { domains },
        companyId
      );
      break;
    }

    case "detect_account_organization_ids": {
      result = await apiRequest(
        "GET",
        ORGANIZATION_IDS_PATH,
        undefined,
        companyId
      );
      break;
    }

    case "preview_accounts_from_organization_id": {
      const params = new URLSearchParams(organizationIdKey(name, args));
      const limit = optionalNumber(args, "limit");
      if (limit !== undefined) params.set("limit", String(limit));
      result = await apiRequest(
        "GET",
        `${ORGANIZATION_IDS_PATH}/preview?${params.toString()}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_accounts_from_organization_id": {
      result = await apiRequest(
        "POST",
        ORGANIZATION_IDS_PATH,
        organizationIdKey(name, args),
        companyId
      );
      break;
    }

    case "get_account_organization_id_job": {
      const jobId = requiredString(name, args, "jobId");
      result = await apiRequest(
        "GET",
        `${ORGANIZATION_IDS_PATH}/jobs/${encodeURIComponent(jobId)}`,
        undefined,
        companyId
      );
      break;
    }

    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
