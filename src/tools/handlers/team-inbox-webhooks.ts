import { apiRequest } from "../../runtime.js";
import {
  optionalString,
  optionalStringArray,
  requiredString,
  optionalAllowedString,
  requiredAllowedString,
  optionalIntegerInRange,
  optionalWebhookEvents,
} from "../internal.js";

const MAX_BASE64_ATTACHMENT_CHARS = 20_971_520;
const MAX_BASE64_ATTACHMENT_TOTAL_CHARS = 20_971_520;

export async function handleTeamInboxWebhookTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_team_members": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest("GET", "/api/v1/team", undefined, companyId);
      break;
    }

    case "invite_team_member": {
      const companyId = args.companyId as string | undefined;
      const email = requiredString("invite_team_member", args, "email");
      const role = requiredAllowedString("invite_team_member", args, "role", [
        "admin",
        "marketer",
        "viewer",
        "restricted",
      ]);

      if (
        args.canManageBilling !== undefined &&
        typeof args.canManageBilling !== "boolean"
      ) {
        throw new Error(
          "`canManageBilling` must be a boolean when calling `invite_team_member`."
        );
      }

      result = await apiRequest(
        "POST",
        "/api/v1/team/invitations",
        {
          email,
          role,
          ...(args.canManageBilling !== undefined && {
            canManageBilling: args.canManageBilling,
          }),
        },
        companyId
      );
      break;
    }

    case "cancel_team_invitation": {
      const companyId = args.companyId as string | undefined;
      const invitationId = requiredString(
        "cancel_team_invitation",
        args,
        "invitationId"
      );
      result = await apiRequest(
        "DELETE",
        `/api/v1/team/invitations/${encodeURIComponent(invitationId)}`,
        undefined,
        companyId
      );
      break;
    }

    // Inbox (Conversations)
    case "get_inbox_address": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/conversations/inbox-address",
        undefined,
        companyId
      );
      break;
    }

    case "update_inbox_address": {
      const companyId = args.companyId as string | undefined;
      if (args.reset !== undefined && typeof args.reset !== "boolean") {
        throw new Error(
          "`reset` must be a boolean when calling `update_inbox_address`."
        );
      }
      const localPart = optionalString(args, "localPart");
      const domain = optionalString(args, "domain");
      let body: { localPart: string | null; domain: string | null };
      if (args.reset === true) {
        if (localPart !== undefined || domain !== undefined) {
          throw new Error(
            "Pass either `reset: true` or `localPart` and `domain` when calling `update_inbox_address`, not both."
          );
        }
        body = { localPart: null, domain: null };
      } else {
        if (localPart === undefined || domain === undefined) {
          throw new Error(
            "Provide both `localPart` and `domain` (or `reset: true`) when calling `update_inbox_address`."
          );
        }
        body = { localPart, domain };
      }
      result = await apiRequest(
        "PUT",
        "/api/v1/conversations/inbox-address",
        body,
        companyId
      );
      break;
    }

    case "list_conversations": {
      const companyId = args.companyId as string | undefined;
      const conversationParams = new URLSearchParams();
      const status = optionalAllowedString(
        "list_conversations",
        args,
        "status",
        ["open", "closed", "all"]
      );
      if (status) conversationParams.set("status", status);
      const search = optionalString(args, "search");
      if (search) conversationParams.set("search", search);

      if (args.unread !== undefined) {
        if (typeof args.unread !== "boolean") {
          throw new Error(
            "`unread` must be a boolean when calling `list_conversations`."
          );
        }

        if (args.unread) {
          conversationParams.set("unread", "true");
        }
      }

      if (args.spam !== undefined) {
        if (typeof args.spam !== "boolean") {
          throw new Error(
            "`spam` must be a boolean when calling `list_conversations`."
          );
        }
        if (args.spam) conversationParams.set("spam", "true");
      }
      const recipient = optionalString(args, "recipient");
      if (recipient) conversationParams.set("recipient", recipient);

      if (args.page !== undefined) {
        if (
          typeof args.page !== "number" ||
          !Number.isInteger(args.page) ||
          args.page < 1
        ) {
          throw new Error(
            "`page` must be a positive integer when calling `list_conversations`."
          );
        }

        conversationParams.set("page", String(args.page));
      }

      const limit = optionalIntegerInRange(
        "list_conversations",
        args,
        "limit",
        1,
        100
      );
      if (limit !== undefined) {
        conversationParams.set("limit", String(limit));
      }

      result = await apiRequest(
        "GET",
        `/api/v1/conversations${conversationParams.size > 0 ? `?${conversationParams}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_conversation": {
      const companyId = args.companyId as string | undefined;
      const conversationId = requiredString(
        "get_conversation",
        args,
        "conversationId"
      );
      result = await apiRequest(
        "GET",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "reply_to_conversation": {
      const companyId = args.companyId as string | undefined;
      const conversationId = requiredString(
        "reply_to_conversation",
        args,
        "conversationId"
      );
      const type =
        optionalAllowedString("reply_to_conversation", args, "type", [
          "outbound",
          "note",
        ]) ?? "outbound";
      const subject = optionalString(args, "subject");
      const bodyText = optionalString(args, "bodyText");
      const bodyHtml = optionalString(args, "bodyHtml");
      const senderProfileId = optionalString(args, "senderProfileId");
      // A blank ID must not silently fall back to the default sender.
      if (
        typeof args.senderProfileId === "string" &&
        senderProfileId === undefined
      ) {
        throw new Error(
          "`senderProfileId` must be a non-empty sender profile ID from `list_sender_profiles`."
        );
      }

      if (senderProfileId !== undefined && type === "note") {
        throw new Error(
          "`senderProfileId` applies to outbound replies; notes are never emailed."
        );
      }

      if (
        type === "outbound" &&
        bodyText === undefined &&
        bodyHtml === undefined
      ) {
        throw new Error(
          "Provide `bodyText` or `bodyHtml` when calling `reply_to_conversation` with an outbound message."
        );
      }

      const attachments = parseReplyAttachments(args.attachments);

      result = await apiRequest(
        "POST",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          type,
          ...(subject !== undefined && { subject }),
          ...(bodyText !== undefined && { bodyText }),
          ...(bodyHtml !== undefined && { bodyHtml }),
          ...(senderProfileId !== undefined && { senderProfileId }),
          ...(attachments.length > 0 && { attachments }),
        },
        companyId
      );
      break;
    }

    case "update_conversation_status": {
      const companyId = args.companyId as string | undefined;
      const conversationId = requiredString(
        "update_conversation_status",
        args,
        "conversationId"
      );
      const status = requiredAllowedString(
        "update_conversation_status",
        args,
        "status",
        ["open", "closed"]
      );
      result = await apiRequest(
        "POST",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/status`,
        { status },
        companyId
      );
      break;
    }

    case "bulk_update_conversation_status": {
      const companyId = args.companyId as string | undefined;
      const conversationIds = optionalStringArray(
        "bulk_update_conversation_status",
        args,
        "conversationIds"
      );
      if (conversationIds.length === 0) {
        throw new Error(
          "`conversationIds` must include at least one conversation ID when calling `bulk_update_conversation_status`."
        );
      }
      if (conversationIds.length > 100) {
        throw new Error(
          "`conversationIds` accepts at most 100 IDs when calling `bulk_update_conversation_status`. Split larger sets into several calls."
        );
      }
      const status = requiredAllowedString(
        "bulk_update_conversation_status",
        args,
        "status",
        ["open", "closed"]
      );
      result = await apiRequest(
        "POST",
        "/api/v1/conversations/bulk/status",
        { conversationIds, status },
        companyId
      );
      break;
    }

    case "bulk_update_conversation_spam": {
      const companyId = args.companyId as string | undefined;
      const conversationIds = optionalStringArray(
        "bulk_update_conversation_spam",
        args,
        "conversationIds"
      );
      if (conversationIds.length === 0) {
        throw new Error(
          "`conversationIds` must include at least one conversation ID when calling `bulk_update_conversation_spam`."
        );
      }
      if (conversationIds.length > 100) {
        throw new Error(
          "`conversationIds` accepts at most 100 IDs when calling `bulk_update_conversation_spam`. Split larger sets into several calls."
        );
      }
      if (typeof args.spam !== "boolean") {
        throw new Error(
          "`spam` must be true or false when calling `bulk_update_conversation_spam`."
        );
      }
      result = await apiRequest(
        "POST",
        "/api/v1/conversations/bulk/spam",
        { conversationIds, spam: args.spam },
        companyId
      );
      break;
    }

    case "list_conversation_recipients": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/conversations/recipients",
        undefined,
        companyId
      );
      break;
    }

    case "mark_conversation_unread": {
      const companyId = args.companyId as string | undefined;
      const conversationId = requiredString(
        "mark_conversation_unread",
        args,
        "conversationId"
      );
      result = await apiRequest(
        "POST",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/unread`,
        undefined,
        companyId
      );
      break;
    }

    case "forward_conversation_message": {
      const companyId = args.companyId as string | undefined;
      const conversationId = requiredString(
        "forward_conversation_message",
        args,
        "conversationId"
      );
      const messageId = requiredString(
        "forward_conversation_message",
        args,
        "messageId"
      );
      const to = requiredString("forward_conversation_message", args, "to");
      const senderProfileId = optionalString(args, "senderProfileId");
      if (
        typeof args.senderProfileId === "string" &&
        senderProfileId === undefined
      ) {
        throw new Error(
          "`senderProfileId` must be a non-empty sender profile ID from `list_sender_profiles`."
        );
      }
      result = await apiRequest(
        "POST",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}/forward`,
        { to, ...(senderProfileId !== undefined && { senderProfileId }) },
        companyId
      );
      break;
    }

    case "mark_conversation_read": {
      const companyId = args.companyId as string | undefined;
      const conversationId = requiredString(
        "mark_conversation_read",
        args,
        "conversationId"
      );
      result = await apiRequest(
        "POST",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/read`,
        undefined,
        companyId
      );
      break;
    }

    // Outbound Webhooks
    case "list_webhooks": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/webhooks",
        undefined,
        companyId
      );
      break;
    }

    case "create_webhook": {
      const companyId = args.companyId as string | undefined;
      const name = requiredString("create_webhook", args, "name");
      const url = requiredString("create_webhook", args, "url");
      const events = optionalWebhookEvents("create_webhook", args);

      result = await apiRequest(
        "POST",
        "/api/v1/webhooks",
        {
          name,
          url,
          ...(events !== undefined && { events }),
        },
        companyId
      );
      break;
    }

    case "update_webhook": {
      const companyId = args.companyId as string | undefined;
      const webhookId = requiredString("update_webhook", args, "webhookId");
      const name = optionalString(args, "name");
      const url = optionalString(args, "url");
      const events = optionalWebhookEvents("update_webhook", args);
      const status = optionalAllowedString("update_webhook", args, "status", [
        "enabled",
        "disabled",
      ]);

      if (
        name === undefined &&
        url === undefined &&
        events === undefined &&
        status === undefined
      ) {
        throw new Error(
          "Provide at least one of `name`, `url`, `events`, or `status` when calling `update_webhook`."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/webhooks/${encodeURIComponent(webhookId)}`,
        {
          ...(name !== undefined && { name }),
          ...(url !== undefined && { url }),
          ...(events !== undefined && { events }),
          ...(status !== undefined && { status }),
        },
        companyId
      );
      break;
    }

    case "delete_webhook": {
      const companyId = args.companyId as string | undefined;
      const webhookId = requiredString("delete_webhook", args, "webhookId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/webhooks/${encodeURIComponent(webhookId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "test_webhook": {
      const companyId = args.companyId as string | undefined;
      const webhookId = requiredString("test_webhook", args, "webhookId");
      result = await apiRequest(
        "POST",
        `/api/v1/webhooks/${encodeURIComponent(webhookId)}/test`,
        undefined,
        companyId
      );
      break;
    }

    case "list_webhook_deliveries": {
      const companyId = args.companyId as string | undefined;
      const webhookId = requiredString(
        "list_webhook_deliveries",
        args,
        "webhookId"
      );
      const limit = optionalIntegerInRange(
        "list_webhook_deliveries",
        args,
        "limit",
        1,
        100
      );
      const deliveryParams = new URLSearchParams();
      if (limit !== undefined) {
        deliveryParams.set("limit", String(limit));
      }

      result = await apiRequest(
        "GET",
        `/api/v1/webhooks/${encodeURIComponent(webhookId)}/deliveries${deliveryParams.size > 0 ? `?${deliveryParams}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "replay_webhook_delivery": {
      const companyId = args.companyId as string | undefined;
      const webhookId = requiredString(
        "replay_webhook_delivery",
        args,
        "webhookId"
      );
      const deliveryId = requiredString(
        "replay_webhook_delivery",
        args,
        "deliveryId"
      );
      result = await apiRequest(
        "POST",
        `/api/v1/webhooks/${encodeURIComponent(webhookId)}/deliveries/${encodeURIComponent(deliveryId)}/replay`,
        undefined,
        companyId
      );
      break;
    }

    // AI Generation
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}

function parseReplyAttachments(
  value: unknown
): Array<{ filename: string; content: string; contentType?: string }> {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    throw new Error(
      "`attachments` must be an array of { filename, content } objects when calling `reply_to_conversation`."
    );
  }
  if (value.length > 10) {
    throw new Error(
      "`attachments` accepts at most 10 files when calling `reply_to_conversation`."
    );
  }
  let encodedTotal = 0;
  return value.map((item, index) => {
    const record =
      item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    const { filename, content, contentType } = record;
    if (
      typeof filename !== "string" ||
      !filename.trim() ||
      typeof content !== "string" ||
      !content.trim()
    ) {
      throw new Error(
        `\`attachments[${index}]\` needs a non-empty \`filename\` and base64 \`content\` when calling \`reply_to_conversation\`.`
      );
    }
    if (content.length > MAX_BASE64_ATTACHMENT_CHARS) {
      throw new Error(
        `\`attachments[${index}].content\` exceeds the 15 MB decoded attachment limit when calling \`reply_to_conversation\`.`
      );
    }
    encodedTotal += content.length;
    if (encodedTotal > MAX_BASE64_ATTACHMENT_TOTAL_CHARS) {
      throw new Error(
        "`attachments` exceeds the 15 MB total decoded attachment limit when calling `reply_to_conversation`."
      );
    }
    if (contentType !== undefined && typeof contentType !== "string") {
      throw new Error(
        `\`attachments[${index}].contentType\` must be a string when calling \`reply_to_conversation\`.`
      );
    }
    return {
      filename,
      content,
      ...(contentType !== undefined && { contentType }),
    };
  });
}
