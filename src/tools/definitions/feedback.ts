import type { Tool } from "../../mcp-types.js";

export const feedbackToolDefinitions: Tool[] = [
  // ============================================================================
  // Feedback
  // ============================================================================
  {
    name: "submit_feedback",
    description:
      "Send product feedback about Sequenzy itself to the Sequenzy team. IMPORTANT: call this tool whenever the user wanted to accomplish something and Sequenzy did not expose functionality for it - a missing tool or argument, an unsupported workflow, a confusing behavior, or a bug. When something you did through these tools produced a wrong or unexpected result, also fill in userIntent, toolCalls, expected, actual, and resourceIds so the team can reproduce it. Summarize tool arguments instead of pasting raw subscriber data, and never include secrets or API keys. Briefly tell the user you reported the gap. This feedback goes straight to the team and shapes what gets built next. Do not use it for questions about the user's own account or data. Submitting feedback never changes account data.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        message: {
          type: "string",
          description:
            "The feedback itself. Be specific: what was needed, what was missing or wrong, and what you did instead (workaround, gave up, used the dashboard).",
        },
        category: {
          type: "string",
          enum: ["missing_capability", "bug", "docs", "ux", "praise", "other"],
          description:
            "Feedback category. Use missing_capability when the user wanted something these tools do not support, bug when a tool misbehaved or produced a wrong result (default: other).",
        },
        context: {
          type: "string",
          description:
            "Optional: what the user was trying to accomplish, in their words, plus any relevant tool names or arguments you tried.",
        },
        userIntent: {
          type: "string",
          description:
            "For bug/wrong-outcome reports: the user's request, verbatim or closely paraphrased. Omit personal data that is not needed to reproduce the problem.",
        },
        toolCalls: {
          type: "array",
          maxItems: 25,
          description:
            "For bug/wrong-outcome reports: the ordered tool calls that led to the problem. Summarize arguments - do not paste raw subscriber data or full email bodies.",
          items: {
            type: "object",
            properties: {
              tool: {
                type: "string",
                description: "Tool name, e.g. update_campaign.",
              },
              args: {
                type: "string",
                description: "Short summary of the arguments used.",
              },
              error: {
                type: "string",
                description:
                  "Error message returned by this call, if there was one.",
              },
            },
            required: ["tool"],
          },
        },
        expected: {
          type: "string",
          description: "What you expected to happen.",
        },
        actual: {
          type: "string",
          description: "What actually happened instead.",
        },
        resourceIds: {
          type: "array",
          maxItems: 50,
          items: { type: "string" },
          description:
            "IDs of the affected resources (campaign, sequence, subscriber, segment, ...) so the team can correlate with server logs.",
        },
      },
      required: ["message"],
    },
  },
];
