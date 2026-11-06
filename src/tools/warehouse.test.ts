import { beforeEach, describe, expect, it, mock } from "bun:test";

type ApiRequestMock = (
  method: string,
  path: string,
  body?: unknown,
  companyIdOverride?: string
) => Promise<unknown>;

const mockApiRequest = mock<ApiRequestMock>(async () => ({ success: true }));

await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: mockApiRequest,
  apiUploadRequest: async () => undefined,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");
const { getToolsForProfile } = await import("./profiles.js");

const WAREHOUSE_TOOLS = [
  "list_warehouse_connections",
  "get_warehouse_connection",
  "create_warehouse_connection",
  "update_warehouse_connection",
  "delete_warehouse_connection",
  "test_warehouse_connection",
  "preview_warehouse_query",
  "list_warehouse_syncs",
  "get_warehouse_sync",
  "create_warehouse_sync",
  "update_warehouse_sync",
  "delete_warehouse_sync",
  "run_warehouse_sync",
  "list_warehouse_sync_runs",
];

function text(result: { content: { text: string }[] }) {
  return result.content.map((entry) => entry.text).join("\n");
}

beforeEach(() => {
  mockApiRequest.mockReset();
  mockApiRequest.mockResolvedValue({ success: true });
});

describe("warehouse tool definitions", () => {
  it("registers every tool with plain object schemas and correct hints", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    for (const name of WAREHOUSE_TOOLS) {
      const tool = byName.get(name);
      expect({ name, registered: tool !== undefined }).toEqual({
        name,
        registered: true,
      });
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
    }
    expect(byName.get("list_warehouse_syncs")?.annotations?.readOnlyHint).toBe(
      true
    );
    expect(
      byName.get("preview_warehouse_query")?.annotations?.openWorldHint
    ).toBe(true);
    expect(
      byName.get("delete_warehouse_sync")?.annotations?.destructiveHint
    ).toBe(true);
  });

  it("keeps credential and raw-row tools off the OpenAI-reviewed surface", () => {
    const names = new Set(
      getToolsForProfile(tools, "openai").map((tool) => tool.name)
    );
    expect(names.has("create_warehouse_connection")).toBe(false);
    expect(names.has("update_warehouse_connection")).toBe(false);
    expect(names.has("preview_warehouse_query")).toBe(false);
    expect(names.has("list_warehouse_syncs")).toBe(true);
  });
});

describe("warehouse tool handlers", () => {
  it("creates connections and syncs with the documented bodies", async () => {
    await handleToolCall("create_warehouse_connection", {
      companyId: "comp_1",
      name: "Snowflake",
      provider: "snowflake",
      config: { account: "myorg-acct", username: "READER" },
      credentials: { privateKey: "-----BEGIN PRIVATE KEY-----" },
    });
    await handleToolCall("create_warehouse_sync", {
      connectionId: "conn_1",
      name: "Customers",
      kind: "subscribers",
      query: "select email from customers",
      mapping: { emailColumn: "EMAIL" },
      cursorColumn: "UPDATED_AT",
      frequency: "hourly",
      listIds: ["list_1"],
      optInMode: "confirmed",
      triggerAutomations: false,
    });

    expect(mockApiRequest.mock.calls[0]).toEqual([
      "POST",
      "/api/v1/warehouse-connections",
      {
        name: "Snowflake",
        provider: "snowflake",
        config: { account: "myorg-acct", username: "READER" },
        credentials: { privateKey: "-----BEGIN PRIVATE KEY-----" },
      },
      "comp_1",
    ]);
    expect(mockApiRequest.mock.calls[1]).toEqual([
      "POST",
      "/api/v1/warehouse-syncs",
      {
        connectionId: "conn_1",
        name: "Customers",
        kind: "subscribers",
        query: "select email from customers",
        mapping: { emailColumn: "EMAIL" },
        cursorColumn: "UPDATED_AT",
        frequency: "hourly",
        listIds: ["list_1"],
        optInMode: "confirmed",
        triggerAutomations: false,
      },
      undefined,
    ]);
  });

  it.each([
    [
      "create_warehouse_connection",
      { name: "x", provider: "mysql", config: {}, credentials: {} },
      "`provider` must be one of",
    ],
    [
      "create_warehouse_connection",
      { name: "x", provider: "postgres", config: {} },
      "`credentials` is required",
    ],
    [
      "create_warehouse_connection",
      { name: "x", provider: "postgres", config: "h", credentials: {} },
      "`config` must be an object",
    ],
    ["update_warehouse_connection", { connectionId: "c" }, "Nothing to update"],
    ["preview_warehouse_query", { connectionId: "c" }, "`query` is required"],
    [
      "create_warehouse_sync",
      { connectionId: "c", name: "n", kind: "orders", query: "q", mapping: {} },
      "`kind` must be one of",
    ],
    [
      "create_warehouse_sync",
      {
        connectionId: "c",
        name: "n",
        kind: "events",
        query: "q",
        mapping: {},
        frequency: "yearly",
      },
      "`frequency` must be one of",
    ],
    [
      "create_warehouse_sync",
      {
        connectionId: "c",
        name: "n",
        kind: "events",
        query: "q",
        mapping: {},
        cursorColumn: 5,
      },
      "`cursorColumn` must be a string",
    ],
    [
      "update_warehouse_sync",
      { syncId: "s", isEnabled: "no" },
      "`isEnabled` must be a boolean",
    ],
    ["update_warehouse_sync", { syncId: "s" }, "Nothing to update"],
    [
      "run_warehouse_sync",
      { syncId: "s", fullResync: "yes" },
      "`fullResync` must be a boolean",
    ],
    [
      "list_warehouse_sync_runs",
      { syncId: "s", limit: 0 },
      "between 1 and 100",
    ],
  ])("%s rejects %j", async (name, args, message) => {
    const result = await handleToolCall(name, args);
    expect(result.isError).toBe(true);
    expect(text(result)).toContain(message);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("routes the remaining tools", async () => {
    await handleToolCall("list_warehouse_connections", {});
    await handleToolCall("get_warehouse_connection", { connectionId: "c1" });
    await handleToolCall("update_warehouse_connection", {
      connectionId: "c/1",
      name: "Renamed",
      config: { port: 5439 },
      credentials: { password: "x" },
    });
    await handleToolCall("delete_warehouse_connection", { connectionId: "c1" });
    await handleToolCall("test_warehouse_connection", { connectionId: "c1" });
    await handleToolCall("preview_warehouse_query", {
      connectionId: "c1",
      query: "select 1",
    });
    await handleToolCall("list_warehouse_syncs", { connectionId: "c 1" });
    await handleToolCall("list_warehouse_syncs", {});
    await handleToolCall("get_warehouse_sync", { syncId: "s1" });
    await handleToolCall("update_warehouse_sync", {
      syncId: "s1",
      name: "n",
      query: "select 2",
      mapping: { emailColumn: "e" },
      cursorColumn: "",
      isEnabled: false,
    });
    await handleToolCall("delete_warehouse_sync", { syncId: "s1" });
    await handleToolCall("run_warehouse_sync", {
      syncId: "s1",
      fullResync: true,
    });
    await handleToolCall("run_warehouse_sync", { syncId: "s1" });
    await handleToolCall("list_warehouse_sync_runs", {
      syncId: "s1",
      limit: 5,
    });
    await handleToolCall("list_warehouse_sync_runs", { syncId: "s1" });

    expect(
      mockApiRequest.mock.calls.map((call) => [call[0], call[1], call[2]])
    ).toEqual([
      ["GET", "/api/v1/warehouse-connections", undefined],
      ["GET", "/api/v1/warehouse-connections/c1", undefined],
      [
        "PATCH",
        "/api/v1/warehouse-connections/c%2F1",
        {
          name: "Renamed",
          config: { port: 5439 },
          credentials: { password: "x" },
        },
      ],
      ["DELETE", "/api/v1/warehouse-connections/c1", undefined],
      ["POST", "/api/v1/warehouse-connections/c1/test", undefined],
      [
        "POST",
        "/api/v1/warehouse-connections/c1/preview",
        { query: "select 1" },
      ],
      ["GET", "/api/v1/warehouse-syncs?connectionId=c%201", undefined],
      ["GET", "/api/v1/warehouse-syncs", undefined],
      ["GET", "/api/v1/warehouse-syncs/s1", undefined],
      [
        "PATCH",
        "/api/v1/warehouse-syncs/s1",
        {
          name: "n",
          query: "select 2",
          mapping: { emailColumn: "e" },
          cursorColumn: null,
          isEnabled: false,
        },
      ],
      ["DELETE", "/api/v1/warehouse-syncs/s1", undefined],
      ["POST", "/api/v1/warehouse-syncs/s1/run", { fullResync: true }],
      ["POST", "/api/v1/warehouse-syncs/s1/run", {}],
      ["GET", "/api/v1/warehouse-syncs/s1/runs?limit=5", undefined],
      ["GET", "/api/v1/warehouse-syncs/s1/runs", undefined],
    ]);
  });
});
