import { readFileSync, statSync } from "node:fs";
import { basename } from "node:path";

import { buildSequenzyAppUrls, type AppUrlInput } from "../app-urls.js";
import {
  apiRequest,
  areLocalFileUploadsEnabled,
  getSelectedCompanyId,
} from "../runtime.js";

import { isRecord, optionalString } from "./common-primitives.js";

export const DELIVERY_CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  epub: "application/epub+zip",
  zip: "application/zip",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  mp4: "video/mp4",
  txt: "text/plain",
  csv: "text/csv",
};

export function resolveDeliveryContentType(filePath: string): string | null {
  const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
  return DELIVERY_CONTENT_TYPE_BY_EXTENSION[extension] ?? null;
}

/** Max size for product delivery files (100MB). Mirrors the server-side limit. */
export const DELIVERY_FILE_MAX_SIZE_BYTES = 100 * 1024 * 1024;

export interface UploadedDeliveryFile {
  url: string;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

/**
 * Upload a local file as a product delivery file via a presigned URL.
 * Only available on the local stdio server - the hosted remote MCP server
 * must never read server-side paths.
 */
export async function uploadLocalDeliveryFile(
  filePath: string,
  companyId: string | undefined
): Promise<UploadedDeliveryFile> {
  if (!areLocalFileUploadsEnabled()) {
    throw new Error(
      "`filePath` is only supported when the MCP server runs locally on your machine. Host the file somewhere public and pass `url` instead."
    );
  }

  const contentType = resolveDeliveryContentType(filePath);
  if (!contentType) {
    throw new Error(
      "Unsupported file type. Use PDF, ePub, ZIP, image, audio, video, or text files."
    );
  }

  // Reject oversized files from the stat alone - reading them first would
  // load the whole file into memory before the API could say no.
  const fileSizeBytes = statSync(filePath).size;
  if (fileSizeBytes > DELIVERY_FILE_MAX_SIZE_BYTES) {
    throw new Error(
      `File is too large (${Math.round(fileSizeBytes / (1024 * 1024))}MB). Delivery files must be 100MB or smaller.`
    );
  }

  const fileBytes = readFileSync(filePath);

  const presigned = await apiRequest<{
    uploadUrl: string;
    publicUrl: string;
    fileName: string;
  }>(
    "POST",
    "/api/v1/products/delivery/upload-url",
    { filename: basename(filePath), contentType, fileSizeBytes },
    companyId
  );

  const uploadResponse = await fetch(presigned.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: fileBytes,
  });

  if (!uploadResponse.ok) {
    throw new Error(`File upload failed (${uploadResponse.status})`);
  }

  return {
    url: presigned.publicUrl,
    fileName: presigned.fileName,
    fileSizeBytes,
    mimeType: contentType,
  };
}

export async function resolveCompanyIdForAppUrls(
  args: Record<string, unknown>
): Promise<string | undefined> {
  const explicitCompanyId = optionalString(args, "companyId");
  if (explicitCompanyId) {
    return explicitCompanyId;
  }

  const selectedCompanyId = getSelectedCompanyId();
  if (selectedCompanyId) {
    return selectedCompanyId;
  }

  try {
    const account = await apiRequest<{ currentCompanyId: string | null }>(
      "GET",
      "/api/v1/account"
    );
    return account.currentCompanyId ?? undefined;
  } catch {
    return undefined;
  }
}

export async function resolveRequiredCompanyId(
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const companyId = await resolveCompanyIdForAppUrls(args);
  if (!companyId) {
    throw new Error(
      `A company is required when calling \`${toolName}\`. Call \`get_account\`, then \`select_company\`, or pass \`companyId\` explicitly.`
    );
  }

  return companyId;
}

export function addUrlToRecord(
  value: unknown,
  url: string | undefined
): unknown {
  if (!isRecord(value) || !url) {
    return value;
  }

  return {
    ...value,
    url,
  };
}

export function addCampaignUrlsToRecord(
  value: unknown,
  urls: { campaign?: string; campaignPreview?: string }
): unknown {
  if (!isRecord(value)) {
    return value;
  }

  return {
    ...value,
    ...(urls.campaign !== undefined && { url: urls.campaign }),
    ...(urls.campaignPreview !== undefined && {
      previewUrl: urls.campaignPreview,
    }),
  };
}

export function addListItemUrls(
  value: unknown,
  companyId: string | undefined,
  kind: "campaign" | "landingPage" | "sequence" | "template" | "transactional"
): unknown {
  if (!Array.isArray(value) || !companyId) {
    return value;
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      return item;
    }

    const id = optionalString(item, "id");
    if (!id) {
      return item;
    }

    const appUrls = buildSequenzyAppUrls({
      companyId,
      ...(kind === "campaign" && { campaignId: id }),
      ...(kind === "landingPage" && { landingPageId: id }),
      ...(kind === "sequence" && { sequenceId: id }),
      ...(kind === "template" && { emailId: id }),
      ...(kind === "transactional" && { transactionalId: id }),
    });

    if (kind === "campaign") {
      return addCampaignUrlsToRecord(item, appUrls.urls);
    }

    const url =
      kind === "sequence"
        ? appUrls.urls.sequence
        : kind === "landingPage"
          ? appUrls.urls.landingPage
          : kind === "template"
            ? appUrls.urls.email
            : appUrls.urls.transactionalEmail;

    return addUrlToRecord(item, url);
  });
}

export function addCompanyUrls(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => {
    if (!isRecord(item)) {
      return item;
    }

    const id = optionalString(item, "id");
    if (!id) {
      return item;
    }

    const appUrls = buildSequenzyAppUrls({ companyId: id });

    return {
      ...item,
      url: appUrls.urls.dashboard,
      settingsUrl: appUrls.urls.settings,
    };
  });
}

export const dashboardUrlToolNames = new Set([
  "get_account",
  "select_company",
  "create_company",
  "get_company",
  "update_company",
  "list_campaigns",
  "get_campaign",
  "get_email_send",
  "create_campaign",
  "update_campaign",
  "schedule_campaign",
  "send_test_email",
  "cancel_campaign",
  "pause_campaign",
  "resume_campaign",
  "duplicate_campaign",
  "resend_campaign_to_non_openers",
  "list_landing_pages",
  "get_landing_page",
  "create_landing_page",
  "update_landing_page",
  "publish_landing_page",
  "unpublish_landing_page",
  "delete_landing_page",
  "list_sequences",
  "get_sequence",
  "create_sequence",
  "update_sequence",
  "update_sequence_node",
  "update_sequence_nodes",
  "edit_sequence_graph",
  "insert_sequence_step",
  "enable_sequence",
  "disable_sequence",
  "pause_sequence_enrollments",
  "resume_sequence_enrollments",
  "cancel_sequence_enrollments",
  "list_ab_tests",
  "get_ab_test",
  "get_ab_test_stats",
  "update_ab_test_variant",
  "list_templates",
  "get_template",
  "create_template",
  "update_template",
  "set_template_localization",
  "sync_template_localizations",
  "list_transactional_emails",
  "get_transactional_email",
  "create_transactional_email",
  "update_transactional_email",
]);

export async function addAppUrlsToToolResult(
  name: string,
  args: Record<string, unknown>,
  result: unknown
): Promise<unknown> {
  if (!isRecord(result) || !dashboardUrlToolNames.has(name)) {
    return result;
  }

  const companyRecord = isRecord(result.company) ? result.company : undefined;
  const companyIdFromResult =
    optionalString(result, "selectedCompanyId") ??
    optionalString(result, "currentCompanyId") ??
    optionalString(result, "companyId") ??
    (companyRecord ? optionalString(companyRecord, "id") : undefined) ??
    (companyRecord ? optionalString(companyRecord, "companyId") : undefined);
  const companyId =
    companyIdFromResult ?? (await resolveCompanyIdForAppUrls(args));

  if (!companyId) {
    return result;
  }

  const campaignRecord = isRecord(result.campaign)
    ? result.campaign
    : undefined;
  const sequenceRecord = isRecord(result.sequence)
    ? result.sequence
    : undefined;
  const landingPageRecord = isRecord(result.landingPage)
    ? result.landingPage
    : undefined;
  const templateRecord = isRecord(result.template)
    ? result.template
    : undefined;
  const transactionalRecord =
    isRecord(result.transactional) && !Array.isArray(result.transactional)
      ? result.transactional
      : undefined;

  const urlInput: AppUrlInput = {
    companyId,
    campaignId:
      optionalString(args, "campaignId") ??
      optionalString(result, "campaignId") ??
      (campaignRecord ? optionalString(campaignRecord, "id") : undefined),
    landingPageId:
      optionalString(args, "landingPageId") ??
      optionalString(result, "landingPageId") ??
      (landingPageRecord ? optionalString(landingPageRecord, "id") : undefined),
    sequenceId:
      optionalString(args, "sequenceId") ??
      optionalString(result, "sequenceId") ??
      (sequenceRecord ? optionalString(sequenceRecord, "id") : undefined),
    emailId:
      optionalString(result, "templateId") ??
      (templateRecord ? optionalString(templateRecord, "id") : undefined) ??
      (transactionalRecord
        ? optionalString(transactionalRecord, "emailId")
        : undefined) ??
      optionalString(args, "templateId"),
    transactionalId:
      optionalString(args, "transactionalId") ??
      (transactionalRecord
        ? optionalString(transactionalRecord, "id")
        : undefined) ??
      optionalString(args, "idOrSlug"),
    emailSendId:
      optionalString(args, "emailSendId") ??
      optionalString(result, "emailSendId") ??
      (isRecord(result.emailSend)
        ? optionalString(result.emailSend, "id")
        : undefined),
    status: optionalString(args, "status"),
  };
  const appUrls = buildSequenzyAppUrls(urlInput);
  const companyAppUrls = companyRecord
    ? buildSequenzyAppUrls({ companyId })
    : undefined;

  return {
    ...result,
    ...(Array.isArray(result.companies) && {
      companies: addCompanyUrls(result.companies),
    }),
    ...(Array.isArray(result.campaigns) && {
      campaigns: addListItemUrls(result.campaigns, companyId, "campaign"),
    }),
    ...(Array.isArray(result.landingPages) && {
      landingPages: addListItemUrls(
        result.landingPages,
        companyId,
        "landingPage"
      ),
    }),
    ...(Array.isArray(result.sequences) && {
      sequences: addListItemUrls(result.sequences, companyId, "sequence"),
    }),
    ...(Array.isArray(result.templates) && {
      templates: addListItemUrls(result.templates, companyId, "template"),
    }),
    ...(Array.isArray(result.transactional) && {
      transactional: addListItemUrls(
        result.transactional,
        companyId,
        "transactional"
      ),
    }),
    ...(companyRecord &&
      companyAppUrls !== undefined && {
        company: {
          ...companyRecord,
          url: companyAppUrls.urls.dashboard,
          settingsUrl: companyAppUrls.urls.settings,
        },
      }),
    ...(campaignRecord &&
      appUrls.urls.campaign !== undefined && {
        campaign: addCampaignUrlsToRecord(campaignRecord, appUrls.urls),
      }),
    ...(sequenceRecord &&
      appUrls.urls.sequence !== undefined && {
        sequence: addUrlToRecord(sequenceRecord, appUrls.urls.sequence),
      }),
    ...(landingPageRecord &&
      appUrls.urls.landingPage !== undefined && {
        landingPage: addUrlToRecord(
          landingPageRecord,
          appUrls.urls.landingPage
        ),
      }),
    ...(templateRecord &&
      appUrls.urls.email !== undefined && {
        template: addUrlToRecord(templateRecord, appUrls.urls.email),
      }),
    ...(transactionalRecord &&
      appUrls.urls.transactionalEmail !== undefined && {
        transactional: addUrlToRecord(
          transactionalRecord,
          appUrls.urls.transactionalEmail
        ),
      }),
    ...(isRecord(result.emailSend) &&
      appUrls.urls.emailSend !== undefined && {
        emailSend: addUrlToRecord(result.emailSend, appUrls.urls.emailSend),
      }),
    appUrls: appUrls.urls,
  };
}
