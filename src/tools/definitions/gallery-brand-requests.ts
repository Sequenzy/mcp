import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

/**
 * Asking for brands (usually competitors) to be added to the Sequenzy email
 * gallery, the same as Suggest a brand in the dashboard's gallery picker.
 */
export const galleryBrandRequestToolDefinitions: Tool[] = [
  {
    name: "list_gallery_brand_requests",
    description:
      "List this company's requests to add brands (usually competitors) to the Sequenzy email gallery, newest first. Each has a status: requested (not added yet), collecting (the brand is added and its emails are being collected), available (its emails are in the gallery; brand.url links to them and list_email_references can return them) or declined (with declineReason). Requires templates:read.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "request_gallery_brand",
    description:
      "Ask for a brand, usually a competitor, to be added to the Sequenzy email gallery so its real emails can be used as references. Pass its website or domain. Asking again for the same domain keeps the one request (a new note replaces the old) and returns created false. If the brand is already in the gallery, the request comes back with status available. A company can keep up to 50 requests. It is not your own website. Requires templates:write.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        website: {
          type: "string",
          description:
            "The brand's website or domain, such as competitor.com or https://competitor.com/pricing.",
        },
        note: {
          type: "string",
          description:
            "Optional, up to 300 characters: what you want to see from them, such as their onboarding emails.",
        },
      },
      required: ["website"],
    },
  },
  {
    name: "remove_gallery_brand_request",
    description:
      "Withdraw one of this company's brand requests by id (from list_gallery_brand_requests). The brand stays in the gallery if it was already added. Requires templates:write.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        id: { type: "string", description: "The brand request ID." },
      },
      required: ["id"],
    },
  },
];
