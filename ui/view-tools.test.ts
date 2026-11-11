import { describe, expect, it, mock } from "bun:test";

import {
  callViewTool,
  viewToolsFor,
  type ViewController,
  type ViewMode,
} from "./view-tools";

const MODES: ViewMode[] = ["home", "sequence", "email", "other"];

function controller(mode: ViewMode, overrides: Partial<ViewController> = {}) {
  const calls: unknown[][] = [];
  const record =
    <T>(name: string, value: T) =>
    (...args: unknown[]) => {
      calls.push([name, ...args]);
      return value;
    };
  const base: ViewController = {
    mode: () => mode,
    state: () => ({ view: mode, companyId: "co_1" }),
    openStep: mock(record("openStep", Promise.resolve("Showing step."))),
    showOverview: mock(record("showOverview", "Showing overview.")),
    setWidth: mock(record("setWidth", "Width set.")),
    reload: mock(record("reload", Promise.resolve("Reloaded."))),
    openSequence: mock(record("openSequence", Promise.resolve("Opened."))),
    openCampaignEmail: mock(
      record("openCampaignEmail", Promise.resolve("Opened campaign."))
    ),
  };
  return { view: { ...base, ...overrides }, calls };
}

const textOf = (result: { content?: Array<{ text?: string }> }) =>
  result.content?.[0]?.text ?? "";

describe("view tool definitions", () => {
  it("fit host limits and stay object-rooted", () => {
    for (const mode of MODES) {
      const tools = viewToolsFor(mode);
      expect(tools.length).toBeLessThanOrEqual(64);
      expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
      expect(JSON.stringify(tools).length).toBeLessThan(1024 * 1024);
      for (const tool of tools) {
        expect(tool.name).toMatch(/^[A-Za-z0-9._-]{1,128}$/);
        expect(tool.inputSchema.type).toBe("object");
        expect(tool.title.length).toBeGreaterThan(0);
        expect(tool.description.split("\n")[0].length).toBeLessThanOrEqual(200);
        expect(tool.annotations).toMatchObject({ readOnlyHint: true });
        expect(JSON.stringify(tool.inputSchema)).not.toContain("anyOf");
      }
    }
  });

  it("offers each mode only the tools that act on it", () => {
    const names = (mode: ViewMode) =>
      viewToolsFor(mode).map((tool) => tool.name);
    expect(names("home")).toEqual([
      "get_view_state",
      "open_sequence",
      "open_campaign_email",
      "reload_view",
    ]);
    expect(names("sequence")).toEqual([
      "get_view_state",
      "open_sequence_step",
      "show_sequence_overview",
      "set_preview_width",
      "reload_view",
    ]);
    expect(names("email")).toEqual([
      "get_view_state",
      "set_preview_width",
      "reload_view",
    ]);
    expect(names("other")).toEqual([]);
  });

  it("keeps a tool's definition identical across modes", () => {
    const reload = MODES.flatMap((mode) => viewToolsFor(mode)).filter(
      (tool) => tool.name === "reload_view"
    );
    expect(reload).toHaveLength(3);
    for (const tool of reload) expect(tool).toBe(reload[0]);
  });
});

describe("callViewTool", () => {
  it("dispatches validated arguments to the view", async () => {
    const { view, calls } = controller("sequence");
    expect(textOf(await callViewTool(view, "get_view_state", {}))).toBe(
      JSON.stringify({ view: "sequence", companyId: "co_1" })
    );
    expect(
      textOf(
        await callViewTool(view, "open_sequence_step", {
          nodeId: " node_2 ",
          variantId: "v_b",
        })
      )
    ).toBe("Showing step.");
    await callViewTool(view, "open_sequence_step", { nodeId: "node_3" });
    await callViewTool(view, "show_sequence_overview", {});
    await callViewTool(view, "show_sequence_overview", { tab: "emails" });
    await callViewTool(view, "set_preview_width", { width: "mobile" });
    await callViewTool(view, "reload_view", {});
    expect(calls).toEqual([
      ["openStep", "node_2", "v_b"],
      ["openStep", "node_3", undefined],
      ["showOverview", "flow"],
      ["showOverview", "emails"],
      ["setWidth", "mobile"],
      ["reload"],
    ]);

    const home = controller("home");
    await callViewTool(home.view, "open_sequence", { sequenceId: "seq_1" });
    await callViewTool(home.view, "open_campaign_email", {
      campaignId: "cmp_1",
    });
    expect(home.calls).toEqual([
      ["openSequence", "seq_1"],
      ["openCampaignEmail", "cmp_1"],
    ]);
  });

  it("explains invalid input as a normal result without acting", async () => {
    const { view, calls } = controller("sequence");
    for (const [name, args] of [
      ["open_sequence_step", {}],
      ["open_sequence_step", { nodeId: "  " }],
      ["open_sequence_step", { nodeId: "n", variantId: 4 }],
      ["show_sequence_overview", { tab: "graph" }],
      ["set_preview_width", { width: "tablet" }],
    ] as const) {
      const result = await callViewTool(view, name, args);
      expect(result.isError).toBeUndefined();
      expect(textOf(result)).toStartWith("Not done:");
    }
    expect(calls).toEqual([]);
  });

  it("refuses tools that do not act on what the view shows", async () => {
    const { view, calls } = controller("email");
    const result = await callViewTool(view, "open_sequence_step", {
      nodeId: "n",
    });
    expect(textOf(result)).toContain("not available");
    expect(textOf(await callViewTool(view, "drop_table", {}))).toStartWith(
      "Not done:"
    );
    const other = controller("other");
    expect(
      textOf(await callViewTool(other.view, "get_view_state", {}))
    ).toStartWith("Not done:");
    expect(calls).toEqual([]);
  });

  it("reports what went wrong when the view fails", async () => {
    const { view } = controller("sequence", {
      openStep: async () => {
        throw new Error("step n is not an email in this sequence.");
      },
    });
    expect(
      textOf(await callViewTool(view, "open_sequence_step", { nodeId: "n" }))
    ).toBe("Not done: step n is not an email in this sequence.");
  });
});

it("answers before the host deadline while the view keeps loading", async () => {
  let finish: (value: string) => void = () => undefined;
  const { view } = controller("sequence", {
    reload: () =>
      new Promise<string>((resolve) => {
        finish = resolve;
      }),
  });
  const result = await callViewTool(view, "reload_view", {}, 5);
  expect(textOf(result)).toContain("Still loading");
  finish("Reloaded.");
  expect(textOf(await callViewTool(view, "get_view_state", {}, 5))).toContain(
    "sequence"
  );
});
