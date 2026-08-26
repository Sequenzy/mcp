import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const companyAndCampaignProperties = {
  companyId: {
    type: "string" as const,
    description: "Company ID. If omitted, uses the currently selected company.",
  },
  campaignId: { type: "string" as const, description: "Campaign ID." },
};

const goalProperties = {
  name: { type: "string" as const, description: "Goal name." },
  description: {
    type: ["string", "null"] as ["string", "null"],
    description: "Optional goal description.",
  },
  triggerType: {
    type: "string" as const,
    enum: ["event", "attribute_change", "tag_added"],
    description: "Conversion signal type. Defaults to event when creating.",
  },
  triggerEventName: {
    type: ["string", "null"] as ["string", "null"],
    description: "Required event name for event goals.",
  },
  triggerTagName: {
    type: ["string", "null"] as ["string", "null"],
    description: "Required tag name for tag_added goals, e.g. customer.",
  },
  attributePath: {
    type: ["string", "null"] as ["string", "null"],
    description:
      "Subscriber attribute path required for attribute_change goals.",
  },
  attributeCondition: {
    type: ["string", "null"] as ["string", "null"],
    enum: ["changed", "changed_to", "changed_from_to", null],
    description: "How the subscriber attribute must change.",
  },
  attributeValue: {
    type: ["string", "null"] as ["string", "null"],
    description: "Target value for changed_to or changed_from_to.",
  },
  attributePreviousValue: {
    type: ["string", "null"] as ["string", "null"],
    description: "Previous value required for changed_from_to.",
  },
  eventPropertyName: {
    type: ["string", "null"] as ["string", "null"],
    description: "Optional event property whose numeric value is tracked.",
  },
  eventPropertyLabel: {
    type: ["string", "null"] as ["string", "null"],
    description: "Display label for the tracked event property.",
  },
  attributionWindowHours: {
    type: "integer" as const,
    minimum: 1,
    maximum: 720,
    description: "Attribution window in whole hours.",
  },
  isActive: {
    type: "boolean" as const,
    description:
      "Whether conversion tracking is active for this goal. Defaults to true when creating.",
  },
};

export const campaignGoalToolDefinitions: Tool[] = [
  {
    name: "list_campaign_goals",
    description:
      "List persisted conversion goals attached to one email campaign in the dashboard. SMS campaigns are not supported. Campaign goals are attributed to recipients who were sent that campaign (last-touch open/click still wins when the recipient engaged), and appear on the campaign report as named conversion steps after sent/opened/clicked.",
    inputSchema: {
      type: "object",
      properties: companyAndCampaignProperties,
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_campaign_goal",
    description:
      "Create a persisted event, subscriber-attribute, or tag-applied conversion goal for one email campaign. SMS campaigns are not supported. Event goals (the default triggerType) require triggerEventName; attribute_change goals require attributePath; tag_added goals require triggerTagName. Campaign goals are attributed to recipients who were sent the campaign (opens/clicks still win when present). Use this to measure outcomes such as signup or becoming a customer on a one-off campaign. Distinct from company-wide goals and from sequence goals.",
    inputSchema: {
      type: "object",
      properties: { ...companyAndCampaignProperties, ...goalProperties },
      required: ["campaignId", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_campaign_goal",
    description:
      "Update a persisted email-campaign conversion goal, including its signal, attribution window, or active state. SMS campaigns are not supported.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyAndCampaignProperties,
        goalId: { type: "string", description: "Campaign goal ID." },
        ...goalProperties,
      },
      required: ["campaignId", "goalId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_campaign_goal",
    description:
      "Delete one persisted email-campaign conversion goal. SMS campaigns are not supported.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyAndCampaignProperties,
        goalId: { type: "string", description: "Campaign goal ID." },
      },
      required: ["campaignId", "goalId"],
      additionalProperties: false,
    },
  },
];
