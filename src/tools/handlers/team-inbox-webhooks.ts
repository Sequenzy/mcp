import { apiRequest } from "../../runtime.js";
import {
  optionalString,
  requiredString,
  optionalAllowedString,
  requiredAllowedString,
  optionalIntegerInRange,
  optionalWebhookEvents,
} from "../internal.js";

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

      if (
        type === "outbound" &&
        bodyText === undefined &&
        bodyHtml === undefined
      ) {
        throw new Error(
          "Provide `bodyText` or `bodyHtml` when calling `reply_to_conversation` with an outbound message."
        );
      }

      result = await apiRequest(
        "POST",
        `/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
        {
          type,
          ...(subject !== undefined && { subject }),
          ...(bodyText !== undefined && { bodyText }),
          ...(bodyHtml !== undefined && { bodyHtml }),
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
