/**
 * Start screen for open_sequenzy: the company's sequences and campaigns, with
 * a company switcher when the connection reaches more than one. Opening an
 * item hands off to the sequence flow or the email preview.
 */
import { element, record, text } from "./dom";
import { icon } from "./icons";

export interface HomeItem {
  id: string;
  name: string;
  detail: string;
  status: string;
}

export interface HomeSection {
  items: HomeItem[];
  total: number;
  error?: string;
}

export interface HomeData {
  companyId: string;
  companyName: string;
  companies: Array<{ id: string; name: string }>;
  sequences: HomeSection;
  campaigns: HomeSection;
}

function parseSection(
  value: unknown,
  detail: (item: Record<string, unknown>) => string
): HomeSection {
  const section = record(value);
  const items = (Array.isArray(section["items"]) ? section["items"] : [])
    .map(record)
    .filter((item) => text(item["id"]))
    .map((item) => ({
      id: text(item["id"]),
      name: text(item["name"], "Untitled"),
      detail: detail(item),
      status: text(item["effectiveStatus"], text(item["status"])),
    }));
  const total = section["total"];
  return {
    items,
    total: typeof total === "number" ? total : items.length,
    ...(text(section["error"]) ? { error: text(section["error"]) } : {}),
  };
}

export function parseHome(data: Record<string, unknown>): HomeData {
  const companies = (Array.isArray(data["companies"]) ? data["companies"] : [])
    .map(record)
    .filter((company) => text(company["id"]))
    .map((company) => ({
      id: text(company["id"]),
      name: text(company["name"], "Untitled company"),
    }));
  const companyId = text(data["companyId"]);
  return {
    companyId,
    companyName: text(
      data["companyName"],
      companies.find((company) => company.id === companyId)?.name ?? ""
    ),
    companies,
    sequences: parseSection(data["sequences"], (item) => {
      const count = item["emailCount"];
      return typeof count === "number"
        ? `${count} email${count === 1 ? "" : "s"}`
        : "Sequence";
    }),
    campaigns: parseSection(data["campaigns"], (item) =>
      text(item["subject"], "No subject")
    ),
  };
}

export interface HomeActions {
  openSequence(id: string): void;
  openCampaign(id: string): void;
  switchCompany(id: string): void;
}

function section(
  title: string,
  data: HomeSection,
  empty: string,
  open: (id: string) => void
) {
  const wrapper = element("section", "home-section");
  const heading = element("div", "home-section-heading");
  heading.append(
    element("h2", "", title),
    element(
      "span",
      "",
      data.total > data.items.length
        ? `${data.items.length} of ${data.total}`
        : String(data.items.length)
    )
  );
  wrapper.append(heading);
  if (data.error) {
    wrapper.append(element("p", "home-error", data.error));
    return wrapper;
  }
  if (!data.items.length) {
    wrapper.append(element("p", "empty-list", empty));
    return wrapper;
  }
  for (const item of data.items) {
    const button = element("button", "email-list-item");
    const copy = element("span", "email-list-copy");
    copy.append(
      element("strong", "", item.name),
      element("span", "", item.detail)
    );
    const status = element(
      "span",
      "home-status",
      item.status.replaceAll("_", " ")
    );
    status.dataset["status"] = item.status;
    button.append(copy, status, icon("next"));
    button.addEventListener("click", () => open(item.id));
    wrapper.append(button);
  }
  return wrapper;
}

export function renderHome(
  root: HTMLElement,
  data: HomeData,
  actions: HomeActions
): void {
  root.replaceChildren();
  if (!data.companyId) {
    root.append(
      element(
        "p",
        "empty-list",
        "This connection has no company yet. Create one in Sequenzy, then reopen this view."
      )
    );
    return;
  }
  if (data.companies.length > 1) {
    const label = element("label", "home-company");
    const select = element("select", "text-input");
    select.setAttribute("aria-label", "Company");
    for (const company of data.companies) {
      const option = element("option", "", company.name);
      option.value = company.id;
      option.selected = company.id === data.companyId;
      select.append(option);
    }
    select.addEventListener("change", () =>
      actions.switchCompany(select.value)
    );
    label.append(element("span", "field-label", "Company"), select);
    root.append(label);
  }
  root.append(
    section(
      "Sequences",
      data.sequences,
      "No sequences yet. Ask your assistant to create one.",
      actions.openSequence
    ),
    section(
      "Campaigns",
      data.campaigns,
      "No campaigns yet. Ask your assistant to draft one.",
      actions.openCampaign
    )
  );
}
