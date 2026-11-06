import type { Tool } from "../../mcp-types.js";

const id = { type: "string", minLength: 1, maxLength: 128 };
const ids = { type: "array", items: id, maxItems: 100000 };

export const createCampaignForAudienceTool: Tool = {
  name: "create_campaign_for_audience",
  description:
    "Create a blank campaign draft for selected contacts, a complete filtered contact group, or a complete email-activity drilldown. Saves a frozen, distinct group of up to 100,000 contacts (8 MiB); does not send email. Requires campaigns:write and subscribers:read, plus analytics:read for activity. Returns selectedCount and currently eligibleCount. Review/update the draft and schedule separately. Existing get_campaign, get_campaign_audience and update_campaign read, replace or clear targetLists.",
  inputSchema: {
    type: "object",
    properties: {
      companyId: { type: "string" },
      name: { type: "string", minLength: 1, maxLength: 255 },
      selection: {
        type: "object",
        properties: {
          source: {
            type: "string",
            enum: ["contacts", "email_activity"],
            description:
              "Provide only the matching contacts or activity object.",
          },
          contacts: {
            type: "object",
            properties: {
              subscriberIds: {
                ...ids,
                minItems: 1,
                description:
                  "Explicit selected IDs, all owned by this company. Omit to select all matching contacts.",
              },
              excludedSubscriberIds: ids,
              filters: {
                type: "array",
                maxItems: 100,
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
                description:
                  "Subscriber filters. Mutually exclusive with root and segmentId.",
              },
              root: {
                type: "object",
                properties: {
                  kind: { type: "string", enum: ["group"] },
                  id: { type: "string" },
                  joinOperator: { type: "string", enum: ["and", "or"] },
                  children: { type: "array", items: { type: "object" } },
                },
                required: ["kind", "id", "joinOperator", "children"],
                description:
                  "Nested subscriber filter tree, maximum depth 8. Mutually exclusive with filters and segmentId.",
              },
              filterJoinOperator: { type: "string", enum: ["and", "or"] },
              activeOnly: { type: "boolean" },
              search: { type: "string", maxLength: 500 },
              listId: id,
              segmentId: {
                ...id,
                description:
                  "Saved segment. Do not also provide filters or root.",
              },
            },
            additionalProperties: false,
          },
          activity: {
            type: "object",
            properties: {
              eventType: {
                type: "string",
                enum: [
                  "send",
                  "delivery",
                  "open",
                  "click",
                  "bounce",
                  "unsubscribe",
                ],
              },
              campaignId: id,
              automationId: id,
              automationNodeId: id,
              transactionalId: id,
              audience: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["list", "segment"] },
                  id,
                },
                required: ["type", "id"],
                additionalProperties: false,
              },
              period: {
                type: "string",
                enum: ["all", "1h", "24h", "7d", "30d", "90d"],
              },
              includeMachineEngagement: { type: "boolean" },
              search: { type: "string", maxLength: 200 },
              bounceType: {
                type: "string",
                enum: ["Permanent", "Transient", "Soft", "Blocked"],
                description:
                  "Only for bounce activity. Transient is every temporary bounce; Blocked is the part the receiver refused on content, policy, or reputation grounds, and Soft is the rest.",
              },
              bounceSubType: {
                type: "string",
                maxLength: 100,
                description: "Only for bounce activity.",
              },
              mailboxProvider: { type: "string", minLength: 1, maxLength: 100 },
            },
            required: ["eventType"],
            additionalProperties: false,
            description:
              "Choose at most one campaign/automation/node/transactional source. With no source, audience is required. An audience can also narrow a source. Includes every matching contact across pages. Marketers can use only marketing email sources.",
          },
        },
        required: ["source"],
        additionalProperties: false,
      },
    },
    required: ["selection"],
    additionalProperties: false,
  },
};
