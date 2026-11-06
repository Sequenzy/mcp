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
const { APP_RESOURCE_URI } = await import("../app-resource.js");

const TOOLS = [
  "list_sequence_email_variations",
  "generate_sequence_email_variations",
  "use_sequence_email_variation",
  "discard_sequence_email_variation",
];

describe("sequence email variation MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes every tool with a plain object schema", () => {
    for (const name of TOOLS) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
      expect(tool?.inputSchema.required).toEqual(
        expect.arrayContaining(["sequenceId", "emailId"])
      );
    }
  });

  it("shows the variations in MCP Apps clients as they list and generate", () => {
    for (const name of [
      "list_sequence_email_variations",
      "generate_sequence_email_variations",
    ]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?._meta).toEqual({ ui: { resourceUri: APP_RESOURCE_URI } });
    }
  });

  it("tells the preview what the variations are of, and which ones a generate started", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      email: { emailId: "e1", nodeId: "n1", label: "Email 1" },
      variations: [{ id: "v1" }, { id: "v2" }],
    });
    const generated = (await handleToolCall(
      "generate_sequence_email_variations",
      { sequenceId: "s1", emailId: "e1", prompt: "Bolder", companyId: "co" }
    )) as { structuredContent?: Record<string, unknown> };
    expect(generated.structuredContent).toMatchObject({
      mode: "variations",
      target: "sequence",
      sequenceId: "s1",
      emailId: "e1",
      companyId: "co",
      email: { nodeId: "n1" },
      newVariationIds: ["v1", "v2"],
    });

    mockApiRequest.mockResolvedValueOnce({ success: true, variations: [] });
    const listed = (await handleToolCall("list_campaign_variations", {
      campaignId: "c1",
    })) as { structuredContent?: Record<string, unknown> };
    expect(listed.structuredContent).toEqual({
      success: true,
      variations: [],
      mode: "variations",
      target: "campaign",
      campaignId: "c1",
    });
    for (const name of [
      "list_campaign_variations",
      "generate_campaign_variations",
    ]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?._meta).toEqual({ ui: { resourceUri: APP_RESOURCE_URI } });
    }
  });

  it("marks the read read-only, generating additive and using destructive", () => {
    expect(
      getRequiredToolHints("list_sequence_email_variations")
    ).toMatchObject({ readOnlyHint: true });
    expect(
      getRequiredToolHints("generate_sequence_email_variations")
    ).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    });
    expect(
      getRequiredToolHints("use_sequence_email_variation").destructiveHint
    ).toBe(true);
    expect(
      getRequiredToolHints("discard_sequence_email_variation").destructiveHint
    ).toBe(true);
  });

  it.each([
    [
      "list_sequence_email_variations",
      { sequenceId: "s 1", emailId: "e1", companyId: "co" },
      ["GET", "/api/v1/sequences/s%201/emails/e1/variations", undefined, "co"],
    ],
    [
      "generate_sequence_email_variations",
      {
        sequenceId: "s1",
        emailId: "e1",
        prompt: "Bolder",
        count: 2,
        style: "bold",
      },
      [
        "POST",
        "/api/v1/sequences/s1/emails/e1/variations/generate",
        { prompt: "Bolder", count: 2, style: "bold" },
        undefined,
      ],
    ],
    [
      "use_sequence_email_variation",
      {
        sequenceId: "s1",
        emailId: "e1",
        variationId: "v1",
        scope: "all",
        dryRun: true,
      },
      [
        "POST",
        "/api/v1/sequences/s1/emails/e1/variations/v1/use",
        { scope: "all", dryRun: true },
        undefined,
      ],
    ],
    [
      "discard_sequence_email_variation",
      { sequenceId: "s1", emailId: "e1", variationId: "v1" },
      [
        "DELETE",
        "/api/v1/sequences/s1/emails/e1/variations/v1",
        undefined,
        undefined,
      ],
    ],
    [
      "render_email",
      { sequenceId: "s1", nodeId: "n1", variationId: "v1" },
      [
        "POST",
        "/api/v1/sequences/s1/nodes/n1/render",
        { variationId: "v1" },
        undefined,
      ],
    ],
  ])("%s calls the API", async (name, args, expected) => {
    await handleToolCall(name, args);
    expect(mockApiRequest.mock.calls[0]).toEqual(expected as never);
  });

  it("checks arguments before calling the API", async () => {
    for (const [name, args] of [
      [
        "generate_sequence_email_variations",
        { sequenceId: "s1", emailId: "e1", prompt: "x", count: 9 },
      ],
      [
        "generate_sequence_email_variations",
        { sequenceId: "s1", emailId: "e1", prompt: "x", style: "wild" },
      ],
      [
        "use_sequence_email_variation",
        { sequenceId: "s1", emailId: "e1", variationId: "v1", scope: "some" },
      ],
      ["list_sequence_email_variations", { sequenceId: "s1" }],
    ] as const) {
      const result = (await handleToolCall(name, { ...args })) as {
        isError?: boolean;
      };
      expect(result.isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
