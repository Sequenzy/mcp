import type { Tool } from "../../mcp-types.js";

export const inboxToolDefinitions: Tool[] = [
  // ============================================================================
  // Inbox (Conversations)
  // ============================================================================
  {
    name: "get_inbox_address",
    description:
      "Get the email address anyone (a person, a service, or another agent) can write to so the message lands in this company's Sequenzy inbox. Also returns the default address, the branded address (customAddress, with status active or pending), whether receiving is on, whether attachments are stored, and how many days messages are kept. Replies to Sequenzy emails arrive in the same inbox automatically.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "update_inbox_address",
    description:
      "Set the inbox address to share, like support@support.acme.com, on one of the company's receiving domains (see list_receiving_domains; add one with add_receiving_domain), or go back to the default with reset. Any other address on that receiving domain also lands in the inbox. The address starts receiving once the receiving domain is verified (see customAddress.status in the result); inbox+{companyId}@inbound.sequenzy.com keeps working either way. Requires the companies:manage scope. Confirm the address with the user before changing it.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        localPart: {
          type: "string",
          description:
            "Name before the @, e.g. support. Letters, numbers, dots, dashes or underscores. Required unless reset is true.",
        },
        domain: {
          type: "string",
          description:
            "One of the company's receiving domains, e.g. support.acme.com. The address becomes localPart@domain. Required unless reset is true.",
        },
        reset: {
          type: "boolean",
          description:
            "Set true to remove the branded address and use the default inbox address only.",
        },
      },
    },
  },
  {
    name: "list_conversations",
    description:
      "List inbox conversations: replies to campaigns, sequences and transactional email, plus email sent to the inbox address (context.type inbox; recipientAddress says which address). Filter by status, search, unread, spam (only listed with spam true) or recipient, with pagination. Each conversation includes lastMessagePreview: a short plain-text preview of the latest subscriber or team reply (quoted history removed), or null.",
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
        spam: {
          type: "boolean",
          description: "Set true to list the Spam folder instead.",
        },
        recipient: {
          type: "string",
          description: "Only conversations that started at this inbox address.",
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
      "Get a conversation with its full message history, subscriber details, and context. Message attachments include a downloadUrl (signed, valid for one hour) when the file is stored.",
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
      "Send a reply in a conversation, or add an internal note. type 'outbound' (default) emails the subscriber and requires bodyText or bodyHtml; type 'note' adds a private team-only note. When the conversation has a recipientAddress (the inbox address it was sent to), list the sender profiles first and, if one's email equals that address, reply from it with senderProfileId. Replying to a closed conversation reopens it. Each successful outbound call sends another email, so after a timeout check the conversation with get_conversation before retrying.",
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
        senderProfileId: {
          type: "string",
          description:
            "Optional sender profile to reply from (outbound only; its domain must be verified). Get IDs from list_sender_profiles. Omit to send from the API key owner's email address.",
        },
        attachments: {
          type: "array",
          maxItems: 10,
          description:
            "Optional files to attach (max 10, 15 MB total). Requires attachment storage; see attachmentsAvailable from get_inbox_address.",
          items: {
            type: "object",
            properties: {
              filename: { type: "string", description: "File name." },
              content: {
                type: "string",
                maxLength: 20971520,
                description: "Base64-encoded file content.",
              },
              contentType: {
                type: "string",
                description:
                  "Optional MIME type. Inferred from the file name when omitted.",
              },
            },
            required: ["filename", "content"],
          },
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
    name: "bulk_update_conversation_status",
    description:
      "Open or close up to 100 conversations in one call, e.g. to close every conversation returned by list_conversations. Returns updatedIds, unchangedIds (already had the status) and notFoundIds (missing or in another company); only changed conversations are rewritten, so retrying is safe.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        conversationIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 100,
          description:
            "Conversation IDs to update, from 1 to 100. Duplicates are ignored.",
        },
        status: {
          type: "string",
          enum: ["open", "closed"],
          description: "New status for every listed conversation.",
        },
      },
      required: ["conversationIds", "status"],
    },
  },
  {
    name: "bulk_update_conversation_spam",
    description:
      "Move up to 100 conversations to Spam (spam true) or back to the inbox (spam false). Returns updatedIds, unchangedIds and notFoundIds; retrying is safe.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        conversationIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 100,
          description:
            "Conversation IDs to move, from 1 to 100. Duplicates are ignored.",
        },
        spam: {
          type: "boolean",
          description: "True moves them to Spam; false back.",
        },
      },
      required: ["conversationIds", "spam"],
    },
  },
  {
    name: "list_conversation_recipients",
    description:
      "List the inbox addresses conversations started at, for list_conversations recipient filters.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
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
  {
    name: "mark_conversation_unread",
    description:
      "Mark a conversation unread again, for example to leave it for a teammate. Its latest received message becomes unread.",
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
    name: "forward_conversation_message",
    description:
      "Email a copy of one received or sent message (with its stored attachments) to another address, such as a teammate. Notes cannot be forwarded. The forward is recorded in the conversation as a system message and does not change its status or unread state. Each successful call sends another copy, so after a timeout check the conversation with get_conversation before retrying.",
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
        messageId: {
          type: "string",
          description: "ID of the message to forward, from get_conversation.",
        },
        to: {
          type: "string",
          description: "One email address to forward the message to.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Optional sender profile to forward from. Omit to use the company default sender.",
        },
      },
      required: ["conversationId", "messageId", "to"],
    },
  },
];
