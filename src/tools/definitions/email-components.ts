import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { emailBlocksDescription } from "../internal.js";

/**
 * Reusable email components: saved sections plus the per-company default
 * footer. The default footer is the one an agent most often needs, because it
 * is what the branding wrap appends to sequence and campaign emails. Editing it
 * here is the supported way to change every email's footer at once - authoring
 * a footer band inline in one email's `blocks` only changes that email.
 */
export const emailComponentToolDefinitions: Tool[] = [
  {
    name: "list_email_components",
    description:
      "List the company's reusable email components newest first. Components are saved block groups that can be dropped into emails, plus the components pinned as company defaults for a slot (currently `footer`). Pass defaultsOnly to see only the pinned defaults.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        type: {
          type: "string",
          enum: ["section", "footer"],
          description:
            "Optional component type filter. `section` is an ordinary saved block group; `footer` is a footer component.",
        },
        defaultsOnly: {
          type: "boolean",
          description:
            "When true, return only components pinned as a company default for a slot.",
        },
      },
    },
  },
  {
    name: "get_email_component",
    description:
      "Get one email component's blocks and metadata by id, including its `version` and whether it is pinned as a company default slot.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        componentId: {
          type: "string",
          description: "Email component ID",
        },
      },
      required: ["componentId"],
    },
  },
  {
    name: "get_default_email_component",
    description:
      "Get the company's default component for a slot - use this to read the current email footer before editing it. Returns not_found when no default is set, which means emails fall back to the footer Sequenzy generates from the company profile.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        slot: {
          type: "string",
          enum: ["footer"],
          description: "Default slot to read. Currently only `footer`.",
        },
      },
      required: ["slot"],
    },
  },
  {
    name: "set_default_email_component",
    description:
      "Create or replace the company's default component for a slot. This is the supported way to change the footer on every email: sequence, campaign, and AI-generated emails clone this component when they are built, instead of the generated default footer. Call get_default_email_component first and edit the blocks it returns, otherwise you replace the existing footer wholesale. A default footer always keeps its unsubscribe link enabled - transactional sends hide it at render time. Editing this does not rewrite emails that were already created.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        slot: {
          type: "string",
          enum: ["footer"],
          description: "Default slot to write. Currently only `footer`.",
        },
        blocks: {
          type: "array",
          description: `Blocks that make up the default component. ${emailBlocksDescription}`,
          items: { type: "object" },
        },
        name: {
          type: "string",
          description:
            "Optional component name. Defaults to `Default Footer` when creating the footer default.",
        },
        description: {
          type: "string",
          description: "Optional human-readable description.",
        },
      },
      required: ["slot", "blocks"],
    },
  },
  {
    name: "create_email_component",
    description:
      "Create a reusable email component from a block list. Component names are unique per company. Use set_default_email_component instead when the goal is to change the footer every email gets.",
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
          description: "Component name, unique within the company.",
        },
        description: {
          type: "string",
          description: "Optional human-readable description.",
        },
        blocks: {
          type: "array",
          description: `Blocks that make up the component. ${emailBlocksDescription}`,
          items: { type: "object" },
        },
        componentType: {
          type: "string",
          enum: ["section", "footer"],
          description:
            "Component type. Defaults to `section`. Creating one with type `footer` does not pin it as the company default - use set_default_email_component for that.",
        },
      },
      required: ["name", "blocks"],
    },
  },
  {
    name: "update_email_component",
    description:
      "Update an email component's metadata or replace its blocks. Replacing blocks bumps the component `version`. Emails that already cloned this component keep the copy they were built with; the new version applies to emails built afterwards. Editing the component pinned as the default footer keeps its unsubscribe link enabled.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        componentId: {
          type: "string",
          description: "Email component ID",
        },
        name: {
          type: "string",
          description: "New component name, unique within the company.",
        },
        description: {
          type: "string",
          description: "New description. Send an empty string to clear it.",
        },
        blocks: {
          type: "array",
          description: `Replacement blocks for the component. Replaces the whole block list. ${emailBlocksDescription}`,
          items: { type: "object" },
        },
        componentType: {
          type: "string",
          enum: ["section", "footer"],
          description: "New component type.",
        },
      },
      required: ["componentId"],
    },
  },
  {
    name: "delete_email_component",
    description:
      "Delete an email component. Emails that already rendered it keep their copied blocks, so this does not change existing emails. Deleting the component pinned as the default footer makes new emails fall back to the generated footer.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        componentId: {
          type: "string",
          description: "Email component ID",
        },
      },
      required: ["componentId"],
    },
  },
];
