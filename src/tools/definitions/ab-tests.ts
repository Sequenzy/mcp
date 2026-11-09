import type { Tool } from "../../mcp-types.js";
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
    description: "List A/B tests and their variants.",
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
      "Get A/B test details, variants, localization sync status, and settings. Sequence action_ab_test steps also expose each variant's blocks on get_sequence.sequence.emails[].abTest.variants; use this tool when you need the full test record rather than copy alone. Pass the abTestId from get_sequence.",
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
      "Get A/B test aggregate stats, per-variant stats and whether the winner metric difference is statistically significant (95% confidence). Supports period or custom start/end ranges.",
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
    name: "select_ab_test_winner",
    description:
      "Select a winner for an A/B test. For a campaign A/B test that is currently testing, this queues the winning variant for the remaining audience and starts external email delivery. For a sequence A/B test (nodeType action_ab_test), this selects or changes the winner, including one picked automatically: everyone who reaches the step afterwards gets the new winner, and contacts who already got a variant keep it. Pass confirmLiveChange when the sequence is active.",
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
          description: "Campaign or sequence A/B test ID",
        },
        variantId: { type: "string", description: "Winning variant ID" },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Sequence tests only. Required as true when the sequence is active, because the new winner goes to everyone who reaches the step from then on.",
        },
      },
      required: ["abTestId", "variantId"],
      additionalProperties: false,
    },
  },
  {
    name: "resume_ab_test",
    description:
      "Resume a sequence A/B test (nodeType action_ab_test) that already has a winner, for example one picked automatically before the user was sure. Clears the winner so contacts reaching the step are split across the variants again, keeps the results collected so far, and turns off automatic selection for this test: it keeps splitting until a winner is selected with select_ab_test_winner. Pass confirmLiveChange when the sequence is active.",
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
          description: "Sequence A/B test ID to resume",
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Required as true when the sequence is active, because contacts reaching the step are split again from then on.",
        },
      },
      required: ["abTestId"],
      additionalProperties: false,
    },
  },
  {
    name: "update_ab_test_variant",
    description:
      "Update an A/B test variant, including the email body of a sequence step whose nodeType is action_ab_test - that content cannot be edited through update_sequence_node or update_template, and a change meant for the whole step has to be repeated on every variant. Take abTestId and variantId from get_sequence.sequence.emails[].abTest.variants (or get_ab_test). If this tool is not in the MCP tool list, enable it on the Sequenzy connector rather than writing through another email tool. Campaign variants are editable only in draft. Sequence variants can be edited after activity with confirmLiveChange, but earlier sends stay unchanged and combined results may no longer be accurate. Provide at least one of subject, previewText, html, or blocks. Use either html or blocks, not both.",
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
      "Update A/B test settings. Campaign tests use testPercentage, testDurationMinutes, and winnerCriteria. During testing, duration is total minutes from the original start, or from when the last test email is due when delivery is spread (a past deadline selects immediately), and audience changes queue a resize that preserves committed sends. Read pendingSampleUpdate and progress using get_ab_test; retry the same percentage after failure or discard a failed request with cancelSampleUpdate. endTestNow ends a running campaign test early: the winner is picked by its criteria from the results so far and sent to the rest of the audience. The winning metric stays fixed once testing starts. Sequence tests use testType, winnerThreshold, winnerCriteria, and autoSelectWinner; changing live or already-used sequence settings requires confirmLiveChange. Provide at least one setting.",
    inputSchema: {
      type: "object",
      properties: {
        cancelSampleUpdate: {
          type: "boolean",
          description:
            "Discard a failed campaign sample change. Cannot be combined with testPercentage.",
        },
        endTestNow: {
          type: "boolean",
          description:
            "End a running campaign test now and pick the winner by its criteria, instead of waiting for testDurationMinutes. Needs the campaigns:send permission. Cannot be combined with testDurationMinutes.",
        },
        expectedUpdatedAt: {
          type: "string",
          description:
            "Optional timestamp from get_ab_test. Rejects a change if settings have since changed.",
        },
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
          enum: [
            "open_rate",
            "click_rate",
            "goal_conversion_rate",
            "goal_value",
            "event_rate",
          ],
          description:
            'Winner selection criteria. Applies to both campaign and sequence tests and is locked once a campaign test starts. goal_conversion_rate picks the variant whose recipients convert on winnerGoalId most often, goal_value the one with the most goal value per delivered email (use winnerGoalId "default-revenue" for purchase revenue), and event_rate the one whose recipients most often fire winnerEventName after receiving it. Conversions count when attributed to the email (an open or click within the goal\'s window; for campaigns, revenue and campaign goals also credit a recipient who received the email in that window). When no variant converts, campaign tests fall back to click rate and sequence tests keep splitting.',
        },
        winnerGoalId: {
          type: "string",
          description:
            'Goal judged by goal_conversion_rate or goal_value: a goal ID (company-wide, or scoped to this campaign or sequence) or "default-revenue" for built-in purchase revenue. Required for those criteria.',
        },
        winnerEventName: {
          type: "string",
          description:
            'Event judged by event_rate, such as "trial.converted". Required for event_rate.',
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
        autoSelectWinner: {
          type: "boolean",
          description:
            "Sequence-only. true picks the leading variant once winnerThreshold is reached (the default); false keeps splitting contacts until select_ab_test_winner. Turning it on can pick a winner on the next send if the threshold is already reached. resume_ab_test sets it to false.",
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
          enum: [
            "open_rate",
            "click_rate",
            "goal_conversion_rate",
            "goal_value",
            "event_rate",
          ],
          description:
            'Winner selection criteria. Campaign tests default to open_rate. For sequence tests, an explicit value overrides the testType default. goal_conversion_rate picks the variant whose recipients convert on winnerGoalId most often, goal_value the one with the most goal value per delivered email (use winnerGoalId "default-revenue" for purchase revenue), and event_rate the one whose recipients most often fire winnerEventName after receiving it. Conversions count when attributed to the email (an open or click within the goal\'s window; for campaigns, revenue and campaign goals also credit a recipient who received the email in that window). When no variant converts, campaign tests fall back to click rate and sequence tests keep splitting.',
        },
        winnerGoalId: {
          type: "string",
          description:
            'Goal judged by goal_conversion_rate or goal_value: a goal ID (company-wide, or scoped to this campaign or sequence) or "default-revenue" for built-in purchase revenue. Required for those criteria.',
        },
        winnerEventName: {
          type: "string",
          description:
            'Event judged by event_rate, such as "trial.converted". Required for event_rate.',
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
