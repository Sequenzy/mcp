import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import { Window } from "happy-dom";

import type { HostContext } from "./bridge";
import { setupDisplayMode } from "./display-mode";

const original = Object.getOwnPropertyDescriptor(globalThis, "document");
let window: Window;
beforeEach(() => {
  window = new Window();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: window.document,
  });
});
afterEach(async () => {
  if (original) Object.defineProperty(globalThis, "document", original);
  else Reflect.deleteProperty(globalThis, "document");
  await window.happyDOM.close();
});

function setup(context: HostContext | undefined) {
  let current = context;
  const requestDisplayMode = mock(async () => {
    current = { ...current, displayMode: "fullscreen" };
    return "fullscreen" as const;
  });
  const button = document.createElement("button");
  const root = document.createElement("div");
  const control = setupDisplayMode(
    { getHostContext: () => current, requestDisplayMode },
    button,
    root
  );
  return {
    button,
    root,
    control,
    requestDisplayMode,
    setContext(next: HostContext) {
      current = next;
      control.update();
    },
  };
}

it("offers a larger view only for content that wants one, where the host has it", () => {
  const offered = setup({
    displayMode: "inline",
    availableDisplayModes: ["inline", "fullscreen"],
  });
  expect(offered.button.hidden).toBe(true);
  offered.control.setExpandable(true);
  expect(offered.button.hidden).toBe(false);
  expect(offered.root.dataset["display"]).toBe("inline");

  for (const context of [
    undefined,
    { displayMode: "inline" as const },
    {
      displayMode: "inline" as const,
      availableDisplayModes: ["inline" as const],
    },
  ]) {
    const { button, control } = setup(context);
    control.setExpandable(true);
    expect(button.hidden).toBe(true);
  }
});

it("requests fullscreen from the click and hides once the host moves the view", async () => {
  const { button, control, requestDisplayMode, root, setContext } = setup({
    displayMode: "inline",
    availableDisplayModes: ["inline", "fullscreen"],
  });
  control.setExpandable(true);
  button.click();
  expect(requestDisplayMode).toHaveBeenCalledWith("fullscreen");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(button.hidden).toBe(true);
  expect(root.dataset["display"]).toBe("fullscreen");

  setContext({
    displayMode: "inline",
    availableDisplayModes: ["inline", "fullscreen"],
  });
  expect(button.hidden).toBe(false);
});

it("stays usable when the host rejects the request", async () => {
  const { button, control, requestDisplayMode } = setup({
    displayMode: "inline",
    availableDisplayModes: ["inline", "fullscreen"],
  });
  requestDisplayMode.mockImplementation(async () => {
    throw new Error("Invalid params");
  });
  control.setExpandable(true);
  button.click();
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(button.hidden).toBe(false);
});

it("fills the area only where the host fixes its height", () => {
  const { control, root, setContext } = setup({ displayMode: "inline" });
  control.update();
  expect(root.dataset["fixedHeight"]).toBeUndefined();
  setContext({
    displayMode: "fullscreen",
    containerDimensions: { width: 800, height: 700 },
  });
  expect(root.dataset["fixedHeight"]).toBe("");
  setContext({
    displayMode: "fullscreen",
    containerDimensions: { width: 800, maxHeight: 700 },
  });
  expect(root.dataset["fixedHeight"]).toBeUndefined();
});
