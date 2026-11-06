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
  apiUploadRequest: mock(async () => undefined),
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");
const { OPENAI_EXCLUDED_TOOL_NAMES } = await import("./openai-profile.js");
const { pushImportToolDefinitions } =
  await import("./definitions/push-imports.js");

describe("push import MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    [
      "get_push_import_preflight",
      { companyId: "c1", source: "onesignal", platforms: ["ios"] },
      "GET",
      "/api/v1/push/imports/preflight?source=onesignal&platforms=ios",
      undefined,
    ],
    [
      "list_push_imports",
      { companyId: "c1", limit: 5 },
      "GET",
      "/api/v1/push/imports?limit=5",
      undefined,
    ],
    [
      "get_push_import",
      { companyId: "c1", importId: "i/1" },
      "GET",
      "/api/v1/push/imports/i%2F1",
      undefined,
    ],
    [
      "create_push_import",
      {
        companyId: "c1",
        source: "braze",
        apiKey: "k",
        brazeRestEndpoint: "rest.iad-01.braze.com",
        brazeSegmentId: "s",
        platforms: ["android"],
      },
      "POST",
      "/api/v1/push/imports",
      {
        source: "braze",
        apiKey: "k",
        brazeRestEndpoint: "rest.iad-01.braze.com",
        brazeSegmentId: "s",
        platforms: ["android"],
      },
    ],
    [
      "add_push_import_rows",
      { companyId: "c1", importId: "i1", csv: "token,platform" },
      "POST",
      "/api/v1/push/imports/i1/rows",
      { csv: "token,platform" },
    ],
    [
      "start_push_import",
      { companyId: "c1", importId: "i1" },
      "POST",
      "/api/v1/push/imports/i1/start",
      undefined,
    ],
    [
      "cancel_push_import",
      { companyId: "c1", importId: "i1" },
      "POST",
      "/api/v1/push/imports/i1/cancel",
      undefined,
    ],
  ];

  for (const [tool, args, method, path, body] of cases) {
    it(`${tool} calls ${method} ${path.split("?")[0]}`, async () => {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBeUndefined();
      expect(mockApiRequest).toHaveBeenCalledWith(method, path, body, "c1");
    });
  }

  it("covers every push import tool with plain object schemas", () => {
    const names = pushImportToolDefinitions.map((tool) => tool.name);
    expect(names.sort()).toEqual(cases.map(([tool]) => tool).sort());
    for (const definition of pushImportToolDefinitions) {
      expect(tools.some((tool) => tool.name === definition.name)).toBe(true);
      expect(definition.inputSchema.type).toBe("object");
      expect(JSON.stringify(definition.inputSchema)).not.toMatch(
        /anyOf|oneOf|allOf/
      );
    }
  });

  it("validates required inputs before calling the API", async () => {
    for (const [tool, args] of [
      ["get_push_import_preflight", { companyId: "c1" }],
      ["create_push_import", { companyId: "c1" }],
      ["get_push_import", { companyId: "c1" }],
      ["add_push_import_rows", { companyId: "c1", importId: "i1" }],
    ] as const) {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("keeps the tools that take source API keys or CSV off the OpenAI surface", () => {
    expect(OPENAI_EXCLUDED_TOOL_NAMES.has("create_push_import")).toBe(true);
    expect(OPENAI_EXCLUDED_TOOL_NAMES.has("add_push_import_rows")).toBe(true);
    expect(OPENAI_EXCLUDED_TOOL_NAMES.has("get_push_import")).toBe(false);
  });
});
