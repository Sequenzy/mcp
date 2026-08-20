import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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
    name: "get_recipient_suppression",
    description:
      "Check whether one recipient is suppressed by Sequenzy's bounce, complaint, or email-hygiene safeguards or the regional Amazon SES account-level suppression list. This exact-address lookup never exposes other recipients from the shared SES account.",
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
      "Remove stale bounce suppression for an exact recipient associated with the company. Clears matching Amazon SES bounce entries and Sequenzy's local bounce block, then reactivates bounced company subscribers. Complaint, unsubscribe, and email-hygiene protections are never removed.",
    inputSchema: {
      type: "object",
      properties: commonProperties,
      required: ["email"],
      additionalProperties: false,
    },
  },
];
