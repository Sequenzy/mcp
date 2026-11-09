import type { Tool } from "../../mcp-types.js";

const baseProperties = {
  companyId: {
    type: "string" as const,
    description: "Company ID. If omitted, uses the currently selected company.",
  },
  sequenceId: {
    type: "string" as const,
    description: "Sequence with an inbound_webhook trigger.",
  },
};

export const sequenceInboundWebhookToolDefinitions: Tool[] = [
  {
    name: "get_sequence_inbound_webhook",
    description:
      "Read the usable URL, mapping, sample payload, and setup status for a sequence inbound webhook. mappingCheck reports whether the mapping finds an email in the last received payload: email_not_found means webhooks are answered but skipped without creating subscribers, and missingFields lists mapped paths absent from that payload.",
    inputSchema: {
      type: "object",
      properties: baseProperties,
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "configure_sequence_inbound_webhook",
    description:
      "Create or update the secret endpoint attached to a sequence inbound_webhook trigger. On first setup, omitted mapping/sample inputs apply the selected catalog or custom integration defaults; on later calls, omitted inputs keep the saved values, so a captured sample survives mapping-only updates. Use clearFieldMapping to return to pending setup and clearSamplePayload to drop the saved sample. Map paths from the payload the endpoint actually receives, not the source app's documented format, since relays often wrap or flatten it; check mappingCheck in the response.",
    inputSchema: {
      type: "object",
      properties: {
        ...baseProperties,
        fieldMapping: {
          type: "object",
          properties: {
            email: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            properties: {
              type: "object",
              additionalProperties: { type: "string" },
            },
          },
          required: ["email"],
          additionalProperties: false,
        },
        samplePayload: {
          type: "object",
          description: "Representative raw webhook payload for mapping setup.",
          additionalProperties: true,
        },
        clearFieldMapping: {
          type: "boolean",
          description:
            "Set true to clear the saved mapping and return the endpoint to pending_setup.",
        },
        clearSamplePayload: {
          type: "boolean",
          description: "Set true to clear the saved sample payload.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "rotate_sequence_inbound_webhook_secret",
    description:
      "Rotate the inbound webhook secret and return a new URL. The previous URL stops working immediately.",
    inputSchema: {
      type: "object",
      properties: baseProperties,
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
];
