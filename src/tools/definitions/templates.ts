import type { Tool } from "../../mcp-types.js";
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
        isTemplate: {
          type: "boolean",
          description:
            "Filter to reusable master designs (true) or everything else (false). Dashboard sequence steps and campaigns can start from these designs as independent copies. MCP does not expose a standalone-template copy operation; create_campaign accepts templateId for campaign copies.",
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
      "Create a new email template. `prompt` generates net-new email content from natural language. `blocks` is for finished caller-supplied Sequenzy content and `html` for supplied or explicitly requested preserved HTML. Creating a standalone copy of a saved design and AI rewriting within its layout are currently dashboard-only workflows; this tool has no source-design operation, and `prompt` does not preserve an existing layout. For a campaign copy, use create_campaign with templateId.",
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
          description:
            "Generation style; valid only with `prompt`. Pass 'designed' or 'plain' to force the designed or plain-text email style; other values are freeform prompt guidance. Defaults to the company's email style preference.",
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
        isTemplate: {
          type: "boolean",
          description:
            "Save as a reusable master design. Master designs are offered first when a dashboard sequence step or campaign starts from an existing email, and starting from one always creates an independent copy.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_template",
    description:
      "Update an existing template. At least one of `name`, `subject`, `previewText`, `html`, `blocks`, `labels`, or `isTemplate` is required, and only those update fields are accepted. For the double opt-in email (`consent.doubleOptInEmailId` from `get_tracking_settings`), new `html` or `blocks` must keep `{{DOUBLE_OPT_IN_URL}}` or nothing is saved.",
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
        isTemplate: {
          type: "boolean",
          description:
            "Mark (true) or unmark (false) this email as a reusable master design that sequence steps and campaigns can start from.",
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "set_template_localization",
    description:
      "Create or replace one caller-supplied localized variant of a template. The locale must be enabled for the company and cannot be its primary locale. Provide exactly one of `html` or `blocks`. By default, automatic translation on save replaces it when the original changes. Set `keepEdits` to protect it like a dashboard edit: it is marked as edited (`editedAt`) and becomes `stale` instead of being replaced.",
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
        keepEdits: {
          type: "boolean",
          description:
            "Protect this translation from automatic translation on save, like an edit made in the dashboard. Defaults to false.",
        },
      },
      required: ["templateId", "locale", "subject"],
      additionalProperties: false,
    },
  },
  {
    name: "sync_template_localizations",
    description:
      "Queue AI translation for selected template locales. Omit `locales` to sync every enabled non-primary locale. This works even when automatic on-save localization is disabled. By default it also retranslates locales someone edited; set `skipEdited` to keep those and get them back in `skippedLocales`.",
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
        skipEdited: {
          type: "boolean",
          description:
            "Keep translations someone edited (set via set_template_localization or the dashboard) instead of retranslating them. Defaults to false.",
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_template_localization_coverage",
    description:
      "Show how many emails that keep sending are translated into each enabled language: every email step and A/B variant in sequences that are not archived, plus enabled transactional emails (left out for marketer keys). Per language it returns total, upToDate, edited, outdated (translated before the original changed; still sends), translating, failed and missing counts. `push` gives the same counts (without failed) for push steps in sequences that are not archived or defined in code. Use it to follow progress after translate_missing_template_localizations or after a language was added in the dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "translate_missing_template_localizations",
    description:
      "Queue AI translation, in one call, for every sequence email (including sequence A/B variants) and enabled transactional email that has no translation in a language yet or whose last translation failed. It also translates sequence push steps (not archived, not defined in code) missing a language. Translations someone edited, up-to-date ones and outdated ones are left alone; use sync_template_localizations on one template to retranslate it. Omit `locales` for every enabled non-primary locale. Adding a language in the dashboard already does this for that language. Translations run in the background; follow them with get_template_localization_coverage.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        locales: {
          type: "array",
          description:
            "Optional enabled non-primary locale codes to translate into. Omit for every enabled non-primary locale.",
          items: {
            type: "string",
          },
        },
      },
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
