import { apiRequest } from "../../runtime.js";
import {
  validateHtmlOrBlocksArgs,
  validateSendingIdentityArgs,
  validateLabelsArg,
  validateCreateCampaignContentArgs,
  validateCreateTemplateContentArgs,
  validateScheduleCampaignArgs,
  isRecord,
  optionalString,
  requiredString,
  optionalAllowedString,
  optionalIntegerInRange,
} from "../internal.js";

export async function handleCampaignTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "list_templates": {
      const companyId = args.companyId as string | undefined;
      const templateParams = new URLSearchParams();
      const label = optionalString(args, "label");
      if (label) templateParams.set("label", label);
      result = await apiRequest(
        "GET",
        `/api/v1/templates${templateParams.size > 0 ? `?${templateParams}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_template": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/templates/${args.templateId}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_template": {
      const companyId = args.companyId as string | undefined;
      validateCreateTemplateContentArgs(args);
      const createBody = Object.fromEntries(
        Object.entries(args).filter(([key]) => key !== "companyId")
      );
      result = await apiRequest(
        "POST",
        "/api/v1/templates",
        createBody,
        companyId
      );
      break;
    }

    case "update_template": {
      const companyId = args.companyId as string | undefined;
      const allowedTemplateUpdateKeys = new Set([
        "companyId",
        "templateId",
        "name",
        "subject",
        "previewText",
        "html",
        "blocks",
        "labels",
      ]);
      const unsupportedTemplateUpdateKeys = Object.keys(args).filter(
        (key) => !allowedTemplateUpdateKeys.has(key)
      );

      if (unsupportedTemplateUpdateKeys.length > 0) {
        throw new Error(
          `\`update_template\` accepts only \`name\`, \`subject\`, \`previewText\`, \`html\`, \`blocks\`, and \`labels\` update fields. Unsupported field${unsupportedTemplateUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedTemplateUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateHtmlOrBlocksArgs("update_template", args);
      validateLabelsArg("update_template", args);

      if (
        args.name === undefined &&
        args.subject === undefined &&
        args.previewText === undefined &&
        args.html === undefined &&
        args.blocks === undefined &&
        args.labels === undefined
      ) {
        throw new Error(
          "Provide at least one of `name`, `subject`, `previewText`, `html`, `blocks`, or `labels` when calling `update_template`."
        );
      }

      result = await apiRequest(
        "PUT",
        `/api/v1/templates/${args.templateId}`,
        args,
        companyId
      );
      break;
    }

    case "set_template_localization": {
      const companyId = args.companyId as string | undefined;
      const templateId = requiredString(
        "set_template_localization",
        args,
        "templateId"
      );
      const locale = requiredString(
        "set_template_localization",
        args,
        "locale"
      );
      const subject = requiredString(
        "set_template_localization",
        args,
        "subject"
      );
      const allowedKeys = new Set([
        "companyId",
        "templateId",
        "locale",
        "subject",
        "previewText",
        "html",
        "blocks",
      ]);
      const unsupportedKeys = Object.keys(args).filter(
        (key) => !allowedKeys.has(key)
      );
      if (unsupportedKeys.length > 0) {
        throw new Error(
          `\`set_template_localization\` received unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateHtmlOrBlocksArgs("set_template_localization", args, {
        requireContent: true,
      });

      const localizationBody: Record<string, unknown> = { subject };
      if (args.previewText !== undefined) {
        localizationBody.previewText = args.previewText;
      }
      if (args.html !== undefined) {
        localizationBody.html = args.html;
      }
      if (args.blocks !== undefined) {
        localizationBody.blocks = args.blocks;
      }

      result = await apiRequest(
        "PUT",
        `/api/v1/templates/${encodeURIComponent(templateId)}/localizations/${encodeURIComponent(locale)}`,
        localizationBody,
        companyId
      );
      break;
    }

    case "sync_template_localizations": {
      const companyId = args.companyId as string | undefined;
      const templateId = requiredString(
        "sync_template_localizations",
        args,
        "templateId"
      );
      const allowedKeys = new Set(["companyId", "templateId", "locales"]);
      const unsupportedKeys = Object.keys(args).filter(
        (key) => !allowedKeys.has(key)
      );
      if (unsupportedKeys.length > 0) {
        throw new Error(
          `\`sync_template_localizations\` received unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      let locales: string[] | undefined;
      if (args.locales !== undefined) {
        if (
          !Array.isArray(args.locales) ||
          args.locales.length === 0 ||
          args.locales.some(
            (locale) => typeof locale !== "string" || locale.trim().length === 0
          )
        ) {
          throw new Error(
            "`locales` must contain at least one non-empty locale string when calling `sync_template_localizations`."
          );
        }
        locales = args.locales.map((locale) => locale.trim());
      }

      result = await apiRequest(
        "POST",
        `/api/v1/templates/${encodeURIComponent(templateId)}/localizations/sync`,
        locales === undefined ? {} : { locales },
        companyId
      );
      break;
    }

    case "delete_template": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "DELETE",
        `/api/v1/templates/${args.templateId}`,
        undefined,
        companyId
      );
      break;
    }

    // A/B Tests
    case "list_ab_tests": {
      const companyId = args.companyId as string | undefined;
      const abTestParams = new URLSearchParams();
      const sequenceId = optionalString(args, "sequenceId");
      if (sequenceId) abTestParams.set("sequenceId", sequenceId);

      result = await apiRequest(
        "GET",
        `/api/v1/ab-tests${abTestParams.size > 0 ? `?${abTestParams}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_ab_test": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/ab-tests/${args.abTestId}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_ab_test_stats": {
      const companyId = args.companyId as string | undefined;
      const abTestStatsParams = new URLSearchParams();
      const period = optionalString(args, "period");
      const start = optionalString(args, "start");
      const end = optionalString(args, "end");
      if (period) abTestStatsParams.set("period", period);
      if (start) abTestStatsParams.set("start", start);
      if (end) abTestStatsParams.set("end", end);
      if (args.includeMachineEngagement === true) {
        abTestStatsParams.set("includeMachineEngagement", "true");
      }

      result = await apiRequest(
        "GET",
        `/api/v1/ab-tests/${args.abTestId}/stats${abTestStatsParams.size > 0 ? `?${abTestStatsParams}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "restart_ab_test": {
      const companyId = args.companyId as string | undefined;
      const allowedRestartKeys = new Set([
        "companyId",
        "abTestId",
        "sourceVariantId",
        "testType",
        "winnerThreshold",
        "variantCount",
      ]);
      const unsupportedRestartKeys = Object.keys(args).filter(
        (key) => !allowedRestartKeys.has(key)
      );

      if (unsupportedRestartKeys.length > 0) {
        throw new Error(
          `\`restart_ab_test\` accepts only \`sourceVariantId\`, \`testType\`, \`winnerThreshold\`, and \`variantCount\` option fields. Unsupported field${unsupportedRestartKeys.length === 1 ? "" : "s"}: ${unsupportedRestartKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      const testType = optionalString(args, "testType");
      if (
        testType !== undefined &&
        testType !== "subject" &&
        testType !== "content"
      ) {
        throw new Error(
          "`restart_ab_test` testType must be `subject` or `content`."
        );
      }

      const winnerThreshold =
        args.winnerThreshold === undefined
          ? undefined
          : Number(args.winnerThreshold);
      if (
        winnerThreshold !== undefined &&
        (!Number.isInteger(winnerThreshold) ||
          winnerThreshold < 10 ||
          winnerThreshold > 1000)
      ) {
        throw new Error(
          "`restart_ab_test` winnerThreshold must be an integer from 10 to 1000."
        );
      }

      const variantCount =
        args.variantCount === undefined ? undefined : Number(args.variantCount);
      if (
        variantCount !== undefined &&
        (!Number.isInteger(variantCount) ||
          variantCount < 2 ||
          variantCount > 4)
      ) {
        throw new Error(
          "`restart_ab_test` variantCount must be an integer from 2 to 4."
        );
      }

      result = await apiRequest(
        "POST",
        `/api/v1/ab-tests/${args.abTestId}/restart`,
        {
          sourceVariantId: optionalString(args, "sourceVariantId"),
          testType,
          winnerThreshold,
          variantCount,
        },
        companyId
      );
      break;
    }

    case "update_ab_test_variant": {
      const companyId = args.companyId as string | undefined;
      const allowedAbTestUpdateKeys = new Set([
        "companyId",
        "abTestId",
        "variantId",
        "subject",
        "previewText",
        "html",
        "blocks",
        "confirmLiveChange",
      ]);
      const unsupportedAbTestUpdateKeys = Object.keys(args).filter(
        (key) => !allowedAbTestUpdateKeys.has(key)
      );

      if (unsupportedAbTestUpdateKeys.length > 0) {
        throw new Error(
          `\`update_ab_test_variant\` accepts only \`subject\`, \`previewText\`, \`html\`, \`blocks\`, and \`confirmLiveChange\` fields. Unsupported field${unsupportedAbTestUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedAbTestUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateHtmlOrBlocksArgs("update_ab_test_variant", args);

      if (
        args.confirmLiveChange !== undefined &&
        typeof args.confirmLiveChange !== "boolean"
      ) {
        throw new Error(
          "`confirmLiveChange` must be a boolean when calling `update_ab_test_variant`."
        );
      }

      if (
        args.subject === undefined &&
        args.previewText === undefined &&
        args.html === undefined &&
        args.blocks === undefined
      ) {
        throw new Error(
          "Provide at least one of `subject`, `previewText`, `html`, or `blocks` when calling `update_ab_test_variant`."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/ab-tests/${args.abTestId}/variants/${args.variantId}`,
        args,
        companyId
      );
      break;
    }

    case "update_ab_test": {
      const companyId = args.companyId as string | undefined;
      const abTestId = requiredString("update_ab_test", args, "abTestId");
      const allowedAbTestSettingsKeys = new Set([
        "companyId",
        "abTestId",
        "name",
        "testPercentage",
        "testDurationMinutes",
        "winnerCriteria",
        "testType",
        "winnerThreshold",
        "confirmLiveChange",
      ]);
      const unsupportedAbTestSettingsKeys = Object.keys(args).filter(
        (key) => !allowedAbTestSettingsKeys.has(key)
      );
      if (unsupportedAbTestSettingsKeys.length > 0) {
        throw new Error(
          `\`update_ab_test\` received unsupported field${unsupportedAbTestSettingsKeys.length === 1 ? "" : "s"}: ${unsupportedAbTestSettingsKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }
      if (
        args.confirmLiveChange !== undefined &&
        typeof args.confirmLiveChange !== "boolean"
      ) {
        throw new Error(
          "`confirmLiveChange` must be a boolean when calling `update_ab_test`."
        );
      }

      const name = optionalString(args, "name");
      const testPercentage = optionalIntegerInRange(
        "update_ab_test",
        args,
        "testPercentage",
        5,
        50
      );
      const testDurationMinutes = optionalIntegerInRange(
        "update_ab_test",
        args,
        "testDurationMinutes",
        15,
        1440
      );
      const winnerCriteria = optionalAllowedString(
        "update_ab_test",
        args,
        "winnerCriteria",
        ["open_rate", "click_rate"]
      );
      const testType = optionalAllowedString(
        "update_ab_test",
        args,
        "testType",
        ["subject", "content"]
      );
      const winnerThreshold = optionalIntegerInRange(
        "update_ab_test",
        args,
        "winnerThreshold",
        10,
        1000
      );
      if (
        name === undefined &&
        testPercentage === undefined &&
        testDurationMinutes === undefined &&
        winnerCriteria === undefined &&
        testType === undefined &&
        winnerThreshold === undefined
      ) {
        throw new Error(
          "Provide at least one of `name`, `testPercentage`, `testDurationMinutes`, `winnerCriteria`, `testType`, or `winnerThreshold` when calling `update_ab_test`."
        );
      }

      result = await apiRequest(
        "PATCH",
        `/api/v1/ab-tests/${encodeURIComponent(abTestId)}`,
        {
          ...(name !== undefined && { name }),
          ...(testPercentage !== undefined && { testPercentage }),
          ...(testDurationMinutes !== undefined && { testDurationMinutes }),
          ...(winnerCriteria !== undefined && { winnerCriteria }),
          ...(testType !== undefined && { testType }),
          ...(winnerThreshold !== undefined && { winnerThreshold }),
          ...(args.confirmLiveChange === true && { confirmLiveChange: true }),
        },
        companyId
      );
      break;
    }

    case "create_ab_test": {
      const companyId = args.companyId as string | undefined;
      const campaignId = optionalString(args, "campaignId");
      const automationNodeId = optionalString(args, "automationNodeId");
      if (
        args.confirmLiveChange !== undefined &&
        typeof args.confirmLiveChange !== "boolean"
      ) {
        throw new Error(
          "`confirmLiveChange` must be a boolean when calling `create_ab_test`."
        );
      }
      if (Boolean(campaignId) === Boolean(automationNodeId)) {
        throw new Error(
          "Provide exactly one of `campaignId` or `automationNodeId` when calling `create_ab_test`."
        );
      }
      const name = optionalString(args, "name");
      const testPercentage = optionalIntegerInRange(
        "create_ab_test",
        args,
        "testPercentage",
        5,
        50
      );
      const testDurationMinutes = optionalIntegerInRange(
        "create_ab_test",
        args,
        "testDurationMinutes",
        15,
        1440
      );
      const winnerCriteria = optionalAllowedString(
        "create_ab_test",
        args,
        "winnerCriteria",
        ["open_rate", "click_rate"]
      );
      const testType = optionalAllowedString(
        "create_ab_test",
        args,
        "testType",
        ["subject", "content"]
      );
      const winnerThreshold = optionalIntegerInRange(
        "create_ab_test",
        args,
        "winnerThreshold",
        10,
        1000
      );

      if (args.variants !== undefined) {
        if (!Array.isArray(args.variants)) {
          throw new Error(
            "`variants` must be an array when calling `create_ab_test`."
          );
        }

        args.variants.forEach((variant, index) => {
          if (
            !isRecord(variant) ||
            typeof variant.subject !== "string" ||
            variant.subject.trim() === ""
          ) {
            throw new Error(
              `\`variants\` item ${index + 1} must include a non-empty \`subject\` when calling \`create_ab_test\`.`
            );
          }

          if (variant.blocks !== undefined && !Array.isArray(variant.blocks)) {
            throw new Error(
              `\`variants\` item ${index + 1} \`blocks\` must be an array when calling \`create_ab_test\`.`
            );
          }
        });
      }
      const variants = Array.isArray(args.variants) ? args.variants : undefined;
      if (
        automationNodeId !== undefined &&
        (!variants || variants.length < 1)
      ) {
        throw new Error(
          "`variants` must include at least one competing variant when calling `create_ab_test` with `automationNodeId`."
        );
      }
      if (variants && variants.length > 4) {
        throw new Error(
          "`variants` supports at most four extra variants when calling `create_ab_test`."
        );
      }

      result = await apiRequest(
        "POST",
        "/api/v1/ab-tests",
        {
          ...(campaignId !== undefined && { campaignId }),
          ...(automationNodeId !== undefined && { automationNodeId }),
          ...(args.confirmLiveChange === true && {
            confirmLiveChange: true,
          }),
          ...(name !== undefined && { name }),
          ...(testPercentage !== undefined && { testPercentage }),
          ...(testDurationMinutes !== undefined && { testDurationMinutes }),
          ...(winnerCriteria !== undefined && { winnerCriteria }),
          ...(testType !== undefined && { testType }),
          ...(winnerThreshold !== undefined && { winnerThreshold }),
          ...(args.variants !== undefined && { variants: args.variants }),
        },
        companyId
      );
      break;
    }

    case "add_ab_test_variant": {
      const companyId = args.companyId as string | undefined;
      const abTestId = requiredString("add_ab_test_variant", args, "abTestId");
      const subject = requiredString("add_ab_test_variant", args, "subject");
      const previewText = optionalString(args, "previewText");

      if (args.blocks !== undefined && !Array.isArray(args.blocks)) {
        throw new Error(
          "`blocks` must be an array when calling `add_ab_test_variant`."
        );
      }
      if (
        args.confirmLiveChange !== undefined &&
        typeof args.confirmLiveChange !== "boolean"
      ) {
        throw new Error(
          "`confirmLiveChange` must be a boolean when calling `add_ab_test_variant`."
        );
      }

      result = await apiRequest(
        "POST",
        `/api/v1/ab-tests/${encodeURIComponent(abTestId)}/variants`,
        {
          subject,
          ...(previewText !== undefined && { previewText }),
          ...(args.blocks !== undefined && { blocks: args.blocks }),
          ...(args.confirmLiveChange === true && { confirmLiveChange: true }),
        },
        companyId
      );
      break;
    }

    case "delete_ab_test_variant": {
      const companyId = args.companyId as string | undefined;
      const abTestId = requiredString(
        "delete_ab_test_variant",
        args,
        "abTestId"
      );
      const variantId = requiredString(
        "delete_ab_test_variant",
        args,
        "variantId"
      );
      if (
        args.confirmLiveChange !== undefined &&
        typeof args.confirmLiveChange !== "boolean"
      ) {
        throw new Error(
          "`confirmLiveChange` must be a boolean when calling `delete_ab_test_variant`."
        );
      }
      result = await apiRequest(
        "DELETE",
        `/api/v1/ab-tests/${encodeURIComponent(abTestId)}/variants/${encodeURIComponent(variantId)}${
          args.confirmLiveChange === true ? "?confirmLiveChange=true" : ""
        }`,
        undefined,
        companyId
      );
      break;
    }

    case "delete_ab_test": {
      const companyId = args.companyId as string | undefined;
      const abTestId = requiredString("delete_ab_test", args, "abTestId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/ab-tests/${encodeURIComponent(abTestId)}`,
        undefined,
        companyId
      );
      break;
    }

    // Campaigns
    case "list_campaigns": {
      const companyId = args.companyId as string | undefined;
      const campaignParams = new URLSearchParams();
      if (args.status) campaignParams.set("status", String(args.status));
      const label = optionalString(args, "label");
      if (label) campaignParams.set("label", label);
      for (const field of ["limit", "offset"] as const) {
        if (args[field] !== undefined) {
          campaignParams.set(field, String(args[field]));
        }
      }
      result = await apiRequest(
        "GET",
        `/api/v1/campaigns?${campaignParams}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_campaign": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/campaigns/${args.campaignId}`,
        undefined,
        companyId
      );
      break;
    }

    case "get_campaign_audience": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/campaigns/${encodeURIComponent(String(args.campaignId))}/audience`,
        undefined,
        companyId
      );
      break;
    }

    case "get_email_send": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/email-sends/${encodeURIComponent(String(args.emailSendId))}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_email_sends": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      const stringFilters = [
        "search",
        "subject",
        "recipient",
        "campaignId",
        "transactionalEmailId",
        "automationId",
      ] as const;
      for (const key of stringFilters) {
        const value = optionalString(args, key);
        if (value) params.set(key, value);
      }

      const status = optionalAllowedString("list_email_sends", args, "status", [
        "pending",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "complained",
        "failed",
        "suppressed",
      ]);
      const emailType = optionalAllowedString(
        "list_email_sends",
        args,
        "emailType",
        ["campaign", "transactional", "sequence"]
      );
      const bounceType = optionalAllowedString(
        "list_email_sends",
        args,
        "bounceType",
        ["Permanent", "Transient"]
      );
      const sortField = optionalAllowedString(
        "list_email_sends",
        args,
        "sortField",
        [
          "recipientEmail",
          "subject",
          "status",
          "eventAt",
          "sentAt",
          "createdAt",
        ]
      );
      const sortOrder = optionalAllowedString(
        "list_email_sends",
        args,
        "sortOrder",
        ["asc", "desc"]
      );
      const days = optionalIntegerInRange(
        "list_email_sends",
        args,
        "days",
        1,
        14
      );
      const page = optionalIntegerInRange(
        "list_email_sends",
        args,
        "page",
        1,
        Number.MAX_SAFE_INTEGER
      );
      const limit = optionalIntegerInRange(
        "list_email_sends",
        args,
        "limit",
        1,
        100
      );

      const optionalParams: Array<[string, string | number | undefined]> = [
        ["status", status],
        ["emailType", emailType],
        ["bounceType", bounceType],
        ["sortField", sortField],
        ["sortOrder", sortOrder],
        ["days", days],
        ["page", page],
        ["limit", limit],
      ];
      for (const [key, value] of optionalParams) {
        if (value !== undefined) params.set(key, String(value));
      }

      const query = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/email-sends${query ? `?${query}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "create_campaign": {
      const companyId = args.companyId as string | undefined;
      validateCreateCampaignContentArgs(args);
      validateSendingIdentityArgs("create_campaign", args);

      const createBody = Object.fromEntries(
        Object.entries(args).filter(([key]) => key !== "companyId")
      );
      result = await apiRequest(
        "POST",
        "/api/v1/campaigns",
        createBody,
        companyId
      );
      break;
    }

    case "update_campaign": {
      const companyId = args.companyId as string | undefined;
      const allowedCampaignUpdateKeys = new Set([
        "companyId",
        "campaignId",
        "name",
        "subject",
        "trackingCode",
        "html",
        "blocks",
        "fromEmail",
        "fromName",
        "senderProfileId",
        "replyTo",
        "replyToName",
        "replyProfileId",
        "ccEmails",
        "bccEmails",
        "campaignData",
        "computedLists",
        "targetLists",
        "segmentId",
        "labels",
      ]);
      const unsupportedCampaignUpdateKeys = Object.keys(args).filter(
        (key) => !allowedCampaignUpdateKeys.has(key)
      );

      if (unsupportedCampaignUpdateKeys.length > 0) {
        throw new Error(
          `\`update_campaign\` accepts only content, sending identity, campaign data, computed list, audience, and label update fields. Unsupported field${unsupportedCampaignUpdateKeys.length === 1 ? "" : "s"}: ${unsupportedCampaignUpdateKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateHtmlOrBlocksArgs("update_campaign", args);
      validateLabelsArg("update_campaign", args);

      validateSendingIdentityArgs("update_campaign", args, {
        replyFirst: true,
      });
      if (args.segmentId !== undefined && args.targetLists !== undefined) {
        throw new Error(
          "Provide either `segmentId` or `targetLists` when calling `update_campaign`, not both."
        );
      }

      if (
        args.name === undefined &&
        args.subject === undefined &&
        args.trackingCode === undefined &&
        args.html === undefined &&
        args.blocks === undefined &&
        args.fromEmail === undefined &&
        args.senderProfileId === undefined &&
        args.replyTo === undefined &&
        args.replyProfileId === undefined &&
        args.ccEmails === undefined &&
        args.bccEmails === undefined &&
        args.campaignData === undefined &&
        args.computedLists === undefined &&
        args.targetLists === undefined &&
        args.segmentId === undefined &&
        args.labels === undefined
      ) {
        throw new Error(
          "Provide at least one campaign content, sending identity, campaign data, computed list, audience, or label field when calling `update_campaign`."
        );
      }

      result = await apiRequest(
        "PUT",
        `/api/v1/campaigns/${args.campaignId}`,
        args,
        companyId
      );
      break;
    }

    case "schedule_campaign": {
      const companyId = args.companyId as string | undefined;
      const allowedCampaignScheduleKeys = new Set([
        "companyId",
        "campaignId",
        "scheduledAt",
        "targetLists",
        "sendTimeOptimization",
        "spreadOverHours",
        "recurringInterval",
      ]);
      const unsupportedCampaignScheduleKeys = Object.keys(args).filter(
        (key) => !allowedCampaignScheduleKeys.has(key)
      );

      if (unsupportedCampaignScheduleKeys.length > 0) {
        throw new Error(
          `\`schedule_campaign\` accepts only \`campaignId\`, \`scheduledAt\`, \`targetLists\`, \`sendTimeOptimization\`, \`spreadOverHours\`, and \`recurringInterval\`. Unsupported field${unsupportedCampaignScheduleKeys.length === 1 ? "" : "s"}: ${unsupportedCampaignScheduleKeys.map((key) => `\`${key}\``).join(", ")}.`
        );
      }

      validateScheduleCampaignArgs(args);

      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${args.campaignId}/schedule`,
        {
          scheduledAt: args.scheduledAt,
          ...(args.targetLists !== undefined && {
            targetLists: args.targetLists,
          }),
          ...(args.sendTimeOptimization !== undefined && {
            sendTimeOptimization: args.sendTimeOptimization,
          }),
          ...(args.spreadOverHours !== undefined && {
            spreadOverHours: args.spreadOverHours,
          }),
          ...(args.recurringInterval !== undefined && {
            recurringInterval: args.recurringInterval,
          }),
        },
        companyId
      );
      break;
    }

    case "send_test_email": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${args.campaignId}/test`,
        { to: args.to },
        companyId
      );
      break;
    }

    case "cancel_campaign": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString("cancel_campaign", args, "campaignId");
      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}/cancel`,
        undefined,
        companyId
      );
      break;
    }

    case "unschedule_campaign": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString(
        "unschedule_campaign",
        args,
        "campaignId"
      );
      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}/unschedule`,
        undefined,
        companyId
      );
      break;
    }

    case "pause_campaign": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString("pause_campaign", args, "campaignId");
      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}/pause`,
        undefined,
        companyId
      );
      break;
    }

    case "resume_campaign": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString("resume_campaign", args, "campaignId");
      const spreadOverHours = optionalIntegerInRange(
        "resume_campaign",
        args,
        "spreadOverHours",
        1,
        72
      );
      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}/resume`,
        {
          ...(spreadOverHours !== undefined && { spreadOverHours }),
        },
        companyId
      );
      break;
    }

    case "delete_campaign": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString("delete_campaign", args, "campaignId");
      result = await apiRequest(
        "DELETE",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}`,
        undefined,
        companyId
      );
      break;
    }

    case "duplicate_campaign": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString(
        "duplicate_campaign",
        args,
        "campaignId"
      );
      const mode = optionalAllowedString("duplicate_campaign", args, "mode", [
        "campaign",
        "ab_test",
        "variant",
      ]);
      const variantId = optionalString(args, "variantId");

      if (mode === "variant" && variantId === undefined) {
        throw new Error(
          "`variantId` is required when calling `duplicate_campaign` with mode `variant`."
        );
      }

      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}/duplicate`,
        {
          ...(mode !== undefined && { mode }),
          ...(variantId !== undefined && { variantId }),
        },
        companyId
      );
      break;
    }

    case "resend_campaign_to_non_openers": {
      const companyId = args.companyId as string | undefined;
      const campaignId = requiredString(
        "resend_campaign_to_non_openers",
        args,
        "campaignId"
      );

      result = await apiRequest(
        "POST",
        `/api/v1/campaigns/${encodeURIComponent(campaignId)}/resend-to-non-openers`,
        undefined,
        companyId
      );
      break;
    }

    // Landing Pages
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
