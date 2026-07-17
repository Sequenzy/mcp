import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  rawHtmlContentWarning,
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
      "Get A/B test details, variants, and per-locale localization sync status",
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
      "Update a draft A/B test variant. Provide at least one of subject, previewText, html, or blocks. Use either html or blocks, not both.",
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
          description: `Replacement HTML body. Mutually exclusive with blocks. ${rawHtmlContentWarning}`,
        },
        blocks: {
          type: "array",
          description: `${replacementEmailBlocksDescription} Mutually exclusive with html.`,
          items: {
            type: "object",
          },
        },
      },
      required: ["abTestId", "variantId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_ab_test",
    description:
      "Create a campaign A/B test. Control variant A is created automatically from the campaign's current email; optionally provide extra variants. The campaign must be in draft or rejected status, and each campaign can only have one A/B test.",
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
          description: "Draft campaign ID to create the A/B test for.",
        },
        name: {
          type: "string",
          description: "Optional A/B test name.",
        },
        testPercentage: {
          type: "number",
          description:
            "Percentage of the audience used for the test phase, from 5 to 50. Defaults to 20.",
        },
        testDurationMinutes: {
          type: "number",
          description:
            "Test phase duration in minutes before the winner is selected, from 15 to 1440. Defaults to 240.",
        },
        winnerCriteria: {
          type: "string",
          enum: ["open_rate", "click_rate"],
          description: "Winner selection criteria. Defaults to open_rate.",
        },
        variants: {
          type: "array",
          description:
            "Optional extra variants to create in addition to control variant A.",
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
                description: replacementEmailBlocksDescription,
                items: { type: "object" },
              },
            },
            required: ["subject"],
          },
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "add_ab_test_variant",
    description:
      "Add a variant to a draft campaign A/B test. Variants cannot be added after the test has started.",
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
          description: replacementEmailBlocksDescription,
          items: { type: "object" },
        },
      },
      required: ["abTestId", "subject"],
    },
  },
  {
    name: "delete_ab_test_variant",
    description:
      "Permanently delete a variant from a draft campaign A/B test. This cannot be undone. Variant A is the control and cannot be deleted, and the test must keep at least the minimum number of variants. Variants cannot be removed after the test has started.",
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
