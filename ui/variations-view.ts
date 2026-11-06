import type { AppBridge } from "./bridge";
import { element, record, resultData, text } from "./dom";
import { previewDocument } from "./email-preview";

/** What the variations are of, from a list or generate tool result. */
export type VariationsTarget =
  | { kind: "campaign"; campaignId: string }
  | {
      kind: "sequence";
      sequenceId: string;
      emailId: string;
      nodeId: string;
      label: string;
    };

export interface PreviewVariation {
  id: string;
  label: string;
  name: string;
  status: string;
  summary: string;
  error: string;
  inUse: boolean;
}

const POLL_MS = 3000;
const WATCH_MS = 5 * 60_000;

export function parseVariationsTarget(
  data: Record<string, unknown>
): VariationsTarget {
  if (data["target"] === "campaign") {
    const campaignId = text(data["campaignId"]);
    if (!campaignId) throw new Error("No campaign was returned.");
    return { kind: "campaign", campaignId };
  }
  const email = record(data["email"]);
  const sequenceId = text(data["sequenceId"]);
  const emailId = text(data["emailId"], text(email["emailId"]));
  const nodeId = text(email["nodeId"]);
  if (!sequenceId || !emailId || !nodeId)
    throw new Error("No sequence email was returned.");
  return {
    kind: "sequence",
    sequenceId,
    emailId,
    nodeId,
    label: text(email["label"], "This email"),
  };
}

export function parseVariations(value: unknown): PreviewVariation[] {
  return (Array.isArray(value) ? value : []).flatMap((item) => {
    const entry = record(item);
    const id = text(entry["id"]);
    if (!id) return [];
    return [
      {
        id,
        label: text(entry["label"], "Variation"),
        name: text(entry["name"]),
        status: text(entry["status"], "ready"),
        summary: text(entry["summary"]),
        error: text(entry["error"]),
        inUse: entry["inUse"] === true,
      },
    ];
  });
}

/** The ways to use a variation, with the tool and arguments each calls. */
export function variationActions(target: VariationsTarget) {
  return target.kind === "campaign"
    ? [
        {
          label: "Use this design",
          confirm: "Put this variation in the campaign email?",
          tool: "use_campaign_variation",
          extra: {},
        },
      ]
    : [
        {
          label: `Use for ${target.label}`,
          confirm: `Save this design into ${target.label}? It keeps its subject and words.`,
          tool: "use_sequence_email_variation",
          extra: {},
        },
        {
          label: "Use for every email",
          confirm:
            "Save this design into this email, and its style into every other email of the sequence? Each keeps its own words.",
          tool: "use_sequence_email_variation",
          extra: { scope: "all" },
        },
      ];
}

/** One result's lifetime: its polling, renders and pending writes stop when disposed. */
export function showVariations(
  app: AppBridge,
  root: HTMLElement,
  data: Record<string, unknown>
) {
  const target = parseVariationsTarget(data);
  const companyId = text(data["companyId"]);
  const followed = Array.isArray(data["newVariationIds"])
    ? new Set(data["newVariationIds"].map((id) => String(id)))
    : null;
  const scope = {
    ...(companyId ? { companyId } : {}),
    ...(target.kind === "campaign"
      ? { campaignId: target.campaignId }
      : { sequenceId: target.sequenceId, emailId: target.emailId }),
  };
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadline = Date.now() + WATCH_MS;
  let polling = false;
  let busy = false;
  const rendered = new Map<string, Promise<void>>();
  const frames = new Map<string, HTMLElement>();

  const note = element("p", "secondary-note");
  note.setAttribute("role", "status");
  const grid = element("div", "variation-grid");
  const refresh = element("button", "variation-button", "Refresh");
  refresh.type = "button";
  const toolbar = element("div", "variation-toolbar");
  toolbar.append(note, refresh);
  root.replaceChildren(toolbar, grid);
  root.classList.add("variations-view");
  root.hidden = false;

  const report = (error: unknown) => {
    note.textContent =
      error instanceof Error
        ? error.message
        : "The request could not be completed.";
    note.setAttribute("role", "alert");
  };

  function preview(variation: PreviewVariation, frame: HTMLElement) {
    if (rendered.has(variation.id)) return;
    frame.replaceChildren(element("span", "variation-wait", "Rendering…"));
    rendered.set(
      variation.id,
      (async () => {
        try {
          const result = resultData(
            await app.callServerTool({
              name: "render_email",
              arguments: {
                ...(companyId ? { companyId } : {}),
                ...(target.kind === "campaign"
                  ? { campaignId: target.campaignId }
                  : { sequenceId: target.sequenceId, nodeId: target.nodeId }),
                variationId: variation.id,
              },
            })
          );
          if (disposed) return;
          const html = text(result["html"]);
          if (!html) throw new Error("This variation has no content.");
          const iframe = element("iframe");
          iframe.title = `${variation.label} preview`;
          iframe.setAttribute("sandbox", "");
          iframe.setAttribute("referrerpolicy", "no-referrer");
          iframe.srcdoc = previewDocument(html);
          (frames.get(variation.id) ?? frame).replaceChildren(iframe);
        } catch (error) {
          rendered.delete(variation.id);
          if (!disposed)
            (frames.get(variation.id) ?? frame).replaceChildren(
              element(
                "span",
                "variation-wait",
                error instanceof Error
                  ? error.message
                  : "The preview could not be loaded."
              )
            );
        }
      })()
    );
  }

  async function use(
    variation: PreviewVariation,
    action: ReturnType<typeof variationActions>[number]
  ) {
    if (disposed || busy) return;
    busy = true;
    for (const button of grid.querySelectorAll("button"))
      button.disabled = true;
    note.setAttribute("role", "status");
    note.textContent = `Saving ${variation.label}…`;
    try {
      const result = resultData(
        await app.callServerTool({
          name: action.tool,
          arguments: { ...scope, variationId: variation.id, ...action.extra },
        })
      );
      if (disposed) return;
      const emails = Array.isArray(result["emails"]) ? result["emails"] : [];
      const saved = emails.filter((email) => record(email)["saved"] === true);
      const done =
        target.kind === "campaign"
          ? `${variation.label} is now the campaign email.`
          : saved.length > 1
            ? `Saved ${variation.label}'s design to ${saved.length} emails.`
            : saved.length === 1
              ? `${target.label} now uses ${variation.label}.`
              : "Nothing was saved. The email may have changed meanwhile; refresh and try again.";
      note.textContent = done;
      try {
        await app.updateModelContext({
          content: [
            {
              type: "text",
              text: JSON.stringify({
                usedVariation: variation.id,
                ...scope,
                ...action.extra,
                result,
              }),
            },
          ],
        });
      } catch {
        // The note already tells the user; the assistant can list again.
      }
      // Shows which one is in use now, then says what was saved.
      await poll();
      if (!disposed && note.getAttribute("role") !== "alert")
        note.textContent = done;
    } catch (error) {
      if (!disposed) report(error);
    } finally {
      if (!disposed) {
        busy = false;
        for (const button of grid.querySelectorAll("button"))
          button.disabled = button.dataset["ready"] !== "true";
      }
    }
  }

  function card(variation: PreviewVariation) {
    const item = element("article", "variation-card");
    const header = element("div", "variation-header");
    const title = element("strong", "", variation.label);
    if (variation.name) title.append(element("span", "", ` ${variation.name}`));
    const state = element(
      "span",
      "state-badge",
      variation.inUse ? "In use" : variation.status
    );
    state.dataset["status"] = variation.inUse ? "live" : variation.status;
    header.append(title, state);
    const frame = frames.get(variation.id) ?? element("div", "variation-frame");
    frames.set(variation.id, frame);
    item.append(header, frame);
    if (variation.status === "generating" && !frame.childNodes.length)
      frame.replaceChildren(element("span", "variation-wait", "Designing…"));
    if (variation.status === "failed")
      frame.replaceChildren(
        element(
          "span",
          "variation-wait",
          variation.error || "This variation couldn't be made."
        )
      );
    if (variation.status === "ready") preview(variation, frame);
    if (variation.summary)
      item.append(element("p", "variation-summary", variation.summary));
    const actions = element("div", "variation-actions");
    const confirmRow = element("div", "variation-confirm");
    confirmRow.hidden = true;
    for (const action of variationActions(target)) {
      const button = element("button", "variation-button", action.label);
      button.type = "button";
      const ready = variation.status === "ready";
      button.dataset["ready"] = String(ready);
      button.disabled = !ready || busy;
      button.addEventListener("click", () => {
        const yes = element("button", "primary-button", "Save");
        const no = element("button", "variation-button", "Cancel");
        yes.type = no.type = "button";
        yes.dataset["ready"] = no.dataset["ready"] = "true";
        yes.addEventListener("click", () => {
          confirmRow.hidden = true;
          void use(variation, action);
        });
        no.addEventListener("click", () => {
          confirmRow.hidden = true;
        });
        confirmRow.replaceChildren(
          element("span", "", action.confirm),
          yes,
          no
        );
        confirmRow.hidden = false;
      });
      actions.append(button);
    }
    item.append(actions, confirmRow);
    return item;
  }

  function render(variations: PreviewVariation[]) {
    const shown = followed
      ? variations.filter((variation) => followed.has(variation.id))
      : variations;
    grid.replaceChildren(...shown.map(card));
    const generating = shown.filter(
      (variation) => variation.status === "generating"
    ).length;
    note.setAttribute("role", "status");
    note.textContent = !shown.length
      ? "No variations yet. Ask your assistant to design a few."
      : generating
        ? `Designing ${generating} of ${shown.length}. Updates every few seconds.`
        : `${shown.length} variation${shown.length === 1 ? "" : "s"}. Nothing changes until you use one.`;
    if (generating && !disposed) {
      clearTimeout(timer);
      if (Date.now() < deadline)
        timer = setTimeout(() => {
          void poll();
        }, POLL_MS);
      else note.textContent += " Monitoring paused. Refresh to continue.";
    }
  }

  async function poll() {
    if (disposed || polling) return;
    clearTimeout(timer);
    polling = true;
    refresh.disabled = true;
    try {
      const result = resultData(
        await app.callServerTool({
          name:
            target.kind === "campaign"
              ? "list_campaign_variations"
              : "list_sequence_email_variations",
          arguments: scope,
        })
      );
      if (!disposed) render(parseVariations(result["variations"]));
    } catch (error) {
      if (!disposed) report(error);
    } finally {
      polling = false;
      if (!disposed) refresh.disabled = false;
    }
  }

  refresh.addEventListener("click", () => {
    deadline = Date.now() + WATCH_MS;
    void poll();
  });
  render(parseVariations(data["variations"]));

  return {
    title:
      target.kind === "campaign" ? "Campaign email" : `${target.label} design`,
    dispose() {
      disposed = true;
      clearTimeout(timer);
      root.hidden = true;
      root.classList.remove("variations-view");
      root.replaceChildren();
    },
  };
}
