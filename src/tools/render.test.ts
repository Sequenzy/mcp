import { beforeEach, describe, expect, it, mock } from "bun:test";

type ApiRequestMock = (
  method: string,
  path: string,
  body?: unknown,
  companyIdOverride?: string
) => Promise<unknown>;

const mockApiRequest = mock<ApiRequestMock>(async () => {
  throw new Error("apiRequest should not be called");
});

await mock.module("../runtime.js", () => ({
  apiRequest: mockApiRequest,
  apiUploadRequest: async () => {
    throw new Error("apiUploadRequest should not be called");
  },
  areLocalFileUploadsEnabled: () => false,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");

const RENDER_RESULT = {
  success: true,
  html: "<html><body>Hi</body></html>",
  subject: "Hi",
  previewText: null,
  locale: "en",
  personalized: false,
  trackingApplied: false,
  entity: { type: "campaign", id: "camp_123", variantId: null },
};

describe("render_email MCP tool", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("is registered and advertises a read-only hint", () => {
    const tool = tools.find((entry) => entry.name === "render_email");
    expect(tool).toBeDefined();
    expect(tool?.annotations?.readOnlyHint).toBe(true);
  });

  it("routes a campaign target", async () => {
    mockApiRequest.mockResolvedValue(RENDER_RESULT);

    const result = await handleToolCall("render_email", {
      campaignId: "camp_123",
      companyId: "comp_1",
      subscriberId: "sub_1",
      tracking: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/render",
      { subscriberId: "sub_1", tracking: true },
      "comp_1"
    );
  });

  it("routes a sequence step target", async () => {
    mockApiRequest.mockResolvedValue(RENDER_RESULT);

    await handleToolCall("render_email", {
      sequenceId: "seq_1",
      nodeId: "node_1",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq_1/nodes/node_1/render",
      {},
      undefined
    );
  });

  it("routes a template target", async () => {
    mockApiRequest.mockResolvedValue(RENDER_RESULT);

    await handleToolCall("render_email", { templateId: "tmpl_1" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates/tmpl_1/render",
      {},
      undefined
    );
  });

  it("errors when no target is supplied", async () => {
    const result = await handleToolCall("render_email", {});

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("errors when more than one target is supplied", async () => {
    const result = await handleToolCall("render_email", {
      campaignId: "camp_1",
      templateId: "tmpl_1",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("errors when a sequence target omits nodeId", async () => {
    const result = await handleToolCall("render_email", {
      sequenceId: "seq_1",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("forwards the tags of an inline subscriber", async () => {
    // Without them a `tag` condition has no tags to read and renders as false,
    // so only the else branch of a tag split is previewable.
    mockApiRequest.mockResolvedValue(RENDER_RESULT);

    await handleToolCall("render_email", {
      templateId: "tmpl_1",
      subscriber: { email: "ada@example.com", tags: ["extended"] },
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates/tmpl_1/render",
      { subscriber: { email: "ada@example.com", tags: ["extended"] } },
      undefined
    );
  });

  it("documents that action_ab_test sequence steps need variantId", () => {
    const tool = tools.find((candidate) => candidate.name === "render_email");
    const variantId = (
      tool?.inputSchema as {
        properties?: { variantId?: { description?: string } };
      }
    )?.properties?.variantId;

    expect(tool?.description).toContain("action_ab_test");
    expect(variantId?.description).toContain("action_ab_test");
    expect(variantId?.description).toContain("ab_tests:read");
  });

  it("documents that an unevaluated condition renders as false", () => {
    const tool = tools.find((candidate) => candidate.name === "render_email");
    const unevaluatedConditions = tool?.outputSchema?.properties?.[
      "unevaluatedConditions"
    ] as { description?: string } | undefined;

    expect(tool?.description).toContain("unevaluatedConditions");
    expect(unevaluatedConditions?.description).toContain(
      "requires_stored_subscriber"
    );
  });

  it("forwards inline subscriber and variables", async () => {
    mockApiRequest.mockResolvedValue(RENDER_RESULT);

    await handleToolCall("render_email", {
      templateId: "tmpl_1",
      subscriber: { email: "ada@example.com", firstName: "Ada" },
      variables: { plan: "Pro" },
      locale: "es",
      variantId: "var_1",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates/tmpl_1/render",
      {
        subscriber: { email: "ada@example.com", firstName: "Ada" },
        variables: { plan: "Pro" },
        locale: "es",
        variantId: "var_1",
      },
      undefined
    );
  });
});
