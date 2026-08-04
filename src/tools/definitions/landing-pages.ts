import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  landingPageContentDescription,
  landingPageTemplateDescription,
} from "../internal.js";

export const landingPageToolDefinitions: Tool[] = [
  // ============================================================================
  // Landing Pages
  // ============================================================================
  {
    name: "list_landing_pages",
    description: "List all landing pages for a company",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list landing pages for. If not provided, uses the currently selected company.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_landing_page",
    description: "Get landing page details, content, metrics, and URLs",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID.",
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_landing_page",
    description:
      "Create a draft landing page. Provide content for an exact page, or a template for generated starter content.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the landing page in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description:
            "Landing page name. Optional; defaults to a template-specific name.",
        },
        slug: {
          type: "string",
          description:
            "Optional URL slug. It will be normalized and made unique within the company.",
        },
        template: {
          type: "string",
          description: landingPageTemplateDescription,
        },
        content: {
          type: "object",
          description: landingPageContentDescription,
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_landing_page",
    description:
      "Edit a landing page's name, slug, or full content. Provide at least one update field.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID.",
        },
        name: {
          type: "string",
          description: "Landing page name.",
        },
        slug: {
          type: "string",
          description:
            "Landing page URL slug. It will be normalized and made unique within the company.",
        },
        content: {
          type: "object",
          description: landingPageContentDescription,
          additionalProperties: true,
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
  {
    name: "duplicate_landing_page",
    description:
      "Duplicate a landing page. The copy is created as a draft with its own slug and stats, so the original keeps its published URL.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID to duplicate.",
        },
        name: {
          type: "string",
          description:
            "Optional name for the copy. Defaults to the original name with a (copy) suffix.",
        },
        slug: {
          type: "string",
          description:
            "Optional slug for the copy. It will be normalized and made unique within the company.",
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_landing_page",
    description: "Delete a landing page",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID.",
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_landing_page",
    description:
      "Publish a landing page. Optional name, slug, or content updates are saved before publishing.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID.",
        },
        name: {
          type: "string",
          description: "Optional landing page name update.",
        },
        slug: {
          type: "string",
          description: "Optional slug update before publishing.",
        },
        content: {
          type: "object",
          description: landingPageContentDescription,
          additionalProperties: true,
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
  {
    name: "unpublish_landing_page",
    description:
      "Unpublish a landing page and return it to draft status. Optional name, slug, or content updates are saved first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID.",
        },
        name: {
          type: "string",
          description: "Optional landing page name update.",
        },
        slug: {
          type: "string",
          description: "Optional slug update before unpublishing.",
        },
        content: {
          type: "object",
          description: landingPageContentDescription,
          additionalProperties: true,
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
  {
    name: "connect_landing_page_domain",
    description:
      "Connect a custom domain for published landing pages. Returns the DNS target and verification records.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        domain: {
          type: "string",
          description: "Custom domain, for example pages.example.com.",
        },
      },
      required: ["domain"],
      additionalProperties: false,
    },
  },
  {
    name: "update_landing_page_domain_settings",
    description:
      "Update landing page domain settings. Provide domain to replace the custom domain, verify true to refresh verification, or both.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        domain: {
          type: "string",
          description: "Replacement custom domain.",
        },
        verify: {
          type: "boolean",
          description: "Refresh domain verification after any domain update.",
        },
      },
      additionalProperties: false,
    },
  },
];
