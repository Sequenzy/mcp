import { APP_RESOURCE_URI } from "../../app-resource.js";
import type { Tool } from "../../mcp-types.js";

export const appToolDefinitions: Tool[] = [
  {
    name: "preview_sequence",
    description:
      "Show an interactive visual preview of a saved sequence in clients that support MCP Apps. Displays its real nodes, connections, delays and branches; click an email step to preview its saved rendered email, including available A/B variants, at desktop or mobile width. Read-only: does not activate, enroll or send. Requires an explicit companyId to keep step previews pinned to the same company. Other clients receive the sequence data; use render_email for individual step HTML.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          minLength: 1,
          description:
            "Target company ID from get_account. Remains fixed for all previews in this view.",
        },
        sequenceId: {
          type: "string",
          minLength: 1,
          description: "Saved sequence ID.",
        },
      },
      required: ["companyId", "sequenceId"],
      additionalProperties: false,
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  },
  ...["open_image_upload", "monitor_subscriber_import"].map((name): Tool => ({
    name,
    description:
      name === "open_image_upload"
        ? "Open a compact image picker as a supporting workflow for email creation. Opening does not upload anything; the user chooses an image and explicitly submits it through upload_image_asset. Requires an explicit companyId. Clients without MCP Apps can use upload_image_asset directly."
        : "Show a compact progress card for an existing subscriber import. Reads immediately, then polls get_subscriber_import every five seconds for up to five minutes while running. Refresh resumes monitoring. Requires explicit companyId and importId. Does not start or retry an import. Other clients receive the import data.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          minLength: 1,
          description: "Pinned target company ID from get_account.",
        },
        ...(name === "monitor_subscriber_import"
          ? {
              importId: {
                type: "string",
                minLength: 1,
                description: "Existing subscriber import ID.",
              },
            }
          : {}),
      },
      required:
        name === "open_image_upload"
          ? ["companyId"]
          : ["companyId", "importId"],
      additionalProperties: false,
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  })),
];
