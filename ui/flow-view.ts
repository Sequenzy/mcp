import { element } from "./dom";
import {
  describeNode,
  edgeLabel,
  layoutSequence,
  NODE_HEIGHT,
  NODE_WIDTH,
  type PreviewEmail,
  type PreviewSequence,
} from "./graph";
import { icon } from "./icons";

export function drawFlow(
  canvas: HTMLElement,
  sequence: PreviewSequence,
  openEmail: (email: PreviewEmail) => void
): { width: number; height: number } {
  canvas.replaceChildren();
  const layout = layoutSequence(sequence);
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(layout.height));
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("connections");
  const positions = new Map(layout.nodes.map((node) => [node.node.id, node]));
  for (const edge of sequence.edges) {
    const source = positions.get(edge.sourceNodeId);
    const target = positions.get(edge.targetNodeId);
    if (!source || !target) continue;
    const sx = source.x + NODE_WIDTH / 2;
    const sy = source.y + NODE_HEIGHT;
    const tx = target.x + NODE_WIDTH / 2;
    const ty = target.y;
    const path = document.createElementNS(svg.namespaceURI, "path");
    const back = ty <= sy;
    const bend = (sy + ty) / 2;
    path.setAttribute(
      "d",
      back
        ? `M ${sx} ${sy} C ${sx + 170} ${sy + 50}, ${tx + 170} ${ty - 50}, ${tx} ${ty}`
        : `M ${sx} ${sy} C ${sx} ${bend}, ${tx} ${bend}, ${tx} ${ty}`
    );
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--line)");
    path.setAttribute("stroke-width", "1.5");
    if (back) path.setAttribute("stroke-dasharray", "4 4");
    svg.append(path);
    const label = edgeLabel(edge, source.node);
    if (label) {
      const badge = element("span", "branch-label", label);
      badge.style.left = `${(sx + tx) / 2}px`;
      badge.style.top = `${bend - 9}px`;
      canvas.append(badge);
    }
  }
  canvas.prepend(svg);
  for (const position of layout.nodes) {
    const email = sequence.emails.find(
      (email) => email.nodeId === position.node.id
    );
    const description = describeNode(position.node, email);
    const card = email
      ? element("button", `flow-node ${description.kind}`)
      : element("article", `flow-node ${description.kind}`);
    card.style.left = `${position.x}px`;
    card.style.top = `${position.y}px`;
    const symbol = element("span", "node-icon");
    symbol.append(icon(description.icon));
    const copy = element("span", "node-copy");
    copy.append(
      element(
        "span",
        "node-label",
        description.kind === "email"
          ? email?.nodeType === "action_ab_test"
            ? "A/B EMAIL"
            : "EMAIL"
          : description.kind.toUpperCase()
      ),
      element("strong", "node-title", description.title),
      element("span", "node-subtitle", description.subtitle)
    );
    card.append(symbol, copy);
    card.title = `${description.title}: ${description.subtitle}`;
    if (email) {
      card.setAttribute("aria-label", `Preview ${description.title}`);
      card.append(icon("next"));
      card.addEventListener("click", () => openEmail(email));
    }
    canvas.append(card);
  }
  if (!sequence.nodes.length)
    canvas.append(
      element(
        "p",
        "empty-flow",
        "No steps yet. Add steps in the sequence builder to preview them here."
      )
    );
  return layout;
}
