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

beforeEach(() => {
  mockApiRequest.mockClear();
  mockApiRequest.mockImplementation(async () => ({ success: true }));
});

describe("get_send_schedule", () => {
  it("is registered as a read-only tool", () => {
    const tool = tools.find((entry) => entry.name === "get_send_schedule");
    expect(tool).toBeDefined();
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.outputSchema?.properties).toHaveProperty("activeSequences");
  });

  it("requests the schedule feed with range and timezone", async () => {
    await handleToolCall("get_send_schedule", {
      from: "2026-07-01T00:00:00Z",
      to: "2026-07-31T23:59:59Z",
      timezone: "Europe/Kyiv",
    });

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    const [method, path, body, companyId] = mockApiRequest.mock.calls[0] ?? [];
    expect(method).toBe("GET");
    expect(path).toContain("/api/v1/schedule?");
    expect(path).toContain("from=2026-07-01T00%3A00%3A00Z");
    expect(path).toContain("timezone=Europe%2FKyiv");
    expect(body).toBeUndefined();
    expect(companyId).toBeUndefined();
  });

  it("requires from and to", async () => {
    const result = await handleToolCall("get_send_schedule", {});
    expect(result.isError).toBe(true);
  });
});

describe("get_schedule_overlap", () => {
  it("is registered as a read-only tool", () => {
    const tool = tools.find((entry) => entry.name === "get_schedule_overlap");
    expect(tool).toBeDefined();
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });

  it("requests the conflict endpoint with flattened targets", async () => {
    await handleToolCall("get_schedule_overlap", {
      itemA: { type: "campaign", campaignId: "camp-1" },
      itemB: {
        type: "sequence",
        automationId: "auto-1",
        from: "2026-07-20T08:00:00Z",
        to: "2026-07-20T18:00:00Z",
      },
    });

    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    const [method, path] = mockApiRequest.mock.calls[0] ?? [];
    expect(method).toBe("GET");
    expect(path).toContain("/api/v1/schedule/conflict?");
    expect(path).toContain("aType=campaign");
    expect(path).toContain("aCampaignId=camp-1");
    expect(path).toContain("bType=sequence");
    expect(path).toContain("bAutomationId=auto-1");
    expect(path).toContain("bFrom=2026-07-20T08%3A00%3A00Z");
  });

  it("rejects malformed targets", async () => {
    const result = await handleToolCall("get_schedule_overlap", {
      itemA: { type: "campaign" },
      itemB: { type: "campaign", campaignId: "camp-2" },
    });
    expect(result.isError).toBe(true);
  });

  it("supports direct transactional volume targets", async () => {
    await handleToolCall("get_schedule_overlap", {
      itemA: { type: "campaign", campaignId: "camp-1" },
      itemB: {
        type: "transactional",
        transactionalEmailId: null,
        from: "2026-07-20T08:00:00Z",
        to: "2026-07-20T18:00:00Z",
      },
    });

    const [, path] = mockApiRequest.mock.calls[0] ?? [];
    expect(path).toContain("bType=transactional");
    expect(path).not.toContain("bTransactionalEmailId");
    expect(path).toContain("bFrom=2026-07-20T08%3A00%3A00Z");
  });
});
