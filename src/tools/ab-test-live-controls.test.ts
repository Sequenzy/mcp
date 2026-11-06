import { beforeEach, describe, expect, it, mock } from "bun:test";
const request = mock(
  async (
    _method: string,
    _path: string,
    _body?: unknown,
    _company?: string
  ): Promise<unknown> => ({ success: true })
);
await mock.module("../runtime.js", () => ({
  apiRequest: request,
  apiUploadRequest: async () => ({}),
  areLocalFileUploadsEnabled: () => false,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));
const { handleToolCall, tools } = await import("./index.js");
beforeEach(() => request.mockClear());
describe("campaign A/B live controls", () => {
  it("passes live updates, revision and failed-request discard to the API", async () => {
    for (const fields of [
      {
        testPercentage: 30,
        testDurationMinutes: 120,
        expectedUpdatedAt: "2026-09-13T12:00:00.000Z",
      },
      { cancelSampleUpdate: true },
      { endTestNow: true },
    ]) {
      expect(
        (
          await handleToolCall("update_ab_test", {
            companyId: "company",
            abTestId: "test",
            ...fields,
          })
        ).isError
      ).toBeUndefined();
      expect(request).toHaveBeenLastCalledWith(
        "PATCH",
        "/api/v1/ab-tests/test",
        fields,
        "company"
      );
    }
  });
  it("returns pending intent and progress without dropping fields", async () => {
    request.mockResolvedValueOnce({
      success: true,
      abTest: {
        progress: { sent: 20, remaining: 80 },
        pendingSampleUpdate: { id: "request", testPercentage: 30 },
      },
    });
    const result = await handleToolCall("get_ab_test", { abTestId: "test" });
    expect(JSON.stringify(result)).toContain("pendingSampleUpdate");
    expect(JSON.stringify(result)).toContain("remaining");
  });
  it("rejects invalid discard values and preserves compatible schemas", async () => {
    expect(
      (
        await handleToolCall("update_ab_test", {
          abTestId: "test",
          cancelSampleUpdate: "yes",
        })
      ).isError
    ).toBe(true);
    expect(
      (
        await handleToolCall("update_ab_test", {
          abTestId: "test",
          endTestNow: "now",
        })
      ).isError
    ).toBe(true);
    expect(request).not.toHaveBeenCalled();
    const tool = tools.find((tool) => tool.name === "update_ab_test");
    expect(tool?.inputSchema.type).toBe("object");
    expect(tool?.inputSchema.properties).toHaveProperty("cancelSampleUpdate");
    expect(tool?.inputSchema.properties).toHaveProperty("endTestNow");
    expect(tool?.inputSchema.properties).toHaveProperty("expectedUpdatedAt");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain('"anyOf"');
  });
});
