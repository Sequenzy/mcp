/**
 * Side panel and full screen. The view declares both modes; the host reports
 * `fullscreen` for its side panel and for full screen alike, and only grants a
 * move from a click or key press, so the button requests it inside its own
 * click handler. Hosts without these modes never show the button.
 */
import type { AppBridge } from "./bridge";

export const AVAILABLE_DISPLAY_MODES = ["inline", "fullscreen"] as const;

export interface DisplayModeControl {
  /** Re-read the host context, e.g. after host-context-changed. */
  update(): void;
  /** Whether the current content benefits from more room. */
  setExpandable(value: boolean): void;
}

export function setupDisplayMode(
  app: Pick<AppBridge, "getHostContext" | "requestDisplayMode">,
  button: HTMLButtonElement,
  root: HTMLElement = document.documentElement
): DisplayModeControl {
  let expandable = false;
  const update = () => {
    const context = app.getHostContext();
    const mode = context?.displayMode ?? "inline";
    root.dataset["display"] = mode;
    // Fill the area only where the host sizes it; hosts that size the view
    // from its content report a maxHeight instead.
    const size = context?.["containerDimensions"];
    const fixed = size !== null && typeof size === "object" && "height" in size;
    if (fixed) root.dataset["fixedHeight"] = "";
    else delete root.dataset["fixedHeight"];
    const offered = context?.availableDisplayModes?.includes("fullscreen");
    button.hidden = !expandable || !offered || mode === "fullscreen";
  };
  button.addEventListener("click", () => {
    void app
      .requestDisplayMode("fullscreen")
      .catch(() => undefined)
      .then(update);
  });
  update();
  return {
    update,
    setExpandable(value) {
      expandable = value;
      update();
    },
  };
}
