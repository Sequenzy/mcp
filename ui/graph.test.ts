import { describe, expect, it } from "bun:test";

import { record, resultData, text } from "./dom";
import {
  describeNode,
  edgeLabel,
  layoutSequence,
  parseSequence,
} from "./graph";

const node = (id: string, nodeType = "action_email", config = {}) => ({
  id,
  nodeType,
  config,
});
const edge = (from: string, to: string, condition = {}) => ({
  sourceNodeId: from,
  targetNodeId: to,
  condition,
});

describe("sequence preview data", () => {
  it("preserves topology, effective status and actual A/B variant fields", () => {
    const input = {
      id: "s",
      name: "Welcome",
      status: "active",
      effectiveStatus: "enrollment_paused",
      nodes: [node("a", "action_ab_test")],
      edges: [],
      emails: [
        {
          nodeId: "a",
          nodeType: "action_ab_test",
          name: "Welcome",
          subject: "Hello",
          abTest: {
            variants: [
              { variantId: "va", variantLabel: "A" },
              { variantId: "vb", variantLabel: "B" },
            ],
          },
        },
      ],
    };
    expect(parseSequence(input)).toMatchObject({
      id: "s",
      status: "enrollment_paused",
      emails: [
        {
          variants: [
            { id: "va", label: "A" },
            { id: "vb", label: "B" },
          ],
        },
      ],
    });
    expect(parseSequence({ nodes: [], edges: [] })).toMatchObject({
      name: "Untitled sequence",
      status: "draft",
      emails: [],
    });
    expect(
      parseSequence({
        nodes: [node("a")],
        edges: [],
        emails: [
          { nodeId: "a", abTest: { variants: [{ variantId: "v" }, {}] } },
        ],
      }).emails[0]?.variants
    ).toEqual([{ id: "v", label: "Variant 1" }]);
    expect(
      parseSequence({ nodes: [node("a")], edges: [], emails: [null] }).emails[0]
        ?.variants
    ).toEqual([]);
  });
  it("rejects invalid graphs instead of silently hiding steps or connections", () => {
    for (const input of [
      null,
      {},
      { nodes: [], edges: null },
      { nodes: [node("a"), node("a")], edges: [] },
      { nodes: [node("")], edges: [] },
      { nodes: [node("a", "")], edges: [] },
      { nodes: [node("a")], edges: [edge("a", "missing")] },
    ])
      expect(() => parseSequence(input)).toThrow();
  });
  it("lays out every branch and merge and terminates on cycles", () => {
    const data = parseSequence({
      nodes: [
        node("root"),
        node("left"),
        node("right"),
        node("merge"),
        node("orphan"),
      ],
      edges: [
        edge("root", "left"),
        edge("root", "right"),
        edge("left", "merge"),
        edge("right", "merge"),
      ],
    });
    const layout = layoutSequence(data);
    const positions = Object.fromEntries(
      layout.nodes.map((position) => [position.node.id, position])
    );
    expect(layout.nodes).toHaveLength(5);
    expect(positions["left"].y).toBe(positions["right"].y);
    expect(positions["left"].x).not.toBe(positions["right"].x);
    expect(positions["merge"].y).toBeGreaterThan(positions["right"].y);
    expect(
      layoutSequence(
        parseSequence({
          nodes: [node("a"), node("b")],
          edges: [edge("a", "b"), edge("b", "a")],
        })
      ).nodes
    ).toHaveLength(2);
    expect(
      layoutSequence(parseSequence({ nodes: [], edges: [] })).nodes
    ).toEqual([]);
  });
  it("describes email, trigger, delay, branch, wait and other action nodes", () => {
    expect(
      describeNode(node("a"), {
        nodeId: "a",
        nodeType: "action_email",
        name: "Welcome",
        subject: "Hello",
        variants: [],
      })
    ).toMatchObject({ title: "Welcome", subtitle: "Hello", kind: "email" });
    expect(
      describeNode(
        node("a", "action_ab_test", { label: "Test", subject: "Saved subject" })
      )
    ).toMatchObject({ title: "Test", subtitle: "Saved subject" });
    expect(describeNode(node("a"))).toMatchObject({
      title: "Send email",
      subtitle: "Preview saved content",
    });
    expect(
      describeNode(node("t", "trigger_event", { eventName: "purchase" }))
        .subtitle
    ).toBe("purchase");
    expect(describeNode(node("t", "trigger_subscriber_added")).subtitle).toBe(
      "subscriber added"
    );
    expect(
      describeNode(
        node("d", "logic_delay", {
          delayDays: 1,
          delayHours: 2,
          delayMinutes: 5,
        })
      ).subtitle
    ).toBe("1 day, 2 hours, 5 minutes");
    expect(
      describeNode(node("d", "logic_delay", { delayMs: 90000 })).subtitle
    ).toBe("1.5 minutes");
    expect(describeNode(node("d", "logic_delay")).subtitle).toBe("No delay");
    expect(
      describeNode(node("d", "logic_delay", { mode: "until_date" })).subtitle
    ).toContain("date");
    expect(
      describeNode(
        node("d", "logic_delay", {
          mode: "until_weekday",
          label: "Next Monday",
        })
      ).title
    ).toBe("Next Monday");
    expect(
      describeNode(node("d", "logic_delay", { mode: "until_weekday" })).subtitle
    ).toBe("Until the configured weekday window");
    expect(
      describeNode(
        node("d", "logic_delay", { mode: "until_weekday", delayDays: 6 })
      ).subtitle
    ).toBe("6 days, then the configured weekday window");
    expect(describeNode(node("b", "logic_branch")).kind).toBe("branch");
    expect(describeNode(node("w", "logic_wait_for_event")).kind).toBe("delay");
    expect(describeNode(node("tag", "action_add_tag")).title).toBe("add tag");
  });
  it("uses saved branch labels without inventing conditions", () => {
    const source = node("b", "logic_branch", {
      branches: [
        { id: "paid", name: "Paying customers" },
        { id: "trial", label: "On a trial" },
      ],
    });
    expect(edgeLabel(edge("b", "a", { branchId: "paid" }), source)).toBe(
      "Paying customers"
    );
    expect(edgeLabel(edge("b", "a", { branchId: "trial" }), source)).toBe(
      "On a trial"
    );
    expect(edgeLabel(edge("b", "a", { branchId: "else" }), source)).toBe(
      "Otherwise"
    );
    expect(edgeLabel(edge("b", "a", { branch: "yes" }), node("b"))).toBe(
      "branch-0"
    );
    expect(edgeLabel(edge("b", "a", {}), source)).toBe("");
  });
  it("reads both structured and text results and propagates errors", () => {
    expect(resultData({ structuredContent: { html: "saved" } })).toEqual({
      html: "saved",
    });
    expect(
      resultData({
        content: [
          { type: "image" },
          { type: "text", text: '{"html":"saved"}' },
        ],
      })
    ).toEqual({ html: "saved" });
    expect(() =>
      resultData({ isError: true, content: [{ type: "text", text: "Denied" }] })
    ).toThrow("Denied");
    expect(() => resultData({ isError: true })).toThrow("could not be loaded");
    expect(() => resultData({})).toThrow("no preview");
    expect(() =>
      resultData({ content: [{ type: "text", text: "{" }] })
    ).toThrow();
    expect(record([])).toEqual({});
    expect(record(null)).toEqual({});
    expect(text(" ", "fallback")).toBe("fallback");
  });
});

it("shows weighted random routing using saved IDs and positional aliases", () => {
  const source = node("split", "logic_branch", {
    splitMode: "random",
    branches: [
      { id: "offer-a", label: "Offer A" },
      { id: "offer-b", label: "Offer B" },
    ],
    randomPercentages: [90, 10],
  });
  expect(describeNode(source).subtitle).toBe("Random allocation");
  expect(edgeLabel(edge("split", "a", { branchId: "offer-a" }), source)).toBe(
    "Offer A · 90%"
  );
  expect(edgeLabel(edge("split", "b", { branchId: "branch-1" }), source)).toBe(
    "Offer B · 10%"
  );
  expect(edgeLabel(edge("split", "b", { branchId: "else" }), source)).toBe(
    "Fallback"
  );
});
