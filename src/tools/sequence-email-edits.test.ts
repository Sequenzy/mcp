import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockApiRequest = mock(
  async (
    _method: string,
    _path: string,
    _body?: unknown,
    _companyId?: string
  ): Promise<unknown> => ({
    success: true,
    dryRun: false,
    emails: [],
    skipped: [],
  })
);

await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: mockApiRequest,
  apiUploadRequest: mock(async () => undefined),
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");
const { getRequiredToolHints } = await import("./tool-hints.js");

describe("edit_sequence_emails MCP tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes a plain object schema", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "edit_sequence_emails"
    );
    expect(tool?.inputSchema.type).toBe("object");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
    expect(tool?.inputSchema.required).toEqual(["sequenceId", "prompt"]);
  });

  it("is a saving, open-world tool", () => {
    expect(getRequiredToolHints("edit_sequence_emails")).toMatchObject({
      readOnlyHint: false,
      openWorldHint: true,
    });
  });

  it("posts the prompt for every email", async () => {
    await handleToolCall("edit_sequence_emails", {
      sequenceId: "seq 1",
      prompt: "Make the background cream",
    });
    expect(mockApiRequest.mock.calls[0]).toEqual([
      "POST",
      "/api/v1/sequences/seq%201/emails/edit",
      { prompt: "Make the background cream" },
      undefined,
    ]);
  });

  it("passes listed emails, sections, dry run and the company", async () => {
    await handleToolCall("edit_sequence_emails", {
      companyId: "co",
      sequenceId: "seq_1",
      prompt: "Stronger headline",
      emailIds: ["em_2"],
      sectionIds: ["hero"],
      dryRun: true,
    });
    expect(mockApiRequest.mock.calls[0]).toEqual([
      "POST",
      "/api/v1/sequences/seq_1/emails/edit",
      {
        prompt: "Stronger headline",
        emailIds: ["em_2"],
        sectionIds: ["hero"],
        dryRun: true,
      },
      "co",
    ]);
  });

  it.each([
    [{ sequenceId: "seq_1" }, "prompt"],
    [{ prompt: "x" }, "sequenceId"],
    [{ sequenceId: "seq_1", prompt: "x", emailIds: "em_1" }, "emailIds"],
    [
      {
        sequenceId: "seq_1",
        prompt: "x",
        emailIds: ["a", "b"],
        sectionIds: ["h"],
      },
      "exactly one",
    ],
  ])("rejects %o before calling the API", async (args, message) => {
    const result = (await handleToolCall("edit_sequence_emails", args)) as {
      isError?: boolean;
      content?: Array<{ text?: string }>;
    };
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.text).toContain(message);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
