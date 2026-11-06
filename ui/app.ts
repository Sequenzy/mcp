import { AppBridge } from "./bridge";
import { element, record, requiredElement, resultData, text } from "./dom";
import { previewDocument } from "./email-preview";
import { drawFlow } from "./flow-view";
import {
  parseSequence,
  type PreviewEmail,
  type PreviewSequence,
} from "./graph";
import { showSecondary } from "./secondary";
import { icon } from "./icons";
import { showVariations } from "./variations-view";

const app = new AppBridge({ name: "Sequenzy previews", version: "1.0.0" });
const heading = requiredElement("heading");
const subtitle = requiredElement("subtitle");
const badge = requiredElement("state");
const status = requiredElement("status");
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
let disposeSecondary: (() => void) | undefined;
let companyId = "";
let sequenceId = "";
let sequence: PreviewSequence | undefined;
let selectedEmail: PreviewEmail | undefined;
let selectedVariant: string | undefined;
let input: Record<string, unknown> = {};
let requestVersion = 0;
let closed = false;
let deviceWidth = 640;
let zoom = 1;
let flowSize = { width: 330, height: 200 };
let retryAction: (() => void) | undefined;

for (const [id, name] of Object.entries({
  envelope: "mail",
  refresh: "refresh",
  back: "back",
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
function fail(error: unknown) {
  message(
    error instanceof Error ? error.message : "The preview could not be loaded.",
    true
  );
  retry.hidden = !retryAction;
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
  heading.textContent = sequence.name;
  subtitle.textContent =
    sequence.description ||
    `${sequence.emails.length} email${sequence.emails.length === 1 ? "" : "s"} · ${sequence.nodes.length} steps`;
  badge.textContent = sequence.status.replaceAll("_", " ");
  badge.hidden = false;
  badge.dataset["status"] = sequence.status;
  sequenceView.hidden = false;
  emailView.hidden = true;
  tabs.hidden = false;
  back.hidden = true;
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
  sequenceView.hidden = true;
  tabs.hidden = true;
  emailView.hidden = false;
  back.hidden = !sequence;
  badge.hidden = true;
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
}
async function openEmail(email: PreviewEmail, variantId?: string) {
  if (closed || !sequence || !companyId || !sequenceId) return;
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
    message(
      "Variant previews are unavailable. This step requires access to its A/B variants.",
      true
    );
    refresh.disabled = false;
    retryAction = undefined;
    return;
  }
  message("Rendering your email…");
  try {
    const result = await app.callServerTool({
      name: "render_email",
      arguments: {
        companyId,
        sequenceId,
        nodeId: email.nodeId,
        ...(selectedVariant ? { variantId: selectedVariant } : {}),
      },
    });
    if (closed || version !== requestVersion) return;
    showEmail(resultData(result));
  } catch (error) {
    if (!closed && version === requestVersion) fail(error);
  } finally {
    if (!closed && version === requestVersion) refresh.disabled = false;
  }
}
async function refreshSequence() {
  const version = ++requestVersion;
  retryAction = () => {
    void refreshSequence();
  };
  refresh.disabled = true;
  retry.hidden = true;
  sequenceView.hidden = true;
  message("Refreshing sequence…");
  try {
    const result = await app.callServerTool({
      name: "preview_sequence",
      arguments: { companyId, sequenceId },
    });
    if (closed || version !== requestVersion) return;
    sequence = parseSequence(resultData(result)["sequence"]);
    overview();
  } catch (error) {
    if (!closed && version === requestVersion) fail(error);
  } finally {
    if (!closed && version === requestVersion) refresh.disabled = false;
  }
}
function selectTab(flow: boolean) {
  flowTab.setAttribute("aria-selected", String(flow));
  emailsTab.setAttribute("aria-selected", String(!flow));
  requiredElement("flow-panel").hidden = !flow;
  emailList.hidden = flow;
  if (flow) requestAnimationFrame(fitFlow);
}
flowTab.addEventListener("click", () => selectTab(true));
emailsTab.addEventListener("click", () => selectTab(false));
back.addEventListener("click", overview);
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
  else if (sequence) void refreshSequence();
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
  disposeSecondary?.();
  disposeSecondary = undefined;
  requiredElement("secondary-view").hidden = true;
  requiredElement("secondary-view").replaceChildren();
  message("");
  document.querySelector(".preview-label")!.textContent = "Preview";
  companyId = "";
  sequenceId = "";
  sequence = undefined;
  selectedEmail = undefined;
  selectedVariant = undefined;
  retryAction = undefined;
  clearEmail();
  sequenceView.hidden = true;
  emailView.hidden = true;
  tabs.hidden = true;
  refresh.hidden = true;
  back.hidden = true;
  retry.hidden = true;
  badge.hidden = true;
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
      document.querySelector(".preview-label")!.textContent = upload
        ? "Images"
        : "Import";
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
      document.querySelector(".preview-label")!.textContent = "Variations";
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
      heading.textContent = "Email preview";
      subtitle.textContent = input["campaignId"]
        ? "Campaign email"
        : input["sequenceId"]
          ? "Sequence email"
          : "Saved email";
      emailChrome();
      showEmail(data);
    } else throw new Error("No email or sequence preview was returned.");
  } catch (error) {
    fail(error);
  }
};
app.onhostcontextchanged = (context) => {
  if (context.theme) document.documentElement.dataset["theme"] = context.theme;
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
  })
  .catch(fail);
