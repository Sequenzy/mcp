import type { Tool } from "../../mcp-types.js";

const exampleProperties = {
  companyId: {
    type: "string",
    description:
      "Company ID. If not provided, uses the currently selected company.",
  },
  url: {
    type: "string",
    description:
      "Email gallery page URL. Provide either url, or brand plus the example slug; not both.",
  },
  brand: {
    type: "string",
    description:
      "Gallery brand slug from the URL (/email-examples/brands/{brand}/...). Use with the example slug instead of url.",
  },
  brief: {
    type: "string",
    description:
      "Optional direction, up to 1000 characters, such as an offer or feature to highlight. Takes priority over the example.",
  },
  name: {
    type: "string",
    description: "Optional name, up to 200 characters, for what is created.",
  },
} as const;

/**
 * Remixing public email gallery examples (sequenzy.com/email-examples) into
 * the workspace. Same contract and results as the dashboard's "Remix this
 * email" and "Clone this sequence" flows.
 */
export const galleryExampleToolDefinitions: Tool[] = [
  {
    name: "create_template_from_example",
    description:
      "Remix a public Sequenzy email gallery email into a new email template for this company. The new email keeps the example's exact layout and design; AI rewrites every piece of text for the company and its logo, brand color and links are swapped in. The example brand is never named and none of its copy, offers or claims are reused. Saved as an HTML template. Requires templates:write. Takes 5-20 seconds. Creates no template if generation fails (a company's first AI generation still saves its inferred email design direction); each successful call creates another template. Accepts a gallery email URL (https://sequenzy.com/email-examples/brands/{brand}/emails/{email}, or for an email in a sequence the sequence page URL ending in #email-{email}) or brand plus email slugs. For a whole sequence use create_sequence_from_example.",
    inputSchema: {
      type: "object",
      properties: {
        ...exampleProperties,
        email: {
          type: "string",
          description:
            "Gallery email slug from the URL (/emails/{email}). Use with brand instead of url.",
        },
      },
    },
  },
  {
    name: "preview_template_from_example",
    description:
      "Preview how a public Sequenzy email gallery email would read for this company without saving any email (a company's first AI generation saves its inferred email design direction, like generate_email): the same rewrite as create_template_from_example (the example's layout, every word written for the company, its logo, brand color and links swapped in), returned as subject, previewText and HTML. Pass website to write it for another site's brand instead, such as a prospect or client; it is looked up like the gallery's public preview. Requires templates:write. Takes 5-20 seconds. Call create_template_from_example to keep it as a template. Accepts a gallery email URL or brand plus email slugs.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: exampleProperties.companyId,
        url: exampleProperties.url,
        brand: exampleProperties.brand,
        brief: exampleProperties.brief,
        email: {
          type: "string",
          description:
            "Gallery email slug from the URL (/emails/{email}). Use with brand instead of url.",
        },
        website: {
          type: "string",
          description:
            "Optional site or domain, like acme.com, to write the preview for instead of this company's own brand.",
        },
      },
    },
  },
  {
    name: "preview_sequence_from_example",
    description:
      "Preview the first 3 emails of a public Sequenzy email gallery sequence written for this company, without creating a sequence or email (a company's first AI generation saves its inferred email design direction, like generate_email). Each email keeps the example's layout with every word rewritten; returns subject, previewText, HTML and the original day for each, plus how many emails were left out. Pass website to write it for another site's brand instead. Requires sequences:write. Takes 10-30 seconds. Call create_sequence_from_example to create the draft sequence with every email. Accepts a gallery sequence URL or brand plus sequence slugs.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: exampleProperties.companyId,
        url: exampleProperties.url,
        brand: exampleProperties.brand,
        brief: exampleProperties.brief,
        sequence: {
          type: "string",
          description:
            "Gallery sequence slug from the URL (/sequences/{sequence}). Use with brand instead of url.",
        },
        website: {
          type: "string",
          description:
            "Optional site or domain, like acme.com, to write the preview for instead of this company's own brand.",
        },
      },
    },
  },
  {
    name: "create_sequence_from_example",
    description:
      "Clone a public Sequenzy email gallery sequence into a draft sequence for this company, with the example's trigger family (signup, abandoned cart, order placed, or inactive tag) and send timing, up to 12 emails (the first 12 unless stepNumbers picks which; each kept email keeps its original timing from the trigger). AI then writes every email in the company's brand in the background (usually 30-60 seconds); poll get_sequence until enrichmentStatus is complete. If this tool returns enrichmentStatus not_queued with a warning, the draft exists but writing did not start: open it in the dashboard and do not call this tool again. The sequence stays a draft and sends nothing until enabled. Requires sequences:write. Each call creates another sequence. Accepts a gallery sequence URL (https://sequenzy.com/email-examples/brands/{brand}/sequences/{sequence}) or brand plus sequence slugs.",
    inputSchema: {
      type: "object",
      properties: {
        ...exampleProperties,
        sequence: {
          type: "string",
          description:
            "Gallery sequence slug from the URL (/sequences/{sequence}). Use with brand instead of url.",
        },
        stepNumbers: {
          type: "array",
          items: { type: "integer", minimum: 1 },
          description:
            "Optional: which of the example's emails to clone, as 1-based positions in the gallery sequence (Email 1, Email 2, ...), 1 to 12 distinct positions. Defaults to the first 12. These are positions in the example, not the stepNumber of the created sequence's steps.",
        },
        emailStyle: {
          type: "string",
          enum: ["visual", "plain"],
          description:
            "Generated email style. Defaults to the company's email style preference.",
        },
      },
    },
  },
];
