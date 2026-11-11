/**
 * Minimal MCP Apps client for the preview widget. It speaks the same
 * JSON-RPC-over-postMessage protocol as `App` from
 * `@modelcontextprotocol/ext-apps` (ui/initialize handshake, host
 * notifications, size reporting, display modes, view tools, messages, ping
 * and teardown) without bundling the MCP client and zod, which made up most
 * of the widget's size.
 */

export const APP_PROTOCOL_VERSION = "2026-01-26";
const REQUEST_TIMEOUT_MS = 60_000;

export interface ToolResult {
  isError?: boolean;
  structuredContent?: unknown;
  content?: Array<{ type: string; text?: string }>;
}

export type DisplayMode = "inline" | "fullscreen" | "pip";

export interface HostContext {
  theme?: "light" | "dark";
  displayMode?: DisplayMode;
  availableDisplayModes?: DisplayMode[];
  [key: string]: unknown;
}

export interface HostCapabilities {
  message?: object;
  [key: string]: unknown;
}

/** What the view tells the host it supports, sent once in ui/initialize. */
export interface AppCapabilities {
  availableDisplayModes?: DisplayMode[];
  tools?: { listChanged?: boolean };
}

/** A tool the view itself offers to the host's model (an "app tool"). */
export interface ViewToolDefinition {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  annotations?: Record<string, boolean>;
}

interface JsonRpcMessage {
  jsonrpc: "2.0";
  id?: string | number;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
}

interface HostWindow {
  postMessage(message: unknown, targetOrigin: string): void;
}

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class AppBridge {
  ontoolinput?: (params: { arguments?: Record<string, unknown> }) => void;
  ontoolresult?: (result: ToolResult) => void;
  onhostcontextchanged?: (context: HostContext) => void;
  onteardown?: () => Promise<unknown> | unknown;
  /** Lists the view's tools when the host asks; omit to offer none. */
  onlisttools?: () => ViewToolDefinition[];
  oncalltool?: (
    name: string,
    args: Record<string, unknown>
  ) => Promise<ToolResult>;

  private hostContext: HostContext | undefined;
  private hostCapabilities: HostCapabilities | undefined;
  private nextId = 1;
  private readonly pending = new Map<string | number, Pending>();
  private readonly listener = (event: MessageEvent) => {
    if (event.source !== this.host) return;
    const message = event.data as JsonRpcMessage | null;
    if (message?.jsonrpc !== "2.0") return;
    void this.receive(message);
  };

  constructor(
    private readonly appInfo: { name: string; version: string },
    private readonly host: HostWindow = window.parent,
    private readonly appCapabilities: AppCapabilities = {}
  ) {}

  async connect(): Promise<void> {
    window.addEventListener("message", this.listener);
    const result = (await this.request("ui/initialize", {
      appCapabilities: this.appCapabilities,
      appInfo: this.appInfo,
      protocolVersion: APP_PROTOCOL_VERSION,
    })) as
      | { hostContext?: HostContext; hostCapabilities?: HostCapabilities }
      | undefined;
    this.hostContext = result?.hostContext;
    this.hostCapabilities = result?.hostCapabilities;
    this.notify("ui/notifications/initialized");
    this.reportSize();
  }

  getHostContext(): HostContext | undefined {
    return this.hostContext;
  }

  getHostCapabilities(): HostCapabilities | undefined {
    return this.hostCapabilities;
  }

  /**
   * Hosts grant fullscreen only from a recent click or key press in the view,
   * so call this directly inside the event handler. Resolves with the mode the
   * host actually set, which is the current one when it refuses.
   */
  async requestDisplayMode(mode: DisplayMode): Promise<DisplayMode> {
    const result = (await this.request("ui/request-display-mode", {
      mode,
    })) as { mode?: DisplayMode } | undefined;
    if (result?.mode)
      this.hostContext = { ...this.hostContext, displayMode: result.mode };
    return this.hostContext?.displayMode ?? "inline";
  }

  /** Sends a user message to the conversation, as if the user typed it. */
  async sendMessage(text: string): Promise<{ isError?: boolean }> {
    const result = (await this.request("ui/message", {
      role: "user",
      content: [{ type: "text", text }],
    })) as { isError?: boolean } | undefined;
    return result ?? {};
  }

  /** Tells the host to list the view's tools again. */
  sendToolListChanged(): void {
    if (this.appCapabilities.tools?.listChanged)
      this.notify("notifications/tools/list_changed");
  }

  async callServerTool(params: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<ToolResult> {
    return (await this.request("tools/call", params)) as ToolResult;
  }

  async updateModelContext(params: {
    content?: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
  }): Promise<void> {
    await this.request("ui/update-model-context", params);
  }

  private request(method: string, params: Record<string, unknown>) {
    const id = this.nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("The host did not respond in time."));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, { resolve, reject, timer });
      this.host.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
    });
  }

  private notify(method: string, params?: Record<string, unknown>) {
    this.host.postMessage(
      { jsonrpc: "2.0", method, ...(params ? { params } : {}) },
      "*"
    );
  }

  private respond(id: string | number, result: unknown) {
    this.host.postMessage({ jsonrpc: "2.0", id, result }, "*");
  }

  private async receive(message: JsonRpcMessage) {
    if (message.method === undefined) {
      const pending =
        message.id === undefined ? undefined : this.pending.get(message.id);
      if (!pending || message.id === undefined) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result);
      return;
    }

    const params = message.params ?? {};
    if (message.id === undefined) {
      if (message.method === "ui/notifications/tool-input")
        this.ontoolinput?.(params);
      else if (message.method === "ui/notifications/tool-result")
        this.ontoolresult?.(params);
      else if (message.method === "ui/notifications/host-context-changed") {
        this.hostContext = { ...this.hostContext, ...params };
        this.onhostcontextchanged?.(params);
      }
      return;
    }

    if (message.method === "ping") return this.respond(message.id, {});
    if (message.method === "tools/list" && this.appCapabilities.tools)
      return this.respond(message.id, { tools: this.onlisttools?.() ?? [] });
    if (message.method === "tools/call" && this.appCapabilities.tools)
      return this.respond(message.id, await this.callViewTool(params));
    if (message.method === "ui/resource-teardown") {
      await this.onteardown?.();
      window.removeEventListener("message", this.listener);
      return this.respond(message.id, {});
    }
    this.host.postMessage(
      {
        jsonrpc: "2.0",
        id: message.id,
        error: { code: -32601, message: `Method not found: ${message.method}` },
      },
      "*"
    );
  }

  private async callViewTool(
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const name = typeof params["name"] === "string" ? params["name"] : "";
    const args = params["arguments"];
    const failure = (text: string): ToolResult => ({
      isError: true,
      content: [{ type: "text", text }],
    });
    // The handler answers names it no longer lists too: a host can call a
    // tool from a list it has not refreshed yet, and a normal result keeps
    // the guidance that an error result might lose.
    const call = this.oncalltool;
    if (!call) return failure("This view offers no tools.");
    try {
      return await call(
        name,
        args !== null && typeof args === "object" && !Array.isArray(args)
          ? (args as Record<string, unknown>)
          : {}
      );
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : "The view could not do that."
      );
    }
  }

  /** Mirrors ext-apps autoResize: report the content size whenever it changes. */
  private reportSize() {
    let scheduled = false;
    let width = 0;
    let height = 0;
    const measure = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        const root = document.documentElement;
        const previous = root.style.height;
        root.style.height = "max-content";
        const nextHeight = Math.ceil(root.getBoundingClientRect().height);
        root.style.height = previous;
        const nextWidth = Math.ceil(window.innerWidth);
        if (nextWidth === width && nextHeight === height) return;
        width = nextWidth;
        height = nextHeight;
        this.notify("ui/notifications/size-changed", { width, height });
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.documentElement);
    observer.observe(document.body);
  }
}
