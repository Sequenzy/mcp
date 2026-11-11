import { apiRequest } from "../../runtime.js";
import {
  validateHtmlOrBlocksArgs,
  validateLabelsArg,
  validateCreateTransactionalContentArgs,
  validateSendingIdentityArgs,
  requireSubscriberIdentifier,
  fetchDetailedSubscriberByIdentifier,
  requiredString,
  buildEmailEventListParams,
  optionalString,
  optionalStringArray,
  optionalAllowedString,
  optionalIntegerInRange,
  parseSendRecipients,
  dedupeSendRecipientFields,
  assertSendRecipientPolicy,
} from "../internal.js";

/** Custom range, provider, recipient domain, source and outcome filters shared by the stats tools. */
function setDrillDownParams(
  params: URLSearchParams,
  args: Record<string, unknown>
): void {
  for (const field of [
    "start",
    "end",
    "mailboxProvider",
    "recipientDomain",
    "source",
    "outcome",
  ] as const) {
    const value = optionalString(args, field);
    if (value) params.set(field, value);
  }
}

export async function handleAnalyticsAndTransactionalTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_transactional_emails": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      validateLabelsArg(name, args);
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
      for (const label of optionalStringArray(name, args, "labels"))
        params.append("label", label);
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
        "labels",
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
          `\`create_transactional_email\` accepts only \`name\`, \`slug\`, \`subject\`, \`previewText\`, \`html\`, \`blocks\`, \`prompt\`, \`style\`, \`tone\`, \`enabled\`, and \`labels\` fields. Unsupported field${unsupportedTransactionalCreateKeys.length === 1 ? "" : "s"}: ${unsupportedTransactionalCreateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateLabelsArg(name, args);
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
        "labels",
        "html",
        "blocks",
      ]);
      const unsupportedTransactionalUpdateKeys = Object.keys(args).filter(
        (key) => !allowedTransactionalUpdateKeys.has(key)
      );

      if (unsupportedTransactionalUpdateKeys.length > 0) {
        throw new Error(
          `\`update_transactional_email\` accepts only \`name\`, \`enabled\`, \`subject\`, \`previewText\`, \`html\`, \`blocks\`, and \`labels\` update fields. Unsupported field${unsupportedTransactionalUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedTransactionalUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateLabelsArg(name, args);
      validateHtmlOrBlocksArgs("update_transactional_email", args);

      if (
        args.labels === undefined &&
        args.name === undefined &&
        args.enabled === undefined &&
        args.subject === undefined &&
        args.previewText === undefined &&
        args.html === undefined &&
        args.blocks === undefined
      ) {
        throw new Error(
          "Provide at least one of `name`, `enabled`, `subject`, `previewText`, `html`, `blocks`, or `labels` when calling `update_transactional_email`."
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
      const parsedTo = parseSendRecipients(args, "to");
      if (parsedTo === undefined) {
        throw new Error("`to` is required when calling `send_email`.");
      }
      const recipients = dedupeSendRecipientFields({
        to: parsedTo,
        cc: parseSendRecipients(args, "cc"),
        bcc: parseSendRecipients(args, "bcc"),
      });
      const { to, cc, bcc } = recipients;
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
      const trackAs =
        args.trackAs === undefined
          ? undefined
          : requiredString("send_email", args, "trackAs");
      const emailType =
        args.emailType === undefined
          ? undefined
          : requiredString("send_email", args, "emailType");
      const replyTo =
        args.replyTo === undefined
          ? undefined
          : requiredString("send_email", args, "replyTo");
      const senderProfileId =
        args.senderProfileId === undefined
          ? undefined
          : requiredString("send_email", args, "senderProfileId");
      const fromEmail =
        args.fromEmail === undefined
          ? undefined
          : requiredString("send_email", args, "fromEmail");
      const fromName =
        args.fromName === undefined
          ? undefined
          : requiredString("send_email", args, "fromName");
      const replyProfileId =
        args.replyProfileId === undefined
          ? undefined
          : requiredString("send_email", args, "replyProfileId");
      const replyToName =
        args.replyToName === undefined
          ? undefined
          : requiredString("send_email", args, "replyToName");
      const idempotencyKey =
        args.idempotencyKey === undefined
          ? undefined
          : requiredString("send_email", args, "idempotencyKey");
      const subscriberExternalId =
        typeof args.subscriberExternalId === "string"
          ? optionalString(args, "subscriberExternalId")
          : args.subscriberExternalId;
      if (idempotencyKey && idempotencyKey.length > 255) {
        throw new Error(
          "`idempotencyKey` must be 255 characters or fewer when calling `send_email`."
        );
      }
      let attachments: Array<Record<string, string>> | undefined;
      if (args.attachments !== undefined) {
        if (!Array.isArray(args.attachments) || args.attachments.length > 10) {
          throw new Error(
            "`attachments` must be an array with at most 10 items when calling `send_email`."
          );
        }
        attachments = args.attachments.map((entry, index) => {
          if (
            typeof entry !== "object" ||
            entry === null ||
            Array.isArray(entry)
          ) {
            throw new Error(
              `\`attachments[${index}]\` must be an object when calling \`send_email\`.`
            );
          }
          const record = entry as Record<string, unknown>;
          const allowed = new Set([
            "filename",
            "content",
            "path",
            "contentId",
            "contentType",
          ]);
          if (Object.keys(record).some((key) => !allowed.has(key))) {
            throw new Error(
              `\`attachments[${index}]\` contains an unsupported field when calling \`send_email\`.`
            );
          }
          const parsed: Record<string, string> = {};
          for (const field of allowed) {
            const value = record[field];
            if (value === undefined) continue;
            if (typeof value !== "string") {
              throw new Error(
                `\`attachments[${index}].${field}\` must be a string when calling \`send_email\`.`
              );
            }
            parsed[field] = value;
          }
          if (!parsed["filename"]) {
            throw new Error(
              `\`attachments[${index}].filename\` is required when calling \`send_email\`.`
            );
          }
          const hasContent = parsed["content"] !== undefined;
          const hasPath = parsed["path"] !== undefined;
          if (hasContent === hasPath) {
            throw new Error(
              `\`attachments[${index}]\` must provide exactly one of \`content\` or \`path\` when calling \`send_email\`.`
            );
          }
          return parsed;
        });
      }

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

      if (templateId !== undefined && trackAs !== undefined) {
        throw new Error(
          "`trackAs` only applies to direct `subject` and `html` sends; saved templates already track their own stats when calling `send_email`."
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

      validateSendingIdentityArgs("send_email", args);

      assertSendRecipientPolicy({
        emailType,
        to,
        cc,
        bcc,
        subscriberExternalId,
      });

      let trackingSettings:
        { clickTracking?: boolean; openTracking?: boolean } | undefined;
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

      let headers: Record<string, string> | undefined;
      if (args.headers !== undefined) {
        if (
          typeof args.headers !== "object" ||
          args.headers === null ||
          Array.isArray(args.headers)
        ) {
          throw new Error(
            "`headers` must be an object of header names to string values when calling `send_email`."
          );
        }
        headers = {};
        for (const [name, value] of Object.entries(args.headers)) {
          if (typeof value !== "string") {
            throw new Error(
              `\`headers.${name}\` must be a string when calling \`send_email\`.`
            );
          }
          headers[name] = value;
        }
      }

      const sendBody = Object.fromEntries(
        Object.entries({
          to,
          cc,
          bcc,
          slug: templateId,
          subject,
          body: html,
          trackAs,
          variables: args.variables,
          subscriberExternalId,
          emailType,
          replyTo,
          senderProfileId,
          fromEmail,
          fromName,
          replyProfileId,
          replyToName,
          attachments,
          trackingSettings,
          headers,
        }).filter(([, value]) => value !== undefined)
      );

      result = idempotencyKey
        ? await apiRequest(
            "POST",
            "/api/v1/transactional/send",
            sendBody,
            companyId,
            { "Idempotency-Key": idempotencyKey }
          )
        : await apiRequest(
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
      setDrillDownParams(params, args);
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

    case "get_stats_breakdown": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      for (const field of ["by", "period", "emailType"] as const) {
        const value = optionalString(args, field);
        if (value) params.set(field, value);
      }
      setDrillDownParams(params, args);
      if (args.limit !== undefined) params.set("limit", String(args.limit));
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/breakdown${query ? `?${query}` : ""}`,
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

    case "get_email_client_stats": {
      const companyId = args.companyId as string | undefined;
      const campaignId = optionalString(args, "campaignId");
      const params = new URLSearchParams();
      const filters = campaignId
        ? (["mailboxProvider"] as const)
        : (["period", "start", "end", "emailType", "mailboxProvider"] as const);
      for (const field of filters) {
        const value = optionalString(args, field);
        if (value) params.set(field, value);
      }
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      const path = campaignId
        ? `/api/v1/metrics/campaigns/${encodeURIComponent(campaignId)}/clients`
        : "/api/v1/metrics/clients";
      result = await apiRequest(
        "GET",
        `${path}${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_link_click_stats": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      for (const field of [
        "period",
        "start",
        "end",
        "emailType",
        "mailboxProvider",
      ] as const) {
        const value = optionalString(args, field);
        if (value) params.set(field, value);
      }
      if (args.limit !== undefined) params.set("limit", String(args.limit));
      if (args.includeMachineEngagement === true) {
        params.set("includeMachineEngagement", "true");
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/links${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_poll_responses": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString(
        "list_poll_responses",
        args,
        "campaignId"
      );
      const params = new URLSearchParams();
      const blockId = optionalString(args, "blockId");
      if (blockId) params.set("blockId", blockId);
      if (args["hasComment"] === true) params.set("hasComment", "true");
      for (const field of ["page", "limit"] as const) {
        if (args[field] !== undefined) {
          params.set(field, String(args[field]));
        }
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/campaigns/${encodeURIComponent(campaignId)}/poll-responses${
          query ? `?${query}` : ""
        }`,
        undefined,
        companyId
      );
      break;
    }

    case "list_campaign_replies": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString(
        "list_campaign_replies",
        args,
        "campaignId"
      );
      const params = new URLSearchParams();
      for (const field of ["page", "limit"] as const) {
        if (args[field] !== undefined) {
          params.set(field, String(args[field]));
        }
      }
      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/metrics/campaigns/${encodeURIComponent(campaignId)}/replies${
          query ? `?${query}` : ""
        }`,
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
      if (
        emailType === "campaign" &&
        (sequenceIds.length > 0 || step !== undefined)
      ) {
        throw new Error(
          "`emailType` campaign cannot be combined with `sequenceId` or `step` when calling `list_email_metrics`."
        );
      }
      if (emailType === "sequence" && campaignIds.length > 0) {
        throw new Error(
          "`emailType` sequence cannot be combined with `campaignId` when calling `list_email_metrics`."
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
