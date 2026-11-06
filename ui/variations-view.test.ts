import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";

import type { AppBridge } from "./bridge";
import {
  parseVariationsTarget,
  showVariations,
  variationActions,
} from "./variations-view";

const globals = ["document", "DOMParser"] as const;
const originals = globals.map((name) =>
  Object.getOwnPropertyDescriptor(globalThis, name)
);
let window: Window;
beforeEach(() => {
  window = new Window();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
  Object.defineProperty(globalThis, "DOMParser", {
    configurable: true,
    value: window.DOMParser,
  });
});
afterEach(async () => {
  for (const [index, name] of globals.entries()) {
    const original = originals[index];
    if (original) Object.defineProperty(globalThis, name, original);
    else Reflect.deleteProperty(globalThis, name);
  }
  await window.happyDOM.close();
});

const structured = (value: unknown) => ({ structuredContent: value });
const variation = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  label: id.toUpperCase(),
  name: "Violet editorial",
  status: "ready",
  summary: "Bigger headline.",
  error: null,
  inUse: false,
  ...overrides,
});
const sequenceData = (overrides: Record<string, unknown> = {}) => ({
  mode: "variations",
  target: "sequence",
  companyId: "co_1",
  sequenceId: "seq_1",
  emailId: "em_1",
  email: { emailId: "em_1", nodeId: "node_1", label: "Email 1" },
  variations: [variation("v1"), variation("v2", { status: "generating" })],
  ...overrides,
});

function fakeApp(
  respond: (name: string, args: Record<string, unknown>) => unknown
) {
  const callServerTool = mock(
    async ({
      name,
      arguments: args,
    }: {
      name: string;
      arguments: Record<string, unknown>;
    }) => structured(respond(name, args))
  );
  const updateModelContext = mock(async () => ({}));
  return {
    app: { callServerTool, updateModelContext } as unknown as AppBridge,
    callServerTool,
    updateModelContext,
  };
}

const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
const buttons = (root: HTMLElement, label: string) =>
  [...root.querySelectorAll("button")].filter(
    (button) => button.textContent === label
  ) as HTMLButtonElement[];

describe("parseVariationsTarget", () => {
  it("reads a campaign or a sequence email", () => {
    expect(
      parseVariationsTarget({ target: "campaign", campaignId: "c1" })
    ).toEqual({ kind: "campaign", campaignId: "c1" });
    expect(parseVariationsTarget(sequenceData())).toEqual({
      kind: "sequence",
      sequenceId: "seq_1",
      emailId: "em_1",
      nodeId: "node_1",
      label: "Email 1",
    });
  });

  it("needs the email's step to render it", () => {
    expect(() =>
      parseVariationsTarget(sequenceData({ email: { emailId: "em_1" } }))
    ).toThrow("No sequence email was returned.");
    expect(() => parseVariationsTarget({ target: "campaign" })).toThrow();
  });

  it("offers this email and every email for a sequence, one use for a campaign", () => {
    expect(
      variationActions({ kind: "campaign", campaignId: "c1" }).map(
        (a) => a.label
      )
    ).toEqual(["Use this design"]);
    const actions = variationActions(parseVariationsTarget(sequenceData()));
    expect(actions.map((action) => [action.label, action.extra])).toEqual([
      ["Use for Email 1", {}],
      ["Use for every email", { scope: "all" }],
    ]);
  });
});

describe("showVariations", () => {
  it("renders each ready variation in place of the email, and waits on the others", async () => {
    const { app, callServerTool } = fakeApp(() => ({
      html: "<html><body><h1>Designed</h1><script>alert(1)</script></body></html>",
    }));
    const root = document.createElement("section");
    const view = showVariations(app, root, sequenceData());
    await settle();

    expect(view.title).toBe("Email 1 design");
    expect(root.querySelectorAll(".variation-card")).toHaveLength(2);
    expect(callServerTool).toHaveBeenCalledTimes(1);
    expect(callServerTool.mock.calls[0]?.[0]).toEqual({
      name: "render_email",
      arguments: {
        companyId: "co_1",
        sequenceId: "seq_1",
        nodeId: "node_1",
        variationId: "v1",
      },
    });
    const iframe = root.querySelector("iframe")!;
    expect(iframe.getAttribute("sandbox")).toBe("");
    expect(iframe.getAttribute("srcdoc")).toContain("Designed");
    expect(iframe.getAttribute("srcdoc")).not.toContain("alert(1)");
    expect(root.textContent).toContain("Designing…");
    expect(root.textContent).toContain("Designing 1 of 2.");
    // Only a ready variation can be used.
    expect(
      buttons(root, "Use for every email").map((button) => button.disabled)
    ).toEqual([false, true]);
    view.dispose();
  });

  it("follows only the variations a generate call started", async () => {
    const { app } = fakeApp(() => ({ html: "<p>Hi</p>" }));
    const root = document.createElement("section");
    const view = showVariations(
      app,
      root,
      sequenceData({ newVariationIds: ["v2"] })
    );
    expect(root.querySelectorAll(".variation-card")).toHaveLength(1);
    expect(root.textContent).toContain("V2");
    view.dispose();
  });

  it("refreshes from the list tool and renders a campaign's variations by campaign", async () => {
    const { app, callServerTool } = fakeApp((name) =>
      name === "list_campaign_variations"
        ? { variations: [variation("v1", { inUse: true })] }
        : { html: "<p>Hi</p>" }
    );
    const root = document.createElement("section");
    const view = showVariations(app, root, {
      mode: "variations",
      target: "campaign",
      campaignId: "camp_1",
      variations: [variation("v1", { status: "generating" })],
    });
    buttons(root, "Refresh")[0]!.click();
    await settle();
    await settle();

    expect(callServerTool.mock.calls.map((call) => call[0])).toEqual([
      { name: "list_campaign_variations", arguments: { campaignId: "camp_1" } },
      {
        name: "render_email",
        arguments: { campaignId: "camp_1", variationId: "v1" },
      },
    ]);
    expect(root.querySelector(".state-badge")?.textContent).toBe("In use");
    expect(root.textContent).toContain("Nothing changes until you use one.");
    view.dispose();
  });

  it("saves a design to every email only after confirming, and tells the assistant", async () => {
    const used = {
      success: true,
      dryRun: false,
      emails: [
        { emailId: "em_1", saved: true },
        { emailId: "em_2", saved: true },
      ],
    };
    const { app, callServerTool, updateModelContext } = fakeApp((name) =>
      name === "use_sequence_email_variation"
        ? used
        : name === "list_sequence_email_variations"
          ? { variations: [variation("v1", { inUse: true })] }
          : { html: "<p>Hi</p>" }
    );
    const root = document.createElement("section");
    const view = showVariations(
      app,
      root,
      sequenceData({ variations: [variation("v1")] })
    );
    await settle();
    buttons(root, "Use for every email")[0]!.click();
    expect(root.textContent).toContain("and its style into every other email");
    buttons(root, "Cancel")[0]!.click();
    buttons(root, "Use for every email")[0]!.click();
    buttons(root, "Save")[0]!.click();
    await settle();
    await settle();

    const writes = callServerTool.mock.calls.filter(
      (call) => call[0].name === "use_sequence_email_variation"
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]?.[0].arguments).toEqual({
      companyId: "co_1",
      sequenceId: "seq_1",
      emailId: "em_1",
      variationId: "v1",
      scope: "all",
    });
    expect(root.textContent).toContain("Saved V1's design to 2 emails.");
    expect(updateModelContext).toHaveBeenCalledTimes(1);
    expect(root.querySelector(".state-badge")?.textContent).toBe("In use");
    expect(
      buttons(root, "Use for every email").map((button) => button.disabled)
    ).toEqual([false]);
    view.dispose();
  });

  it("says when nothing was saved, and shows errors", async () => {
    const { app } = fakeApp((name) => {
      if (name === "use_sequence_email_variation")
        return { emails: [{ emailId: "em_1", saved: false }] };
      if (name === "list_sequence_email_variations")
        throw new Error("List failed.");
      return { html: "<p>Hi</p>" };
    });
    const root = document.createElement("section");
    const view = showVariations(
      app,
      root,
      sequenceData({ variations: [variation("v1")] })
    );
    await settle();
    buttons(root, "Use for Email 1")[0]!.click();
    buttons(root, "Save")[0]!.click();
    await settle();
    await settle();
    expect(root.textContent).toContain("List failed.");
    view.dispose();
  });

  it("stops touching the page once disposed", async () => {
    let finish: (value: unknown) => void = () => undefined;
    const callServerTool = mock(
      () => new Promise((resolve) => (finish = resolve))
    );
    const root = document.createElement("section");
    const view = showVariations(
      { callServerTool } as unknown as AppBridge,
      root,
      sequenceData({ variations: [variation("v1")] })
    );
    view.dispose();
    finish(structured({ html: "<p>Late</p>" }));
    await settle();
    expect(root.hidden).toBe(true);
    expect(root.childNodes).toHaveLength(0);
  });
});
