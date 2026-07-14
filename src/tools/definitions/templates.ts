import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { emailBlocksDescription } from "../internal.js";

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
          description:
            "Email HTML content. Mutually exclusive with `blocks`. Use this for imported provider templates; Sequenzy stores it as one raw HTML block to preserve the design.",
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
      "Update an existing template. At least one of `name`, `subject`, `html`, `blocks`, or `labels` is required, and only those update fields are accepted.",
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
        html: {
          type: "string",
          description:
            "Email HTML content. Mutually exclusive with `blocks`. Use this for imported provider templates; Sequenzy stores it as one raw HTML block to preserve the design.",
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
