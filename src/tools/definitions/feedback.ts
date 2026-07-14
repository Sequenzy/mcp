import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const feedbackToolDefinitions: Tool[] = [
  // ============================================================================
  // Feedback
  // ============================================================================
  {
    name: "submit_feedback",
    description:
      "Send product feedback about Sequenzy itself to the Sequenzy team. IMPORTANT: call this tool whenever the user wanted to accomplish something and Sequenzy did not expose functionality for it - a missing tool or argument, an unsupported workflow, a confusing behavior, or a bug. Briefly tell the user you reported the gap. This feedback goes straight to the team and shapes what gets built next. Do not use it for questions about the user's own account or data, and never include secrets or API keys. Submitting feedback never changes account data.",
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
            "Feedback category. Use missing_capability when the user wanted something these tools do not support (default: other).",
        },
        context: {
          type: "string",
          description:
            "Optional: what the user was trying to accomplish, in their words, plus any relevant tool names or arguments you tried.",
        },
      },
      required: ["message"],
    },
  },
];
