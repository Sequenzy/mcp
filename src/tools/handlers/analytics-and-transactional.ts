import { apiRequest } from "../../runtime.js";
import {
  validateHtmlOrBlocksArgs,
  validateCreateTransactionalContentArgs,
  requireSubscriberIdentifier,
  fetchDetailedSubscriberByIdentifier,
  requiredString,
  buildEmailEventListParams,
  optionalString,
  optionalStringArray,
  optionalAllowedString,
  optionalIntegerInRange,
} from "../internal.js";

export async function handleAnalyticsAndTransactionalTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_transactional_emails": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      const search = optionalString(args, "search");
      const status = optionalAllowedString(
        "list_transactional_emails",
        args,
        "status",
        ["all", "active", "disabled"]
      );
      const sort = optionalAllowedString(
        "list_transactional_emails",
        args,
        "sort",
        ["date", "sends", "opens", "open-rate", "clicks", "ctr"]
      );
      const order = optionalAllowedString(
        "list_transactional_emails",
        args,
        "order",
        ["asc", "desc"]
      );
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (sort) params.set("sort", sort);
      if (order) params.set("order", order);
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/transactional${query ? `?${query}` : ""}`,
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

    case "delete_transactional_email": {
      const companyId = args.companyId as string | undefined;
      const idOrSlug = requiredString(
        "delete_transactional_email",
        args,
        "idOrSlug"
      );

      result = await apiRequest(
        "DELETE",
        `/api/v1/transactional/${encodeURIComponent(idOrSlug)}`,
        undefined,
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
      const emailType =
        args.emailType === undefined
          ? undefined
          : requiredString("send_email", args, "emailType");
      const replyTo =
        args.replyTo === undefined
          ? undefined
          : requiredString("send_email", args, "replyTo");

      if (
        emailType !== undefined &&
        emailType !== "marketing" &&
        emailType !== "transactional"
      ) {
        throw new Error(
          "`emailType` must be `marketing` or `transactional` when calling `send_email`."
        );
      }

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

      let trackingSettings:
        | { clickTracking?: boolean; openTracking?: boolean }
        | undefined;
      if (args.trackingSettings !== undefined) {
        if (
          typeof args.trackingSettings !== "object" ||
          args.trackingSettings === null ||
          Array.isArray(args.trackingSettings)
        ) {
          throw new Error(
            "`trackingSettings` must be an object with optional boolean `clickTracking` and `openTracking` fields when calling `send_email`."
          );
        }
        const rawTracking = args.trackingSettings as Record<string, unknown>;
        trackingSettings = {};
        for (const field of ["clickTracking", "openTracking"] as const) {
          const value = rawTracking[field];
          if (value === undefined) continue;
          if (typeof value !== "boolean") {
            throw new Error(
              `\`trackingSettings.${field}\` must be a boolean when calling \`send_email\`.`
            );
          }
          trackingSettings[field] = value;
        }
      }

      const sendBody = Object.fromEntries(
        Object.entries({
          to,
          slug: templateId,
          subject,
          body: html,
          variables: args.variables,
          subscriberExternalId: args.subscriberExternalId,
          emailType,
          replyTo,
          trackingSettings,
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
      const emailType =
        args.emailType === undefined
          ? undefined
          : requiredString("get_stats", args, "emailType");
      if (
        emailType !== undefined &&
        !["campaign", "transactional", "sequence"].includes(emailType)
      ) {
        throw new Error(
          "`emailType` must be `campaign`, `transactional`, or `sequence` when calling `get_stats`."
        );
      }
      if (emailType) {
        params.set("emailType", emailType);
      }
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
      if (typeof args.period === "string") params.set("period", args.period);
      if (typeof args.start === "string") params.set("start", args.start);
      if (typeof args.end === "string") params.set("end", args.end);
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

    case "get_transactional_stats": {
      const companyId = args.companyId as string | undefined;
      const idOrSlug = requiredString(
        "get_transactional_stats",
        args,
        "idOrSlug"
      );
      const params = new URLSearchParams();
      for (const key of ["period", "start", "end"] as const) {
        if (typeof args[key] === "string" && args[key].trim()) {
          params.set(key, args[key].trim());
        }
      }
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/transactional/${encodeURIComponent(idOrSlug)}${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_sequence_stats": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      for (const key of ["period", "start", "end"] as const) {
        if (typeof args[key] === "string" && args[key].trim()) {
          params.set(key, args[key].trim());
        }
      }
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
      const automationNodeId = optionalString(args, "automationNodeId");
      if (automationNodeId) {
        params.set("automationNodeId", automationNodeId);
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/sequences/${encodeURIComponent(sequenceId)}/events${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_email_metrics": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();

      const emailType = optionalAllowedString(
        "list_email_metrics",
        args,
        "emailType",
        ["campaign", "sequence"]
      );
      if (emailType) {
        params.set("emailType", emailType);
      }

      const sequenceIds = optionalStringArray(
        "list_email_metrics",
        args,
        "sequenceId"
      );
      const campaignIds = optionalStringArray(
        "list_email_metrics",
        args,
        "campaignId"
      );

      const step = optionalIntegerInRange(
        "list_email_metrics",
        args,
        "step",
        1,
        1_000
      );
      if (campaignIds.length > 0 && (sequenceIds.length > 0 || step)) {
        throw new Error(
          "`campaignId` cannot be combined with `sequenceId` or `step` when calling `list_email_metrics`."
        );
      }
      if (sequenceIds.length > 0) {
        params.set("sequenceId", sequenceIds.join(","));
      }
      if (campaignIds.length > 0) {
        params.set("campaignId", campaignIds.join(","));
      }
      if (step !== undefined) {
        params.set("step", String(step));
      }

      const period = optionalAllowedString(
        "list_email_metrics",
        args,
        "period",
        ["1h", "24h", "7d", "30d", "90d"]
      );
      if (period) {
        params.set("period", period);
      }

      for (const key of ["start", "end"] as const) {
        const value = optionalString(args, key);
        if (value) {
          params.set(key, value);
        }
      }

      const sort = optionalAllowedString("list_email_metrics", args, "sort", [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "openRate",
        "clickRate",
        "unsubscribed",
        "conversions",
        "revenue",
        "step",
        "name",
      ]);
      if (sort) {
        params.set("sort", sort);
      }

      const order = optionalAllowedString("list_email_metrics", args, "order", [
        "asc",
        "desc",
      ]);
      if (order) {
        params.set("order", order);
      }

      const page = optionalIntegerInRange(
        "list_email_metrics",
        args,
        "page",
        1,
        1_000_000
      );
      if (page !== undefined) {
        params.set("page", String(page));
      }

      const limit = optionalIntegerInRange(
        "list_email_metrics",
        args,
        "limit",
        1,
        500
      );
      if (limit !== undefined) {
        params.set("limit", String(limit));
      }

      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }

      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/emails${query ? `?${query}` : ""}`,
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
