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
    requestAnimationFrame: (callback: () => void) => setTimeout(callback, 0),
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
