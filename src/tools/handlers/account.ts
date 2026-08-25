import { buildSequenzyAppUrls } from "../../app-urls.js";
import {
  apiRequest,
  getSelectedCompanyId,
  setSelectedCompanyId,
} from "../../runtime.js";
import {
  buildUpdateCompanyBody,
  buildUpdateTrackingSettingsBody,
  isRecord,
  optionalString,
  resolveCompanyIdForAppUrls,
  resolveRequiredCompanyId,
} from "../internal.js";

/**
 * Company IDs from an account payload, or `null` when the payload does not
 * carry a company list at all. The distinction matters: an empty list means
 * the key can reach no companies, while a missing list means the response
 * shape is unexpected and no selection should be discarded because of it.
 */
function readCompanyIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.flatMap((entry) =>
    isRecord(entry) && typeof entry.id === "string" ? [entry.id] : []
  );
}

export async function handleAccountTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  let result: unknown;

  switch (name) {
    case "get_account": {
      // Sent without a company header: this lookup must succeed even when the
      // current selection points at a company that no longer exists.
      const accountData = await apiRequest<Record<string, unknown>>(
        "GET",
        "/api/v1/account",
        undefined,
        null
      );
      // Include the locally selected company ID in the response
      const locallySelectedCompanyId = getSelectedCompanyId();
      // A company can be deleted, or access to it revoked, while a selection
      // still points at it. Left in place, every later parameterless call
      // sends a dead `x-company-id` and fails - including `get_account`
      // itself, which is the documented recovery path. Drop the selection
      // here so the account listing stays usable and the next call falls back
      // to a company the key can still reach.
      const accessibleCompanyIds = readCompanyIds(accountData.companies);
      const staleSelection =
        locallySelectedCompanyId !== null &&
        accessibleCompanyIds !== null &&
        !accessibleCompanyIds.includes(locallySelectedCompanyId);
      if (staleSelection) {
        setSelectedCompanyId(null);
      }
      const effectiveSelectedCompanyId = staleSelection
        ? null
        : locallySelectedCompanyId;
      result = {
        ...accountData,
        selectedCompanyId:
          effectiveSelectedCompanyId ?? accountData.currentCompanyId,
        ...(staleSelection && {
          note: `The previously selected company (${locallySelectedCompanyId}) is no longer available to this API key and has been cleared. Call select_company with one of the companies listed above, or pass companyId explicitly.`,
        }),
      };
      break;
    }

    case "select_company": {
      const companyId = args.companyId as string;
      // Verify the company exists by fetching account info first
      // Switching away from a deleted company has to work, so this
      // verification lookup ignores the current selection too.
      const accountInfo = await apiRequest<{
        success: boolean;
        companies?: Array<{ id: string; name: string }>;
      }>("GET", "/api/v1/account", undefined, null);

      const company = accountInfo.companies?.find((c) => c.id === companyId);
      if (!company) {
        throw new Error(
          `Company not found. Available companies: ${accountInfo.companies?.map((c) => `${c.name} (${c.id})`).join(", ") ?? "none"}`
        );
      }

      setSelectedCompanyId(companyId);
      result = {
        success: true,
        message: `Switched to company: ${company.name}`,
        companyId: company.id,
        companyName: company.name,
      };
      break;
    }

    case "get_app_urls": {
      const companyId = await resolveCompanyIdForAppUrls(args);
      const appUrls = buildSequenzyAppUrls({
        companyId,
        campaignId: optionalString(args, "campaignId"),
        landingPageId: optionalString(args, "landingPageId"),
        sequenceId: optionalString(args, "sequenceId"),
        emailId:
          optionalString(args, "emailId") ?? optionalString(args, "templateId"),
        transactionalId: optionalString(args, "transactionalId"),
        emailSendId: optionalString(args, "emailSendId"),
        domainId: optionalString(args, "domainId"),
        status: optionalString(args, "status"),
        settingsTab: optionalString(args, "settingsTab"),
      });

      result = {
        ...appUrls,
        ...(companyId === undefined && {
          note: "No company ID is selected. Call get_account, select_company, or pass companyId to get concrete dashboard URLs.",
        }),
      };
      break;
    }

    case "create_company": {
      // Create the company
      const createResult = await apiRequest<{
        success: boolean;
        company: { id: string; name: string; status: string };
        message?: string;
      }>("POST", "/api/v1/companies", {
        name: args.name,
        domain: args.domain,
      });

      if (!createResult.success) {
        throw new Error("Failed to create company");
      }

      const newCompanyId = createResult.company.id;
      const maxPolls = 6; // 6 polls * 20 seconds = 2 minutes max
      let pollCount = 0;
      let finalStatus = createResult.company.status;

      // Poll until processed or max polls reached
      while (finalStatus === "processing" && pollCount < maxPolls) {
        // Wait 20 seconds before polling
        await new Promise((resolve) => setTimeout(resolve, 20000));
        pollCount++;

        const statusResult = await apiRequest<{
          success: boolean;
          company: {
            id: string;
            name: string;
            status: string;
            logoUrl?: string;
          };
        }>("GET", `/api/v1/companies/${newCompanyId}`);

        if (statusResult.success) {
          finalStatus = statusResult.company.status;
        }
      }

      // Auto-select the new company
      setSelectedCompanyId(newCompanyId);

      // Get final company details
      const finalResult = await apiRequest<{
        success: boolean;
        company: {
          id: string;
          name: string;
          status: string;
          websiteUrl?: string;
          logoUrl?: string;
        };
      }>("GET", `/api/v1/companies/${newCompanyId}`);

      result = {
        success: true,
        company: finalResult.company,
        message:
          finalStatus === "processing"
            ? "Company created but still processing. You can continue using it while processing completes."
            : `Company '${finalResult.company.name}' created and ready to use.`,
        autoSelected: true,
      };
      break;
    }

    case "get_company": {
      const companyId = args.companyId as string;
      result = await apiRequest("GET", `/api/v1/companies/${companyId}`);
      break;
    }

    case "update_company": {
      const companyId = await resolveRequiredCompanyId("update_company", args);
      const body = buildUpdateCompanyBody(args);
      result = await apiRequest(
        "PATCH",
        `/api/v1/companies/${companyId}`,
        body
      );
      break;
    }

    case "get_sync_rules": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/sync-rules",
        undefined,
        companyId
      );
      break;
    }

    case "update_sync_rules": {
      const companyId = args.companyId as string | undefined;
      if (args.syncRules !== null && !Array.isArray(args.syncRules)) {
        throw new Error(
          "`syncRules` must be an array of rules or null when calling `update_sync_rules`."
        );
      }
      result = await apiRequest(
        "PUT",
        "/api/v1/sync-rules",
        { syncRules: args.syncRules },
        companyId
      );
      break;
    }

    case "get_shopify_automation_settings": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/shopify/automation-settings",
        undefined,
        companyId
      );
      break;
    }

    case "update_shopify_automation_settings": {
      const companyId = args.companyId as string | undefined;
      const payload: Record<string, unknown> = {};
      if (args.browseAbandonment !== undefined) {
        payload["browseAbandonment"] = args.browseAbandonment;
      }
      if (args.cartAbandonment !== undefined) {
        payload["cartAbandonment"] = args.cartAbandonment;
      }
      if (args.priceDrop !== undefined) {
        payload["priceDrop"] = args.priceDrop;
      }
      if (Object.keys(payload).length === 0) {
        throw new Error(
          "Provide `browseAbandonment`, `cartAbandonment`, and/or `priceDrop` when calling `update_shopify_automation_settings`."
        );
      }
      result = await apiRequest(
        "PUT",
        "/api/v1/shopify/automation-settings",
        payload,
        companyId
      );
      break;
    }

    case "create_api_key": {
      const companyId = args.companyId as string;
      const body: Record<string, unknown> = {};
      if (typeof args.name === "string") {
        body.name = args.name;
      }
      if (typeof args.preset === "string") {
        body.preset = args.preset;
      }
      if (Array.isArray(args.scopes)) {
        body.scopes = args.scopes;
      }
      result = await apiRequest("POST", "/api/v1/api-keys", body, companyId);
      break;
    }

    case "request_api_key_handoff": {
      const companyId = await resolveRequiredCompanyId(name, args);
      const body: Record<string, unknown> = {};
      if (typeof args.name === "string") {
        body.name = args.name;
      }
      if (typeof args.preset === "string") {
        body.preset = args.preset;
      }
      if (Array.isArray(args.scopes)) {
        body.scopes = args.scopes;
      }
      if (typeof args.replaceApiKeyId === "string") {
        body.replaceApiKeyId = args.replaceApiKeyId;
      }
      result = await apiRequest(
        "POST",
        "/api/v1/api-key-handoff",
        body,
        companyId
      );
      break;
    }

    case "list_api_keys": {
      const companyId = await resolveRequiredCompanyId(name, args);
      result = await apiRequest(
        "GET",
        "/api/v1/api-keys",
        undefined,
        companyId
      );
      break;
    }

    case "update_api_key": {
      const companyId = await resolveRequiredCompanyId(name, args);
      const body: Record<string, unknown> = {};
      if (typeof args.name === "string") {
        body.name = args.name;
      }
      if (typeof args.preset === "string") {
        body.preset = args.preset;
      }
      if (Array.isArray(args.scopes)) {
        body.scopes = args.scopes;
      }
      if (Object.keys(body).length === 0) {
        throw new Error(
          "Provide at least one of `name`, `preset`, or `scopes` when calling `update_api_key`."
        );
      }
      result = await apiRequest(
        "PATCH",
        `/api/v1/api-keys/${encodeURIComponent(String(args.apiKeyId))}`,
        body,
        companyId
      );
      break;
    }

    case "revoke_api_key":
    case "delete_api_key": {
      const companyId = await resolveRequiredCompanyId(name, args);
      result = await apiRequest(
        "DELETE",
        `/api/v1/api-keys/${encodeURIComponent(String(args.apiKeyId))}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_websites": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/websites",
        undefined,
        companyId
      );
      break;
    }

    case "add_sending_domain":
    case "add_website": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/websites",
        { domain: args.domain },
        companyId
      );
      break;
    }

    case "check_website": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        `/api/v1/websites/${encodeURIComponent(String(args.domain))}`,
        undefined,
        companyId
      );
      break;
    }

    case "verify_sending_domain": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        `/api/v1/websites/${encodeURIComponent(String(args.domain))}/verify`,
        undefined,
        companyId
      );
      break;
    }

    case "list_integrations": {
      const companyId = args.companyId as string | undefined;
      const params = new URLSearchParams();
      if (args.includeInactive === true) {
        params.set("includeInactive", "true");
      }
      const queryString = params.toString();
      result = await apiRequest(
        "GET",
        `/api/v1/integrations${queryString ? `?${queryString}` : ""}`,
        undefined,
        companyId
      );
      break;
    }

    case "list_sender_profiles": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/sender-profiles",
        undefined,
        companyId
      );
      break;
    }

    case "update_sender_profile": {
      const companyId = args.companyId as string | undefined;
      const profileId = args.profileId as string;
      // The two profile kinds live in separate tables with independent IDs, so
      // the caller says which list the ID came from rather than us guessing
      // from an ID prefix - profile IDs are plain cuids by default.
      const path =
        args.type === "reply"
          ? `/api/v1/reply-profiles/${encodeURIComponent(profileId)}`
          : `/api/v1/sender-profiles/${encodeURIComponent(profileId)}`;
      result = await apiRequest(
        "PATCH",
        path,
        { name: args.name as string },
        companyId
      );
      break;
    }

    case "get_sending_status": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/sending-status",
        undefined,
        companyId
      );
      break;
    }

    case "resume_sending": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "POST",
        "/api/v1/sending-status/resume",
        {
          listSanitizationConfirmed: args.listSanitizationConfirmed === true,
        },
        companyId
      );
      break;
    }

    case "get_tracking_settings": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/tracking-settings",
        undefined,
        companyId
      );
      break;
    }

    case "update_tracking_settings": {
      const companyId = args.companyId as string | undefined;
      const body = buildUpdateTrackingSettingsBody(args);
      result = await apiRequest(
        "PATCH",
        "/api/v1/tracking-settings",
        body,
        companyId
      );
      break;
    }

    case "get_notification_preferences": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "GET",
        "/api/v1/notification-preferences",
        undefined,
        companyId
      );
      break;
    }

    case "update_notification_preferences": {
      const companyId = args.companyId as string | undefined;
      result = await apiRequest(
        "PATCH",
        "/api/v1/notification-preferences",
        { notificationPreferences: args.notificationPreferences },
        companyId
      );
      break;
    }

    case "get_integration_guide":
      result = await apiRequest("POST", "/api/v1/integration-guide", args);
      break;

    // Subscribers
    default:
      return { handled: false, result: undefined };
  }

  return { handled: true, result };
}
