import { afterEach, beforeEach, expect, it } from "bun:test";
import { Window } from "happy-dom";

import { APP_PROTOCOL_VERSION, AppBridge } from "./bridge";

const GLOBALS = [
  "window",
  "document",
  "requestAnimationFrame",
  "ResizeObserver",
] as const;
const originals = new Map<string, PropertyDescriptor | undefined>();
let browser: Window;
// Frames still queued when a test ends would run after afterEach removes the
// fake document, failing whichever test file Bun runs next in this process.
const pendingFrames = new Set<ReturnType<typeof setTimeout>>();
let sent: Array<Record<string, unknown>>;
const host = {
  postMessage(message: unknown) {
    sent.push(message as Record<string, unknown>);
  },
};

function deliver(data: unknown, source: unknown = host) {
  browser.dispatchEvent(
    new browser.MessageEvent("message", {
      data,
      source: source as never,
    })
  );
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

async function connected() {
  const app = new AppBridge({ name: "test", version: "1" }, host);
  const connecting = app.connect();
  await tick();
  const initialize = sent.find((m) => m["method"] === "ui/initialize");
  deliver({
    jsonrpc: "2.0",
    id: initialize?.["id"],
    result: { hostContext: { theme: "dark" } },
  });
  await connecting;
  return app;
}

beforeEach(() => {
  browser = new Window();
  sent = [];
  for (const name of GLOBALS) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  const values = {
    window: browser,
    document: browser.document,
    requestAnimationFrame: (callback: () => void) => {
      const frame = setTimeout(() => {
        pendingFrames.delete(frame);
        callback();
      }, 0);
      pendingFrames.add(frame);
      return frame;
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {}
    },
  };
  for (const name of GLOBALS) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      value: values[name],
    });
  }
});

afterEach(() => {
  for (const frame of pendingFrames) clearTimeout(frame);
  pendingFrames.clear();
  for (const name of GLOBALS) {
    const original = originals.get(name);
    if (original) Object.defineProperty(globalThis, name, original);
    else delete (globalThis as Record<string, unknown>)[name];
  }
});

it("completes the ui/initialize handshake and reports its size", async () => {
  const app = await connected();
  expect(sent[0]).toMatchObject({
    jsonrpc: "2.0",
    method: "ui/initialize",
    params: {
      appInfo: { name: "test", version: "1" },
      protocolVersion: APP_PROTOCOL_VERSION,
    },
  });
  expect(sent[1]).toEqual({
    jsonrpc: "2.0",
    method: "ui/notifications/initialized",
  });
  expect(app.getHostContext()?.theme).toBe("dark");
  await tick();
  expect(
    sent.some((m) => m["method"] === "ui/notifications/size-changed")
  ).toBe(true);
});

it("dispatches host notifications and ignores other windows", async () => {
  const app = await connected();
  const results: unknown[] = [];
  const inputs: unknown[] = [];
  const themes: unknown[] = [];
  app.ontoolresult = (result) => results.push(result);
  app.ontoolinput = (params) => inputs.push(params.arguments);
  app.onhostcontextchanged = (context) => themes.push(context.theme);

  const result = { structuredContent: { html: "<p>Hi</p>" } };
  deliver(
    { jsonrpc: "2.0", method: "ui/notifications/tool-result", params: result },
    { postMessage() {} }
  );
  deliver({
    jsonrpc: "2.0",
    method: "ui/notifications/tool-result",
    params: result,
  });
  deliver({
    jsonrpc: "2.0",
    method: "ui/notifications/tool-input",
    params: { arguments: { campaignId: "c1" } },
  });
  deliver({
    jsonrpc: "2.0",
    method: "ui/notifications/host-context-changed",
    params: { theme: "light" },
  });
  await tick();

  expect(results).toEqual([result]);
  expect(inputs).toEqual([{ campaignId: "c1" }]);
  expect(themes).toEqual(["light"]);
  expect(app.getHostContext()?.theme).toBe("light");
});

it("calls server tools through the host and surfaces errors", async () => {
  const app = await connected();
  const call = app.callServerTool({
    name: "render_email",
    arguments: { campaignId: "c1" },
  });
  const request = sent.find((m) => m["method"] === "tools/call");
  expect(request?.["params"]).toEqual({
    name: "render_email",
    arguments: { campaignId: "c1" },
  });
  deliver({
    jsonrpc: "2.0",
    id: request?.["id"],
    result: { structuredContent: { ok: true } },
  });
  expect(await call).toEqual({ structuredContent: { ok: true } });

  const failing = app.updateModelContext({
    content: [{ type: "text", text: "x" }],
  });
  const update = sent.find((m) => m["method"] === "ui/update-model-context");
  deliver({
    jsonrpc: "2.0",
    id: update?.["id"],
    error: { code: -32603, message: "Host refused" },
  });
  expect(await failing.catch((error: Error) => error.message)).toBe(
    "Host refused"
  );
});

it("answers ping, teardown and unknown host requests", async () => {
  const app = await connected();
  let tornDown = false;
  app.onteardown = () => {
    tornDown = true;
  };
  deliver({ jsonrpc: "2.0", id: "p", method: "ping", params: {} });
  deliver({ jsonrpc: "2.0", id: "u", method: "ui/unknown", params: {} });
  deliver({
    jsonrpc: "2.0",
    id: "t",
    method: "ui/resource-teardown",
    params: {},
  });
  await tick();

  expect(sent).toContainEqual({ jsonrpc: "2.0", id: "p", result: {} });
  expect(sent).toContainEqual({
    jsonrpc: "2.0",
    id: "u",
    error: { code: -32601, message: "Method not found: ui/unknown" },
  });
  expect(sent).toContainEqual({ jsonrpc: "2.0", id: "t", result: {} });
  expect(tornDown).toBe(true);
});

async function connectedWith(
  capabilities: ConstructorParameters<typeof AppBridge>[2],
  result: Record<string, unknown> = {}
) {
  const app = new AppBridge({ name: "test", version: "1" }, host, capabilities);
  const connecting = app.connect();
  await tick();
  const initialize = sent.find((m) => m["method"] === "ui/initialize");
  deliver({ jsonrpc: "2.0", id: initialize?.["id"], result });
  await connecting;
  return { app, initialize };
}

const answer = (id: unknown) =>
  sent.find((m) => m["id"] === id && !m["method"]);

it("declares display modes and view tools, and keeps host capabilities", async () => {
  const { app, initialize } = await connectedWith(
    {
      availableDisplayModes: ["inline", "fullscreen"],
      tools: { listChanged: true },
    },
    {
      hostContext: {
        displayMode: "inline",
        availableDisplayModes: ["inline", "fullscreen"],
      },
      hostCapabilities: { message: {} },
    }
  );
  expect(initialize?.["params"]).toMatchObject({
    appCapabilities: {
      availableDisplayModes: ["inline", "fullscreen"],
      tools: { listChanged: true },
    },
  });
  expect(app.getHostCapabilities()).toEqual({ message: {} });
  expect(app.getHostContext()?.availableDisplayModes).toEqual([
    "inline",
    "fullscreen",
  ]);
});

it("requests a display mode and reports the mode the host set", async () => {
  const { app } = await connectedWith(
    {},
    { hostContext: { displayMode: "inline" } }
  );
  const granted = app.requestDisplayMode("fullscreen");
  const request = sent.find((m) => m["method"] === "ui/request-display-mode");
  expect(request?.["params"]).toEqual({ mode: "fullscreen" });
  deliver({
    jsonrpc: "2.0",
    id: request?.["id"],
    result: { mode: "fullscreen" },
  });
  expect(await granted).toBe("fullscreen");

  // A refusal leaves the view where it is, which is now fullscreen.
  const refused = app.requestDisplayMode("inline");
  const second = sent.filter(
    (m) => m["method"] === "ui/request-display-mode"
  )[1];
  deliver({ jsonrpc: "2.0", id: second?.["id"], result: {} });
  expect(await refused).toBe("fullscreen");
});

it("sends a user message to the conversation", async () => {
  const { app } = await connectedWith({});
  const sending = app.sendMessage("Review this email");
  const request = sent.find((m) => m["method"] === "ui/message");
  expect(request?.["params"]).toEqual({
    role: "user",
    content: [{ type: "text", text: "Review this email" }],
  });
  deliver({ jsonrpc: "2.0", id: request?.["id"], result: {} });
  expect(await sending).toEqual({});
});

it("lists and runs view tools for the host, and reports failures as results", async () => {
  const { app } = await connectedWith({ tools: { listChanged: true } });
  const tool = {
    name: "reload_view",
    title: "Reload",
    description: "Reload.",
    inputSchema: { type: "object" as const, properties: {} },
  };
  const calls: unknown[] = [];
  app.onlisttools = () => [tool];
  app.oncalltool = async (name, args) => {
    calls.push([name, args]);
    if (args["boom"]) throw new Error("Render failed");
    return { content: [{ type: "text", text: "Reloaded." }] };
  };

  deliver({ jsonrpc: "2.0", id: "l", method: "tools/list", params: {} });
  deliver({
    jsonrpc: "2.0",
    id: "c",
    method: "tools/call",
    params: { name: "reload_view", arguments: { a: 1 } },
  });
  deliver({
    jsonrpc: "2.0",
    id: "x",
    method: "tools/call",
    params: { name: "reload_view", arguments: { boom: true } },
  });
  deliver({
    jsonrpc: "2.0",
    id: "m",
    method: "tools/call",
    params: { name: "delete_everything", arguments: {} },
  });
  deliver({
    jsonrpc: "2.0",
    id: "n",
    method: "tools/call",
    params: { name: "reload_view", arguments: ["not", "an", "object"] },
  });
  await tick();

  expect(answer("l")?.["result"]).toEqual({ tools: [tool] });
  expect(answer("c")?.["result"]).toEqual({
    content: [{ type: "text", text: "Reloaded." }],
  });
  expect(answer("x")?.["result"]).toEqual({
    isError: true,
    content: [{ type: "text", text: "Render failed" }],
  });
  // Unlisted names still reach the handler, which answers with guidance.
  expect(answer("m")?.["result"]).toEqual({
    content: [{ type: "text", text: "Reloaded." }],
  });
  expect(calls).toEqual([
    ["reload_view", { a: 1 }],
    ["reload_view", { boom: true }],
    ["delete_everything", {}],
    ["reload_view", {}],
  ]);

  app.sendToolListChanged();
  expect(sent.at(-1)).toEqual({
    jsonrpc: "2.0",
    method: "notifications/tools/list_changed",
  });
});

it("offers no view tools unless it declared them", async () => {
  const { app } = await connectedWith({});
  app.onlisttools = () => [];
  deliver({ jsonrpc: "2.0", id: "l", method: "tools/list", params: {} });
  await tick();
  expect(answer("l")?.["error"]).toEqual({
    code: -32601,
    message: "Method not found: tools/list",
  });
  const before = sent.length;
  app.sendToolListChanged();
  expect(sent).toHaveLength(before);
});

it("answers a tool call with an error result when the view has no handler", async () => {
  await connectedWith({ tools: { listChanged: true } });
  deliver({
    jsonrpc: "2.0",
    id: "h",
    method: "tools/call",
    params: { name: "reload_view", arguments: {} },
  });
  await tick();
  expect(answer("h")?.["result"]).toEqual({
    isError: true,
    content: [{ type: "text", text: "This view offers no tools." }],
  });
});

it("remembers the display mode the host granted", async () => {
  const { app } = await connectedWith(
    {},
    { hostContext: { displayMode: "inline" } }
  );
  const granted = app.requestDisplayMode("fullscreen");
  const request = sent.find((m) => m["method"] === "ui/request-display-mode");
  deliver({
    jsonrpc: "2.0",
    id: request?.["id"],
    result: { mode: "fullscreen" },
  });
  await granted;
  expect(app.getHostContext()?.displayMode).toBe("fullscreen");
});
