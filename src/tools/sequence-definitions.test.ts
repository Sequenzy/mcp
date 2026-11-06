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

describe("sequence definition tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("keeps plain object input schemas", () => {
    for (const name of [
      "get_sequence_definition",
      "push_sequence_definition",
    ]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
    }
  });

  it("reads by key or by sequence id", async () => {
    await handleToolCall("get_sequence_definition", { key: "onboarding" });
    await handleToolCall("get_sequence_definition", {
      sequenceId: "seq_1",
      companyId: "comp_1",
    });
    expect(mockApiRequest.mock.calls[0]?.slice(0, 2)).toEqual([
      "GET",
      "/api/v1/sequences/definitions/onboarding",
    ]);
    expect(mockApiRequest.mock.calls[1]).toEqual([
      "GET",
      "/api/v1/sequences/seq_1/definition",
      undefined,
      "comp_1",
    ]);
  });

  it("rejects reads that name neither or both identifiers", async () => {
    const neither = await handleToolCall("get_sequence_definition", {});
    const both = await handleToolCall("get_sequence_definition", {
      key: "onboarding",
      sequenceId: "seq_1",
    });
    for (const result of [neither, both]) {
      expect(JSON.stringify(result)).toContain(
        "exactly one of key or sequenceId"
      );
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("pushes the document with dry-run and live-change flags as query parameters", async () => {
    const definition = { name: "Onboarding", steps: [], connections: [] };
    await handleToolCall("push_sequence_definition", {
      key: "onboarding",
      definition,
      dryRun: true,
    });
    await handleToolCall("push_sequence_definition", {
      key: "onboarding",
      definition,
      confirmLiveChange: true,
    });
    expect(mockApiRequest.mock.calls[0]?.slice(0, 3)).toEqual([
      "PUT",
      "/api/v1/sequences/definitions/onboarding?dryRun=true",
      definition,
    ]);
    expect(mockApiRequest.mock.calls[1]?.[1]).toBe(
      "/api/v1/sequences/definitions/onboarding?confirmLiveChange=true"
    );
  });

  it("asks for the explicit form only when format is raw", async () => {
    await handleToolCall("get_sequence_definition", {
      key: "onboarding",
      format: "raw",
    });
    expect(mockApiRequest.mock.calls[0]?.[1]).toBe(
      "/api/v1/sequences/definitions/onboarding?format=raw"
    );
  });
});
