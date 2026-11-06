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

const DATA_EXPORT_TOOLS = [
  "list_data_exports",
  "get_data_export",
  "create_data_export",
  "update_data_export",
  "delete_data_export",
  "test_data_export",
  "run_data_export",
  "list_data_export_runs",
];

function errorText(result: { content: { text: string }[] }): string {
  return result.content.map((entry) => entry.text).join("\n");
}

beforeEach(() => {
  mockApiRequest.mockReset();
  mockApiRequest.mockResolvedValue({ success: true });
});

describe("data export tool definitions", () => {
  it("registers every tool with plain object input schemas", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    for (const name of DATA_EXPORT_TOOLS) {
      const tool = byName.get(name);
      expect({ name, registered: tool !== undefined }).toEqual({
        name,
        registered: true,
      });
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
    }
  });

  it("classifies hints: reads, bucket writes and the destructive delete", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    for (const name of [
      "list_data_exports",
      "get_data_export",
      "list_data_export_runs",
    ]) {
      expect(byName.get(name)?.annotations?.readOnlyHint).toBe(true);
    }
    for (const name of [
      "create_data_export",
      "test_data_export",
      "run_data_export",
    ]) {
      expect(byName.get(name)?.annotations?.openWorldHint).toBe(true);
      expect(byName.get(name)?.annotations?.readOnlyHint).toBe(false);
    }
    expect(byName.get("delete_data_export")?.annotations?.destructiveHint).toBe(
      true
    );
  });

  it("keeps credential-taking tools off the OpenAI-reviewed surface", () => {
    const openAiNames = new Set(
      getToolsForProfile(tools, "openai").map((tool) => tool.name)
    );
    expect(openAiNames.has("create_data_export")).toBe(false);
    expect(openAiNames.has("update_data_export")).toBe(false);
    expect(openAiNames.has("list_data_exports")).toBe(true);
  });
});

describe("data export tool handlers", () => {
  it("creates an export with only the provided fields", async () => {
    await handleToolCall("create_data_export", {
      companyId: "comp_1",
      name: "Lake",
      provider: "gcs",
      bucket: "acme",
      pathPrefix: "sequenzy",
      accessKeyId: "GOOG1",
      secretAccessKey: "secret",
      datasets: ["email_events", "subscribers"],
      frequency: "hourly",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/data-exports",
      {
        name: "Lake",
        provider: "gcs",
        bucket: "acme",
        accessKeyId: "GOOG1",
        secretAccessKey: "secret",
        pathPrefix: "sequenzy",
        datasets: ["email_events", "subscribers"],
        frequency: "hourly",
      },
      "comp_1"
    );
  });

  it.each([
    [{ provider: "azure" }, "`provider` must be one of s3, gcs"],
    [{ datasets: ["passwords"] }, "`datasets` must list one or more"],
    [{ frequency: "weekly" }, "`frequency` must be one of"],
    [{ bucket: undefined }, "`bucket` is required"],
  ])("rejects invalid create input %j", async (override, message) => {
    const result = await handleToolCall("create_data_export", {
      name: "Lake",
      provider: "s3",
      bucket: "acme",
      accessKeyId: "AKIA",
      secretAccessKey: "secret",
      ...override,
    });

    expect(result.isError).toBe(true);
    expect(errorText(result)).toContain(message);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("updates, pausing and rotating credentials together", async () => {
    await handleToolCall("update_data_export", {
      dataExportId: "exp/1",
      isEnabled: false,
      accessKeyId: "AKIANEW",
      secretAccessKey: "new",
      endpoint: "",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/data-exports/exp%2F1",
      {
        endpoint: "",
        accessKeyId: "AKIANEW",
        secretAccessKey: "new",
        isEnabled: false,
      },
      undefined
    );
  });

  it.each([
    [{ accessKeyId: "AKIA" }, "together"],
    [{ isEnabled: "no" }, "`isEnabled` must be a boolean"],
    [{}, "Nothing to update"],
  ])("rejects invalid updates %j", async (args, message) => {
    const result = await handleToolCall("update_data_export", {
      dataExportId: "exp_1",
      ...args,
    });

    expect(result.isError).toBe(true);
    expect(errorText(result)).toContain(message);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("routes list, get, delete, test, run and runs", async () => {
    await handleToolCall("list_data_exports", {});
    await handleToolCall("get_data_export", { dataExportId: "exp_1" });
    await handleToolCall("delete_data_export", { dataExportId: "exp_1" });
    await handleToolCall("test_data_export", { dataExportId: "exp_1" });
    await handleToolCall("run_data_export", { dataExportId: "exp_1" });
    await handleToolCall("list_data_export_runs", {
      dataExportId: "exp_1",
      limit: 5,
    });
    await handleToolCall("list_data_export_runs", { dataExportId: "exp_1" });

    expect(mockApiRequest.mock.calls.map((call) => [call[0], call[1]])).toEqual(
      [
        ["GET", "/api/v1/data-exports"],
        ["GET", "/api/v1/data-exports/exp_1"],
        ["DELETE", "/api/v1/data-exports/exp_1"],
        ["POST", "/api/v1/data-exports/exp_1/test"],
        ["POST", "/api/v1/data-exports/exp_1/run"],
        ["GET", "/api/v1/data-exports/exp_1/runs?limit=5"],
        ["GET", "/api/v1/data-exports/exp_1/runs"],
      ]
    );
  });

  it("requires a data export id and a valid limit", async () => {
    const missing = await handleToolCall("run_data_export", {});
    const badLimit = await handleToolCall("list_data_export_runs", {
      dataExportId: "exp_1",
      limit: 500,
    });

    expect(errorText(missing)).toContain("`dataExportId` is required");
    expect(errorText(badLimit)).toContain("between 1 and 100");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
