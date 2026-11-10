import type { AppBridge } from "./bridge";
import { element, record, resultData, text } from "./dom";

/** Each tool result owns its own lifetime, including pending requests and timers. */
export function showSecondary(
  app: AppBridge,
  root: HTMLElement,
  data: Record<string, unknown>
) {
  const companyId = text(data["companyId"]);
  if (!companyId)
    throw new Error("Open this tool with an explicit company ID.");
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const note = element("p", "secondary-note");
  note.setAttribute("role", "status");
  const card = element("div", "secondary-card");
  root.replaceChildren(card);
  root.hidden = false;
  const report = (error: unknown) => {
    note.textContent =
      error instanceof Error
        ? error.message
        : "The request could not be completed.";
    note.setAttribute("role", "alert");
  };
  if (data["mode"] === "upload") {
    const form = element("div", "upload-form");
    const label = element("label", "upload-picker");
    const picker = element("input");
    picker.type = "file";
    picker.accept = "image/png,image/jpeg,image/gif,image/webp";
    label.append(
      element("strong", "", "A little more you."),
      element("span", "", "Choose an image for your next email"),
      picker,
      element("small", "", "PNG, JPG, GIF or WebP · up to 10 MB")
    );
    const altLabel = element("label", "field-label", "Image description");
    const alt = element("input", "text-input");
    alt.type = "text";
    alt.maxLength = 500;
    alt.placeholder = "Describe the image for your readers";
    altLabel.append(alt);
    const submit = element("button", "primary-button", "Upload image");
    submit.type = "button";
    const result = element("div", "upload-result");
    result.hidden = true;
    form.append(label, altLabel, submit);
    card.append(form, note, result);
    let busy = false;
    submit.addEventListener("click", (event) => {
      event.preventDefault();
      if (disposed || busy) return;
      const file = picker.files?.[0];
      if (
        !file ||
        !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(
          file.type
        ) ||
        file.size > 10 * 1024 * 1024 ||
        !file.size
      ) {
        report(new Error("Choose a PNG, JPG, GIF or WebP image up to 10 MB."));
        return;
      }
      busy = true;
      submit.disabled = picker.disabled = alt.disabled = true;
      result.hidden = true;
      note.textContent = "Uploading your image…";
      const altText = alt.value;
      void (async () => {
        try {
          const imageBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () =>
              reject(new Error("This image could not be read."));
            reader.readAsDataURL(file);
          });
          if (disposed) return;
          const uploaded = resultData(
            await app.callServerTool({
              name: "upload_image_asset",
              arguments: {
                companyId,
                filename: file.name,
                imageBase64,
                ...(altText ? { altText } : {}),
              },
            })
          );
          if (disposed) return;
          const asset = record(uploaded["asset"]);
          result.replaceChildren(
            element("strong", "", "Ready for your next email"),
            element("span", "", text(asset["filename"], file.name))
          );
          const url = text(asset["url"]);
          if (url.startsWith("https://")) {
            const img = element("img");
            img.src = url;
            img.alt = altText;
            img.referrerPolicy = "no-referrer";
            result.prepend(img);
          }
          result.hidden = false;
          note.textContent = "Saved to your image library.";
          try {
            await app.updateModelContext({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({ companyId, ...uploaded }),
                },
              ],
            });
          } catch {
            if (!disposed)
              note.textContent =
                "Saved to your image library. Your assistant could not receive the result; use list_image_assets to find it.";
          }
        } catch (error) {
          if (!disposed) {
            report(error);
            note.append(
              " Check your image library before trying again; the upload may have completed."
            );
          }
        } finally {
          if (!disposed) {
            busy = false;
            submit.disabled = picker.disabled = alt.disabled = false;
          }
        }
      })();
    });
  } else {
    const importId = text(data["importId"]);
    if (!importId)
      throw new Error("Open this tool with an explicit import ID.");
    const title = element("strong", "import-filename");
    const state = element("span", "state-badge");
    const header = element("div", "import-heading");
    header.append(title, state);
    const progress = element("progress");
    progress.setAttribute("aria-label", "Import progress");
    const counts = element("div", "import-counts");
    const refresh = element("button", "retry-button", "Refresh status");
    const details = element("div", "import-details");
    card.append(header, progress, counts, details, note, refresh);
    let deadline = Date.now() + 5 * 60_000;
    let busy = false;
    function render(value: Record<string, unknown>) {
      const entry = record(value["import"]);
      const status = text(entry["status"]);
      if (!status)
        throw new Error(
          "Import status was not returned. Refresh to try again."
        );
      title.textContent = text(entry["fileName"], "Subscriber import");
      state.textContent = status;
      state.dataset["status"] = status;
      const total = Number(entry["totalRows"]) || 0;
      const processed = Number(entry["processedCount"]) || 0;
      progress.max = Math.max(total, 1);
      progress.value = Math.min(processed, progress.max);
      counts.replaceChildren();
      for (const [label, field] of [
        ["Added", "addedCount"],
        ["Updated", "updatedCount"],
        ["Skipped", "skippedCount"],
        ["Failed", "failedCount"],
      ]) {
        const metric = element("div");
        metric.append(
          element("strong", "", String(Number(entry[field]) || 0)),
          element("span", "", label)
        );
        counts.append(metric);
      }
      details.replaceChildren();
      for (const field of [
        "skippedReasons",
        "failedReasons",
        "failedChunkReasons",
      ]) {
        const reasons = record(entry[field]);
        for (const [reason, count] of Object.entries(reasons))
          details.append(element("p", "", `${reason}: ${String(count)}`));
      }
      note.setAttribute("role", "status");
      const listQuality = record(entry["listQuality"]);
      const qualityMessage =
        typeof listQuality["message"] === "string"
          ? listQuality["message"]
          : "";
      note.textContent = `${processed.toLocaleString()} of ${total.toLocaleString()} rows processed. ${status === "running" ? "Updates every 5 seconds." : status === "completed" ? "Import complete." : "Import needs attention."}${qualityMessage ? ` ${qualityMessage}` : ""}`;
      if (status === "running" && !disposed) {
        if (Date.now() < deadline)
          timer = setTimeout(() => {
            void poll();
          }, 5000);
        else note.textContent += " Monitoring paused. Refresh to continue.";
      }
    }
    async function poll() {
      if (disposed || busy) return;
      if (Date.now() >= deadline) {
        note.textContent = "Monitoring paused. Refresh to continue.";
        return;
      }
      clearTimeout(timer);
      busy = true;
      refresh.disabled = true;
      try {
        const response = await app.callServerTool({
          name: "get_subscriber_import",
          arguments: { companyId, importId },
        });
        if (!disposed) render(resultData(response));
      } catch (error) {
        if (!disposed) report(error);
      } finally {
        if (!disposed) {
          busy = false;
          refresh.disabled = false;
        }
      }
    }
    refresh.addEventListener("click", () => {
      deadline = Date.now() + 5 * 60_000;
      void poll();
    });
    render(data);
  }
  return () => {
    disposed = true;
    clearTimeout(timer);
    root.hidden = true;
    root.replaceChildren();
  };
}
