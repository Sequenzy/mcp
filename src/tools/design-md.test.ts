import { beforeEach, describe, expect, it, mock } from "bun:test";

const DOC =
  "---\nlogo: null\n---\n\n# Acme email design\n\n## Voice\n\nWarm.\n";
const request = mock(async (..._args: unknown[]): Promise<unknown> => ({
  success: true,
  markdown: DOC,
  version: "abc123",
  designSystem: {},
}));
await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: request,
  apiUploadRequest: async () => undefined,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));
const { handleToolCall, tools } = await import("./index.js");
const { handleResourceRead, resources } = await import("../resources/index.js");

describe("design.md MCP tools", () => {
  beforeEach(() => request.mockClear());

  it("registers plain object schemas, output fields and hints", () => {
    for (const name of ["get_design_md", "update_design_md"]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.type).toBe("object");
      const schema = JSON.stringify(tool?.inputSchema);
      for (const keyword of ['"anyOf"', '"oneOf"', '"allOf"']) {
        expect(schema).not.toContain(keyword);
      }
      expect(tool?.outputSchema?.properties).toHaveProperty("markdown");
      expect(tool?.outputSchema?.properties).toHaveProperty("version");
      expect(tool?.annotations?.readOnlyHint).toBe(name === "get_design_md");
    }
    expect(
      tools.find((tool) => tool.name === "update_design_md")?.inputSchema
        .required
    ).toEqual(["markdown"]);
  });

  it("reads design.md for the requested company", async () => {
    const result = await handleToolCall("get_design_md", {
      companyId: "company-1",
    });
    expect(request).toHaveBeenCalledWith(
      "GET",
      "/api/v1/design-md",
      undefined,
      "company-1"
    );
    expect(result.structuredContent).toMatchObject({ version: "abc123" });
  });

  it("saves with the version and dry-run flag it was given", async () => {
    await handleToolCall("update_design_md", {
      markdown: DOC,
      expectedVersion: "abc123",
      dryRun: true,
    });
    expect(request).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/design-md",
      { markdown: DOC, expectedVersion: "abc123", dryRun: true },
      undefined
    );

    await handleToolCall("update_design_md", { markdown: DOC });
    expect(request).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/design-md",
      { markdown: DOC },
      undefined
    );
  });

  it("rejects missing markdown and malformed options before calling the API", async () => {
    for (const args of [
      {},
      { markdown: 4 },
      { markdown: DOC, expectedVersion: "" },
      { markdown: DOC, dryRun: "yes" },
    ]) {
      const result = await handleToolCall("update_design_md", args);
      expect(result.isError).toBe(true);
    }
    expect(request).not.toHaveBeenCalled();
  });
});

describe("sequenzy://design-md resource", () => {
  it("serves the raw markdown", async () => {
    expect(
      resources.find((resource) => resource.uri === "sequenzy://design-md")
        ?.mimeType
    ).toBe("text/markdown");
    expect(await handleResourceRead("sequenzy://design-md")).toEqual({
      contents: [
        { uri: "sequenzy://design-md", mimeType: "text/markdown", text: DOC },
      ],
    });
  });

  it("redacts restricted data on the OpenAI-reviewed profile", async () => {
    request.mockResolvedValueOnce({
      success: true,
      markdown: "logo: https://x.test/logo.png?api_key=SECRET\n",
      version: "v",
      designSystem: {},
    });
    const result = await handleResourceRead("sequenzy://design-md", {
      profile: "openai",
    });
    expect(result.contents[0]?.mimeType).toBe("text/markdown");
    expect(result.contents[0]?.text).not.toContain("SECRET");
  });

  it("returns a readable error when the API fails", async () => {
    request.mockRejectedValueOnce(
      new Error("API key is missing required scope")
    );
    const result = await handleResourceRead("sequenzy://design-md");
    expect(result.contents[0]?.mimeType).toBe("text/plain");
    expect(result.contents[0]?.text).toContain("missing required scope");
  });
});
