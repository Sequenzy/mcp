import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  emailBlocksDescription,
  rawHtmlContentDescription,
  replacementEmailBlocksDescription,
} from "../internal.js";

export const transactionalToolDefinitions: Tool[] = [
  // ============================================================================
  {
    name: "list_transactional_emails",
    description:
      "List transactional email templates with subjects, delivery metrics, API slugs, and dashboard URLs. Each item also carries `emailPreset`, the per-email Style > Format (branded or minimal, null for a standalone raw HTML email), so a chrome drift check across templates does not need one get_transactional_email call each. Search by name, slug, or email title; filter active state; and sort by sends, opens, open rate, clicks, or CTR.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        search: {
          type: "string",
          description:
            "Case-insensitive search across template name, API slug, and linked email subject/title.",
        },
        status: {
          type: "string",
          description: "Template status: all, active, or disabled.",
        },
        sort: {
          type: "string",
          description:
            "Sort field: date, sends, opens, open-rate, clicks, or ctr. Defaults to date.",
        },
        order: {
          type: "string",
          description: "Sort order: asc or desc. Defaults to desc.",
        },
        includeMachineEngagement: {
          type: "boolean",
          description:
            "Include bot, scanner, and privacy-proxy engagement in open and click metrics. Defaults to false.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_transactional_email",
    description:
      "Get a transactional email by ID or slug, including subject, preview text, blocks, variables, and linked dashboard URLs. `emailPreset` reports the per-email Style > Format the same way get_sequence does per step (branded or minimal; null when the whole email is standalone raw HTML), so it can be compared against sequence steps and campaigns without rendering them - minimal suppresses the company logo at render time.",
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. ${rawHtmlContentDescription}`,
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. ${rawHtmlContentDescription}`,
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
    name: "delete_transactional_email",
    description:
      "Permanently delete a saved transactional email template by ID or slug. Use this to retire an obsolete template: the slug stops sending and becomes free to reuse. Already-sent deliveries and their stats are kept, so history and analytics survive the delete. The linked email content stays as a reusable template and comes back as `deleted.emailId`; pass that to `delete_template` to remove the content too. To stop sends without losing the template, call `update_transactional_email` with `enabled` set to false instead.",
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
      additionalProperties: false,
    },
  },
  {
    name: "send_email",
    description:
      "Queue one email using either a saved transactional email API slug (`templateId`) or direct `subject` and `html` content. Always provide a stable `idempotencyKey` when an agent or workflow may retry, and reuse it for the same logical email; Sequenzy returns the original send for 14 days and rejects different content under the same key. The default delivery policy is transactional. When the recipient matches a subscriber, saved first and last names fill omitted name variables; explicit variables take precedence. Set `emailType` to `marketing` to add subscriber suppression, a marketing footer, and RFC 8058 one-click unsubscribe. Company Reply-To defaults are inherited when no override is provided, and `{{viewInBrowserUrl}}` is replaced with a hosted copy URL. Attach up to 10 files with Base64 `content` or a public `path`; `contentId` embeds a CID image referenced by the HTML. Use `trackingSettings` with `clickTracking` or `openTracking` set to `false` to disable click-link rewriting or the open-tracking pixel for this send only; these opt-out fields cannot enable tracking the account has disabled. Returns a durable emailSendId and the accepted emailType; pass the ID to get_email_send for delivery status and failure details.",
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
        idempotencyKey: {
          type: "string",
          description:
            "Caller-owned retry key for this logical email (maximum 255 characters). Reuse the same key with the same arguments to get the original emailSendId for 14 days. Never reuse a key for different content.",
        },
        subject: {
          type: "string",
          description:
            "Email subject line. Required with `html` when `templateId` is omitted.",
        },
        html: {
          type: "string",
          description:
            "Direct-send HTML body. Required with `subject` when `templateId` is omitted; the MCP server maps this to the transactional API `body` field. Use `{{viewInBrowserUrl}}` for a hosted copy link generated at send time.",
        },
        templateId: {
          type: "string",
          description:
            "Saved transactional email API slug, for example `welcome-email`. The field name is retained for MCP compatibility and is mapped to the transactional API `slug` field.",
        },
        variables: {
          type: "object",
          description:
            "Variables for template personalization. Nested objects and arrays are supported for repeat blocks, for example { items: [...] }. When the recipient matches a subscriber, saved first and last names fill omitted name variables; explicit values, including blanks, take precedence. Variables are HTML-escaped; a template can prefix a tag with 'html.' ({{html.prerenderedHtml}}) to insert a trusted, sanitized HTML value unescaped.",
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
        replyTo: {
          type: "string",
          description:
            "Optional Reply-To address, formatted as `email@example.com` or `Name <email@example.com>`. When omitted, the saved template or company default is used.",
        },
        attachments: {
          type: "array",
          maxItems: 10,
          description:
            "Files to attach (7MB total). Each item needs `filename` and exactly one of Base64 `content` or public HTTP(S) `path`. Set `contentId` to embed it as a CID image referenced from HTML, and optionally set `contentType` to override MIME detection.",
          items: {
            type: "object",
            properties: {
              filename: { type: "string" },
              content: { type: "string" },
              path: { type: "string" },
              contentId: { type: "string" },
              contentType: { type: "string" },
            },
            required: ["filename"],
            additionalProperties: false,
          },
        },
        trackingSettings: {
          type: "object",
          description:
            "Per-send tracking opt-outs. Each field defaults to `true`, meaning the account tracking settings apply; set a field to `false` to disable that tracking for this send only. These fields cannot enable tracking the account has disabled.",
          properties: {
            clickTracking: {
              type: "boolean",
              description:
                "Set to `false` to skip click-link rewriting for this send only, which helps when tracking redirects break universal or deep links.",
            },
            openTracking: {
              type: "boolean",
              description:
                "Set to `false` to skip the open-tracking pixel for this send only.",
            },
          },
          additionalProperties: false,
        },
      },
      required: ["to"],
      additionalProperties: false,
    },
  },
];
