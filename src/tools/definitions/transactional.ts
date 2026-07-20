import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  emailBlocksDescription,
  rawHtmlContentWarning,
  replacementEmailBlocksDescription,
} from "../internal.js";

export const transactionalToolDefinitions: Tool[] = [
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
      "Create a saved transactional email template with an API slug. For net-new natural-language content use `prompt`; do not author HTML or blocks. `blocks` are finished caller-supplied Sequenzy content and `html` is preserved/imported markup.",
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. ${rawHtmlContentWarning}`,
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
            "Generate transactional email blocks from a prompt. Generated blocks include the company's branding (logo and a footer without an unsubscribe link). Mutually exclusive with `html` and `blocks`.",
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
            "Whether this transactional email can be sent immediately. Prompt-created templates default to false; explicit HTML/blocks retain the compatibility default of true.",
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. ${rawHtmlContentWarning}`,
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
    description:
      "Queue one email using either a saved transactional email API slug (`templateId`) or direct `subject` and `html` content. The default delivery policy is transactional. When the recipient matches a subscriber, saved first and last names fill omitted name variables; explicit variables take precedence. Set `emailType` to `marketing` to add subscriber suppression, a marketing footer, and RFC 8058 one-click unsubscribe. Returns a durable emailSendId; pass it to get_email_send for delivery status and failure details.",
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
          description:
            "Email subject line. Required with `html` when `templateId` is omitted.",
        },
        html: {
          type: "string",
          description:
            "Direct-send HTML body. Required with `subject` when `templateId` is omitted; the MCP server maps this to the transactional API `body` field.",
        },
        templateId: {
          type: "string",
          description:
            "Saved transactional email API slug, for example `welcome-email`. The field name is retained for MCP compatibility and is mapped to the transactional API `slug` field.",
        },
        variables: {
          type: "object",
          description:
            "Variables for template personalization. Nested objects and arrays are supported for repeat blocks, for example { items: [...] }. When the recipient matches a subscriber, saved first and last names fill omitted name variables; explicit values, including blanks, take precedence.",
        },
        subscriberExternalId: {
          type: "string",
          description:
            "Customer-owned subscriber ID for attaching analytics, localization, and saved-name personalization on single-recipient sends. Maximum length: 255 characters.",
        },
        emailType: {
          type: "string",
          description:
            "Delivery policy: `transactional` (default) or `marketing`. Marketing mode supports exactly one recipient and automatically applies subscriber suppression, the standard unsubscribe footer, and RFC 8058 headers.",
        },
      },
      required: ["to"],
      additionalProperties: false,
    },
  },
];
