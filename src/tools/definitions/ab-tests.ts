import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  blockFieldWarningsHint,
  rawHtmlContentDescription,
  replacementEmailBlocksDescription,
  includeMachineEngagementToolProperty,
} from "../internal.js";

export const abTestToolDefinitions: Tool[] = [
  // ============================================================================
  // A/B Tests
  // ============================================================================
  {
    name: "list_ab_tests",
    description: "List A/B tests and their variants",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Optional sequence ID to filter automation A/B tests.",
        },
      },
    },
  },
  {
    name: "get_ab_test",
    description:
      "Get A/B test details, variants, and per-locale localization sync status. This is how you read the email copy of a sequence step whose nodeType is action_ab_test: the blocks live on each variant here, not on the sequence node, and get_sequence reports the abTestId to pass in.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
      },
      required: ["abTestId"],
    },
  },
  {
    name: "get_ab_test_stats",
    description:
      "Get A/B test aggregate stats and per-variant stats. Supports period or custom start/end ranges.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        period: {
          type: "string",
          description: "Optional period: 1h, 24h, 7d, 30d, or 90d.",
        },
        start: {
          type: "string",
          description: "Custom range start as ISO 8601. Requires end.",
        },
        end: {
          type: "string",
          description: "Custom range end as ISO 8601. Requires start.",
        },
        includeMachineEngagement: includeMachineEngagementToolProperty,
      },
      required: ["abTestId"],
    },
  },
  {
    name: "restart_ab_test",
    description:
      "Run another sequence A/B test after a winner is selected. By default the winner becomes the new control; pass sourceVariantId to use another variant as the control email.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID to restart",
        },
        sourceVariantId: {
          type: "string",
          description:
            "Optional variant ID to use as the new control email. Defaults to the selected winner.",
        },
        testType: {
          type: "string",
          description: "Optional test type: subject or content.",
        },
        winnerThreshold: {
          type: "number",
          description:
            "Optional number of subscribers before selecting a winner. Must be from 10 to 1000.",
        },
        variantCount: {
          type: "number",
          description:
            "Optional total variants including the control. Must be from 2 to 4.",
        },
      },
      required: ["abTestId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_ab_test_variant",
    description:
      "Update an A/B test variant, including the email body of a sequence step whose nodeType is action_ab_test - that content cannot be edited through update_sequence_node, and a change meant for the whole step has to be repeated on every variant. Campaign variants are editable only in draft. Sequence variants can be edited after activity with confirmLiveChange, but earlier sends stay unchanged and combined results may no longer be accurate. Provide at least one of subject, previewText, html, or blocks. Use either html or blocks, not both.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        variantId: {
          type: "string",
          description: "A/B test variant ID",
        },
        subject: {
          type: "string",
          description: "Variant subject line",
        },
        previewText: {
          type: "string",
          description:
            "Variant preview text. Pass an empty string to clear it.",
        },
        html: {
          type: "string",
          description: `Replacement HTML body. Mutually exclusive with blocks. ${rawHtmlContentDescription}`,
        },
        blocks: {
          type: "array",
          description: `${replacementEmailBlocksDescription}${blockFieldWarningsHint} Mutually exclusive with html.`,
          items: {
            type: "object",
          },
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required as true when the sequence is active, the test is no longer a draft, or it has recorded activity. The edit affects future sends and can make combined results inaccurate.",
        },
      },
      required: ["abTestId", "variantId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_ab_test",
    description:
      "Update A/B test settings. Campaign tests use testPercentage, testDurationMinutes, and winnerCriteria. Sequence tests use testType, winnerThreshold, and winnerCriteria; changing live or already-used sequence settings requires confirmLiveChange. Provide at least one setting.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        name: {
          type: "string",
          description: "Optional A/B test name.",
        },
        testPercentage: {
          type: "number",
          description:
            "Campaign-only percentage of the audience used for the test phase, from 5 to 50.",
        },
        testDurationMinutes: {
          type: "number",
          description:
            "Campaign-only test duration in minutes, from 15 to 1440.",
        },
        winnerCriteria: {
          type: "string",
          enum: ["open_rate", "click_rate"],
          description:
            "Winner selection criteria. Applies to both campaign and sequence tests.",
        },
        testType: {
          type: "string",
          enum: ["subject", "content"],
          description:
            "Sequence-only variant strategy. When winnerCriteria is omitted, subject defaults to open_rate and content defaults to click_rate.",
        },
        winnerThreshold: {
          type: "number",
          description:
            "Sequence-only number of recipients before selecting a winner, from 10 to 1000.",
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required as true when sequence settings affect an active test or a test with recorded activity.",
        },
      },
      required: ["abTestId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_ab_test",
    description:
      "Create a campaign A/B test or convert a sequence email node into a typed A/B test node. Provide exactly one of campaignId or automationNodeId. Control variant A is created automatically from the current email. Campaign tests may add variants later; automationNodeId conversions require at least one variants[] entry to compete with control variant A. A conversion moves that step's copy off the sequence node and onto the test's variants: from then on update_sequence_node cannot edit its subject, previewText, or blocks, and every content change has to be applied per variant with update_ab_test_variant (get_ab_test lists them). The response echoes this in contentEditing.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description:
            "Draft campaign ID. Mutually exclusive with automationNodeId.",
        },
        automationNodeId: {
          type: "string",
          description:
            "Sequence email-node ID to convert to action_ab_test. Mutually exclusive with campaignId.",
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required as true when converting an email node in an active sequence.",
        },
        name: {
          type: "string",
          description: "Optional A/B test name.",
        },
        testPercentage: {
          type: "number",
          description:
            "Campaign-only percentage of the audience used for the test phase, from 5 to 50. Defaults to 20. Sequence tests use winnerThreshold instead.",
        },
        testDurationMinutes: {
          type: "number",
          description:
            "Campaign-only test phase duration in minutes, from 15 to 1440. Defaults to 240. Sequence tests select after winnerThreshold recipients instead.",
        },
        winnerCriteria: {
          type: "string",
          enum: ["open_rate", "click_rate"],
          description:
            "Winner selection criteria. Campaign tests default to open_rate. For sequence tests, an explicit value overrides the testType default.",
        },
        testType: {
          type: "string",
          enum: ["subject", "content"],
          description:
            "Sequence A/B test variant strategy. Subject defaults to open_rate and content defaults to click_rate unless winnerCriteria is explicit. Defaults to content.",
        },
        winnerThreshold: {
          type: "number",
          description:
            "Sequence test sample size from 10 to 1000. Defaults to 100.",
        },
        variants: {
          type: "array",
          maxItems: 4,
          description:
            "Extra variants to create in addition to control variant A. Optional for campaign tests; automationNodeId conversions require at least one entry.",
          items: {
            type: "object",
            properties: {
              subject: {
                type: "string",
                description: "Variant subject line.",
              },
              previewText: {
                type: "string",
                description: "Variant preview text.",
              },
              blocks: {
                type: "array",
                description: `${replacementEmailBlocksDescription}${blockFieldWarningsHint}`,
                items: { type: "object" },
              },
            },
            required: ["subject"],
          },
        },
      },
    },
  },
  {
    name: "add_ab_test_variant",
    description:
      "Add a variant to a draft campaign or sequence A/B test. Sequence variants receive their own editable email template. Variants cannot be added after the test has started. Sequence tests whose parent sequence is active require confirmLiveChange.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        subject: {
          type: "string",
          description: "Variant subject line.",
        },
        previewText: {
          type: "string",
          description: "Variant preview text.",
        },
        blocks: {
          type: "array",
          description: `${replacementEmailBlocksDescription}${blockFieldWarningsHint}`,
          items: { type: "object" },
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required as true when the A/B test belongs to an active sequence, because new variants immediately enter the live rotation.",
        },
      },
      required: ["abTestId", "subject"],
    },
  },
  {
    name: "delete_ab_test_variant",
    description:
      "Permanently delete a variant from a draft campaign or sequence A/B test. This cannot be undone. Variant A is the control and cannot be deleted, and the test must keep at least the minimum number of variants. Variants cannot be removed after the test has started. Sequence tests whose parent sequence is active require confirmLiveChange.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID",
        },
        variantId: {
          type: "string",
          description: "A/B test variant ID to delete.",
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required as true when the A/B test belongs to an active sequence, because deletion immediately changes the live rotation.",
        },
      },
      required: ["abTestId", "variantId"],
    },
  },
  {
    name: "delete_ab_test",
    description:
      "Permanently delete a campaign A/B test and all of its variants. This cannot be undone. Running tests (testing or winner_selected) cannot be deleted, and the linked campaign must be in draft or rejected status.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        abTestId: {
          type: "string",
          description: "A/B test ID to delete.",
        },
      },
      required: ["abTestId"],
    },
  },
];
