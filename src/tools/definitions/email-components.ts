import type { Tool } from "../../mcp-types.js";
import { emailBlocksDescription } from "../internal.js";

/**
 * Reusable email components: saved sections plus the per-company default
 * footer. The default footer is the one an agent most often needs, because it
 * is what the branding wrap appends to sequence and campaign emails. Editing it
 * here is the supported way to change every email's footer at once - authoring
 * a footer band inline in one email's `blocks` only changes that email.
 */
const applicationProperty = {
  type: "object" as const,
  description:
    "Explicit existing-email scope. Omit on save for future emails only. Customized footers are preserved unless includeCustomized is true. Sent/in-progress campaigns, raw HTML, ambiguous/missing footers and shared unselected owners are skipped. Counts include eligible A/B variants and translations.",
  properties: {
    scopes: {
      type: "array" as const,
      items: {
        type: "string" as const,
        enum: ["sequences", "campaigns", "transactional", "templates"],
      },
      description:
        "Categories to update. An empty array changes only the future default.",
    },
    includeCustomized: {
      type: "boolean" as const,
      description:
        "Explicitly replace customized footers as well. Defaults to false.",
    },
  },
  required: ["scopes"],
};

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
    name: "preview_default_email_component",
    description:
      "Preview a proposed default footer without saving or sending. Provide the proposed blocks and explicit application scopes. Returns affected counts, every affected/skipped email and a token for set_default_email_component. The application scopes select which categories to update: sequences, draft/scheduled campaigns, transactional templates, reusable templates, or future emails only. Customized footers are preserved unless explicitly included. Set renderPreview to get footerHtml and before/after HTML samples, one per selected category; open or save that HTML and use a browser to inspect the visual result. Use sample with an affected id/kind to render a particular email version. Previews are layout-only, without recipient personalization. A stale apply returns conflict; preview again instead of silently retrying with a new token.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID, otherwise the selected company.",
        },
        slot: {
          type: "string",
          enum: ["footer"],
          description: "Default slot to preview.",
        },
        blocks: {
          type: "array",
          items: { type: "object" },
          description: `Proposed default footer blocks. ${emailBlocksDescription}`,
        },
        name: {
          type: "string",
          description:
            "Proposed component name; use the same value when applying.",
        },
        description: {
          type: "string",
          description:
            "Proposed component description; use the same value when applying.",
        },
        application: applicationProperty,
        renderPreview: {
          type: "boolean",
          description:
            "Return visual before/after HTML and footerHtml without changing saved content.",
        },
        sample: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "An affected item ID from this preview.",
            },
            kind: {
              type: "string",
              enum: ["email", "ab_variant", "localization"],
              description: "Affected item kind.",
            },
          },
          required: ["id", "kind"],
        },
      },
      required: ["slot", "blocks", "application"],
    },
  },
  {
    name: "set_default_email_component",
    description:
      "Create or replace the company's default component for a slot. This is the supported way to change the footer on every email: sequence, campaign, and AI-generated emails built from blocks clone this component when they are built, instead of the generated default footer. Raw HTML emails are the exception - block chrome cannot be injected into raw HTML, so they keep their own markup and a generated unsubscribe footer is appended at send time unless the HTML contains {{unsubscribeUrl}}. Call get_default_email_component first and edit the blocks it returns, otherwise you replace the existing footer wholesale. A default footer always keeps its unsubscribe link enabled - transactional sends hide it at render time. Omitting application keeps existing emails unchanged. To apply to existing emails, call preview_default_email_component first, then pass the same application, blocks and metadata with its token as previewToken. This atomically saves the default and updates only the previewed eligible content. It does not send emails. Customized footers are preserved by default. Conflict means the preview is stale and must be reviewed again.",
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
        application: applicationProperty,
        previewToken: {
          type: "string",
          description:
            "Token from preview_default_email_component. Required whenever application is provided. Bound to the exact company, input and current email state.",
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
    name: "duplicate_email_component",
    description:
      'Copy an email component into a new component with the same description, type and blocks. Without `name`, the copy is called "<name> (Copy)", or "(Copy 2)" and so on when that name is taken. The copy is never pinned as a default, so duplicating the default footer gives a regular component to edit.',
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
          description: "ID of the email component to copy",
        },
        name: {
          type: "string",
          description:
            "Name for the copy, unique within the company. Omit to use the default copy name.",
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
