const DEFAULT_APP_URL = "https://sequenzy.com";

export const settingsTabs = [
  "product-info",
  "domain",
  "tracking",
  "localization",
  "integrations",
  "products",
  "events",
  "tags",
  "labels",
  "goals",
  "sync-rules",
  "api-keys",
  "widgets",
  "team",
  "danger",
] as const;

export type SettingsTab = (typeof settingsTabs)[number];

export const routeTemplates = {
  dashboard: "/dashboard/company/{companyId}",
  campaigns: "/dashboard/company/{companyId}/campaign",
  campaign: "/dashboard/company/{companyId}/campaign/{campaignId}",
  campaignPreview:
    "/dashboard/company/{companyId}/campaign/{campaignId}?step=review",
  campaignList: "/dashboard/company/{companyId}/campaign/list/{status}",
  landingPages: "/dashboard/company/{companyId}/landing-pages",
  landingPage: "/dashboard/company/{companyId}/landing-pages/{landingPageId}",
  sequences: "/dashboard/company/{companyId}/sequences",
  sequence: "/dashboard/company/{companyId}/sequences/{sequenceId}",
  sequenceList: "/dashboard/company/{companyId}/sequences/list/{status}",
  settings: "/dashboard/company/{companyId}/settings",
  settingsTab: "/dashboard/company/{companyId}/settings?tab={tab}",
  emails: "/dashboard/company/{companyId}/emails",
  email: "/dashboard/company/{companyId}/emails/{emailId}",
  subscribers: "/dashboard/company/{companyId}/subscribers",
  sentEmails: "/dashboard/company/{companyId}/sent-emails",
  emailSend: "/dashboard/company/{companyId}/sent-emails/{emailSendId}",
  segments: "/dashboard/company/{companyId}/segments",
  metrics: "/dashboard/company/{companyId}/metrics",
  transactional: "/dashboard/company/{companyId}/transactional",
  transactionalEmail:
    "/dashboard/company/{companyId}/transactional/{transactionalId}",
  domain: "/dashboard/company/{companyId}/settings/domain/{domainId}",
  domainVerify:
    "/dashboard/company/{companyId}/settings/domain/{domainId}/verify",
} as const;

export interface AppUrlInput {
  companyId?: string | null;
  campaignId?: string | null;
  landingPageId?: string | null;
  sequenceId?: string | null;
  emailId?: string | null;
  templateId?: string | null;
  transactionalId?: string | null;
  emailSendId?: string | null;
  domainId?: string | null;
  status?: string | null;
  settingsTab?: string | null;
}

export interface SequenzyAppUrls {
  appUrl: string;
  routeTemplates: typeof routeTemplates;
  settingsTabValues: typeof settingsTabs;
  urls: Record<string, string>;
  settingsUrls: Record<SettingsTab, string>;
}

function normalizeBaseUrl(baseUrl?: string): string {
  const raw = baseUrl ?? process.env.SEQUENZY_APP_URL ?? DEFAULT_APP_URL;
  const trimmed = raw.trim().replace(/\/+$/, "");

  return trimmed.length > 0 ? trimmed : DEFAULT_APP_URL;
}

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function pathSegment(value: string): string {
  return encodeURIComponent(value);
}

function joinUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`;
}

function companyPath(companyId: string, suffix = ""): string {
  return `/dashboard/company/${pathSegment(companyId)}${suffix}`;
}

function settingsUrl(baseUrl: string, companyId: string, tab: string): string {
  return joinUrl(
    baseUrl,
    `${companyPath(companyId, "/settings")}?tab=${encodeURIComponent(tab)}`
  );
}

function buildSettingsUrls(
  baseUrl: string,
  companyId?: string
): Record<SettingsTab, string> {
  const entries = settingsTabs.map((tab) => [
    tab,
    companyId ? settingsUrl(baseUrl, companyId, tab) : "",
  ]);

  return Object.fromEntries(entries) as Record<SettingsTab, string>;
}

export function buildSequenzyAppUrls(
  input: AppUrlInput = {},
  baseUrl?: string
): SequenzyAppUrls {
  const appUrl = normalizeBaseUrl(baseUrl);
  const companyId = clean(input.companyId);
  const urls: Record<string, string> = {};
  const settingsUrls = buildSettingsUrls(appUrl, companyId);

  if (!companyId) {
    return {
      appUrl,
      routeTemplates,
      settingsTabValues: settingsTabs,
      urls,
      settingsUrls,
    };
  }

  urls.dashboard = joinUrl(appUrl, companyPath(companyId));
  urls.campaigns = joinUrl(appUrl, companyPath(companyId, "/campaign"));
  urls.landingPages = joinUrl(appUrl, companyPath(companyId, "/landing-pages"));
  urls.sequences = joinUrl(appUrl, companyPath(companyId, "/sequences"));
  urls.settings = joinUrl(appUrl, companyPath(companyId, "/settings"));
  urls.emails = joinUrl(appUrl, companyPath(companyId, "/emails"));
  urls.subscribers = joinUrl(appUrl, companyPath(companyId, "/subscribers"));
  urls.sentEmails = joinUrl(appUrl, companyPath(companyId, "/sent-emails"));
  urls.segments = joinUrl(appUrl, companyPath(companyId, "/segments"));
  urls.metrics = joinUrl(appUrl, companyPath(companyId, "/metrics"));
  urls.transactional = joinUrl(
    appUrl,
    companyPath(companyId, "/transactional")
  );

  const campaignId = clean(input.campaignId);
  if (campaignId) {
    urls.campaign = joinUrl(
      appUrl,
      companyPath(companyId, `/campaign/${pathSegment(campaignId)}`)
    );
    urls.campaignPreview = `${urls.campaign}?step=review`;
  }

  const landingPageId = clean(input.landingPageId);
  if (landingPageId) {
    urls.landingPage = joinUrl(
      appUrl,
      companyPath(companyId, `/landing-pages/${pathSegment(landingPageId)}`)
    );
  }

  const sequenceId = clean(input.sequenceId);
  if (sequenceId) {
    urls.sequence = joinUrl(
      appUrl,
      companyPath(companyId, `/sequences/${pathSegment(sequenceId)}`)
    );
  }

  const emailId = clean(input.emailId) ?? clean(input.templateId);
  if (emailId) {
    urls.email = joinUrl(
      appUrl,
      companyPath(companyId, `/emails/${pathSegment(emailId)}`)
    );
    urls.template = urls.email;
  }

  const transactionalId = clean(input.transactionalId);
  if (transactionalId) {
    urls.transactionalEmail = joinUrl(
      appUrl,
      companyPath(companyId, `/transactional/${pathSegment(transactionalId)}`)
    );
  }

  const emailSendId = clean(input.emailSendId);
  if (emailSendId) {
    urls.emailSend = joinUrl(
      appUrl,
      companyPath(companyId, `/sent-emails/${pathSegment(emailSendId)}`)
    );
  }

  const domainId = clean(input.domainId);
  if (domainId) {
    urls.domain = joinUrl(
      appUrl,
      companyPath(companyId, `/settings/domain/${pathSegment(domainId)}`)
    );
    urls.domainVerify = `${urls.domain}/verify`;
  }

  const status = clean(input.status);
  if (status) {
    urls.campaignList = joinUrl(
      appUrl,
      companyPath(companyId, `/campaign/list/${pathSegment(status)}`)
    );
    urls.sequenceList = joinUrl(
      appUrl,
      companyPath(companyId, `/sequences/list/${pathSegment(status)}`)
    );
  }

  const settingsTab = clean(input.settingsTab);
  if (settingsTab) {
    urls.settingsTab = settingsUrl(appUrl, companyId, settingsTab);
  }

  return {
    appUrl,
    routeTemplates,
    settingsTabValues: settingsTabs,
    urls,
    settingsUrls,
  };
}
