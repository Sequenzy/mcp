import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const companyAndSequenceProperties = {
  companyId: {
    type: "string" as const,
    description: "Company ID. If omitted, uses the currently selected company.",
  },
  sequenceId: { type: "string" as const, description: "Sequence ID." },
};

const goalProperties = {
  name: { type: "string" as const, description: "Goal name." },
  description: {
    type: ["string", "null"] as ["string", "null"],
    description: "Optional goal description.",
  },
  triggerType: {
    type: "string" as const,
    enum: ["event", "attribute_change"],
    description: "Conversion signal type. Defaults to event when creating.",
  },
  triggerEventName: {
    type: ["string", "null"] as ["string", "null"],
    description: "Required event name for event goals.",
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
    type: "number" as const,
    minimum: 1,
    maximum: 720,
    description: "Attribution window in hours.",
  },
};

export const sequenceGoalToolDefinitions: Tool[] = [
  {
    name: "list_sequence_goals",
    description:
      "List persisted conversion goals attached to one sequence in the dashboard.",
    inputSchema: {
      type: "object",
      properties: companyAndSequenceProperties,
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_sequence_goal",
    description:
      "Create a persisted event or subscriber-attribute conversion goal for one sequence. Event goals (the default triggerType) require triggerEventName; attribute_change goals require attributePath. This is distinct from create_sequence.goal, which is only an AI content prompt.",
    inputSchema: {
      type: "object",
      properties: { ...companyAndSequenceProperties, ...goalProperties },
      required: ["sequenceId", "name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_sequence_goal",
    description:
      "Update a persisted sequence conversion goal, including its signal, attribution window, or active state.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyAndSequenceProperties,
        goalId: { type: "string", description: "Sequence goal ID." },
        ...goalProperties,
        isActive: {
          type: "boolean",
          description: "Whether conversion tracking is active for this goal.",
        },
      },
      required: ["sequenceId", "goalId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_sequence_goal",
    description: "Delete one persisted sequence conversion goal.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyAndSequenceProperties,
        goalId: { type: "string", description: "Sequence goal ID." },
      },
      required: ["sequenceId", "goalId"],
      additionalProperties: false,
    },
  },
];
