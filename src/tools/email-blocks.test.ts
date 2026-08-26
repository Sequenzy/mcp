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
const { resources } = await import("../resources/index.js");

describe("get_email_block_schema", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("is registered with an optional blockType", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "get_email_block_schema"
    );

    expect(tool).toBeDefined();
    expect(tool?.inputSchema.properties).toHaveProperty("blockType");
    expect(tool?.inputSchema.required ?? []).toEqual([]);
  });

  it("tells an agent that lists are a block type rather than a text variant", () => {
    // The two reported failures both built a numbered list out of a `text`
    // block. The description is where an agent looks before it guesses.
    const description =
      tools.find((candidate) => candidate.name === "get_email_block_schema")
        ?.description ?? "";

    expect(description).toContain('{"type":"list","variant":"numbered"');
    expect(description).toContain('{"type":"steps","variant":"numbered"');
    expect(description).toContain("never accepts `items`");
  });

  it("tells an agent that nested object fields are expanded", () => {
    const description =
      tools.find((candidate) => candidate.name === "get_email_block_schema")
        ?.description ?? "";

    expect(description).toContain("nested item arrays and nested objects");
  });

  it("points at the condition table the block fields cannot express", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "get_email_block_schema"
    );
    const conditionFields = tool?.outputSchema?.properties?.[
      "conditionFields"
    ] as { description?: string } | undefined;

    expect(tool?.description).toContain("conditionFields");
    expect(conditionFields?.description).toContain(
      "the only set that field accepts"
    );
  });

  it("lists every block type when no type is given", async () => {
    await handleToolCall("get_email_block_schema", {});

    expect(mockApiRequest).toHaveBeenCalledWith("GET", "/api/v1/email-blocks");
  });

  it("passes creatableOnly through as a query flag", async () => {
    await handleToolCall("get_email_block_schema", { creatableOnly: true });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/email-blocks?creatableOnly=true"
    );
  });

  it("fetches one type when blockType is given", async () => {
    await handleToolCall("get_email_block_schema", { blockType: "steps" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/email-blocks/steps"
    );
  });

  it("encodes a block type that is not a bare identifier", async () => {
    await handleToolCall("get_email_block_schema", {
      blockType: "product grid",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/email-blocks/product%20grid"
    );
  });

  it("asks for the condition table only when the caller wants it", async () => {
    // The table is several times the size of one block type's reference, so a
    // targeted lookup that is not about conditions should not carry it.
    await handleToolCall("get_email_block_schema", {
      blockType: "text",
      conditionFields: true,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/email-blocks/text?conditionFields=true"
    );
  });

  it("says how to get the condition table it left out", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "get_email_block_schema"
    );
    const hint = tool?.outputSchema?.properties?.["conditionFieldsHint"] as
      | { description?: string }
      | undefined;

    expect(tool?.inputSchema.properties).toHaveProperty("conditionFields");
    expect(hint?.description).toContain("omitted `conditionFields`");
  });
});

describe("block authoring guidance in tool schemas", () => {
  it("shows the list and steps shapes on every tool that accepts email blocks", () => {
    // Forms, popups, and landing pages also take a `blocks` array, but of
    // their own unrelated block system, so they are matched out by the email
    // block description rather than by the parameter name.
    const blockTools = tools.filter((tool) => {
      const properties = tool.inputSchema.properties;
      const blocksProperty = properties?.["blocks"] as
        | { description?: string }
        | undefined;
      return (
        blocksProperty?.description?.startsWith("Sequenzy email blocks") ===
        true
      );
    });

    expect(blockTools.length).toBeGreaterThan(0);

    for (const tool of blockTools) {
      const properties = tool.inputSchema.properties as Record<
        string,
        { description?: string }
      >;
      const description = properties["blocks"]?.description ?? "";

      expect(description).toContain(
        '{"type":"list","variant":"numbered","items":[{"content":"First"}]}'
      );
      expect(description).toContain(
        '{"type":"steps","variant":"numbered","items":[{"title":"Step one","description":"What happens"},{"title":"Step two","description":"What happens next"}]}'
      );
      expect(description).toContain("get_email_block_schema");
    }
  });
});

describe("sequenzy://email-blocks resource", () => {
  it("is published alongside the other reference resources", () => {
    const resource = resources.find(
      (candidate) => candidate.uri === "sequenzy://email-blocks"
    );

    expect(resource).toBeDefined();
    expect(resource?.mimeType).toBe("application/json");
  });
});
