import type { Tool } from "../../mcp-types.js";
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
    description:
      "Get landing page details, content, metrics, and URLs. Drafts have publicUrl and appPublicUrl set to null; previewUrl is a signed, unlisted visitor-facing preview that works before publish. Use render_landing_page when you need that preview URL called out with publish-vs-draft guidance.",
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
    name: "render_landing_page",
    description:
      "Render a visitor-facing preview of a landing page without publishing it. Unlike get_landing_page, which returns builder JSON, this returns previewUrl: a signed, unlisted URL that shows the page with the same layout, theme, form, and #form button anchors visitors will see. Drafts keep publicUrl and appPublicUrl null until publish_landing_page; open previewUrl to check copy and layout on a draft instead of putting unreviewed content on the public domain. The preview is not indexed. Signup forms on a draft preview do not collect contacts. This is read-only and never publishes, unpublishes, or changes the page.",
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
          description: "Landing page ID to preview.",
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
      "Connect a custom domain. Omit landingPageId for the legacy workspace-wide domain, or provide it to dedicate the hostname to one page at the domain root. Returns DNS and verification details.",
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
          description:
            "Custom domain: a subdomain (pages.example.com, needs a CNAME record) or a root domain (example.com, needs an A record to 76.76.21.21; www also redirects to the root when its CNAME points to pages.sequenzydns.com).",
        },
        landingPageId: {
          type: "string",
          description:
            "Optional landing page ID. When provided, the domain serves only this page from the hostname root.",
        },
      },
      required: ["domain"],
      additionalProperties: false,
    },
  },
  {
    name: "update_landing_page_domain_settings",
    description:
      "Update or verify landing page domain settings. Omit landingPageId for the workspace domain, or provide it for a dedicated page domain. Dedicated domains must be removed explicitly before replacement.",
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
        landingPageId: {
          type: "string",
          description: "Optional dedicated landing page domain target.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "remove_landing_page_domain",
    description:
      "Remove the dedicated custom domain from one landing page. The page keeps its workspace and Sequenzy fallback URLs.",
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
          description: "Landing page whose dedicated domain should be removed.",
        },
      },
      required: ["landingPageId"],
      additionalProperties: false,
    },
  },
];
