import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  emailBlocksDescription,
  rawHtmlContentDescription,
} from "../internal.js";

export const templateToolDefinitions: Tool[] = [
  // ============================================================================
  // Templates
  // ============================================================================
  {
    name: "list_templates",
    description:
      "List the company's email bodies newest first, including per-locale localization sync status and each body's `emailPreset` Style > Format (branded or minimal; null for standalone raw HTML). Results include standalone templates plus the bodies behind campaigns and transactional emails. Returns 50 per call by default (100 max); page with offset while pagination.hasMore is true, and read pagination.total for the full count. You can also pass a campaign's emailId to get_template to fetch one body directly. Bodies are kept when their campaign or transactional email is deleted.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        label: {
          type: "string",
          description:
            "Optional label name filter. Only templates assigned this label are returned.",
        },
        limit: {
          type: "number",
          description: "Templates per page, 1-100. Defaults to 50.",
        },
        offset: {
          type: "number",
          description:
            "Templates to skip before returning results. Add pagination.count to the current offset to fetch the next page while pagination.hasMore is true.",
        },
      },
    },
  },
  {
    name: "get_template",
    description:
      "Get a template's details, content, and all localized variants with sync status. `emailPreset` reports the per-email Style > Format (branded or minimal; null when the whole email is standalone raw HTML) the same way get_sequence does per step.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
      },
      required: ["templateId"],
    },
  },
  {
    name: "create_template",
    description:
      "Create a new email template. For net-new email content requested in natural language, use `prompt`; do not write HTML or construct blocks yourself. Use `blocks` only for finished caller-supplied Sequenzy content and `html` only for supplied or explicitly requested preserved HTML.",
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
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line. Optional with `prompt`.",
        },
        previewText: {
          type: ["string", "null"],
          description: "Optional preview text override.",
        },
        html: {
          type: "string",
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider templates. ${rawHtmlContentDescription}`,
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        prompt: {
          type: "string",
          description:
            "Natural-language request for Sequenzy to generate branded native template blocks.",
        },
        style: {
          type: "string",
          description: "Generation style; valid only with `prompt`.",
        },
        tone: {
          type: "string",
          description: "Generation tone; valid only with `prompt`.",
        },
        labels: {
          type: "array",
          description:
            "Optional label names to assign. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_template",
    description:
      "Update an existing template. At least one of `name`, `subject`, `previewText`, `html`, `blocks`, or `labels` is required, and only those update fields are accepted.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
        name: {
          type: "string",
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        previewText: {
          type: ["string", "null"],
          description:
            "Inbox preview text. Send null to clear the existing preview text.",
        },
        html: {
          type: "string",
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider templates. ${rawHtmlContentDescription}`,
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        labels: {
          type: "array",
          description:
            "Replacement label names. Send an empty array to clear labels. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "set_template_localization",
    description:
      "Create or replace one caller-supplied localized variant of a template. The locale must be enabled for the company and cannot be its primary locale. Provide exactly one of `html` or `blocks`.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID, transactional email ID, or slug.",
        },
        locale: {
          type: "string",
          description:
            "Enabled non-primary locale code such as es, fr, or pt-BR.",
        },
        subject: {
          type: "string",
          description: "Localized email subject line.",
        },
        previewText: {
          type: ["string", "null"],
          description: "Optional localized inbox preview text.",
        },
        html: {
          type: "string",
          description: `Localized email HTML. Mutually exclusive with \`blocks\`. ${rawHtmlContentDescription}`,
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
      },
      required: ["templateId", "locale", "subject"],
      additionalProperties: false,
    },
  },
  {
    name: "sync_template_localizations",
    description:
      "Queue AI translation for selected template locales. Omit `locales` to sync every enabled non-primary locale. This works even when automatic on-save localization is disabled.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID, transactional email ID, or slug.",
        },
        locales: {
          type: "array",
          description:
            "Optional enabled non-primary locale codes to sync. Omit to sync all enabled non-primary locales.",
          items: {
            type: "string",
          },
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_template",
    description: "Delete a template",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
      },
      required: ["templateId"],
    },
  },
  {
    name: "share_template",
    description:
      "Create (or fetch) the public view-in-browser link for an individual email - a transactional email, a sequence email, or a standalone template. Accepts an email/template ID or a transactional email's ID or slug; for a sequence email, pass the step's emailId from get_sequence. The hosted page renders an anonymized copy - sample contact, inert unsubscribe link, no open/click tracking - so the URL is safe to forward to anyone. Idempotent: if a link is already active, the same URL is returned with created=false rather than rotating it, so previously shared copies keep working. get_template reports the current link as shareUrl (null when none). Revoke with unshare_template. Campaigns have their own campaign-level link that follows the A/B winning variant - use share_campaign for those.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description:
            "Email/template ID, or a transactional email's ID or slug.",
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "unshare_template",
    description:
      "Revoke the email's public view-in-browser link. The shared URL returns 404 immediately, and sharing again later mints a different URL - previously distributed copies stay dead. Returns revoked=false if no link was active.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description:
            "Email/template ID, or a transactional email's ID or slug.",
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
];
