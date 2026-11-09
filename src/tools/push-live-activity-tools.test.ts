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
const { pushLiveActivityToolDefinitions } =
  await import("./definitions/push-live-activities.js");
const { getRequiredToolHints } = await import("./tool-hints.js");

const CONTENT_STATE = { status: "out_for_delivery", minutesAway: 8 };

describe("Live Activity MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true, tokenCount: 1 });
  });

  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    [
      "list_live_activities",
      {
        companyId: "c1",
        email: "jane@example.com",
        kind: "update",
        limit: 20,
      },
      "GET",
      "/api/v1/push/live-activities?email=jane%40example.com&kind=update&limit=20",
      undefined,
    ],
    [
      "list_live_activities",
      { companyId: "c1", platform: "android" },
      "GET",
      "/api/v1/push/live-activities?platform=android",
      undefined,
    ],
    [
      "start_live_activity",
      {
        companyId: "c1",
        email: "jane@example.com",
        activityType: "DeliveryAttributes",
        activityId: "order-1",
        attributes: { orderNumber: "1" },
        contentState: CONTENT_STATE,
        alert: { title: "On its way" },
        staleDate: "1760000000",
        relevanceScore: 10,
      },
      "POST",
      "/api/v1/push/live-activities/start",
      {
        email: "jane@example.com",
        activityType: "DeliveryAttributes",
        activityId: "order-1",
        attributes: { orderNumber: "1" },
        contentState: CONTENT_STATE,
        alert: { title: "On its way" },
        staleDate: "1760000000",
        relevanceScore: 10,
      },
    ],
    [
      "update_live_activity",
      {
        companyId: "c1",
        email: "jane@example.com",
        activityId: "order-1",
        contentState: CONTENT_STATE,
        priority: "low",
      },
      "POST",
      "/api/v1/push/live-activities/update",
      {
        email: "jane@example.com",
        activityId: "order-1",
        contentState: CONTENT_STATE,
        priority: "low",
      },
    ],
    [
      "end_live_activity",
      {
        companyId: "c1",
        activityId: "order-1",
        subscriberId: "sub_1",
        contentState: CONTENT_STATE,
        dismissalDate: "2026-10-20T18:00:00Z",
      },
      "POST",
      "/api/v1/push/live-activities/end",
      {
        subscriberId: "sub_1",
        activityId: "order-1",
        contentState: CONTENT_STATE,
        dismissalDate: "2026-10-20T18:00:00Z",
      },
    ],
    [
      "start_live_activity",
      {
        companyId: "c1",
        tag: "lakers-fan",
        activityType: "GameAttributes",
        activityId: "game-5521",
        contentState: { home: 0 },
        alert: { title: "Tip-off" },
      },
      "POST",
      "/api/v1/push/live-activities/start",
      {
        tag: "lakers-fan",
        activityType: "GameAttributes",
        activityId: "game-5521",
        contentState: { home: 0 },
        alert: { title: "Tip-off" },
      },
    ],
    [
      "start_live_activity",
      {
        companyId: "c1",
        segmentId: "seg_1",
        activityType: "GameAttributes",
        activityId: "game-5521",
        contentState: { home: 0 },
        alert: { title: "Tip-off" },
      },
      "POST",
      "/api/v1/push/live-activities/start",
      {
        segmentId: "seg_1",
        activityType: "GameAttributes",
        activityId: "game-5521",
        contentState: { home: 0 },
        alert: { title: "Tip-off" },
      },
    ],
    [
      "update_live_activity",
      {
        companyId: "c1",
        broadcast: true,
        activityId: "game-5521",
        contentState: { home: 24 },
      },
      "POST",
      "/api/v1/push/live-activities/update",
      { broadcast: true, activityId: "game-5521", contentState: { home: 24 } },
    ],
    [
      "end_live_activity",
      {
        companyId: "c1",
        broadcast: true,
        activityId: "game-5521",
        contentState: { home: 101 },
      },
      "POST",
      "/api/v1/push/live-activities/end",
      { broadcast: true, activityId: "game-5521", contentState: { home: 101 } },
    ],
  ];

  for (const [tool, args, method, path, body] of cases) {
    it(`${tool} calls ${method} ${path.split("?")[0]}`, async () => {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBeUndefined();
      expect(mockApiRequest).toHaveBeenCalledWith(method, path, body, "c1");
    });
  }

  it("covers every Live Activity tool and registers it", () => {
    const names = pushLiveActivityToolDefinitions.map((tool) => tool.name);
    expect(names.sort()).toEqual(
      [...new Set(cases.map(([tool]) => tool))].sort()
    );
    for (const name of names) {
      expect(tools.some((tool) => tool.name === name)).toBe(true);
      expect(OPENAI_EXCLUDED_TOOL_NAMES.has(name)).toBe(false);
    }
  });

  it("uses plain object input schemas without anyOf", () => {
    for (const tool of pushLiveActivityToolDefinitions) {
      expect(tool.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool.inputSchema)).not.toMatch(
        /"(anyOf|oneOf|allOf|not)"/
      );
    }
  });

  it("marks reads read-only and sends as open-world writes", () => {
    expect(getRequiredToolHints("list_live_activities")).toMatchObject({
      readOnlyHint: true,
      openWorldHint: false,
    });
    for (const name of [
      "start_live_activity",
      "update_live_activity",
      "end_live_activity",
    ]) {
      expect(getRequiredToolHints(name)).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true,
      });
    }
  });

  it("refuses a priority on starts, which always go at high priority", async () => {
    const result = await handleToolCall("start_live_activity", {
      companyId: "c1",
      email: "jane@example.com",
      activityType: "DeliveryAttributes",
      activityId: "order-1",
      contentState: CONTENT_STATE,
      alert: { title: "On its way" },
      priority: "low",
    });
    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("refuses update and end without a contact before calling the API", async () => {
    for (const tool of ["update_live_activity", "end_live_activity"]) {
      for (const target of [{}, { broadcast: false }]) {
        const result = await handleToolCall(tool, {
          companyId: "c1",
          activityId: "order-1",
          contentState: CONTENT_STATE,
          ...target,
        });
        expect(result.isError).toBe(true);
      }
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("refuses an end without final content", async () => {
    const result = await handleToolCall("end_live_activity", {
      companyId: "c1",
      email: "jane@example.com",
      activityId: "order-1",
    });
    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("refuses a start without a contact before calling the API", async () => {
    const result = await handleToolCall("start_live_activity", {
      companyId: "c1",
      activityType: "DeliveryAttributes",
      activityId: "order-1",
      contentState: CONTENT_STATE,
      alert: { title: "On its way" },
    });
    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
