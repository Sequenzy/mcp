import { record, text } from "./dom";

export interface PreviewNode {
  id: string;
  nodeType: string;
  config: Record<string, unknown>;
}
export interface PreviewEdge {
  sourceNodeId: string;
  targetNodeId: string;
  condition: Record<string, unknown>;
}
export interface PreviewEmail {
  nodeId: string;
  nodeType: string;
  name: string;
  subject: string;
  variants: Array<{ id: string; label: string }>;
}
export interface PreviewSequence {
  id: string;
  name: string;
  description: string;
  status: string;
  nodes: PreviewNode[];
  edges: PreviewEdge[];
  emails: PreviewEmail[];
}
export interface PositionedNode {
  node: PreviewNode;
  x: number;
  y: number;
}
export const NODE_WIDTH = 252;
export const NODE_HEIGHT = 90;

export function parseSequence(value: unknown): PreviewSequence {
  const data = record(value);
  if (!Array.isArray(data["nodes"]) || !Array.isArray(data["edges"]))
    throw new Error(
      "This sequence has no readable flow. Refresh to try again."
    );
  const nodes = data["nodes"].map((value) => {
    const node = record(value);
    return {
      id: text(node["id"]),
      nodeType: text(node["nodeType"]),
      config: record(node["config"]),
    };
  });
  if (
    nodes.some((node) => !node.id || !node.nodeType) ||
    new Set(nodes.map((node) => node.id)).size !== nodes.length
  )
    throw new Error(
      "The sequence contains invalid steps. Open it in Sequenzy to inspect the flow."
    );
  const ids = new Set(nodes.map((node) => node.id));
  const edges = data["edges"].map((value) => {
    const edge = record(value);
    return {
      sourceNodeId: text(edge["sourceNodeId"]),
      targetNodeId: text(edge["targetNodeId"]),
      condition: record(edge["condition"]),
    };
  });
  if (
    edges.some(
      (edge) => !ids.has(edge.sourceNodeId) || !ids.has(edge.targetNodeId)
    )
  )
    throw new Error(
      "A sequence connection points to a missing step. Refresh to inspect the latest flow."
    );
  const emails = (Array.isArray(data["emails"]) ? data["emails"] : []).map(
    (value) => {
      const email = record(value);
      const abTest = record(email["abTest"]);
      return {
        nodeId: text(email["nodeId"]),
        nodeType: text(email["nodeType"]),
        name: text(email["name"]),
        subject: text(email["subject"]),
        variants: (Array.isArray(abTest["variants"]) ? abTest["variants"] : [])
          .map((value, index) => {
            const variant = record(value);
            return {
              id: text(variant["variantId"]),
              label: text(variant["variantLabel"], `Variant ${index + 1}`),
            };
          })
          .filter((variant) => variant.id),
      };
    }
  );
  return {
    id: text(data["id"]),
    name: text(data["name"], "Untitled sequence"),
    description: text(data["description"]),
    status: text(data["effectiveStatus"], text(data["status"], "draft")),
    nodes,
    edges,
    emails,
  };
}

/** Longest-path ranks keep branches and merges explicit; cycles stay visible as back edges. */
export function layoutSequence(sequence: PreviewSequence): {
  nodes: PositionedNode[];
  width: number;
  height: number;
} {
  const ranks = new Map<string, number>();
  const incoming = new Map(sequence.nodes.map((node) => [node.id, 0]));
  const children = new Map<string, string[]>();
  for (const edge of sequence.edges) {
    incoming.set(edge.targetNodeId, (incoming.get(edge.targetNodeId) ?? 0) + 1);
    children.set(edge.sourceNodeId, [
      ...(children.get(edge.sourceNodeId) ?? []),
      edge.targetNodeId,
    ]);
  }
  const queue = sequence.nodes
    .filter((node) => incoming.get(node.id) === 0)
    .map((node) => node.id);
  for (const id of queue) ranks.set(id, 0);
  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    for (const child of children.get(id) ?? []) {
      ranks.set(
        child,
        Math.max(ranks.get(child) ?? 0, (ranks.get(id) ?? 0) + 1)
      );
      incoming.set(child, (incoming.get(child) ?? 1) - 1);
      if (incoming.get(child) === 0) queue.push(child);
    }
  }
  let lastRank = Math.max(0, ...ranks.values());
  for (const node of sequence.nodes)
    if (!queue.includes(node.id)) ranks.set(node.id, ++lastRank);
  const rows = new Map<number, PreviewNode[]>();
  for (const node of sequence.nodes) {
    const rank = ranks.get(node.id) ?? 0;
    rows.set(rank, [...(rows.get(rank) ?? []), node]);
  }
  const width =
    Math.max(1, ...[...rows.values()].map((row) => row.length)) *
      (NODE_WIDTH + 42) +
    36;
  const positioned: PositionedNode[] = [];
  for (const [rank, row] of rows)
    row.forEach((node, index) =>
      positioned.push({
        node,
        x:
          (width - row.length * (NODE_WIDTH + 42) + 42) / 2 +
          index * (NODE_WIDTH + 42),
        y: 30 + rank * 148,
      })
    );
  return {
    nodes: positioned,
    width,
    height: Math.max(180, 80 + (Math.max(0, ...rows.keys()) + 1) * 148),
  };
}

export function describeNode(
  node: PreviewNode,
  email?: PreviewEmail
): { title: string; subtitle: string; kind: string; icon: string } {
  const config = node.config;
  const label = text(config["label"]);
  if (node.nodeType === "action_email" || node.nodeType === "action_ab_test")
    return {
      title:
        label || email?.name || text(config["linkedEmailName"], "Send email"),
      subtitle:
        email?.subject || text(config["subject"], "Preview saved content"),
      kind: "email",
      icon: "mail",
    };
  if (node.nodeType.startsWith("trigger_"))
    return {
      title: label || "Sequence starts",
      subtitle: text(
        config["eventName"],
        node.nodeType.slice(8).replaceAll("_", " ")
      ),
      kind: "trigger",
      icon: "bolt",
    };
  if (node.nodeType === "logic_delay") {
    const mode = text(config["mode"]);
    const duration = [
      ["delayDays", "day"],
      ["delayHours", "hour"],
      ["delayMinutes", "minute"],
    ]
      .flatMap(([key, unit]) => {
        const count = config[key];
        return typeof count === "number" && count > 0
          ? [`${count} ${unit}${count === 1 ? "" : "s"}`]
          : [];
      })
      .join(", ");
    const ms = config["delayMs"];
    return {
      title: label || "Wait",
      subtitle:
        mode === "until_date"
          ? "Until the configured date"
          : mode === "until_weekday"
            ? duration
              ? `${duration}, then the configured weekday window`
              : "Until the configured weekday window"
            : duration ||
              (typeof ms === "number" && ms > 0
                ? `${ms / 60000} minutes`
                : "No delay"),
      kind: "delay",
      icon: "clock",
    };
  }
  if (
    ["logic_branch", "logic_condition", "logic_random_split"].includes(
      node.nodeType
    )
  )
    return {
      title: label || "Split into paths",
      subtitle:
        config["splitMode"] === "random"
          ? "Random allocation"
          : "Follow the matching branch",
      kind: "branch",
      icon: "branch",
    };
  if (node.nodeType === "logic_wait_for_event")
    return {
      title: label || "Wait for event",
      subtitle: text(config["eventName"], "Configured event or timeout"),
      kind: "delay",
      icon: "clock",
    };
  return {
    title:
      label ||
      node.nodeType.replace(/^(action|logic)_/, "").replaceAll("_", " "),
    subtitle: text(config["description"], "Sequence action"),
    kind: "action",
    icon: "action",
  };
}

export function edgeLabel(edge: PreviewEdge, source: PreviewNode): string {
  const savedId = text(edge.condition["branchId"]);
  const legacy = text(edge.condition["branch"]);
  const id =
    savedId ||
    (legacy === "yes" ? "branch-0" : legacy === "no" ? "else" : legacy);
  if (!id) return "";
  const branches = (
    Array.isArray(source.config["branches"]) ? source.config["branches"] : []
  ).map(record);
  let index = branches.findIndex((branch) => branch["id"] === id);
  if (index < 0 && /^branch-\d+$/.test(id)) index = Number(id.slice(7));
  const branch = branches[index];
  const random = source.config["splitMode"] === "random";
  if (id === "else" && !branch) return random ? "Fallback" : "Otherwise";
  const label = text(branch?.["name"], text(branch?.["label"], id));
  const percentages = source.config["randomPercentages"];
  const percent = Array.isArray(percentages) ? percentages[index] : undefined;
  return random && typeof percent === "number" && Number.isFinite(percent)
    ? `${label} · ${percent}%`
    : label;
}
