import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Collects, per tool call, the company the API defaulted to when a request
 * went out with no `x-company-id`. An account key reaches every workspace its
 * user can access; without a selected company the API picks one and names it
 * in `X-Sequenzy-Company-Id` with `X-Sequenzy-Company-Defaulted: true`.
 *
 * Kept out of runtime.ts so tool tests that replace the runtime module still
 * get a working collector.
 */
interface CompanyDefaultCollector {
  defaultedCompanyId: string | null;
}
const companyDefaultStorage = new AsyncLocalStorage<CompanyDefaultCollector>();

export async function withCompanyDefaultCollector<T>(
  callback: () => Promise<T>
): Promise<{ value: T; defaultedCompanyId: string | null }> {
  const collector: CompanyDefaultCollector = { defaultedCompanyId: null };
  const value = await companyDefaultStorage.run(collector, callback);
  return { value, defaultedCompanyId: collector.defaultedCompanyId };
}

export function recordDefaultedCompany(response: {
  headers: { get(name: string): string | null };
}): void {
  const collector = companyDefaultStorage.getStore();
  if (!collector || collector.defaultedCompanyId) return;
  if (response.headers.get("x-sequenzy-company-defaulted") !== "true") return;
  const companyId = response.headers.get("x-sequenzy-company-id");
  if (companyId) collector.defaultedCompanyId = companyId;
}

export function formatDefaultedCompanyNote(companyId: string): string {
  return `Note: no company was selected, so Sequenzy ran this in the API key's default company (${companyId}). If this key can reach more than one company, call select_company or pass companyId to choose one explicitly.`;
}
