import type { Tool } from "../../mcp-types.js";

export const inboxToolDefinitions: Tool[] = [
  // ============================================================================
  // Inbox (Conversations)
  // ============================================================================
  {
    name: "list_conversations",
    description:
      "List inbox conversations (email replies from subscribers). Filter by status, free-text search, or unread state, with pagination.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        status: {
          type: "string",
          enum: ["open", "closed", "all"],
          description: "Filter by conversation status. Defaults to all.",
        },
        search: {
          type: "string",
          description:
            "Free-text search across conversation subjects and participants.",
        },
        unread: {
          type: "boolean",
          description:
            "Set true to only return conversations with unread messages.",
        },
        page: {
          type: "number",
          description: "Page number. Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Results per page, from 1 to 100. Defaults to 20.",
        },
      },
    },
  },
  {
    name: "get_conversation",
    description:
      "Get a conversation with its full message history, subscriber details, and context.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        conversationId: {
          type: "string",
          description: "Conversation ID.",
        },
      },
      required: ["conversationId"],
    },
  },
  {
    name: "reply_to_conversation",
    description:
      "Send a reply in a conversation, or add an internal note. type 'outbound' (default) emails the subscriber and requires bodyText or bodyHtml; type 'note' adds a private team-only note. Replying to a closed conversation reopens it.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        conversationId: {
          type: "string",
          description: "Conversation ID to reply in.",
        },
        type: {
          type: "string",
          enum: ["outbound", "note"],
          description:
            "Message type: outbound emails the subscriber, note is internal-only. Defaults to outbound.",
        },
        subject: {
          type: "string",
          description:
            "Optional subject override. Defaults to the conversation subject.",
        },
        bodyText: {
          type: "string",
          description: "Plain-text message body.",
        },
        bodyHtml: {
          type: "string",
          description: "HTML message body.",
        },
      },
      required: ["conversationId"],
    },
  },
  {
    name: "update_conversation_status",
    description: "Open or close a conversation.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        conversationId: {
          type: "string",
          description: "Conversation ID.",
        },
        status: {
          type: "string",
          enum: ["open", "closed"],
          description: "New conversation status.",
        },
      },
      required: ["conversationId", "status"],
    },
  },
  {
    name: "mark_conversation_read",
    description: "Mark all unread inbound messages in a conversation as read.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        conversationId: {
          type: "string",
          description: "Conversation ID.",
        },
      },
      required: ["conversationId"],
    },
  },
];
