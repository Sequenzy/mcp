import { AppBridge } from "./bridge";
import { AVAILABLE_DISPLAY_MODES, setupDisplayMode } from "./display-mode";
import { element, record, requiredElement, resultData, text } from "./dom";
import { previewDocument } from "./email-preview";
import { drawFlow } from "./flow-view";
import {
  parseSequence,
  type PreviewEmail,
  type PreviewSequence,
} from "./graph";
import { parseHome, renderHome, type HomeData } from "./home-view";
import { icon } from "./icons";
import { showSecondary } from "./secondary";
import { showVariations } from "./variations-view";
import { callViewTool, viewToolsFor, type ViewMode } from "./view-tools";

const app = new AppBridge(
  { name: "Sequenzy previews", version: "1.0.0" },
  window.parent,
  {
    availableDisplayModes: [...AVAILABLE_DISPLAY_MODES],
    tools: { listChanged: true },
  }
);
const heading = requiredElement("heading");
const subtitle = requiredElement("subtitle");
const badge = requiredElement("state");
const status = requiredElement("status");
const homeView = requiredElement("home-view");
const sequenceView = requiredElement("sequence-view");
const emailView = requiredElement("email-view");
const flowViewport = requiredElement("flow-viewport");
const flowSpace = requiredElement("flow-space");
const flowCanvas = requiredElement("flow-canvas");
const emailList = requiredElement("email-list");
const tabs = requiredElement("tabs");
const flowTab = requiredElement<HTMLButtonElement>("flow-tab");
const emailsTab = requiredElement<HTMLButtonElement>("emails-tab");
const refresh = requiredElement<HTMLButtonElement>("refresh");
const retry = requiredElement<HTMLButtonElement>("retry");
const back = requiredElement<HTMLButtonElement>("back");
const backLabel = requiredElement("back-label");
const ask = requiredElement<HTMLButtonElement>("ask");
const previous = requiredElement<HTMLButtonElement>("previous");
const next = requiredElement<HTMLButtonElement>("next");
const stepLabel = requiredElement("step-label");
const variants = requiredElement("variants");
const iframe = requiredElement<HTMLIFrameElement>("email-frame");
const emailViewport = requiredElement("email-viewport");
const emailCanvas = requiredElement("email-canvas");
const desktop = requiredElement<HTMLButtonElement>("desktop");
const mobile = requiredElement<HTMLButtonElement>("mobile");
const warnings = requiredElement("warnings");
const previewLabel = requiredElement("preview-label");
const display = setupDisplayMode(app, requiredElement("expand"));
let disposeSecondary: (() => void) | undefined;
let companyId = "";
let sequenceId = "";
let sequence: PreviewSequence | undefined;
let selectedEmail: PreviewEmail | undefined;
let selectedVariant: string | undefined;
let home: HomeData | undefined;
/** Arguments that re-render a standalone email (not a sequence step). */
let emailArgs: Record<string, unknown> | undefined;
let input: Record<string, unknown> = {};
let requestVersion = 0;
let closed = false;
let deviceWidth = 640;
let zoom = 1;
let flowSize = { width: 330, height: 200 };
let retryAction: (() => void) | undefined;
let listedMode: ViewMode = "other";
/** Set by a reload whose open step no longer exists. */
let reloadNote = "";
/** The request the visible content is waiting on, for get_view_state. */
let loading: { version: number; target: string } | undefined;

for (const [id, name] of Object.entries({
  envelope: "mail",
  refresh: "refresh",
  expand: "expand",
  back: "back",
  ask: "message",
  previous: "back",
  next: "next",
  desktop: "desktop",
  mobile: "mobile",
  "zoom-in": "plus",
  "zoom-out": "minus",
  fit: "fit",
}))
  requiredElement(id).prepend(icon(name));

function message(value: string, isError = false) {
  status.textContent = value;
  status.hidden = !value;
  status.classList.toggle("error", isError);
  status.setAttribute("role", isError ? "alert" : "status");
}
function fail(error: unknown): string {
  const value =
    error instanceof Error ? error.message : "The preview could not be loaded.";
  message(value, true);
  retry.hidden = !retryAction;
  return value;
}
function viewMode(): ViewMode {
  if (!homeView.hidden && home) return "home";
  if (sequence && companyId && sequenceId) return "sequence";
  if (!emailView.hidden && emailArgs) return "email";
  return "other";
}
/** Tell the host when the set of view tools changes with the content. */
function syncView() {
  const mode = viewMode();
  ask.hidden =
    !app.getHostCapabilities()?.message || emailView.hidden || mode === "other";
  if (mode !== listedMode) {
    listedMode = mode;
    app.sendToolListChanged();
  }
}
function updateBack() {
  const toOverview = !emailView.hidden && !!sequence;
  back.hidden = !toOverview && (!home || !homeView.hidden);
  backLabel.textContent = toOverview
    ? "Sequence overview"
    : "All sequences and campaigns";
}
function clearEmail() {
  iframe.removeAttribute("srcdoc");
  iframe.hidden = true;
  warnings.replaceChildren();
  warnings.hidden = true;
  requiredElement("subject").textContent = "";
  requiredElement("preheader").textContent = "";
}
function setDevice(width: number) {
  deviceWidth = width;
  desktop.setAttribute("aria-pressed", String(width === 640));
  mobile.setAttribute("aria-pressed", String(width === 375));
  requiredElement("device-size").textContent = `${width}px`;
  const scale = Math.min(
    1,
    Math.max(1, emailViewport.clientWidth - 32) / width
  );
  emailCanvas.style.width = `${width}px`;
  emailCanvas.style.transform = `scale(${scale})`;
  emailViewport.style.height = `${600 * scale + 32}px`;
  emailCanvas.style.marginLeft = `${Math.max(16, (emailViewport.clientWidth - width * scale) / 2)}px`;
}
function applyZoom(value: number) {
  zoom = Math.max(0.3, Math.min(1.5, value));
  flowCanvas.style.transform = `scale(${zoom})`;
  flowSpace.style.width = `${flowSize.width * zoom}px`;
  flowSpace.style.height = `${flowSize.height * zoom}px`;
  requiredElement("zoom-level").textContent = `${Math.round(zoom * 100)}%`;
}
function fitFlow() {
  applyZoom(Math.min(1, (flowViewport.clientWidth - 24) / flowSize.width));
}
function hideAll() {
  homeView.hidden = true;
  sequenceView.hidden = true;
  emailView.hidden = true;
  tabs.hidden = true;
  badge.hidden = true;
}
const homeActions = {
  openSequence: (id: string) => void openSequence(id),
  openCampaign: (id: string) => void openCampaignEmail(id),
  switchCompany: (id: string) => void loadHome(id),
};
function showHome() {
  if (!home) return;
  requestVersion++;
  const data = home;
  sequence = undefined;
  sequenceId = "";
  selectedEmail = undefined;
  selectedVariant = undefined;
  emailArgs = undefined;
  companyId = data.companyId;
  retryAction = undefined;
  clearEmail();
  message("");
  retry.hidden = true;
  hideAll();
  homeView.hidden = false;
  refresh.hidden = false;
  refresh.disabled = false;
  previewLabel.textContent = "Workspace";
  heading.textContent = data.companyName || "Your Sequenzy workspace";
  subtitle.textContent = "Open a sequence or campaign to preview it.";
  renderHome(homeView, data, homeActions);
  updateBack();
  display.setExpandable(true);
  syncView();
}
function overview() {
  requestVersion++;
  selectedEmail = undefined;
  selectedVariant = undefined;
  retryAction = undefined;
  clearEmail();
  message("");
  retry.hidden = true;
  refresh.disabled = false;
  if (!sequence) return;
  previewLabel.textContent = "Preview";
  heading.textContent = sequence.name;
  subtitle.textContent =
    sequence.description ||
    `${sequence.emails.length} email${sequence.emails.length === 1 ? "" : "s"} · ${sequence.nodes.length} steps`;
  hideAll();
  badge.textContent = sequence.status.replaceAll("_", " ");
  badge.hidden = false;
  badge.dataset["status"] = sequence.status;
  sequenceView.hidden = false;
  tabs.hidden = false;
  refresh.hidden = false;
  flowSize = drawFlow(flowCanvas, sequence, (email) => {
    void openEmail(email);
  });
  emailList.replaceChildren();
  for (const [index, email] of sequence.emails.entries()) {
    const card = element("button", "email-list-item");
    const number = element(
      "span",
      "email-number",
      String(index + 1).padStart(2, "0")
    );
    const copy = element("span", "email-list-copy");
    copy.append(
      element("strong", "", email.name || "Untitled email"),
      element("span", "", email.subject || "No subject")
    );
    const count = element(
      "span",
      "variant-count",
      email.nodeType === "action_ab_test"
        ? `${email.variants.length} variants`
        : "Email"
    );
    card.append(number, copy, count, icon("next"));
    card.addEventListener("click", () => {
      void openEmail(email);
    });
    emailList.append(card);
  }
  if (!sequence.emails.length)
    emailList.append(
      element("p", "empty-list", "This sequence has no email steps yet.")
    );
  updateBack();
  display.setExpandable(true);
  syncView();
  requestAnimationFrame(fitFlow);
}
function showEmail(data: Record<string, unknown>) {
  if (typeof data["html"] !== "string" || !data["html"].trim())
    throw new Error("This email has no rendered content yet.");
  requiredElement("subject").textContent = text(data["subject"], "No subject");
  requiredElement("preheader").textContent = text(
    data["previewText"],
    "No preview text"
  );
  requiredElement("contact-mode").textContent =
    data["personalized"] === true ? "Personalized preview" : "Sample contact";
  iframe.srcdoc = previewDocument(data["html"]);
  iframe.hidden = false;
  warnings.replaceChildren();
  const missing = Array.isArray(data["unresolvedMergeTags"])
    ? data["unresolvedMergeTags"]
    : [];
  const conditions = Array.isArray(data["unevaluatedConditions"])
    ? data["unevaluatedConditions"]
    : [];
  if (missing.length)
    warnings.append(
      element(
        "p",
        "",
        `Some personalization is unresolved: ${missing.map((value) => text(record(value)["tag"], "merge tag")).join(", ")}. Use render_email with sample contact data to check it.`
      )
    );
  if (conditions.length)
    warnings.append(
      element(
        "p",
        "",
        `${conditions.length} condition${conditions.length === 1 ? "" : "s"} could not be evaluated for this contact. The preview may show a fallback branch.`
      )
    );
  warnings.hidden = !warnings.childNodes.length;
  message("");
  retry.hidden = true;
  setDevice(deviceWidth);
}
function emailChrome() {
  hideAll();
  emailView.hidden = false;
  requiredElement("step-navigation").hidden = !sequence;
  variants.replaceChildren();
  if (selectedEmail && sequence) {
    const index = sequence.emails.indexOf(selectedEmail);
    stepLabel.textContent = `Email ${index + 1} of ${sequence.emails.length}`;
    previous.disabled = index <= 0;
    next.disabled = index >= sequence.emails.length - 1;
    for (const variant of selectedEmail.variants) {
      const button = element("button", "variant-button", variant.label);
      button.setAttribute(
        "aria-pressed",
        String(selectedVariant === variant.id)
      );
      button.addEventListener("click", () => {
        if (selectedEmail) void openEmail(selectedEmail, variant.id);
      });
      variants.append(button);
    }
    heading.textContent = selectedEmail.name || "Email preview";
    subtitle.textContent = sequence.name;
  }
  updateBack();
  display.setExpandable(true);
  syncView();
}
/**
 * Runs one request for the visible content. `work` returns whether it applied
 * its result (it must not once newer navigation replaced it). Resolves with
 * null once shown, the error message when it failed, or "superseded", so view
 * tools can report what the user actually sees.
 */
async function track(
  version: number,
  target: string,
  work: () => Promise<boolean>
): Promise<string | null> {
  loading = { version, target };
  try {
    return (await work()) ? null : "superseded";
  } catch (error) {
    if (closed || version !== requestVersion) return "superseded";
    const text = fail(error);
    // The switcher may show a company whose switch was superseded; put it
    // back on the company whose lists are on screen.
    if (home && !homeView.hidden) renderHome(homeView, home, homeActions);
    return text;
  } finally {
    if (loading?.version === version) loading = undefined;
    if (!closed && version === requestVersion) refresh.disabled = false;
  }
}
function loadingTarget(): string | undefined {
  return loading && loading.version === requestVersion
    ? loading.target
    : undefined;
}
async function openEmail(email: PreviewEmail, variantId?: string) {
  if (closed || !sequence || !companyId || !sequenceId)
    return "No sequence is open.";
  const version = ++requestVersion;
  selectedEmail = email;
  selectedVariant = variantId ?? email.variants[0]?.id;
  retryAction = () => {
    void openEmail(email, selectedVariant);
  };
  retry.hidden = true;
  refresh.disabled = true;
  clearEmail();
  emailChrome();
  setDevice(deviceWidth);
  if (email.nodeType === "action_ab_test" && !selectedVariant) {
    refresh.disabled = false;
    retryAction = undefined;
    return fail(
      new Error(
        "Variant previews are unavailable. This step requires access to its A/B variants."
      )
    );
  }
  message("Rendering your email…");
  return track(version, `step ${email.nodeId}`, async () => {
    const result = await app.callServerTool({
      name: "render_email",
      arguments: {
        companyId,
        sequenceId,
        nodeId: email.nodeId,
        ...(selectedVariant ? { variantId: selectedVariant } : {}),
      },
    });
    if (closed || version !== requestVersion) return false;
    showEmail(resultData(result));
    return true;
  });
}
/** Show a standalone email rendered from these render_email arguments. */
async function renderStandalone(args: Record<string, unknown>, title: string) {
  const version = ++requestVersion;
  sequence = undefined;
  sequenceId = "";
  selectedEmail = undefined;
  selectedVariant = undefined;
  emailArgs = args;
  retryAction = () => {
    void renderStandalone(args, title);
  };
  retry.hidden = true;
  refresh.hidden = false;
  refresh.disabled = true;
  previewLabel.textContent = "Preview";
  heading.textContent = "Email preview";
  subtitle.textContent = title;
  clearEmail();
  emailChrome();
  message("Rendering your email…");
  return track(version, "email", async () => {
    const result = await app.callServerTool({
      name: "render_email",
      arguments: args,
    });
    if (closed || version !== requestVersion) return false;
    showEmail(resultData(result));
    return true;
  });
}
async function loadSequence(
  nextCompanyId: string,
  nextSequenceId: string,
  reopenNodeId?: string
) {
  const version = ++requestVersion;
  const switching = nextSequenceId !== sequenceId;
  retryAction = () => {
    void loadSequence(nextCompanyId, nextSequenceId, reopenNodeId);
  };
  refresh.disabled = true;
  retry.hidden = true;
  message(reopenNodeId ? "Reloading saved content…" : "Loading sequence…");
  let reopen: PreviewEmail | undefined;
  const outcome = await track(
    version,
    `sequence ${nextSequenceId}`,
    async () => {
      const result = await app.callServerTool({
        name: "preview_sequence",
        arguments: { companyId: nextCompanyId, sequenceId: nextSequenceId },
      });
      if (closed || version !== requestVersion) return false;
      sequence = parseSequence(resultData(result)["sequence"]);
      companyId = nextCompanyId;
      sequenceId = nextSequenceId;
      reopen = sequence.emails.find((email) => email.nodeId === reopenNodeId);
      if (reopenNodeId && !reopen)
        reloadNote = ` Step ${reopenNodeId} is no longer an email in this sequence, so the view shows the sequence overview.`;
      if (!reopen) {
        if (switching) selectTab(true);
        overview();
      }
      return true;
    }
  );
  if (outcome || !reopen) return outcome;
  const variant = reopen.variants.some((item) => item.id === selectedVariant)
    ? selectedVariant
    : undefined;
  return openEmail(reopen, variant);
}
async function loadHome(nextCompanyId?: string) {
  const version = ++requestVersion;
  retryAction = () => {
    void loadHome(nextCompanyId);
  };
  refresh.disabled = true;
  retry.hidden = true;
  message("Loading your workspace…");
  return track(version, "workspace", async () => {
    const result = await app.callServerTool({
      name: "open_sequenzy",
      arguments: nextCompanyId ? { companyId: nextCompanyId } : {},
    });
    if (closed || version !== requestVersion) return false;
    home = parseHome(resultData(result));
    showHome();
    return true;
  });
}
async function openSequence(id: string) {
  if (!home) return "No company is open.";
  // Home stays on screen (and its tools listed) until the flow replaces it,
  // so a failed load leaves a working view with the error and a retry.
  return loadSequence(home.companyId, id);
}
async function openCampaignEmail(id: string) {
  if (!home) return "No company is open.";
  return renderStandalone(
    { companyId: home.companyId, campaignId: id },
    "Campaign email"
  );
}
async function reload() {
  reloadNote = "";
  const mode = viewMode();
  if (mode === "home") return loadHome(home?.companyId);
  if (mode === "sequence")
    return loadSequence(companyId, sequenceId, selectedEmail?.nodeId);
  if (mode === "email" && emailArgs)
    return renderStandalone(emailArgs, subtitle.textContent || "Saved email");
  return "There is nothing to reload in this view.";
}
function selectTab(flow: boolean) {
  flowTab.setAttribute("aria-selected", String(flow));
  emailsTab.setAttribute("aria-selected", String(!flow));
  requiredElement("flow-panel").hidden = !flow;
  emailList.hidden = flow;
  if (flow) requestAnimationFrame(fitFlow);
}
/** What the user sees, plus anything still loading or the error shown. */
function describeView(): Record<string, unknown> {
  const pending = loadingTarget();
  const error =
    !status.hidden && status.classList.contains("error")
      ? status.textContent
      : undefined;
  return {
    ...describeContent(),
    ...(pending ? { loading: pending } : {}),
    ...(error ? { error } : {}),
  };
}
function describeContent(): Record<string, unknown> {
  const mode = viewMode();
  const width = deviceWidth === 375 ? "mobile" : "desktop";
  const displayMode = app.getHostContext()?.displayMode ?? "inline";
  if (mode === "home" && home)
    return {
      view: "home",
      displayMode,
      companyId: home.companyId,
      companyName: home.companyName,
      sequences: home.sequences.items,
      campaigns: home.campaigns.items,
    };
  if (mode === "sequence" && sequence)
    return {
      view: selectedEmail ? "sequence email" : "sequence overview",
      displayMode,
      companyId,
      sequence: {
        id: sequenceId,
        name: sequence.name,
        status: sequence.status,
        emails: sequence.emails.map((email, index) => ({
          position: index + 1,
          nodeId: email.nodeId,
          name: email.name,
          subject: email.subject,
          variants: email.variants,
        })),
      },
      openStep: selectedEmail
        ? {
            nodeId: selectedEmail.nodeId,
            name: selectedEmail.name,
            variantId: selectedVariant ?? null,
          }
        : null,
      ...(selectedEmail ? { previewWidth: width } : {}),
    };
  if (mode === "email" && emailArgs)
    return {
      view: "email",
      displayMode,
      renderedWith: emailArgs,
      subject: requiredElement("subject").textContent,
      previewWidth: width,
    };
  return { view: "other", displayMode };
}
const outcome = (result: string | null, done: string) => {
  if (result === null) return done;
  if (result === "superseded")
    return "Not done: the user moved to something else before it finished.";
  return `Not done: ${result}`;
};
app.onlisttools = () => viewToolsFor(viewMode());
app.oncalltool = (name, args) =>
  callViewTool(
    {
      mode: viewMode,
      state: describeView,
      async openStep(nodeId, variantId) {
        const email = sequence?.emails.find((item) => item.nodeId === nodeId);
        if (!email)
          throw new Error(
            `step ${nodeId} is not an email in this sequence. Email nodeIds: ${sequence?.emails.map((item) => item.nodeId).join(", ") || "none"}.`
          );
        if (variantId && !email.variants.some((item) => item.id === variantId))
          throw new Error(
            `variant ${variantId} is not on that step. Variant IDs: ${email.variants.map((item) => item.id).join(", ") || "none"}.`
          );
        return outcome(
          await openEmail(email, variantId),
          `Showing "${email.name || "Untitled email"}".`
        );
      },
      showOverview(tab) {
        overview();
        selectTab(tab === "flow");
        return `Showing the ${tab === "flow" ? "flow diagram" : "email list"}.`;
      },
      setWidth(width) {
        if (emailView.hidden)
          throw new Error("no email is open. Open a step first.");
        setDevice(width === "mobile" ? 375 : 640);
        return `Showing the email at ${width} width.`;
      },
      async reload() {
        const result = await reload();
        return outcome(result, `Reloaded from saved data.${reloadNote}`);
      },
      async openSequence(id) {
        if (!home?.sequences.items.some((item) => item.id === id))
          throw new Error(
            `${id} is not in the list shown. Call get_view_state for sequenceIds.`
          );
        // Restarting would discard the load that is nearly done.
        if (loadingTarget() === `sequence ${id}`)
          return "Still loading that sequence. Call get_view_state in a moment to see what it shows.";
        return outcome(await openSequence(id), "Showing the sequence flow.");
      },
      async openCampaignEmail(id) {
        if (!home?.campaigns.items.some((item) => item.id === id))
          throw new Error(
            `${id} is not in the list shown. Call get_view_state for campaignIds.`
          );
        return outcome(
          await openCampaignEmail(id),
          "Showing the campaign email."
        );
      },
    },
    name,
    args
  );
flowTab.addEventListener("click", () => selectTab(true));
emailsTab.addEventListener("click", () => selectTab(false));
back.addEventListener("click", () => {
  if (!emailView.hidden && sequence) overview();
  else showHome();
});
/**
 * Names and arguments are authored data, not the user's words, so the message
 * carries only IDs; the assistant reads the rest with get_view_state.
 */
function emailTarget(): string {
  const ids: Record<string, unknown> =
    selectedEmail && sequence
      ? {
          companyId,
          sequenceId,
          nodeId: selectedEmail.nodeId,
          variantId: selectedVariant,
        }
      : record(emailArgs);
  return [
    "companyId",
    "campaignId",
    "templateId",
    "sequenceId",
    "nodeId",
    "variantId",
    "variationId",
  ]
    .map((key) => [key, ids[key]] as const)
    .filter(
      ([, value]) => typeof value === "string" && /^[\w-]{1,128}$/.test(value)
    )
    .map(([key, value]) => `${key} ${String(value)}`)
    .join(", ");
}
ask.addEventListener("click", () => {
  const target = emailTarget();
  void app
    .sendMessage(
      `Review the email I have open in the Sequenzy preview${target ? ` (${target})` : ""} and suggest improvements before changing anything.`
    )
    .then((result) => {
      if (result.isError)
        message("Your assistant did not receive the request. Try again.", true);
    })
    .catch(() =>
      message("Your assistant did not receive the request. Try again.", true)
    );
});
previous.addEventListener("click", () => {
  if (sequence && selectedEmail) {
    const email = sequence.emails[sequence.emails.indexOf(selectedEmail) - 1];
    if (email) void openEmail(email);
  }
});
next.addEventListener("click", () => {
  if (sequence && selectedEmail) {
    const email = sequence.emails[sequence.emails.indexOf(selectedEmail) + 1];
    if (email) void openEmail(email);
  }
});
refresh.addEventListener("click", () => {
  if (selectedEmail) void openEmail(selectedEmail, selectedVariant);
  else void reload();
});
retry.addEventListener("click", () => retryAction?.());
desktop.addEventListener("click", () => setDevice(640));
mobile.addEventListener("click", () => setDevice(375));
requiredElement("zoom-in").addEventListener("click", () =>
  applyZoom(zoom + 0.1)
);
requiredElement("zoom-out").addEventListener("click", () =>
  applyZoom(zoom - 0.1)
);
requiredElement("fit").addEventListener("click", fitFlow);
const observer = new ResizeObserver(() => {
  if (!emailView.hidden) setDevice(deviceWidth);
});
observer.observe(emailViewport);
app.ontoolinput = (params) => {
  input = record(params.arguments);
};
app.ontoolresult = (result) => {
  if (closed) return;
  requestVersion++;
  refresh.disabled = false;
  disposeSecondary?.();
  disposeSecondary = undefined;
  requiredElement("secondary-view").hidden = true;
  requiredElement("secondary-view").replaceChildren();
  message("");
  previewLabel.textContent = "Preview";
  companyId = "";
  sequenceId = "";
  sequence = undefined;
  selectedEmail = undefined;
  selectedVariant = undefined;
  home = undefined;
  emailArgs = undefined;
  retryAction = undefined;
  clearEmail();
  hideAll();
  refresh.hidden = true;
  back.hidden = true;
  retry.hidden = true;
  display.setExpandable(false);
  try {
    const data = resultData(result);
    if (data["mode"] === "upload" || data["mode"] === "import") {
      const upload = data["mode"] === "upload";
      heading.textContent = upload
        ? "Your image library"
        : "Bringing your audience together";
      subtitle.textContent = upload
        ? "One image, ready for your next email."
        : "A quick look at your subscriber import.";
      previewLabel.textContent = upload ? "Images" : "Import";
      disposeSecondary = showSecondary(
        app,
        requiredElement("secondary-view"),
        data
      );
    } else if (data["mode"] === "variations") {
      const view = showVariations(app, requiredElement("secondary-view"), data);
      disposeSecondary = view.dispose;
      heading.textContent = "Design variations";
      subtitle.textContent = `${view.title}. Compare them, then use the one you like.`;
      previewLabel.textContent = "Variations";
      display.setExpandable(true);
    } else if (data["mode"] === "home") {
      home = parseHome(data);
      showHome();
    } else if (data["mode"] === "sequence") {
      companyId = text(data["companyId"]);
      sequenceId = text(data["sequenceId"]);
      if (!companyId || !sequenceId)
        throw new Error(
          "Open the sequence preview with an explicit company and sequence ID."
        );
      sequence = parseSequence(data["sequence"]);
      selectTab(true);
      overview();
    } else if (typeof data["html"] === "string") {
      // Hosts that skip tool-input leave nothing to re-render from.
      emailArgs = Object.keys(input).length ? input : undefined;
      heading.textContent = "Email preview";
      subtitle.textContent = input["campaignId"]
        ? "Campaign email"
        : input["sequenceId"]
          ? "Sequence email"
          : "Saved email";
      refresh.hidden = !emailArgs;
      emailChrome();
      showEmail(data);
    } else throw new Error("No email or sequence preview was returned.");
  } catch (error) {
    fail(error);
  }
  // Each input belongs to one result; a later result without its own input
  // must not inherit this one's target.
  input = {};
  syncView();
};
app.onhostcontextchanged = (context) => {
  if (context.theme) document.documentElement.dataset["theme"] = context.theme;
  display.update();
  if (!sequenceView.hidden) requestAnimationFrame(fitFlow);
};
app.onteardown = async () => {
  disposeSecondary?.();
  closed = true;
  requestVersion++;
  observer.disconnect();
  return {};
};
window.addEventListener("pagehide", () => {
  disposeSecondary?.();
  closed = true;
  requestVersion++;
  observer.disconnect();
});
void app
  .connect()
  .then(() => {
    const theme = app.getHostContext()?.theme;
    if (theme) document.documentElement.dataset["theme"] = theme;
    display.update();
  })
  .catch(fail);
