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
const { inAppCampaignToolDefinitions } =
  await import("./definitions/in-app-campaigns.js");
const { READ_ONLY_TOOL_NAMES } = await import("./tool-hints.js");

const MESSAGE = { kind: "message", format: "modal", title: "Hi" };

describe("in-app campaign MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    [
      "list_in_app_campaigns",
      { companyId: "c1", status: "sent", limit: 5 },
      "GET",
      "/api/v1/in-app/campaigns?status=sent&limit=5",
      undefined,
    ],
    [
      "get_in_app_campaign",
      { companyId: "c1", campaignId: "a/b" },
      "GET",
      "/api/v1/in-app/campaigns/a%2Fb",
      undefined,
    ],
    [
      "create_in_app_campaign",
      {
        companyId: "c1",
        name: "Launch",
        message: MESSAGE,
        priority: "high",
        endsAt: "2026-12-01T00:00:00Z",
        targetLists: { type: "all" },
      },
      "POST",
      "/api/v1/in-app/campaigns",
      {
        name: "Launch",
        message: MESSAGE,
        priority: "high",
        endsAt: "2026-12-01T00:00:00Z",
        targetLists: { type: "all" },
      },
    ],
    [
      "update_in_app_campaign",
      { companyId: "c1", campaignId: "cmp", endsAt: null },
      "PATCH",
      "/api/v1/in-app/campaigns/cmp",
      { endsAt: null },
    ],
    [
      "estimate_in_app_campaign_recipients",
      { companyId: "c1", targetLists: { type: "all" } },
      "POST",
      "/api/v1/in-app/campaigns/estimate",
      { targetLists: { type: "all" } },
    ],
    [
      "send_in_app_campaign",
      {
        companyId: "c1",
        campaignId: "cmp",
        scheduledAt: "2026-12-01T09:00:00Z",
      },
      "POST",
      "/api/v1/in-app/campaigns/cmp/send",
      { scheduledAt: "2026-12-01T09:00:00Z" },
    ],
    [
      "unschedule_in_app_campaign",
      { companyId: "c1", campaignId: "cmp" },
      "POST",
      "/api/v1/in-app/campaigns/cmp/unschedule",
      undefined,
    ],
    [
      "stop_in_app_campaign",
      { companyId: "c1", campaignId: "cmp" },
      "POST",
      "/api/v1/in-app/campaigns/cmp/stop",
      undefined,
    ],
    [
      "duplicate_in_app_campaign",
      { companyId: "c1", campaignId: "cmp", name: "Copy" },
      "POST",
      "/api/v1/in-app/campaigns/cmp/duplicate",
      { name: "Copy" },
    ],
    [
      "get_in_app_campaign_stats",
      { companyId: "c1", campaignId: "cmp" },
      "GET",
      "/api/v1/in-app/campaigns/cmp/stats",
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

  it("covers every in-app campaign tool, with plain object schemas", () => {
    const names = inAppCampaignToolDefinitions.map((tool) => tool.name);
    expect(names.sort()).toEqual(cases.map(([tool]) => tool).sort());
    for (const definition of inAppCampaignToolDefinitions) {
      const registered = tools.find((tool) => tool.name === definition.name);
      expect(registered).toBeDefined();
      expect(definition.inputSchema.type).toBe("object");
      expect(JSON.stringify(definition.inputSchema)).not.toContain("anyOf");
    }
  });

  it("marks only the reads read-only", () => {
    expect(
      inAppCampaignToolDefinitions
        .map((tool) => tool.name)
        .filter((name) => READ_ONLY_TOOL_NAMES.has(name))
        .sort()
    ).toEqual([
      "estimate_in_app_campaign_recipients",
      "get_in_app_campaign",
      "get_in_app_campaign_stats",
      "list_in_app_campaigns",
    ]);
  });

  it("validates required inputs before calling the API", async () => {
    for (const [tool, args] of [
      ["get_in_app_campaign", { companyId: "c1" }],
      ["send_in_app_campaign", { companyId: "c1" }],
      ["estimate_in_app_campaign_recipients", { companyId: "c1" }],
    ] as const) {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
