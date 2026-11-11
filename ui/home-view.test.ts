import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";

import { parseHome, renderHome } from "./home-view";

const original = Object.getOwnPropertyDescriptor(globalThis, "document");
let window: Window;
beforeEach(() => {
  window = new Window();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
});
afterEach(async () => {
  if (original) Object.defineProperty(globalThis, "document", original);
  else Reflect.deleteProperty(globalThis, "document");
  await window.happyDOM.close();
});

const data = {
  mode: "home",
  companyId: "co_a",
  companyName: "Acme",
  companies: [
    { id: "co_a", name: "Acme" },
    { id: "co_b", name: "Beta" },
    { name: "No id" },
  ],
  sequences: {
    items: [
      {
        id: "seq_1",
        name: "Welcome",
        status: "active",
        effectiveStatus: "enrollment_paused",
        emailCount: 1,
      },
      { id: "seq_2", status: "draft" },
      { name: "missing id" },
    ],
    total: 70,
  },
  campaigns: { items: [], total: 0, error: "Missing scope: campaigns:read" },
};

function actions() {
  return {
    openSequence: mock((_id: string) => undefined),
    openCampaign: mock((_id: string) => undefined),
    switchCompany: mock((_id: string) => undefined),
  };
}

describe("parseHome", () => {
  it("keeps only addressable items and readable labels", () => {
    expect(parseHome(data)).toEqual({
      companyId: "co_a",
      companyName: "Acme",
      companies: [
        { id: "co_a", name: "Acme" },
        { id: "co_b", name: "Beta" },
      ],
      sequences: {
        items: [
          {
            id: "seq_1",
            name: "Welcome",
            detail: "1 email",
            status: "enrollment_paused",
          },
          {
            id: "seq_2",
            name: "Untitled",
            detail: "Sequence",
            status: "draft",
          },
        ],
        total: 70,
      },
      campaigns: {
        items: [],
        total: 0,
        error: "Missing scope: campaigns:read",
      },
    });
    expect(parseHome({}).companyId).toBe("");
  });
});

describe("renderHome", () => {
  it("lists sequences, reports an unreadable list in place and switches company", () => {
    const root = document.createElement("div");
    const handlers = actions();
    renderHome(root, parseHome(data), handlers);
    const text = root.textContent ?? "";
    expect(text).toContain("Welcome");
    expect(text).toContain("enrollment paused");
    expect(text).toContain("2 of 70");
    expect(text).toContain("Missing scope: campaigns:read");
    const buttons = [...root.querySelectorAll("button")];
    expect(buttons).toHaveLength(2);
    buttons[1].click();
    expect(handlers.openSequence).toHaveBeenCalledWith("seq_2");

    const select = root.querySelector("select");
    if (!select) throw new Error("Expected a company switcher.");
    expect(select.value).toBe("co_a");
    select.value = "co_b";
    select.dispatchEvent(new window.Event("change") as unknown as Event);
    expect(handlers.switchCompany).toHaveBeenCalledWith("co_b");
  });

  it("opens campaigns, and hides the switcher for a single company", () => {
    const root = document.createElement("div");
    const handlers = actions();
    renderHome(
      root,
      parseHome({
        companyId: "co_a",
        companies: [{ id: "co_a", name: "Acme" }],
        sequences: { items: [] },
        campaigns: { items: [{ id: "cmp_1", name: "Launch" }] },
      }),
      handlers
    );
    expect(root.querySelector("select")).toBeNull();
    expect(root.textContent).toContain("No sequences yet");
    expect(root.textContent).toContain("No subject");
    root.querySelector("button")?.click();
    expect(handlers.openCampaign).toHaveBeenCalledWith("cmp_1");
  });

  it("explains a connection without a company", () => {
    const root = document.createElement("div");
    renderHome(root, parseHome({ companyId: null, companies: [] }), actions());
    expect(root.textContent).toContain("no company yet");
    expect(root.querySelector("button")).toBeNull();
  });

  it("renders names as text, not markup", () => {
    const root = document.createElement("div");
    renderHome(
      root,
      parseHome({
        companyId: "co_a",
        sequences: {
          items: [{ id: "s", name: '<img src=x onerror="alert(1)">' }],
        },
      }),
      actions()
    );
    expect(root.querySelector("img")).toBeNull();
  });
});
