import type { Tool } from "../../mcp-types.js";

/**
 * Email gallery examples to model a new email on: from brands like the
 * company or the whole gallery. Same contract as the dashboard's new email
 * pickers' Gallery tab.
 */
export const emailReferenceToolDefinitions: Tool[] = [
  {
    name: "list_email_references",
    description:
      "List real emails from the Sequenzy email gallery to model a new email on, for the kind of email being written: campaign (promotions, newsletters, product updates), sequence (lifecycle emails plus whole sequences) or transactional. By default (scope similar) they come from the gallery brands most like the company: brands whose businesses (what each sells, and to whom) are closest in meaning to the company description, closest first (returned as brands; rankings are reused for up to 10 minutes). To rank them, the company description and any search text are sent to an embeddings service; nothing is saved. Each item has a gallery url that create_template_from_example (or create_sequence_from_example for a sequence) accepts, and emails carry an analysis (main button, length, layout, voice, structure and why it works; null until analyzed) to choose a model by. With scope all it browses the whole gallery instead; search narrows either. profile is missing (and the list empty) when the company has no description or company context yet; use scope all then. Requires templates:read.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        kind: {
          type: "string",
          description: "campaign, sequence or transactional. Required.",
        },
        scope: {
          type: "string",
          description:
            "similar (default): emails from the gallery brands most like the company. all: the whole Sequenzy email gallery for this kind of email, a page at a time.",
        },
        search: {
          type: "string",
          description:
            "Optional words to search the emails by meaning, up to 80 characters, e.g. 'black friday countdown'.",
        },
        page: {
          type: "number",
          description:
            "Page of results when scope is all or search is set (pageCount says how many). Defaults to 1.",
        },
        subtype: {
          type: "string",
          description:
            "Optional gallery subtype to list first, e.g. password_reset, receipt, welcome or abandoned_cart. Only for scope similar without search.",
        },
        limit: {
          type: "number",
          description:
            "Most emails to return, 1-60, defaults to 24, for scope similar without search (otherwise pages hold the gallery page size). Also caps the sequences returned.",
        },
      },
      required: ["kind"],
    },
  },
];
