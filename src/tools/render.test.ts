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

const CHECK_RESULT = {
  success: true,
  score: 82,
  grade: "B",
  placement: "Promotions",
  categories: {
    subject: { score: 100, maxScore: 100 },
    preview: { score: 80, maxScore: 100 },
    content: { score: 72, maxScore: 100 },
  },
  issues: [
    {
      category: "content",
      severity: "error",
      rule: "links.broken",
      message: 'Broken link: "Shop" (acme.io/shop) - Page not found (404).',
      blockId: "b1",
      url: "https://acme.io/shop",
    },
  ],
  links: [],
  linkSummary: {
    total: 1,
    checked: 1,
    ok: 0,
    broken: 1,
    warnings: 0,
    restricted: 0,
    notChecked: 0,
  },
  linksChecked: true,
  subject: "Hi",
  previewText: null,
  locale: "en",
  unresolvedMergeTags: [],
  unevaluatedConditions: [],
  entity: { type: "campaign", id: "camp_123", variantId: null },
};

describe("check_email MCP tool", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("is registered read-only with a plain object schema", () => {
    const tool = tools.find((entry) => entry.name === "check_email");
    expect(tool).toBeDefined();
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.inputSchema.type).toBe("object");
    expect(tool?.inputSchema.properties).toHaveProperty("links");
    expect(tool?.inputSchema.properties).not.toHaveProperty("tracking");
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
  });

  it("routes each target to its check endpoint with only check fields", async () => {
    mockApiRequest.mockResolvedValue(CHECK_RESULT);

    const result = await handleToolCall("check_email", {
      campaignId: "camp_123",
      companyId: "comp_1",
      links: false,
      locale: "de",
    });
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toMatchObject({ grade: "B" });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/check",
      { locale: "de", links: false },
      "comp_1"
    );

    await handleToolCall("check_email", {
      sequenceId: "seq_1",
      nodeId: "node_1",
      variantId: "var_1",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/sequences/seq_1/nodes/node_1/check",
      { variantId: "var_1" },
      undefined
    );

    await handleToolCall("check_email", { templateId: "welcome email" });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/templates/welcome%20email/check",
      {},
      undefined
    );
  });

  it("rejects missing, ambiguous and incomplete targets", async () => {
    const none = await handleToolCall("check_email", {});
    expect(none.isError).toBe(true);
    expect(none.content[0]?.text).toContain("check_email requires one of");

    const both = await handleToolCall("check_email", {
      campaignId: "camp_1",
      templateId: "tpl_1",
    });
    expect(both.isError).toBe(true);
    expect(both.content[0]?.text).toContain("exactly one of");

    const tracking = await handleToolCall("check_email", {
      campaignId: "camp_1",
      tracking: true,
    });
    expect(tracking.isError).toBe(true);
    expect(tracking.content[0]?.text).toContain("tracking");

    const noNode = await handleToolCall("check_email", { sequenceId: "s" });
    expect(noNode.isError).toBe(true);
    expect(noNode.content[0]?.text).toContain("nodeId");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects stored-subscriber checks on the OpenAI profile", async () => {
    const result = await handleToolCall(
      "check_email",
      { campaignId: "camp_123", subscriberId: "subscriber_123" },
      { profile: "openai" }
    );
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("subscriberId");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
