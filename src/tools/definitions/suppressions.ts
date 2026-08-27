import type { Tool } from "../../mcp-types.js";

const commonProperties = {
  companyId: {
    type: "string" as const,
    description:
      "Company ID. If not provided, uses the currently selected company.",
  },
  email: {
    type: "string" as const,
    description: "Exact recipient email address to inspect or clean up.",
  },
  region: {
    type: "string" as const,
    description:
      "Optional AWS SES region such as us-east-1. Omit to check every SES region currently used by the company.",
  },
};

export const suppressionToolDefinitions: Tool[] = [
  {
    name: "list_recipient_suppressions",
    description:
      "List the recipients this company cannot reach: protected global invalid-recipient suppressions for addresses associated with the company, protected workspace hard bounces without conclusive invalid-inbox evidence, removable workspace soft-bounce escalations, and protected spam complaints. Each row includes a stable suppressionType, and the response echoes the applied sortBy/sortOrder. Sort by `status` to surface the suppressions you can actually remove. Start here when a customer reports missing email; use get_recipient_suppression for one exact address.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: commonProperties.companyId,
        search: {
          type: "string" as const,
          description:
            "Case-insensitive substring filter on the recipient email address.",
        },
        page: {
          type: "number" as const,
          description: "1-based page number. Defaults to 1.",
        },
        limit: {
          type: "number" as const,
          description: "Entries per page. Defaults to 25, maximum 100.",
        },
        sort: {
          type: "string" as const,
          enum: ["suppressedAt", "email", "status"],
          description:
            "Order the page. `suppressedAt` (default) is newest first, `email` is A-Z, and `status` lists removable workspace escalations before protected suppressions. An unrecognized value falls back to `suppressedAt`.",
        },
        order: {
          type: "string" as const,
          enum: ["asc", "desc"],
          description:
            "Sort direction. Defaults to `desc` for suppressedAt and status, `asc` for email.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get_recipient_suppression",
    description:
      "Check whether one recipient is suppressed by Sequenzy's bounce/complaint safeguards or the regional Amazon SES account-level suppression list. This exact-address lookup never exposes other recipients from the shared SES account.",
    inputSchema: {
      type: "object",
      properties: commonProperties,
      required: ["email"],
      additionalProperties: false,
    },
  },
  {
    name: "remove_recipient_suppression",
    description:
      "Remove a workspace-scoped soft-bounce escalation for an exact recipient associated with the company, then reactivate bounced company subscribers. Global invalid-recipient, workspace hard-bounce, Amazon SES account-level, complaint, and unsubscribe suppressions are protected.",
    inputSchema: {
      type: "object",
      properties: commonProperties,
      required: ["email"],
      additionalProperties: false,
    },
  },
];
