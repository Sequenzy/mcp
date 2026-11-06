import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const externalIdProperty = {
  type: "string",
  description:
    "Customer-owned account (organization/workspace) ID, e.g. the org id in your app.",
} as const;

const memberIdentityProperties = {
  email: {
    type: "string",
    description: "Contact email. Creates the contact when adding a new one.",
  },
  subscriberExternalId: {
    type: "string",
    description: "Contact external ID, as an alternative to email.",
  },
} as const;

export const accountToolDefinitions: Tool[] = [
  {
    name: "list_accounts",
    description:
      "List your customers' organizations (B2B accounts such as companies, workspaces or teams) in the workspace. The dashboard calls them Organizations; these tools keep the account names. Not your Sequenzy account: use get_account for that. Search matches name, external ID and domain. Organizations group contacts; their attributes reach every member as `organization.<name>` for segment attribute filters and sequence conditions, and as `{{organization.<name>}}` merge tags (`account.*` is an older alias).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        search: {
          type: "string",
          description: "Match name, external ID or domain.",
        },
        page: { type: "number", description: "Page number (default 1)." },
        limit: { type: "number", description: "Results per page (max 100)." },
        sort: {
          type: "string",
          enum: [
            "updatedAt",
            "createdAt",
            "name",
            "memberCount",
            "lastEventAt",
          ],
          description: "Sort field (default updatedAt).",
        },
        order: {
          type: "string",
          enum: ["asc", "desc"],
          description: "Sort direction (default desc).",
        },
        withoutEventRecipients: {
          type: "boolean",
          description:
            "true lists only accounts with members but no owner or admin. Account events go to owners or admins by default, so alerts for these accounts reach nobody until a member gets one of those roles.",
        },
      },
    },
  },
  {
    name: "get_account_by_external_id",
    description:
      "Get one account by its external ID, including up to 100 members with their roles (owner, admin, member).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
      },
      required: ["externalId"],
    },
  },
  {
    name: "upsert_account",
    description:
      "Create or update an account by external ID. Attributes merge into the stored attributes (a null value deletes a key; set replaceAttributes to replace them all). Optional members are added in the same call. Use this to model companies, workspaces or teams so segments can filter on `organization.plan` and emails can use `{{organization.name}}` (`account.*` still works). The first organization turns Organizations on for the workspace; it fails with a 409 error when contacts already use a custom attribute named `account` or `account.*`, which must be renamed first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
        name: { type: "string", description: "Display name, e.g. Acme." },
        domain: {
          type: "string",
          description: "Primary domain, e.g. acme.com.",
        },
        attributes: {
          type: "object",
          additionalProperties: true,
          description:
            "Account attributes such as plan, seats, mrr or trialEndsAt (max 100 keys). Nested objects flatten to dotted names.",
        },
        replaceAttributes: {
          type: "boolean",
          description: "Replace all stored attributes instead of merging.",
        },
        members: {
          type: "array",
          maxItems: 100,
          description: "Contacts to add as members in the same call.",
          items: {
            type: "object",
            properties: {
              ...memberIdentityProperties,
              role: {
                type: "string",
                enum: ["owner", "admin", "member"],
                description: "Membership role (default member).",
              },
              firstName: { type: "string" },
              lastName: { type: "string" },
            },
          },
        },
      },
      required: ["externalId"],
    },
  },
  {
    name: "delete_account",
    description:
      "Delete an organization (account) and its memberships. Contacts are kept; their `organization.*` attributes are cleared.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
      },
      required: ["externalId"],
    },
  },
  {
    name: "list_account_members",
    description:
      "List the contacts that belong to an account with their roles. Owners first, then admins, then members.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
        limit: {
          type: "number",
          description: "Maximum members to return (max 5000).",
        },
      },
      required: ["externalId"],
    },
  },
  {
    name: "add_account_member",
    description:
      "Add a contact to an account (creating the contact when the email is new). Re-adding an existing member with a role updates the role; without a role keeps the current one.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
        ...memberIdentityProperties,
        role: {
          type: "string",
          enum: ["owner", "admin", "member"],
          description: "Membership role (default member).",
        },
        firstName: { type: "string" },
        lastName: { type: "string" },
      },
      required: ["externalId"],
    },
  },
  {
    name: "remove_account_member",
    description:
      "Remove a contact from an account. The contact is kept; its `organization.*` attributes are cleared or replaced by another organization it belongs to.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
        ...memberIdentityProperties,
      },
      required: ["externalId"],
    },
  },
  {
    name: "trigger_account_event",
    description:
      "Record an event on an account (for example trial_ending, plan_changed, seat_limit_reached) and deliver it as a contact event to the chosen recipients: owners (default; falls back to admins when there is no owner), admins (includes owners), all members, or none (timeline only). Each delivery runs sync rules and sequence triggers with `event.organization.*` properties (also available as `event.account.*`). To start a sequence once per organization rather than once per recipient, create it with enrollmentMode matching_field and enrollmentFieldPath organization.externalId. Pass eventId to make retries idempotent.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
        event: {
          type: "string",
          description: "Event name, e.g. trial_ending.",
        },
        properties: {
          type: "object",
          additionalProperties: true,
          description:
            "Event properties available as `event.<name>` in sequences.",
        },
        recipients: {
          type: "string",
          enum: ["owners", "admins", "all", "none"],
          description: "Who receives the event (default owners).",
        },
        occurredAt: {
          type: "string",
          description:
            "Original event time in ISO 8601 format. Omit for the current time; account events still use the normal delivery pipeline with this timestamp.",
        },
        eventId: {
          type: "string",
          description:
            "Idempotency key; retries with the same id are no-ops per recipient.",
        },
      },
      required: ["externalId", "event"],
    },
  },
  {
    name: "list_account_events",
    description: "List recent events on an account's timeline, newest first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        externalId: externalIdProperty,
        limit: { type: "number", description: "Number of events (max 500)." },
      },
      required: ["externalId"],
    },
  },
  {
    name: "list_account_suggestions",
    description:
      "Suggest accounts from work email domains that several contacts share (for example 7 contacts at acme.com). Personal and disposable providers (gmail.com, outlook.com, yopmail.com, ...), the workspace's own sending domains, domains where any contact already belongs to an account, and domains an account already uses are skipped. Each suggestion includes up to 10 sampleEmails for review. Read-only; show the list to the user and accept only the domains they confirm with accept_account_suggestions.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        minContacts: {
          type: "number",
          description:
            "Contacts a domain needs to be suggested (default 3, min 2).",
        },
        limit: {
          type: "number",
          description: "Number of suggestions (default 25, max 100).",
        },
      },
    },
  },
  {
    name: "accept_account_suggestions",
    description:
      "Create accounts from suggested email domains. Each domain becomes an account (externalId and domain set to the domain, name derived from it) with the domain's contacts that belong to no account as members. When one account already uses the domain, contacts are added to it; with several, the domain is skipped (multiple_accounts). A domain whose contacts already partly belong to another account is skipped (already_in_account); domains without eligible contacts are skipped (no_contacts). Up to 25 domains per call; personal, disposable and the workspace's own sending domains are rejected. Keeps existing roles, runs no sync rules or segment-entered sequences, and a retry does not duplicate accounts or members; truncated means contacts were left out because an account holds at most 5,000 members. Fails with a 409 error while contacts use a custom attribute named `account` or `account.*`.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        domains: {
          type: "array",
          items: { type: "string" },
          description: 'Domains to accept, e.g. ["acme.com"] (1 to 25).',
        },
      },
      required: ["domains"],
    },
  },
  {
    name: "detect_account_organization_ids",
    description:
      "Find the organization ID the app already sends, so accounts can be created from existing data without code. Looks at event properties from the last 180 days and contact attributes named like workspaceId, organization_id, team_id or account_id. Each candidate has source (event or attribute), propertyKey, nameKey (a sibling name property or null), eventCount (events for event, contacts for attribute), accountCount (distinct organizations) and eventNames. Read-only; next, preview a candidate with preview_accounts_from_organization_id and show it to the user.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
      },
    },
  },
  {
    name: "preview_accounts_from_organization_id",
    description:
      "Preview the biggest accounts create_accounts_from_organization_id would make, before anything is written. Each organization has externalId (its ID), name (from nameKey, otherwise from the work email domain most of its contacts share, null when neither exists), domain, contactCount and up to 3 sampleEmails. Read-only; always show this preview to the user and get confirmation before creating accounts.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        propertyKey: {
          type: "string",
          description:
            "Event property or contact attribute holding your organization ID, e.g. workspaceId (from detect_account_organization_ids).",
        },
        source: {
          type: "string",
          enum: ["event", "attribute"],
          description:
            "Where the ID lives: event (default) for event properties, attribute for contact attributes.",
        },
        nameKey: {
          type: "string",
          description:
            "Optional property or attribute holding the organization name, e.g. workspaceName.",
        },
        limit: {
          type: "number",
          description: "Organizations to show (default 5, max 50).",
        },
      },
      required: ["propertyKey"],
    },
  },
  {
    name: "create_accounts_from_organization_id",
    description:
      "Start a background job that creates one account per distinct propertyKey value and adds each contact seen with it as a member. Accounts are named from nameKey, otherwise after the work email domain most of their contacts share; existing names, domains and roles are kept. No emails are sent, no sync rules run and no segment-entered sequences start. Returns jobId, alreadyRunning (a run for the same key was already queued or running, so none was started) and job; check progress with get_account_organization_id_job. Reruns update the same accounts instead of duplicating them. Only call after the user confirmed the preview. Fails with a 409 error while contacts use a custom attribute named `account` or `account.*`.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        propertyKey: {
          type: "string",
          description:
            "Event property or contact attribute holding your organization ID, e.g. workspaceId (from detect_account_organization_ids).",
        },
        source: {
          type: "string",
          enum: ["event", "attribute"],
          description:
            "Where the ID lives: event (default) for event properties, attribute for contact attributes.",
        },
        nameKey: {
          type: "string",
          description:
            "Optional property or attribute holding the organization name, e.g. workspaceName.",
        },
      },
      required: ["propertyKey"],
    },
  },
  {
    name: "get_account_organization_id_job",
    description:
      "Check a create_accounts_from_organization_id run. state is queued, running, completed or failed. A completed job has result with accountsCreated, accountsUpdated, membershipsCreated, membershipsUpdated, skipped and truncated (history was larger than one run covers; start it again to continue). A failed job has error. Finished jobs expire after a while (404); the accounts stay.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        jobId: {
          type: "string",
          description:
            "jobId returned by create_accounts_from_organization_id.",
        },
      },
      required: ["jobId"],
    },
  },
];
