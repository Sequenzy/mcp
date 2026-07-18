import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { emailBlocksDescription, rawHtmlContentWarning } from "../internal.js";

export const templateToolDefinitions: Tool[] = [
  // ============================================================================
  // Templates
  // ============================================================================
  {
    name: "list_templates",
    description:
      "List all email templates, including per-locale localization sync status",
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
    name: "get_template",
    description:
      "Get a template's details, content, and all localized variants with sync status",
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider templates. ${rawHtmlContentWarning}`,
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider templates. ${rawHtmlContentWarning}`,
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
          description: `Localized email HTML. Mutually exclusive with \`blocks\`. ${rawHtmlContentWarning}`,
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
];
