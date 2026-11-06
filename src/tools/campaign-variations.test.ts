import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockApiRequest = mock(
  async (
    _method: string,
    _path: string,
    _body?: unknown,
    _companyId?: string
  ): Promise<unknown> => ({ success: true })
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

const VARIATION_TOOLS = [
  "list_campaign_variations",
  "get_campaign_variation",
  "generate_campaign_variations",
  "create_campaign_variation",
  "update_campaign_variation",
  "discard_campaign_variation",
  "restore_campaign_variation",
  "use_campaign_variation",
  "generate_campaign_variation_section_options",
  "edit_campaign_variation",
];

describe("campaign variation MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes every tool with a plain object schema", () => {
    for (const name of VARIATION_TOOLS) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
      expect(tool?.inputSchema.required).toContain("campaignId");
    }
  });

  it("marks only the reads read-only and the overwrites destructive", () => {
    expect(getRequiredToolHints("list_campaign_variations").readOnlyHint).toBe(
      true
    );
    expect(
      getRequiredToolHints("generate_campaign_variations").destructiveHint
    ).toBe(false);
    expect(getRequiredToolHints("use_campaign_variation").destructiveHint).toBe(
      true
    );
    expect(
      getRequiredToolHints("update_campaign_variation").destructiveHint
    ).toBe(true);
    expect(getRequiredToolHints("edit_campaign_variation")).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    });
  });

  it.each([
    [
      "generate_campaign_variations",
      { campaignId: "c 1", prompt: "Warmer", count: 2, companyId: "co" },
      [
        "POST",
        "/api/v1/campaigns/c%201/variations/generate",
        { prompt: "Warmer", count: 2 },
        "co",
      ],
    ],
    [
      "use_campaign_variation",
      { campaignId: "c1", variationId: "v1" },
      ["POST", "/api/v1/campaigns/c1/variations/v1/use", undefined, undefined],
    ],
    [
      "discard_campaign_variation",
      { campaignId: "c1", variationId: "v1" },
      ["DELETE", "/api/v1/campaigns/c1/variations/v1", undefined, undefined],
    ],
    [
      "update_campaign_variation",
      { campaignId: "c1", variationId: "v1", name: "Renamed" },
      [
        "PATCH",
        "/api/v1/campaigns/c1/variations/v1",
        { name: "Renamed" },
        undefined,
      ],
    ],
    [
      "generate_campaign_variation_section_options",
      {
        campaignId: "c1",
        variationId: "v1",
        sectionIds: ["h1"],
        prompt: "Shorter",
      },
      [
        "POST",
        "/api/v1/campaigns/c1/variations/section-options",
        { variationId: "v1", sectionIds: ["h1"], prompt: "Shorter" },
        undefined,
      ],
    ],
    [
      "edit_campaign_variation",
      {
        campaignId: "c1",
        variationId: "v1",
        prompt: "Make the hero dark",
        sectionIds: ["hero"],
      },
      [
        "POST",
        "/api/v1/campaigns/c1/variations/v1/edit",
        { prompt: "Make the hero dark", sectionIds: ["hero"] },
        undefined,
      ],
    ],
    [
      "generate_campaign_variations",
      { campaignId: "c1", prompt: "New style", style: "bold" },
      [
        "POST",
        "/api/v1/campaigns/c1/variations/generate",
        { prompt: "New style", style: "bold" },
        undefined,
      ],
    ],
    [
      "update_campaign_variation",
      {
        campaignId: "c1",
        variationId: "v1",
        position: { x: 10, y: -20 },
        emailTheme: null,
        fontFamily: "Georgia, serif",
      },
      [
        "PATCH",
        "/api/v1/campaigns/c1/variations/v1",
        {
          position: { x: 10, y: -20 },
          emailTheme: null,
          fontFamily: "Georgia, serif",
        },
        undefined,
      ],
    ],
  ])("forwards %s to the API", async (name, args, expected) => {
    await handleToolCall(name, args);
    expect(mockApiRequest.mock.calls[0]).toEqual(
      expected as Parameters<typeof mockApiRequest>
    );
  });

  it("rejects bad arguments before calling the API", async () => {
    const results = await Promise.all([
      handleToolCall("generate_campaign_variations", {
        campaignId: "c1",
        prompt: "x",
        count: 9,
      }),
      handleToolCall("create_campaign_variation", {
        campaignId: "c1",
        name: "No content",
      }),
      handleToolCall("generate_campaign_variation_section_options", {
        campaignId: "c1",
        prompt: "x",
        sectionIds: [],
      }),
      handleToolCall("generate_campaign_variations", {
        campaignId: "c1",
        prompt: "x",
        style: "wild",
      }),
      handleToolCall("update_campaign_variation", {
        campaignId: "c1",
        variationId: "v1",
        position: { x: "1", y: 2 },
      }),
      handleToolCall("edit_campaign_variation", {
        campaignId: "c1",
        variationId: "v1",
      }),
    ]);
    for (const result of results) {
      expect((result as { isError?: boolean }).isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
