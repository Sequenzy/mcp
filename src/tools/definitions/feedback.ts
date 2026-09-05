import type { Tool } from "../../mcp-types.js";

export const feedbackToolDefinitions: Tool[] = [
  // ============================================================================
  // Feedback
  // ============================================================================
  {
    name: "submit_feedback",
    description:
      "Send product feedback about Sequenzy itself to the Sequenzy team, but only when the user explicitly asks you to send it. Tell the user where the message goes before calling this tool. Include only reproduction details and resource IDs needed for that report; never include unrelated subscriber data, message content, credentials, raw API payloads, or debug data. Do not use it for questions about the user's own account or data. Submitting feedback never changes account data.",
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
            "Optional: what the user was trying to accomplish, in their words, plus any relevant tool names or arguments you tried. Do not include secrets or unrelated personal data.",
        },
        userIntent: {
          type: "string",
          description:
            "For bug or wrong-outcome reports: the user's request, verbatim or closely paraphrased. Omit personal data that is not needed to reproduce the problem.",
        },
        toolCalls: {
          type: "array",
          maxItems: 25,
          description:
            "For bug or wrong-outcome reports: the ordered tool calls that led to the problem. Summarize arguments; do not paste raw subscriber data, full email bodies, or secrets.",
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
            "IDs of affected resources so the team can correlate the report with server logs. Include only IDs needed to investigate the reported issue.",
        },
      },
      required: ["message"],
    },
  },
];
