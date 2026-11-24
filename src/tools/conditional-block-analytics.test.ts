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

describe("conditional block analytics MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });
  it("routes get_conditional_block_stats across campaign, sequence_step, and transactional", async () => {
    mockApiRequest.mockClear();

    await handleToolCall("get_conditional_block_stats", {
      sourceType: "campaign",
      sourceId: "camp_1",
      abTestVariantId: "var_a",
      goalId: "default-revenue",
      period: "all",
      includeMachineEngagement: true,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/metrics/campaigns/camp_1/conditional-blocks?abTestVariantId=var_a&goalId=default-revenue&period=all&includeMachineEngagement=true",
      undefined,
      undefined
    );

    await handleToolCall("get_conditional_block_stats", {
      sourceType: "sequence",
      sourceId: "seq_1",
      period: "30d",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/metrics/sequences/seq_1/conditional-blocks?period=30d",
      undefined,
      undefined
    );

    await handleToolCall("get_conditional_block_stats", {
      sourceType: "sequence_step",
      sequenceId: "seq_1",
      sourceId: "node_1",
      period: "30d",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/metrics/sequences/seq_1/steps/node_1/conditional-blocks?period=30d",
      undefined,
      undefined
    );

    await handleToolCall("get_conditional_block_stats", {
      sourceType: "transactional",
      sourceId: "tx_1",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/metrics/transactional/tx_1/conditional-blocks",
      undefined,
      undefined
    );
  });

  it("routes list_conditional_block_subscribers and validates required sequenceId and branch", async () => {
    mockApiRequest.mockClear();

    await handleToolCall("list_conditional_block_subscribers", {
      sourceType: "campaign",
      sourceId: "camp_1",
      blockId: "cg_1",
      branch: "if",
      page: 2,
      limit: 25,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/metrics/campaigns/camp_1/conditional-blocks/cg_1/subscribers?branch=if&page=2&limit=25",
      undefined,
      undefined
    );

    const missingSeq = await handleToolCall("get_conditional_block_stats", {
      sourceType: "sequence_step",
      sourceId: "node_1",
    });
    expect(missingSeq.isError).toBe(true);

    const invalidBranch = await handleToolCall(
      "list_conditional_block_subscribers",
      {
        sourceType: "campaign",
        sourceId: "camp_1",
        blockId: "cg_1",
        branch: "bogus",
      }
    );
    expect(invalidBranch.isError).toBe(true);
  });
});
