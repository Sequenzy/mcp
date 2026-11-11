import { apiRequest, getSelectedCompanyId } from "../../runtime.js";
import { isRecord, optionalString, requiredString } from "../internal.js";

const HOME_SEQUENCE_LIMIT = 50;
const HOME_CAMPAIGN_LIMIT = 25;

function records(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function pick(item: Record<string, unknown>, keys: readonly string[]) {
  return Object.fromEntries(
    keys.filter((key) => item[key] !== undefined).map((key) => [key, item[key]])
  );
}

/**
 * One list on the start screen. A list the key cannot read (missing scope,
 * rate limit) is reported in place so the other one still shows.
 */
async function homeSection(
  path: string,
  listKey: string,
  keys: readonly string[],
  companyId: string
): Promise<{ items: unknown[]; total: number; error?: string }> {
  try {
    const response = await apiRequest<Record<string, unknown>>(
      "GET",
      path,
      undefined,
      companyId
    );
    const items = records(response[listKey]).map((item) => pick(item, keys));
    const pagination = response["pagination"];
    const total = isRecord(pagination) ? pagination["total"] : undefined;
    return {
      items,
      total: typeof total === "number" ? total : items.length,
    };
  } catch (error) {
    return {
      items: [],
      total: 0,
      error:
        error instanceof Error
          ? error.message
          : "This list could not be loaded.",
    };
  }
}

async function openWorkspace(
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const requested = optionalString(args, "companyId");
  // Sent without a company header, like get_account, so a stale selection
  // cannot hide the account's companies.
  const account = await apiRequest<Record<string, unknown>>(
    "GET",
    "/api/v1/account",
    undefined,
    null
  );
  const companies = records(account["companies"]).map((company) =>
    pick(company, ["id", "name"])
  );
  const reachable = (id: unknown): id is string =>
    typeof id === "string" && companies.some((company) => company.id === id);
  if (requested && !reachable(requested))
    throw new Error(
      `Company ${requested} is not available to this connection. Call get_account for the companies it can use.`
    );
  const selected = getSelectedCompanyId();
  const companyId =
    requested ??
    (reachable(selected) ? selected : undefined) ??
    (reachable(account["currentCompanyId"])
      ? account["currentCompanyId"]
      : undefined);
  if (!companyId)
    return {
      mode: "home",
      companyId: null,
      companies,
      sequences: { items: [], total: 0 },
      campaigns: { items: [], total: 0 },
    };
  const [sequences, campaigns] = await Promise.all([
    homeSection(
      `/api/v1/sequences?limit=${HOME_SEQUENCE_LIMIT}`,
      "sequences",
      ["id", "name", "status", "effectiveStatus", "emailCount", "updatedAt"],
      companyId
    ),
    homeSection(
      `/api/v1/campaigns?limit=${HOME_CAMPAIGN_LIMIT}`,
      "campaigns",
      ["id", "name", "subject", "status", "updatedAt"],
      companyId
    ),
  ]);
  return {
    mode: "home",
    companyId,
    companyName:
      companies.find((company) => company.id === companyId)?.["name"] ?? null,
    companies,
    sequences,
    campaigns,
  };
}

export async function handleAppTools(
  name: string,
  args: Record<string, unknown>
): Promise<{ handled: boolean; result: unknown }> {
  if (name === "open_sequenzy")
    return { handled: true, result: await openWorkspace(args) };
  if (
    ![
      "preview_sequence",
      "open_image_upload",
      "monitor_subscriber_import",
    ].includes(name)
  )
    return { handled: false, result: undefined };
  const companyId = requiredString(name, args, "companyId");
  if (name === "open_image_upload")
    return { handled: true, result: { mode: "upload", companyId } };
  if (name === "monitor_subscriber_import") {
    const importId = requiredString(name, args, "importId");
    const result = await apiRequest<Record<string, unknown>>(
      "GET",
      `/api/v1/subscribers/imports/${encodeURIComponent(importId)}`,
      undefined,
      companyId
    );
    return {
      handled: true,
      result: { ...result, mode: "import", companyId, importId },
    };
  }
  const sequenceId = requiredString(name, args, "sequenceId");
  const result = await apiRequest<Record<string, unknown>>(
    "GET",
    `/api/v1/sequences/${encodeURIComponent(sequenceId)}`,
    undefined,
    companyId
  );
  return {
    handled: true,
    result: { ...result, mode: "sequence", companyId, sequenceId },
  };
}
