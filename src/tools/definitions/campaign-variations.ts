import { APP_RESOURCE_URI } from "../../app-resource.js";
import type { Tool } from "../../mcp-types.js";
import { emailBlocksDescription } from "../internal.js";

const campaignProperties = {
  companyId: {
    type: "string" as const,
    description: "Company ID. If omitted, uses the currently selected company.",
  },
  campaignId: {
    type: "string" as const,
    description: "Email campaign ID.",
  },
};

const variationIdProperty = {
  variationId: { type: "string" as const, description: "Variation ID." },
};

const contentProperties = {
  blocks: {
    type: "array" as const,
    description: `${emailBlocksDescription} Send blocks or html, not both.`,
    items: { type: "object" as const },
  },
  html: {
    type: "string" as const,
    description: "HTML converted to blocks. Use instead of blocks.",
  },
  summary: {
    type: ["string", "null"] as ["string", "null"],
    description: "What this version changes, up to 500 characters.",
  },
  subject: {
    type: ["string", "null"] as ["string", "null"],
    description:
      "Subject this variation uses. null keeps the email's subject when it is used.",
  },
  previewText: {
    type: ["string", "null"] as ["string", "null"],
    description: "Preview text this variation uses. null keeps the email's.",
  },
};

const lookProperties = {
  emailTheme: {
    type: ["object", "null"] as ["object", "null"],
    description:
      "The variation's own email theme (presetId, colors, typography, layout); a partial theme is completed with defaults. null uses the email's theme. Using the variation puts its theme on the email.",
  },
  fontFamily: {
    type: ["string", "null"] as ["string", "null"],
    description:
      "The variation's own body font stack. null uses the email's font.",
  },
};

const styleProperty = {
  style: {
    type: "string" as const,
    enum: ["close", "fresh", "bold"],
    description:
      "How far to move from the source: close edits it and keeps its style and structure; fresh writes each version anew with its own structure in the brand's colors and fonts; bold also gives each its own look (a theme of its own). Defaults to close for branches of a variation and fresh otherwise.",
  },
};

const VARIATIONS_INTRO =
  "Variations are alternative versions of a campaign's email, compared side by side on the editor's Canvas tab. They never change what the campaign sends until use_campaign_variation. Labels: V1, V2, ... for versions of the email, V2.1, V2.2, ... for branches of V2.";

export const campaignVariationToolDefinitions: Tool[] = [
  {
    name: "list_campaign_variations",
    description: `${VARIATIONS_INTRO} Lists the campaign's variations oldest first with status (generating, ready, failed), parentId (nearest variation it descends from that is not discarded), blocks, emailTheme and fontFamily (its own look, or null for the email's), position (where the user placed it on the canvas, or null), and inUse (the email currently has exactly this content). Discarded variations are not listed. Poll this after generate_campaign_variations until no variation is generating; one still generating after 10 minutes is reported as failed.`,
    inputSchema: {
      type: "object",
      properties: campaignProperties,
      required: ["campaignId"],
      additionalProperties: false,
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  },
  {
    name: "get_campaign_variation",
    description:
      "Get one campaign variation, including its status while it generates and its blocks once ready. Discarded variations are not found.",
    inputSchema: {
      type: "object",
      properties: { ...campaignProperties, ...variationIdProperty },
      required: ["campaignId", "variationId"],
      additionalProperties: false,
    },
  },
  {
    name: "generate_campaign_variations",
    description: `${VARIATIONS_INTRO} Starts generating 1-4 variations with AI and returns them at once with status generating; it does not wait. Each takes its own direction planned from the prompt, so they differ; style sets how far they move. The source is the email's saved content, or parentVariationId (must be ready; the new ones are its branches). Poll list_campaign_variations or get_campaign_variation until each is ready or failed (usually under a minute). Variations succeed or fail independently; a retry is a new request that creates new variations. An email can have at most 8 generating at once; wait for them instead of retrying.`,
    inputSchema: {
      type: "object",
      properties: {
        ...campaignProperties,
        prompt: {
          type: "string",
          description:
            'Direction for the new versions, any language, up to 2000 characters. Name specific versions ("one formal, one playful") to get exactly those.',
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 4,
          description: "How many variations. Defaults to 3.",
        },
        parentVariationId: {
          type: ["string", "null"],
          description: "Derive from this variation instead of the email.",
        },
        ...styleProperty,
      },
      required: ["campaignId", "prompt"],
      additionalProperties: false,
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  },
  {
    name: "create_campaign_variation",
    description:
      "Save content as a new ready campaign variation, for example a copy of a version to take in another direction. Send blocks or html. The campaign email does not change. Pass parentVariationId to save it as a branch of that variation.",
    inputSchema: {
      type: "object",
      properties: {
        ...campaignProperties,
        name: {
          type: "string",
          description: "Variation name, 1-120 characters.",
        },
        ...contentProperties,
        parentVariationId: {
          type: ["string", "null"],
          description: "The variation this one is derived from.",
        },
        ...lookProperties,
      },
      required: ["campaignId", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_campaign_variation",
    description:
      "Rename a campaign variation, replace its content (blocks or html, subject, previewText, emailTheme, fontFamily) or move it on the canvas (position). Content can only change once the variation is ready. To change it with AI instead, use edit_campaign_variation. To apply a section option from generate_campaign_variation_section_options, swap its replacement blocks into the variation's blocks by id and send the full blocks array here. Never changes the campaign email.",
    inputSchema: {
      type: "object",
      properties: {
        ...campaignProperties,
        ...variationIdProperty,
        name: { type: "string", description: "New name, 1-120 characters." },
        ...contentProperties,
        ...lookProperties,
        position: {
          type: ["object", "null"],
          description:
            "Where the variation sits on the editor canvas, as {x, y} in canvas pixels. null lets the canvas place it automatically. Moving it does not change updatedAt.",
          properties: {
            x: { type: "number" },
            y: { type: "number" },
          },
        },
      },
      required: ["campaignId", "variationId"],
      additionalProperties: false,
    },
  },
  {
    name: "discard_campaign_variation",
    description:
      "Discard a campaign variation. It leaves the list and its branches move up to its parent; restore_campaign_variation undoes this.",
    inputSchema: {
      type: "object",
      properties: { ...campaignProperties, ...variationIdProperty },
      required: ["campaignId", "variationId"],
      additionalProperties: false,
    },
  },
  {
    name: "restore_campaign_variation",
    description:
      "Bring back a discarded campaign variation with its label; its branches move back under it.",
    inputSchema: {
      type: "object",
      properties: { ...campaignProperties, ...variationIdProperty },
      required: ["campaignId", "variationId"],
      additionalProperties: false,
    },
  },
  {
    name: "use_campaign_variation",
    description:
      "Put a ready variation's content in the campaign email (blocks, plus subject and preview text when the variation has its own). Draft campaigns only. If the email's current content is not already a variation, it is saved first as a new variation named \"Before <label>\" and returned as savedPrevious, so the previous version is never lost. Translations are re-derived from the new content.",
    inputSchema: {
      type: "object",
      properties: { ...campaignProperties, ...variationIdProperty },
      required: ["campaignId", "variationId"],
      additionalProperties: false,
    },
  },
  {
    name: "generate_campaign_variation_section_options",
    description:
      "Generate 1-4 alternative versions of selected sections (top-level blocks) of the campaign email or of one ready variation. Saves no variation or email content (a company's first AI generation saves its inferred email design direction, like generate_email): each option has name, summary and replacements (new versions of the selected blocks with the same ids). Changes outside the selected sections are dropped, and options that change nothing are left out. Runs synchronously and can take up to a minute. Apply one with update_campaign_variation.",
    inputSchema: {
      type: "object",
      properties: {
        ...campaignProperties,
        variationId: {
          type: "string",
          description:
            "Vary this variation's sections. Omit to vary the email's saved content.",
        },
        sectionIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 50,
          description: "Ids of top-level blocks to vary.",
        },
        prompt: {
          type: "string",
          description: "What should change, any language.",
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 4,
          description: "How many options. Defaults to 3.",
        },
        ...styleProperty,
      },
      required: ["campaignId", "sectionIds", "prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "edit_campaign_variation",
    description:
      "Change one ready campaign variation with AI and save the result over it, like an edit in the editor: the prompt says what to change, in any language. With sectionIds only those top-level blocks change. A whole-variation edit may also give it its own emailTheme and fontFamily. Runs synchronously and can take up to a minute. Fails with 409 if the variation is not ready or changed while the AI was editing it, and with 400 when the AI changed nothing (the error explains why). Never changes the campaign email; use_campaign_variation does.",
    inputSchema: {
      type: "object",
      properties: {
        ...campaignProperties,
        ...variationIdProperty,
        prompt: {
          type: "string",
          description:
            "What should change, any language, up to 2000 characters.",
        },
        sectionIds: {
          type: "array",
          items: { type: "string" },
          maxItems: 50,
          description:
            "Only change these top-level blocks. Omit to change the whole variation.",
        },
      },
      required: ["campaignId", "variationId", "prompt"],
      additionalProperties: false,
    },
  },
];
