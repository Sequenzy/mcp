import type { Tool } from "../../mcp-types.js";

export const savedFormToolDefinitions: Tool[] = [
  {
    name: "list_forms",
    description:
      "List saved signup forms for a company, including their server-managed audience settings and public action URLs.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list forms for. If not provided, uses the currently selected company.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_form",
    description:
      "Create and publish a saved signup form whose opaque formId is a client-safe public capability. The selected lists, tags, duplicate behavior, and success action stay server-side; no API key is needed in the deployed form. This creates the email/name fields only - add typed custom fields (select, textarea, hidden, ...) afterwards with update_form's blocks argument.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the form in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Internal saved-form name.",
        },
        listIds: {
          type: "array",
          description:
            "One or more list IDs that every public submission will be added to. Use list_lists to resolve IDs.",
          items: { type: "string" },
        },
        tagIds: {
          type: "array",
          description:
            "Optional existing tag IDs applied by the saved form. Use list_tags to resolve IDs.",
          items: { type: "string" },
        },
        duplicateStrategy: {
          type: "string",
          enum: ["skip", "merge", "overwrite"],
          description:
            "How to handle an existing subscriber. Defaults to skip.",
        },
        buttonText: {
          type: "string",
          description: "Optional submit button label.",
        },
        headline: {
          type: "string",
          description: "Optional form headline.",
        },
        description: {
          type: "string",
          description: "Optional supporting form copy.",
        },
        successMessage: {
          type: "string",
          description:
            "Confirmation shown after a successful submission when redirectUrl is omitted.",
        },
        redirectUrl: {
          type: "string",
          description:
            "Optional HTTP or HTTPS URL for successful submissions. Omit it to show the saved confirmation message.",
        },
        showFirstName: {
          type: "boolean",
          description: "Whether the generated form also collects first name.",
        },
        showLastName: {
          type: "boolean",
          description: "Whether the generated form also collects last name.",
        },
        theme: {
          type: "object",
          description:
            "Optional visual theme overrides so the form matches the brand instead of the default accent. Any subset of: accentColor, backgroundColor, textColor, mutedTextColor, cardColor, borderColor (all #rrggbb), borderRadius (0-32), headingFontFamily, bodyFontFamily, density (compact | balanced | spacious).",
          additionalProperties: true,
        },
      },
      required: ["name", "listIds"],
      additionalProperties: false,
    },
  },
  {
    name: "update_form",
    description:
      "Update a saved signup form: rename it, retarget its audience, edit its copy, restyle its theme, or replace its content blocks (for example to remove unwanted blocks that render publicly). Read the current content via list_forms first when editing blocks.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        formId: {
          type: "string",
          description: "Saved form ID returned by list_forms or create_form.",
        },
        name: {
          type: "string",
          description: "New internal saved-form name.",
        },
        listIds: {
          type: "array",
          description:
            "Replacement list targeting. Every public submission will be added to these lists.",
          items: { type: "string" },
        },
        tagIds: {
          type: "array",
          description:
            "Replacement tag IDs applied by the saved form. Pass an empty array to clear tags.",
          items: { type: "string" },
        },
        duplicateStrategy: {
          type: "string",
          enum: ["skip", "merge", "overwrite"],
          description: "How to handle an existing subscriber.",
        },
        headline: {
          type: "string",
          description:
            "New text for the form's first heading block. Fails if the form has no heading block; edit blocks instead.",
        },
        description: {
          type: "string",
          description:
            "New text for the form's first paragraph block. Fails if the form has no paragraph block; edit blocks instead.",
        },
        buttonText: {
          type: "string",
          description: "New submit button label.",
        },
        successMessage: {
          type: "string",
          description: "New confirmation message on the success screen.",
        },
        redirectUrl: {
          type: "string",
          description:
            "HTTP or HTTPS URL for successful submissions. Pass an empty string to switch back to the confirmation message.",
        },
        theme: {
          type: "object",
          description:
            "Visual theme overrides merged into the current theme. Any subset of: accentColor, backgroundColor, textColor, mutedTextColor, cardColor, borderColor (all #rrggbb), borderRadius (0-32), headingFontFamily, bodyFontFamily, density (compact | balanced | spacious).",
          additionalProperties: true,
        },
        blocks: {
          type: "array",
          description:
            'Full replacement for the form\'s content blocks. Fetch the current blocks from list_forms, modify them, and send the complete array - the form must keep exactly one required email field and one submit button. Blocks render in array order; every block needs a globally unique "id" and a "kind", and "sectionId" ("success" or "error") moves a content block into that screen. Layout groups use { id, kind: "group", label, layout: "stack" | "row" | "grid" | "overlay", columns (1-4), gap (0-64), padding (0-64), overlayColor (hex), overlayPosition ("top" | "center" | "bottom"), overlayShade (0-100), children: [...] }. In Overlay, gap spaces foreground children while the direct image remains the background. Overlay needs exactly one direct image; images inside subgroups only enable Overlay for that subgroup, while zero or multiple direct images fall back to Stack. Groups may nest to three levels; descendants must use the same sectionId as their group, while form-step, success-screen, and error-state remain at the root. Input blocks are kind "form-field": { id, kind: "form-field", fieldType, name, label, placeholder, required, defaultValue, showLabel, width ("full" | "half"), mapsTo, options }. fieldType is one of text, email, phone, number, textarea, select, radio, checkbox, consent, hidden. mapsTo is one of email, firstName, lastName, phone, customAttribute and defaults to customAttribute, which stores the answer under the block\'s "name" as a subscriber custom attribute (name must start with a letter and may contain letters, digits, "_", ".", "-"). select, radio, and checkbox fields require options: [{ value, label, id }] - label and id default to value when omitted. A hidden field with a defaultValue always stores that server-owned value and ignores whatever the page posts; a hidden field with an empty defaultValue stores the value the page submits. Other kinds and their properties: heading { content, level (1-3), align }, text { content, variant ("paragraph" | "eyebrow" | "caption"), align }, image { src, alt, fit ("cover" | "contain") }, button { text, url, variant, align }, divider {}, spacer { height (8-160) }, custom-html { html, height (40-1200) } - the markup goes in "html", not "content" - feature-grid { features: [{ title, description }], columns }, testimonial { testimonials: [{ quote, name, role }] }, countdown { label, endsAt }, form-step { title, description, blockIds }, submit-button { text, width }, success-screen { heading, message }, error-state { message }. Properties outside a kind\'s list are rejected rather than dropped, so a typo is reported instead of silently saving an empty block. Validation errors name the offending property, for example "blocks[3].children[0].options[0].value".',
          items: { type: "object", additionalProperties: true },
        },
      },
      required: ["formId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_form_embed",
    description:
      "Get a published saved form's action URL, one-line JavaScript embed, minimal native form action, and fetch example. Use this for Astro, Hugo, Jekyll, Cloudflare Pages, Netlify, GitHub Pages, or any browser integration.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        formId: {
          type: "string",
          description: "Saved form ID returned by list_forms or create_form.",
        },
      },
      required: ["formId"],
      additionalProperties: false,
    },
  },
];
