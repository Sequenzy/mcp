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
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");

function collectSchemaKeywordPaths(
  value: unknown,
  keyword: string,
  path: string
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectSchemaKeywordPaths(item, keyword, `${path}[${index}]`)
    );
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const paths = Object.prototype.hasOwnProperty.call(record, keyword)
    ? [path]
    : [];

  for (const [key, child] of Object.entries(record)) {
    paths.push(...collectSchemaKeywordPaths(child, keyword, `${path}.${key}`));
  }

  return paths;
}

function collectArraySchemasWithoutItems(
  value: unknown,
  path: string
): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectArraySchemasWithoutItems(item, `${path}[${index}]`)
    );
  }

  if (typeof value !== "object" || value === null) {
    return [];
  }

  const record = value as Record<string, unknown>;
  const paths =
    record.type === "array" &&
    !Object.prototype.hasOwnProperty.call(record, "items")
      ? [path]
      : [];

  for (const [key, child] of Object.entries(record)) {
    paths.push(...collectArraySchemasWithoutItems(child, `${path}.${key}`));
  }

  return paths;
}

describe("tool schema compatibility", () => {
  it("does not publish unsupported root-level composition keywords", () => {
    const unsupportedRootKeywords = ["anyOf", "oneOf", "allOf", "enum", "not"];
    const violations: string[] = [];

    for (const tool of tools) {
      const inputSchema = tool.inputSchema as Record<string, unknown>;

      for (const keyword of unsupportedRootKeywords) {
        if (Object.prototype.hasOwnProperty.call(inputSchema, keyword)) {
          violations.push(`${tool.name}.${keyword}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not publish anyOf anywhere in tool schemas", () => {
    const violations = tools.flatMap((tool) =>
      collectSchemaKeywordPaths(tool.inputSchema, "anyOf", tool.name)
    );

    expect(violations).toEqual([]);
  });

  it("publishes items for every array schema", () => {
    const violations = tools.flatMap((tool) =>
      collectArraySchemasWithoutItems(tool.inputSchema, tool.name)
    );

    expect(violations).toEqual([]);
  });
});

describe("update_template tool validation", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("requires at least one supported update field in the published schema", () => {
    const updateTemplateTool = tools.find(
      (tool) => tool.name === "update_template"
    );
    const inputSchema = updateTemplateTool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["templateId"]);
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toBeDefined();
    expect(inputSchema?.properties).toHaveProperty("name");
    expect(inputSchema?.properties).toHaveProperty("subject");
    expect(inputSchema?.properties).toHaveProperty("html");
    expect(inputSchema?.properties).toHaveProperty("blocks");
    expect(inputSchema?.properties).toHaveProperty("labels");
  });

  it("rejects update_template calls that omit all supported update fields", async () => {
    const result = await handleToolCall("update_template", {
      templateId: "tmpl_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `subject`, `html`, `blocks`, or `labels` when calling `update_template`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects unsupported update_template fields before hitting the API", async () => {
    const result = await handleToolCall("update_template", {
      templateId: "tmpl_123",
      subject: "Updated subject",
      unknown: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain("Unsupported field: `unknown`.");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content in update_template", async () => {
    const result = await handleToolCall("update_template", {
      templateId: "tmpl_123",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `update_template`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("allows labels as the only update_template field", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      template: {
        id: "tmpl_123",
        name: "Welcome",
        subject: "Hello",
        labels: ["edm"],
      },
    });

    const result = await handleToolCall("update_template", {
      templateId: "tmpl_123",
      labels: ["edm"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/templates/tmpl_123",
      {
        templateId: "tmpl_123",
        labels: ["edm"],
      },
      undefined
    );
  });
});

describe("A/B test tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes A/B test tools with plain object schemas", () => {
    const toolNames = tools.map((tool) => tool.name);
    const updateVariantTool = tools.find(
      (tool) => tool.name === "update_ab_test_variant"
    );
    const inputSchema = updateVariantTool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(toolNames).toContain("list_ab_tests");
    expect(toolNames).toContain("get_ab_test");
    expect(toolNames).toContain("get_ab_test_stats");
    expect(toolNames).toContain("restart_ab_test");
    expect(toolNames).toContain("update_ab_test_variant");
    expect(inputSchema?.required).toEqual(["abTestId", "variantId"]);
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toHaveProperty("subject");
    expect(inputSchema?.properties).toHaveProperty("previewText");
    expect(inputSchema?.properties).toHaveProperty("html");
    expect(inputSchema?.properties).toHaveProperty("blocks");
  });

  it("passes sequence filters through to the A/B test list API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      abTests: [],
    });

    await handleToolCall("list_ab_tests", {
      companyId: "company_123",
      sequenceId: "seq_123",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/ab-tests?sequenceId=seq_123",
      undefined,
      "company_123"
    );
  });

  it("calls the A/B stats API with period filters", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      stats: { sent: 1 },
      variants: [],
    });

    await handleToolCall("get_ab_test_stats", {
      companyId: "company_123",
      abTestId: "ab_123",
      period: "30d",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/ab-tests/ab_123/stats?period=30d",
      undefined,
      "company_123"
    );
  });

  it("calls the A/B restart API with control and generation options", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      abTest: { id: "ab_new" },
    });

    await handleToolCall("restart_ab_test", {
      companyId: "company_123",
      abTestId: "ab_123",
      sourceVariantId: "var_b",
      testType: "content",
      winnerThreshold: 120,
      variantCount: 3,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/ab-tests/ab_123/restart",
      {
        sourceVariantId: "var_b",
        testType: "content",
        winnerThreshold: 120,
        variantCount: 3,
      },
      "company_123"
    );
  });

  it("rejects invalid A/B restart options before calling the API", async () => {
    const result = await handleToolCall("restart_ab_test", {
      abTestId: "ab_123",
      testType: "body",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`restart_ab_test` testType must be `subject` or `content`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects update_ab_test_variant calls that omit all update fields", async () => {
    const result = await handleToolCall("update_ab_test_variant", {
      abTestId: "ab_123",
      variantId: "var_b",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `subject`, `previewText`, `html`, or `blocks` when calling `update_ab_test_variant`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content in update_ab_test_variant", async () => {
    const result = await handleToolCall("update_ab_test_variant", {
      abTestId: "ab_123",
      variantId: "var_b",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `update_ab_test_variant`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("calls the A/B variant update API with supported fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      variant: { id: "var_b", subject: "New subject" },
    });

    await handleToolCall("update_ab_test_variant", {
      companyId: "company_123",
      abTestId: "ab_123",
      variantId: "var_b",
      subject: "New subject",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/ab-tests/ab_123/variants/var_b",
      {
        companyId: "company_123",
        abTestId: "ab_123",
        variantId: "var_b",
        subject: "New subject",
      },
      "company_123"
    );
  });
});

describe("transactional email tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes transactional read, create, and update tools", () => {
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).toContain("list_transactional_emails");
    expect(toolNames).toContain("get_transactional_email");
    expect(toolNames).toContain("create_transactional_email");
    expect(toolNames).toContain("update_transactional_email");
  });

  it("publishes create_transactional_email content fields in the schema", () => {
    const createTransactionalTool = tools.find(
      (tool) => tool.name === "create_transactional_email"
    );
    const inputSchema = createTransactionalTool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["name"]);
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toHaveProperty("slug");
    expect(inputSchema?.properties).toHaveProperty("previewText");
    expect(inputSchema?.properties).toHaveProperty("html");
    expect(inputSchema?.properties).toHaveProperty("blocks");
    expect(inputSchema?.properties).toHaveProperty("prompt");
    expect(inputSchema?.properties).toHaveProperty("style");
    expect(inputSchema?.properties).toHaveProperty("tone");
    expect(inputSchema?.properties).toHaveProperty("enabled");
  });

  it("calls the transactional detail API by ID or slug", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      transactional: { id: "txn_123", slug: "welcome-email" },
    });

    await handleToolCall("get_transactional_email", {
      idOrSlug: "welcome-email",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/transactional/welcome-email",
      undefined,
      undefined
    );
  });

  it("rejects update_transactional_email calls that omit all update fields", async () => {
    const result = await handleToolCall("update_transactional_email", {
      idOrSlug: "welcome-email",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `enabled`, `subject`, `previewText`, `html`, or `blocks` when calling `update_transactional_email`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects create_transactional_email calls that omit body content", async () => {
    const result = await handleToolCall("create_transactional_email", {
      name: "Password Reset",
      subject: "Reset your password",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `prompt`, `html`, or `blocks` when calling `create_transactional_email`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("requires a subject for non-prompt create_transactional_email calls", async () => {
    const result = await handleToolCall("create_transactional_email", {
      name: "Password Reset",
      html: "<p>Reset link: {{RESET_URL}}</p>",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`subject` is required unless `prompt` is provided when calling `create_transactional_email`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content in create_transactional_email", async () => {
    const result = await handleToolCall("create_transactional_email", {
      name: "Password Reset",
      subject: "Reset your password",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `create_transactional_email`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixing prompt and html content in create_transactional_email", async () => {
    const result = await handleToolCall("create_transactional_email", {
      name: "Password Reset",
      prompt: "Create a password reset email",
      html: "<p>Hello</p>",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `prompt`, `html`, or `blocks` when calling `create_transactional_email`, not multiple content sources."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects style without prompt in create_transactional_email", async () => {
    const result = await handleToolCall("create_transactional_email", {
      name: "Password Reset",
      subject: "Reset your password",
      html: "<p>Hello</p>",
      style: "minimal",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`style` and `tone` can only be used with `prompt` when calling `create_transactional_email`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("calls the transactional create API with supported fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      transactional: { id: "txn_123", slug: "password-reset" },
    });

    await handleToolCall("create_transactional_email", {
      companyId: "company_123",
      name: "Password Reset",
      slug: "password-reset",
      subject: "Reset your password",
      previewText: "Use this link to reset your password.",
      html: "<p>Reset link: {{RESET_URL}}</p>",
      enabled: false,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/transactional",
      {
        name: "Password Reset",
        slug: "password-reset",
        subject: "Reset your password",
        previewText: "Use this link to reset your password.",
        html: "<p>Reset link: {{RESET_URL}}</p>",
        enabled: false,
      },
      "company_123"
    );
  });

  it("uses generated email blocks when creating a prompt-based transactional email", async () => {
    const generatedBlocks = [
      {
        type: "text",
        content: "<p>Click {{RESET_URL}} to reset your password.</p>",
        variant: "paragraph",
      },
    ];

    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subject: "Reset your password",
        previewText: "Use this secure link to reset your password.",
        html: "<p>Click {{RESET_URL}} to reset your password.</p>",
        blocks: generatedBlocks,
      })
      .mockResolvedValueOnce({
        success: true,
        transactional: {
          id: "txn_123",
          name: "Password Reset",
          slug: "password-reset",
        },
      });

    const result = await handleToolCall("create_transactional_email", {
      companyId: "company_123",
      name: "Password Reset",
      slug: "password-reset",
      prompt: "Create a concise password reset email with RESET_URL.",
      style: "minimal",
      tone: "professional",
      enabled: false,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/v1/generate/email",
      {
        prompt: "Create a concise password reset email with RESET_URL.",
        style: "minimal",
        tone: "professional",
      },
      "company_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/transactional",
      {
        name: "Password Reset",
        slug: "password-reset",
        subject: "Reset your password",
        previewText: "Use this secure link to reset your password.",
        blocks: generatedBlocks,
        enabled: false,
      },
      "company_123"
    );
  });

  it("rejects mixed html and blocks content in update_transactional_email", async () => {
    const result = await handleToolCall("update_transactional_email", {
      idOrSlug: "welcome-email",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `update_transactional_email`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("calls the transactional update API with supported fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      transactional: { id: "txn_123", slug: "welcome-email" },
    });

    await handleToolCall("update_transactional_email", {
      idOrSlug: "welcome-email",
      subject: "Updated subject",
      html: "<p>Updated body</p>",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/transactional/welcome-email",
      {
        subject: "Updated subject",
        html: "<p>Updated body</p>",
      },
      undefined
    );
  });
});

describe("update_campaign tool validation", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("fetches an email send by ID", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      source: "database",
      emailSend: {
        id: "send_123",
        companyId: "comp_123",
        subject: "Welcome",
        emailBody: "<p>Hello</p>",
      },
      events: [],
    });

    const result = await handleToolCall("get_email_send", {
      companyId: "comp_123",
      emailSendId: "send_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest.mock.calls[0]).toEqual([
      "GET",
      "/api/v1/email-sends/send_123",
      undefined,
      "comp_123",
    ]);

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      emailSend: { url: string };
      appUrls: { emailSend: string };
    };
    expect(payload.emailSend.url).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/sent-emails/send_123"
    );
    expect(payload.appUrls.emailSend).toBe(payload.emailSend.url);
  });

  it("publishes reply-to update fields in the schema", () => {
    const updateCampaignTool = tools.find(
      (tool) => tool.name === "update_campaign"
    );
    const inputSchema = updateCampaignTool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["campaignId"]);
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toHaveProperty("blocks");
    expect(inputSchema?.properties).toHaveProperty("replyTo");
    expect(inputSchema?.properties).toHaveProperty("replyProfileId");
    expect(inputSchema?.properties).toHaveProperty("campaignData");
    expect(inputSchema?.properties).toHaveProperty("computedLists");
    expect(inputSchema?.properties).toHaveProperty("labels");
  });

  it("publishes schedule_campaign with a plain object schema", () => {
    const scheduleCampaignTool = tools.find(
      (tool) => tool.name === "schedule_campaign"
    );
    const inputSchema = scheduleCampaignTool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["campaignId", "scheduledAt"]);
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toHaveProperty("targetLists");
    expect(inputSchema?.properties).toHaveProperty("sendTimeOptimization");
    expect(inputSchema?.properties).toHaveProperty("spreadOverHours");
  });

  it("rejects update_campaign calls that omit all supported update fields", async () => {
    const result = await handleToolCall("update_campaign", {
      campaignId: "camp_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `subject`, `trackingCode`, `html`, `blocks`, `replyTo`, `replyProfileId`, `campaignData`, `computedLists`, or `labels` when calling `update_campaign`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects update_campaign calls that provide both replyTo and replyProfileId", async () => {
    const result = await handleToolCall("update_campaign", {
      campaignId: "camp_123",
      replyTo: "support@example.com",
      replyProfileId: "reply_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `replyTo` or `replyProfileId` when calling `update_campaign`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content in update_campaign", async () => {
    const result = await handleToolCall("update_campaign", {
      campaignId: "camp_123",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `update_campaign`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("allows labels as the only update_campaign field", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: {
        id: "camp_123",
        name: "Launch",
        subject: "Hello",
        status: "draft",
        labels: ["edm"],
      },
    });

    const result = await handleToolCall("update_campaign", {
      campaignId: "camp_123",
      labels: ["edm"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/campaigns/camp_123",
      {
        campaignId: "camp_123",
        labels: ["edm"],
      },
      undefined
    );
  });

  it("allows trackingCode as the only update_campaign field", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: {
        id: "camp_123",
        name: "Launch",
        subject: "Hello",
        status: "draft",
        trackingCode: "AKL-01May2026",
      },
    });

    const result = await handleToolCall("update_campaign", {
      campaignId: "camp_123",
      trackingCode: "AKL-01May2026",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/campaigns/camp_123",
      {
        campaignId: "camp_123",
        trackingCode: "AKL-01May2026",
      },
      undefined
    );
  });

  it("calls the schedule campaign API with supported fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: {
        id: "camp_123",
        name: "Launch",
        subject: "Hello",
        status: "scheduled",
      },
      scheduledAt: "2026-06-01T14:00:00.000Z",
    });

    const result = await handleToolCall("schedule_campaign", {
      companyId: "comp_123",
      campaignId: "camp_123",
      scheduledAt: "2026-06-01T14:00:00Z",
      targetLists: { type: "all" },
      spreadOverHours: 6,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/schedule",
      {
        scheduledAt: "2026-06-01T14:00:00Z",
        targetLists: { type: "all" },
        spreadOverHours: 6,
      },
      "comp_123"
    );

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      campaign: { url: string; previewUrl: string };
      appUrls: { campaign: string; campaignPreview: string };
    };
    expect(payload.campaign.url).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/campaign/camp_123"
    );
    expect(payload.campaign.previewUrl).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/campaign/camp_123?step=review"
    );
    expect(payload.appUrls.campaignPreview).toBe(payload.campaign.previewUrl);
  });

  it("rejects invalid schedule campaign arguments before hitting the API", async () => {
    const result = await handleToolCall("schedule_campaign", {
      campaignId: "camp_123",
      scheduledAt: "2026-06-01T14:00:00Z",
      targetLists: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`targetLists` must be an object when calling `schedule_campaign`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("create_template tool validation", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("requires html or blocks content", async () => {
    const result = await handleToolCall("create_template", {
      name: "Welcome",
      subject: "Hello",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `create_template`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content", async () => {
    const result = await handleToolCall("create_template", {
      name: "Welcome",
      subject: "Hello",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `create_template`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("passes template labels through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      template: {
        id: "tmpl_123",
        name: "[Template] Welcome",
        subject: "Hello",
        labels: ["edm"],
      },
    });

    const result = await handleToolCall("create_template", {
      name: "Welcome",
      subject: "Hello",
      html: "<p>Hello</p>",
      labels: ["edm"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates",
      {
        name: "Welcome",
        subject: "Hello",
        html: "<p>Hello</p>",
        labels: ["edm"],
      },
      undefined
    );
  });
});

describe("label list filters", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("passes template label filters as query parameters", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      companyId: "comp_123",
      emailLocalizationConfig: null,
      templates: [],
    });

    const result = await handleToolCall("list_templates", {
      companyId: "comp_123",
      label: "edm",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/templates?label=edm",
      undefined,
      "comp_123"
    );
  });

  it("passes campaign label filters as query parameters", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaigns: [],
    });

    const result = await handleToolCall("list_campaigns", {
      companyId: "comp_123",
      status: "draft",
      label: "edm",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/campaigns?status=draft&label=edm",
      undefined,
      "comp_123"
    );
  });
});

describe("create_campaign tool validation", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes prompt generation fields in the schema", () => {
    const createCampaignTool = tools.find(
      (tool) => tool.name === "create_campaign"
    );
    const inputSchema = createCampaignTool?.inputSchema as
      | {
          required?: string[];
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["name"]);
    expect(inputSchema?.properties).toHaveProperty("prompt");
    expect(inputSchema?.properties).toHaveProperty("style");
    expect(inputSchema?.properties).toHaveProperty("tone");
    expect(inputSchema?.properties).toHaveProperty("labels");
    expect(inputSchema?.properties).toHaveProperty("trackingCode");
  });

  it("requires subject when prompt is not provided", async () => {
    const result = await handleToolCall("create_campaign", {
      name: "Launch",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`subject` is required unless `prompt` is provided when calling `create_campaign`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content", async () => {
    const result = await handleToolCall("create_campaign", {
      name: "Launch",
      subject: "Hello",
      html: "<p>Hello</p>",
      blocks: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `create_campaign`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixing prompt and html content", async () => {
    const result = await handleToolCall("create_campaign", {
      name: "Launch",
      subject: "Hello",
      prompt: "Announce the new dashboard",
      html: "<p>Hello</p>",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `prompt`, `html`, `blocks`, or `templateId` when calling `create_campaign`, not multiple content sources."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("uses generated email blocks when creating a prompt-based campaign", async () => {
    const generatedBlocks = [
      {
        type: "text",
        content: "<p>Generated launch body</p>",
        variant: "paragraph",
      },
    ];

    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subject: "Generated launch subject",
        html: "<p>Generated launch body</p>",
        blocks: generatedBlocks,
      })
      .mockResolvedValueOnce({
        success: true,
        campaign: {
          id: "camp_123",
          name: "Launch",
          subject: "Generated launch subject",
          status: "draft",
          labels: ["edm"],
        },
      });

    const result = await handleToolCall("create_campaign", {
      companyId: "comp_123",
      name: "Launch",
      prompt: "Announce the new dashboard",
      style: "branded",
      tone: "friendly",
      labels: ["edm"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/v1/generate/email",
      {
        prompt: "Announce the new dashboard",
        style: "branded",
        tone: "friendly",
      },
      "comp_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/campaigns",
      {
        name: "Launch",
        subject: "Generated launch subject",
        blocks: generatedBlocks,
        labels: ["edm"],
      },
      "comp_123"
    );
  });

  it("passes tracking code when creating a prompt-based campaign", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subject: "Generated launch subject",
        blocks: [
          {
            type: "text",
            content: "<p>Generated launch body</p>",
            variant: "paragraph",
          },
        ],
      })
      .mockResolvedValueOnce({
        success: true,
        campaign: {
          id: "camp_123",
          name: "Launch",
          subject: "Generated launch subject",
          status: "draft",
        },
      });

    const result = await handleToolCall("create_campaign", {
      name: "Launch",
      prompt: "Announce the new dashboard",
      trackingCode: "AKL-01May2026",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/campaigns",
      {
        name: "Launch",
        subject: "Generated launch subject",
        blocks: [
          {
            type: "text",
            content: "<p>Generated launch body</p>",
            variant: "paragraph",
          },
        ],
        trackingCode: "AKL-01May2026",
      },
      undefined
    );
  });
});

describe("create_sequence tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes explicit steps and keeps goal optional in the schema", () => {
    const createSequenceTool = tools.find(
      (tool) => tool.name === "create_sequence"
    );
    const inputSchema = createSequenceTool?.inputSchema as
      | {
          required?: string[];
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["name", "trigger"]);
    expect(inputSchema?.properties).toHaveProperty("goal");
    expect(inputSchema?.properties).toHaveProperty("steps");
    expect(inputSchema?.properties).toHaveProperty("stopCondition");
    const stopCondition = inputSchema?.properties?.["stopCondition"] as
      | {
          properties?: {
            type?: { enum?: string[] };
            value?: { type?: string | string[] };
          };
        }
      | undefined;
    expect(stopCondition?.properties?.type?.enum).toContain(
      "removed_from_list"
    );
    expect(stopCondition?.properties?.value?.type).toEqual(["string", "null"]);
  });

  it("creates explicit discount sequences without polling for AI enrichment", async () => {
    const steps = [
      {
        type: "create_discount",
        discount: {
          discountType: "percent",
          percentOff: 20,
          duration: "once",
          appliesToAllPlans: true,
          maxRedemptions: 1,
          codePrefix: "WINBACK",
        },
      },
      {
        subject: "Come back with {{discount.code}}",
        html: "<p>Use {{discount.code}}</p>",
      },
    ];

    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        sequence: {
          id: "seq_123",
          name: "Win-back Discount",
          status: "draft",
          emailCount: 1,
          discountCount: 1,
          nodeCount: 4,
        },
        message:
          "Sequence created with 1 email and 1 discount action. Use POST /api/v1/sequences/{id}/enable to activate.",
      })
      .mockResolvedValueOnce({
        success: true,
        sequence: {
          id: "seq_123",
          name: "Win-back Discount",
          status: "draft",
          enrichmentStatus: "complete",
          emailCount: 1,
          discountCount: 1,
          enrichedCount: 1,
          nodes: [],
        },
      });

    const result = await handleToolCall("create_sequence", {
      companyId: "comp_123",
      name: "Win-back Discount",
      trigger: "tag_added",
      tagName: "cancelled",
      steps,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/v1/sequences",
      {
        companyId: "comp_123",
        name: "Win-back Discount",
        trigger: "tag_added",
        tagName: "cancelled",
        steps,
      },
      "comp_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/api/v1/sequences/seq_123",
      undefined,
      "comp_123"
    );

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      message: string;
      sequence: { discountCount: number };
    };
    expect(payload.message).toContain("explicit steps");
    expect(payload.sequence.discountCount).toBe(1);
  });
});

describe("update_sequence tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes stop condition and branch inputs in the schema", () => {
    const updateSequenceTool = tools.find(
      (tool) => tool.name === "update_sequence"
    );
    const inputSchema = updateSequenceTool?.inputSchema as
      | {
          required?: string[];
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["sequenceId"]);
    expect(inputSchema?.properties).toHaveProperty("enrollmentFieldPath");
    expect(inputSchema?.properties).toHaveProperty("clearEnrollmentFieldPath");
    expect(inputSchema?.properties).toHaveProperty("stopCondition");
    expect(inputSchema?.properties).toHaveProperty("branch");
    const enrollmentFieldPath = inputSchema?.properties?.[
      "enrollmentFieldPath"
    ] as
      | {
          type?: string;
          anyOf?: unknown;
        }
      | undefined;
    expect(enrollmentFieldPath?.type).toBe("string");
    expect(enrollmentFieldPath?.anyOf).toBeUndefined();
    const branch = inputSchema?.properties?.["branch"] as
      | {
          properties?: {
            branches?: { items?: { properties?: Record<string, unknown> } };
            elseSteps?: unknown;
          };
        }
      | undefined;
    expect(branch?.properties?.branches?.items?.properties).toHaveProperty(
      "steps"
    );
    const branchConditionType = branch?.properties?.branches?.items?.properties
      ?.conditionType as { enum?: string[] } | undefined;
    expect(branchConditionType?.enum).toContain("in_segment");
    expect(branchConditionType?.enum).toContain("event_received");
    expect(branchConditionType?.enum).toContain("link_clicked");
    expect(branch?.properties?.branches?.items?.properties).toHaveProperty(
      "segmentId"
    );
    expect(branch?.properties?.branches?.items?.properties).toHaveProperty(
      "eventName"
    );
    expect(branch?.properties?.branches?.items?.properties).toHaveProperty(
      "linkUrl"
    );
    expect(branch?.properties?.branches?.items?.properties).toHaveProperty(
      "activityScope"
    );
    expect(branch?.properties).toHaveProperty("elseSteps");
    const stopCondition = inputSchema?.properties?.["stopCondition"] as
      | {
          properties?: {
            type?: { enum?: string[] };
            value?: { type?: string | string[] };
          };
        }
      | undefined;
    expect(stopCondition?.properties?.type?.enum).toContain(
      "removed_from_list"
    );
    expect(stopCondition?.properties?.value?.type).toEqual(["string", "null"]);
  });

  it("passes branch and stop condition updates through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        updatedEmailCount: 0,
        stopCondition: { type: "has_tag", value: "customer" },
        addedBranchNodeId: "node_branch",
      },
    });

    const branch = {
      afterNodeId: "node_trigger",
      branches: [
        {
          conditionType: "has_tag",
          tagName: "trial_started",
          steps: [
            {
              subject: "Referral ask",
              blocks: [
                {
                  id: "if-body",
                  type: "text",
                  content: "<p>Can you refer us?</p>",
                },
              ],
            },
          ],
        },
      ],
      elseSteps: [
        {
          subject: "Improve ask",
          blocks: [
            {
              id: "else-body",
              type: "text",
              content: "<p>How can we improve?</p>",
            },
          ],
        },
      ],
    };
    const stopCondition = { type: "has_tag", value: "customer" };

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      stopCondition,
      branch,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        stopCondition,
        branch,
      },
      "comp_123"
    );
  });

  it("maps clearEnrollmentFieldPath to a null API update", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        enrollmentFieldPath: null,
      },
    });

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      clearEnrollmentFieldPath: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        enrollmentFieldPath: null,
      },
      "comp_123"
    );
  });

  it("rejects clearEnrollmentFieldPath with enrollmentFieldPath before hitting the API", async () => {
    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      enrollmentFieldPath: "order.id",
      clearEnrollmentFieldPath: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `enrollmentFieldPath` or `clearEnrollmentFieldPath` when calling `update_sequence`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("cancel_sequence_enrollments tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes a plain object schema with sequenceId required", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "cancel_sequence_enrollments"
    );
    const inputSchema = tool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
          anyOf?: unknown;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["sequenceId"]);
    expect(inputSchema?.anyOf).toBeUndefined();
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toHaveProperty("subscriberId");
    expect(inputSchema?.properties).toHaveProperty("fieldPath");
    expect(inputSchema?.properties).toHaveProperty("fieldValues");
    expect(inputSchema?.properties).toHaveProperty("dryRun");
    expect(inputSchema?.properties).toHaveProperty("reason");
  });

  it("passes field-value cancellation through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequenceId: "seq_123",
      dryRun: false,
      matchedCount: 2,
      cancelledCount: 2,
    });

    const result = await handleToolCall("cancel_sequence_enrollments", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      fieldPath: "order.id",
      fieldValues: ["ord_1", "ord_2"],
      dryRun: false,
      reason: "Orders cancelled",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq_123/enrollments/cancel",
      {
        fieldPath: "order.id",
        fieldValues: ["ord_1", "ord_2"],
        dryRun: false,
        reason: "Orders cancelled",
      },
      "comp_123"
    );
  });

  it("rejects mixed subscriber and field-value targets before hitting the API", async () => {
    const result = await handleToolCall("cancel_sequence_enrollments", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      subscriberId: "sub_123",
      fieldValues: ["ord_1"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide exactly one target when calling `cancel_sequence_enrollments`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("dashboard URL helpers", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("generates dashboard URLs from explicit IDs", async () => {
    const result = await handleToolCall("get_app_urls", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      campaignId: "camp_123",
      emailSendId: "send_123",
      settingsTab: "integrations",
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      urls: {
        sequence: string;
        campaign: string;
        emailSend: string;
        settingsTab: string;
      };
    };

    expect(payload.urls.sequence).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/sequences/seq_123"
    );
    expect(payload.urls.campaign).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/campaign/camp_123"
    );
    expect(payload.urls.emailSend).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/sent-emails/send_123"
    );
    expect(payload.urls.settingsTab).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/settings?tab=integrations"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("adds campaign edit and preview URLs to successful campaign tool responses", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: {
        id: "camp_123",
        name: "Launch",
        subject: "Hello",
        status: "draft",
      },
    });

    const result = await handleToolCall("create_campaign", {
      companyId: "comp_123",
      name: "Launch",
      subject: "Hello",
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      campaign: { url: string; previewUrl: string };
      appUrls: { campaign: string; campaignPreview: string };
    };

    expect(payload.campaign.url).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/campaign/camp_123"
    );
    expect(payload.campaign.previewUrl).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/campaign/camp_123?step=review"
    );
    expect(payload.appUrls.campaign).toBe(payload.campaign.url);
    expect(payload.appUrls.campaignPreview).toBe(payload.campaign.previewUrl);
  });
});

describe("create_list tool", () => {
  it("does not require segment filter fields in the published schema", () => {
    const createListTool = tools.find((tool) => tool.name === "create_list");
    const inputSchema = createListTool?.inputSchema as
      | {
          required?: string[];
          anyOf?: unknown;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["name"]);
    expect(inputSchema?.anyOf).toBeUndefined();
    expect(inputSchema?.properties).not.toHaveProperty("filters");
    expect(inputSchema?.properties).not.toHaveProperty("root");
  });
});

describe("create_segment tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes segment filter fields and root shape in the schema", () => {
    const createSegmentTool = tools.find(
      (tool) => tool.name === "create_segment"
    );
    const inputSchema = createSegmentTool?.inputSchema as
      | {
          required?: string[];
          properties?: {
            filterJoinOperator?: unknown;
            root?: unknown;
            filters?: {
              items?: {
                properties?: {
                  field?: {
                    enum?: string[];
                  };
                };
              };
            };
          };
          anyOf?: Array<{ required: string[] }>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["name"]);
    expect(inputSchema?.anyOf).toBeUndefined();
    expect(inputSchema?.properties).toHaveProperty("filterJoinOperator");
    expect(inputSchema?.properties).toHaveProperty("root");
    expect(
      inputSchema?.properties?.filters?.items?.properties?.field?.enum
    ).toEqual(
      expect.arrayContaining([
        "emailProvider",
        "stripeCurrentProduct",
        "stripeTrialProduct",
      ])
    );
  });

  it("rejects create_segment calls without filters or root before hitting the API", async () => {
    const result = await handleToolCall("create_segment", {
      companyId: "comp_123",
      name: "Missing filters",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `filters` or `root` when calling `create_segment`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects create_segment calls with both filters and root before hitting the API", async () => {
    const result = await handleToolCall("create_segment", {
      companyId: "comp_123",
      name: "Ambiguous filters",
      filters: [
        {
          field: "tag",
          operator: "contains",
          value: "vip",
        },
      ],
      root: {
        kind: "group",
        joinOperator: "and",
        children: [],
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `filters` or `root` when calling `create_segment`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("passes filterJoinOperator through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      segment: {
        id: "seg_123",
        name: "VIP or Churn Risk",
        filters: [],
        filterJoinOperator: "or",
      },
    });

    const result = await handleToolCall("create_segment", {
      companyId: "comp_123",
      name: "VIP or Churn Risk",
      filterJoinOperator: "or",
      filters: [
        {
          field: "tag",
          operator: "contains",
          value: "vip",
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/segments",
      expect.objectContaining({
        name: "VIP or Churn Risk",
        filterJoinOperator: "or",
      }),
      "comp_123"
    );
  });

  it("passes nested root through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      segment: {
        id: "seg_123",
        name: "Active non-buyers",
        filters: [],
        filterJoinOperator: "and",
        format: "v2",
      },
    });

    const root = {
      kind: "group",
      joinOperator: "and",
      children: [
        {
          kind: "filter",
          field: "event",
          operator: "is_not",
          value: "saas.purchase:30d",
        },
      ],
    };

    const result = await handleToolCall("create_segment", {
      companyId: "comp_123",
      name: "Active non-buyers",
      root,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/segments",
      expect.objectContaining({
        name: "Active non-buyers",
        root: expect.objectContaining({
          kind: "group",
          id: expect.any(String),
          children: [
            expect.objectContaining({
              kind: "filter",
              id: expect.any(String),
              field: "event",
            }),
          ],
        }),
      }),
      "comp_123"
    );
  });
});
