import type { Tool } from "@modelcontextprotocol/sdk/types.js";

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
      "Create and publish a saved signup form whose opaque formId is a client-safe public capability. The selected lists, tags, duplicate behavior, and success action stay server-side; no API key is needed in the deployed form.",
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
      },
      required: ["name", "listIds"],
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
