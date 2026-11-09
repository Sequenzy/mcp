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
const { getToolsForProfile } = await import("./profiles.js");
const { inAppPlacementToolDefinitions } =
  await import("./definitions/in-app-placements.js");

describe("in-app placement MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    [
      "list_in_app_placements",
      { companyId: "c1" },
      "GET",
      "/api/v1/in-app/placements",
      undefined,
    ],
    [
      "get_in_app_placement",
      { companyId: "c1", key: "home_hero" },
      "GET",
      "/api/v1/in-app/placements/home_hero",
      undefined,
    ],
    [
      "create_in_app_placement",
      {
        companyId: "c1",
        key: "home_hero",
        name: "Home hero",
        width: 360,
        height: null,
      },
      "POST",
      "/api/v1/in-app/placements",
      { key: "home_hero", name: "Home hero", width: 360, height: null },
    ],
    [
      "update_in_app_placement",
      { companyId: "c1", key: "home_hero", description: "Top of home" },
      "PATCH",
      "/api/v1/in-app/placements/home_hero",
      { description: "Top of home" },
    ],
    [
      "delete_in_app_placement",
      { companyId: "c1", key: "home_hero" },
      "DELETE",
      "/api/v1/in-app/placements/home_hero",
      undefined,
    ],
    [
      "get_in_app_placement_content",
      {
        companyId: "c1",
        externalId: "user_42",
        placements: ["home_hero", "sidebar"],
      },
      "GET",
      "/api/v1/in-app/placement-feed?externalId=user_42&placements=home_hero%2Csidebar",
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

  it("covers every placement tool on both profiles", () => {
    const names = inAppPlacementToolDefinitions.map((tool) => tool.name);
    expect(names.sort()).toEqual(cases.map(([tool]) => tool).sort());
    const openAiNames = new Set(
      getToolsForProfile(tools, "openai").map((tool) => tool.name)
    );
    for (const name of names) {
      expect(tools.some((tool) => tool.name === name)).toBe(true);
      expect(openAiNames.has(name)).toBe(true);
    }
  });

  it("validates required inputs before calling the API", async () => {
    for (const [tool, args] of [
      ["get_in_app_placement", { companyId: "c1" }],
      ["create_in_app_placement", { companyId: "c1", key: "home_hero" }],
      ["update_in_app_placement", { companyId: "c1", key: "home_hero" }],
      ["delete_in_app_placement", { companyId: "c1" }],
      [
        "get_in_app_placement_content",
        { companyId: "c1", placements: ["home_hero"] },
      ],
      [
        "get_in_app_placement_content",
        { companyId: "c1", email: "ava@example.com", placements: [] },
      ],
    ] as const) {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("inserts placement steps into sequences", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });
    const result = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "in_app",
      afterNodeId: "n1",
      kind: "placement",
      placement: "home_hero",
      priority: "high",
      title: "Upgrade to Pro",
    });
    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/s1",
      {
        insertSteps: {
          afterNodeId: "n1",
          steps: [
            {
              type: "in_app",
              kind: "placement",
              placement: "home_hero",
              priority: "high",
              title: "Upgrade to Pro",
            },
          ],
        },
      },
      "c1"
    );
  });

  it("keeps MCP input schemas plain objects", () => {
    for (const tool of inAppPlacementToolDefinitions) {
      expect(tool.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool.inputSchema)).not.toContain("anyOf");
    }
  });
});
