import { apiRequest } from "../../runtime.js";
import {
  validateHtmlOrBlocksArgs,
  validateCreateTransactionalContentArgs,
  requireSubscriberIdentifier,
  fetchDetailedSubscriberByIdentifier,
  requiredString,
  buildEmailEventListParams,
} from "../internal.js";

export async function handleAnalyticsAndTransactionalTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_transactional_emails": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/transactional",
        undefined,
        companyId
      );
      break;
    }

    case "get_transactional_email": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/transactional/${args.idOrSlug}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_transactional_email": {
      const companyId = args.companyId as string | undefined;
      const allowedTransactionalCreateKeys = new Set([
        "companyId",
        "name",
        "slug",
        "subject",
        "previewText",
        "html",
        "blocks",
        "prompt",
        "style",
        "tone",
        "enabled",
      ]);
      const unsupportedTransactionalCreateKeys = Object.keys(args).filter(
        (key) => !allowedTransactionalCreateKeys.has(key)
      );

      if (unsupportedTransactionalCreateKeys.length > 0) {
        throw new Error(
          `\`create_transactional_email\` accepts only \`name\`, \`slug\`, \`subject\`, \`previewText\`, \`html\`, \`blocks\`, \`prompt\`, \`style\`, \`tone\`, and \`enabled\` fields. Unsupported field${unsupportedTransactionalCreateKeys.length === 1 ? "" : "s"}: ${unsupportedTransactionalCreateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateCreateTransactionalContentArgs(args);

      const createBody = Object.fromEntries(
        Object.entries(args).filter(([key]) => key !== "companyId")
      );

      result = await apiRequest(
        "POST",
        "/api/v1/transactional",
        createBody,
        companyId
      );
      break;
    }

    case "update_transactional_email": {
      const companyId = args.companyId as string | undefined;
      const allowedTransactionalUpdateKeys = new Set([
        "companyId",
        "idOrSlug",
        "name",
        "enabled",
        "subject",
        "previewText",
        "html",
        "blocks",
      ]);
      const unsupportedTransactionalUpdateKeys = Object.keys(args).filter(
        (key) => !allowedTransactionalUpdateKeys.has(key)
      );

      if (unsupportedTransactionalUpdateKeys.length > 0) {
        throw new Error(
          `\`update_transactional_email\` accepts only \`name\`, \`enabled\`, \`subject\`, \`previewText\`, \`html\`, and \`blocks\` update fields. Unsupported field${unsupportedTransactionalUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedTransactionalUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateHtmlOrBlocksArgs("update_transactional_email", args);

      if (
        args.name === undefined &&
        args.enabled === undefined &&
        args.subject === undefined &&
        args.previewText === undefined &&
        args.html === undefined &&
        args.blocks === undefined
      ) {
        throw new Error(
          "Provide at least one of `name`, `enabled`, `subject`, `previewText`, `html`, or `blocks` when calling `update_transactional_email`."
        );
      }

      const updateBody = Object.fromEntries(
        Object.entries(args).filter(
          ([key]) => key !== "companyId" && key !== "idOrSlug"
        )
      );

      result = await apiRequest(
        "PATCH",
        `/api/v1/transactional/${args.idOrSlug}`,
        updateBody,
        companyId
      );
      break;
    }

    case "send_email": {
      const companyId = args.companyId as string | undefined;
      const to = requiredString("send_email", args, "to");
      const templateId =
        args.templateId === undefined
          ? undefined
          : requiredString("send_email", args, "templateId");
      const subject =
        args.subject === undefined
          ? undefined
          : requiredString("send_email", args, "subject");
      const html =
        args.html === undefined
          ? undefined
          : requiredString("send_email", args, "html");

      if (
        templateId !== undefined &&
        (subject !== undefined || html !== undefined)
      ) {
        throw new Error(
          "`templateId` cannot be combined with `subject` or `html` when calling `send_email`."
        );
      }

      if (
        templateId === undefined &&
        (subject === undefined || html === undefined)
      ) {
        throw new Error(
          "Provide either `templateId` or both `subject` and `html` when calling `send_email`."
        );
      }

      const sendBody = Object.fromEntries(
        Object.entries({
          to,
          slug: templateId,
          subject,
          body: html,
          variables: args.variables,
          subscriberExternalId: args.subscriberExternalId,
        }).filter(([, value]) => value !== undefined)
      );

      result = await apiRequest(
        "POST",
        "/api/v1/transactional/send",
        sendBody,
        companyId
      );
      break;
    }

    // Analytics
    case "get_stats": {
      const companyId = args.companyId as string | undefined;
      const period = args.period ?? "7d";
      const params = new URLSearchParams({ period: String(period) });
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      result = await apiRequest(
        "GET",
        `/api/v1/metrics?${params.toString()}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_campaign_stats": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/campaigns/${args.campaignId}${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_sequence_stats": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/sequences/${args.sequenceId}${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_campaign_events": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString(
        "list_campaign_events",
        args,
        "campaignId"
      );
      const params = buildEmailEventListParams("list_campaign_events", args);
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/campaigns/${encodeURIComponent(campaignId)}/events${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_sequence_events": {
      const companyId = args.companyId as string | undefined;
      const sequenceId = requiredString(
        "list_sequence_events",
        args,
        "sequenceId"
      );
      const params = buildEmailEventListParams("list_sequence_events", args);
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/sequences/${encodeURIComponent(sequenceId)}/events${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_subscriber_activity": {
      const companyId = args.companyId as string | undefined;
      const identifier = requireSubscriberIdentifier(
        "get_subscriber_activity",
        args
      );
      const detail = await fetchDetailedSubscriberByIdentifier(
        identifier,
        companyId,
        {
          includeMachineEngagement: args.includeMachineEngagement === true,
        }
      );
      result = {
        success: detail.success,
        email: detail.subscriber.email,
        emailStats: detail.subscriber.emailStats ?? null,
        activity: detail.subscriber.activity ?? [],
        sequenceEnrollments: detail.subscriber.sequenceEnrollments ?? [],
      };
      break;
    }

    // Team
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
