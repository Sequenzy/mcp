import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string" as const,
  description: "Company ID override; otherwise uses the selected company.",
};
const operationId = {
  type: "string" as const,
  description: "ID returned by start_subscriber_operation.",
};

export const subscriberOperationToolDefinitions: Tool[] = [
  {
    name: "start_subscriber_operation",
    description:
      "Add tags to a whole filtered audience in the background. Returns a durable operation ID; poll get_subscriber_operation or list_subscriber_operations. Reuse requestKey after an uncertain response; changing inputs with the same key is rejected. Tagging needs subscribers:tag, new definitions need tags:write, and triggerAutomations needs automations:trigger. Existing synchronous bulk tag tools remain suitable for up to 500 explicit contacts.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        kind: {
          type: "string",
          enum: ["add_tags"],
          description: "Type of background operation.",
        },
        requestKey: {
          type: "string",
          description: "Required unique idempotency key for this request.",
        },
        audience: {
          type: "object",
          description:
            "Omit for all contacts. Provide either root or filters. Contacts are selected in live bounded pages before applying tags; contacts created after the request are excluded.",
          properties: {
            subscriberIds: {
              type: "array",
              items: { type: "string" },
              description: "Up to 1,000 explicit subscriber IDs.",
            },
            filters: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  field: { type: "string" },
                  operator: { type: "string" },
                  value: { type: "string" },
                },
                required: ["id", "field", "operator", "value"],
              },
            },
            root: {
              type: "object",
              properties: {
                kind: { type: "string" },
                id: { type: "string" },
                joinOperator: { type: "string" },
                children: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {},
                    additionalProperties: true,
                  },
                },
              },
              description: "Nested filter group, maximum depth eight.",
            },
            filterJoinOperator: { type: "string", enum: ["and", "or"] },
            activeOnly: { type: "boolean" },
            search: { type: "string" },
            listId: { type: "string" },
          },
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Required for add_tags: 1 to 25 tag names.",
        },
        triggerAutomations: {
          type: "boolean",
          description: "add_tags only; defaults to false.",
        },
      },
      required: ["kind", "requestKey", "tags"],
    },
  },
  {
    name: "list_subscriber_operations",
    description:
      "List the company's 20 most recent background tagging operations, including progress and failures.",
    inputSchema: { type: "object", properties: { companyId } },
  },
  {
    name: "get_subscriber_operation",
    description:
      "Read background operation progress and state. A completed tagging operation may have per-contact failures; inspect failed and failures.",
    inputSchema: {
      type: "object",
      properties: { companyId, operationId },
      required: ["operationId"],
    },
  },
  {
    name: "cancel_subscriber_operation",
    description:
      "Stop future work for a queued/running tagging operation. Already applied tags are retained. Tagging cancellation requires subscriber tagging access.",
    inputSchema: {
      type: "object",
      properties: { companyId, operationId },
      required: ["operationId"],
    },
  },
];
