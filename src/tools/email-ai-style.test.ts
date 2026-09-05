import { beforeEach, describe, expect, it, mock } from "bun:test";

const request = mock(
  async (..._args: unknown[]): Promise<unknown> => ({
    success: true,
    style: null,
    revisionId: null,
    canManage: true,
  })
);
await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: request,
  apiUploadRequest: async () => undefined,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));
const { handleToolCall, tools } = await import("./index.js");
const { handleEmailAiStyleTools } = await import(
  "./handlers/email-ai-style.js"
);

describe("saved AI style MCP tools", () => {
  beforeEach(() => {
    request.mockClear();
    request.mockResolvedValue({
      success: true,
      style: null,
      revisionId: null,
      canManage: true,
    });
  });

  it("registers compatible schemas, output fields and mutation annotations", () => {
    for (const name of [
      "get_email_ai_style",
      "save_email_ai_style",
      "clear_email_ai_style",
    ]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain('"anyOf"');
      expect(tool?.outputSchema?.properties).toHaveProperty("revisionId");
      expect(tool?.outputSchema?.properties).toHaveProperty("style");
      expect(tool?.annotations?.readOnlyHint).toBe(
        name === "get_email_ai_style"
      );
    }
  });

  it("gets exact API state, including unsupported-version revision IDs", async () => {
    const response = {
      success: true,
      style: null,
      revisionId: "future",
      canManage: false,
    };
    request.mockResolvedValue(response);
    const result = await handleToolCall("get_email_ai_style", {
      companyId: "company",
    });
    expect(request).toHaveBeenCalledWith(
      "GET",
      "/api/v1/email-ai-style",
      undefined,
      "company"
    );
    expect(result.structuredContent).toEqual(response);
  });

  it("forwards initial, replacement and unsaved-canvas captures", async () => {
    await handleToolCall("save_email_ai_style", {
      emailId: "email",
      expectedStyleId: null,
    });
    expect(request).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/email-ai-style",
      { emailId: "email", expectedStyleId: null },
      undefined
    );
    const canvas = {
      blocks: [],
      theme: {},
      fontFamily: "Arial",
      emailPreset: "minimal",
    };
    await handleToolCall("save_email_ai_style", {
      companyId: "company",
      emailId: "email",
      expectedStyleId: "old",
      canvas,
    });
    expect(request).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/email-ai-style",
      { emailId: "email", expectedStyleId: "old", canvas },
      "company"
    );
  });

  it("clears only the reviewed revision and never retries a conflicting write", async () => {
    await handleToolCall("clear_email_ai_style", { expectedStyleId: "old" });
    expect(request).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/email-ai-style",
      { expectedStyleId: "old" },
      undefined
    );
    request.mockClear();
    request.mockRejectedValue(
      new Error("AI_STYLE_CONFLICT: Get the current style and review again.")
    );
    const result = await handleToolCall("clear_email_ai_style", {
      expectedStyleId: "old",
    });
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("review again");
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects missing/blank revisions, source IDs and unknown arguments", async () => {
    for (const [name, args] of [
      ["save_email_ai_style", { emailId: "email" }],
      ["save_email_ai_style", { emailId: "", expectedStyleId: null }],
      ["save_email_ai_style", { emailId: "email", expectedStyleId: " " }],
      ["clear_email_ai_style", { expectedStyleId: null }],
      ["get_email_ai_style", { unexpected: true }],
    ] as const)
      expect((await handleToolCall(name, args)).isError).toBe(true);
    expect(request).not.toHaveBeenCalled();
    expect(await handleEmailAiStyleTools("unrelated", {})).toEqual({
      handled: false,
      result: undefined,
    });
  });
});
