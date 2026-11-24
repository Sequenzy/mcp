import { beforeEach, describe, expect, it, mock } from "bun:test";

type ApiRequestMock = (
  method: string,
  path: string,
  body?: unknown,
  companyId?: string
) => Promise<unknown>;

const mockApiRequest = mock<ApiRequestMock>(async () => ({ success: true }));

await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: mockApiRequest,
  apiUploadRequest: mock(async () => ({ success: true })),
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall } = await import("./index.js");

describe("sequence path analytics MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("routes get_sequence_path_stats and list_sequence_path_subscribers with query validation", async () => {
    await handleToolCall("get_sequence_path_stats", {
      sequenceId: "seq_1",
      goalId: "default-revenue",
      conversionWindowDays: 14,
      period: "30d",
      nodeIds: ["n1", "n2"],
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/api/v1/metrics/sequences/seq_1/outcomes?goalId=default-revenue&conversionWindowDays=14&period=30d&nodeId=n1%2Cn2",
      undefined,
      undefined
    );

    await handleToolCall("list_sequence_path_subscribers", {
      sequenceId: "seq_1",
      nodeId: "n_branch",
      pathId: "b_vip",
      eventName: "upgraded",
      conversionWindowDays: 7,
      page: 2,
      limit: 25,
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/api/v1/metrics/sequences/seq_1/paths/n_branch/subscribers?pathId=b_vip&eventName=upgraded&conversionWindowDays=7&page=2&limit=25",
      undefined,
      undefined
    );

    const invalidResult = await handleToolCall("get_sequence_path_stats", {
      sequenceId: "seq_1",
      goalId: "g1",
      eventName: "upgraded",
    });
    expect(invalidResult.isError).toBe(true);
    expect(JSON.stringify(invalidResult.content)).toContain("not both");
  });
});
