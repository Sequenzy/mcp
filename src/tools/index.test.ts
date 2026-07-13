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
  areLocalFileUploadsEnabled: () => false,
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

function getPublishedToolSchemas(tool: (typeof tools)[number]) {
  return [
    { name: `${tool.name}.inputSchema`, schema: tool.inputSchema },
    ...(tool.outputSchema
      ? [{ name: `${tool.name}.outputSchema`, schema: tool.outputSchema }]
      : []),
  ];
}

describe("account tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes and returns the current API key permission summary", async () => {
    const getAccountTool = tools.find((tool) => tool.name === "get_account");
    const outputProperties = getAccountTool?.outputSchema?.properties as
      | Record<string, unknown>
      | undefined;
    const apiKeyPermissions = {
      preset: "custom",
      fullAccess: false,
      scopes: ["account:read", "subscribers:read"],
      canDiscoverMarketingWork: false,
      missingMarketingReadScopes: [
        "campaigns:read",
        "sequences:read",
        "landing_pages:read",
      ],
      manageUrl:
        "https://sequenzy.com/dashboard/company/company_123/settings?tab=api-keys",
    };

    mockApiRequest.mockResolvedValueOnce({
      success: true,
      companies: [{ id: "company_123", name: "Lyvia" }],
      currentCompanyId: "company_123",
      apiKeyPermissions,
    });

    const result = await handleToolCall("get_account", {});

    expect(outputProperties).toHaveProperty("apiKeyPermissions");
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.["apiKeyPermissions"]).toEqual(
      apiKeyPermissions
    );
    expect(result.structuredContent?.["companies"]).toEqual([
      {
        id: "company_123",
        name: "Lyvia",
        url: "https://sequenzy.com/dashboard/company/company_123",
        settingsUrl:
          "https://sequenzy.com/dashboard/company/company_123/settings",
      },
    ]);
  });
});

describe("API key permission errors", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("makes a create_template scope failure recoverable", async () => {
    mockApiRequest.mockRejectedValueOnce(
      new Error("API key is missing required scope: templates:write")
    );

    const result = await handleToolCall("create_template", {
      companyId: "company_123",
      name: "Credits purchased",
      subject: "Your credits are ready",
      html: "<p>Your credits are ready.</p>",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("API key permission required");
    expect(result.content[0]?.text).toContain("`templates:write`");
    expect(result.content[0]?.text).toContain("`companies[].settingsUrl`");
    expect(result.content[0]?.text).toContain("https://sequenzy.com/dashboard");
    expect(result.content[0]?.text).toContain("replace `SEQUENZY_API_KEY`");
  });
});

describe("AI generation tools", () => {
  it("publishes branding controls for generate_email", () => {
    const generateEmailTool = tools.find(
      (tool) => tool.name === "generate_email"
    );
    const properties = generateEmailTool?.inputSchema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;

    expect(properties?.["applyBranding"]?.["type"]).toBe("boolean");
    expect(properties?.["emailType"]?.["enum"]).toEqual([
      "marketing",
      "transactional",
    ]);
  });

  it("forwards branding controls through generate_email", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      subject: "Password reset",
      previewText: "Reset your password securely",
      blocks: [],
    });

    await handleToolCall("generate_email", {
      companyId: "company_123",
      prompt: "Create a password reset email",
      applyBranding: false,
      emailType: "transactional",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/generate/email",
      {
        companyId: "company_123",
        prompt: "Create a password reset email",
        applyBranding: false,
        emailType: "transactional",
      },
      "company_123"
    );
  });
});

describe("tool schema compatibility", () => {
  it("publishes required boolean tool annotations", () => {
    const requiredHints = [
      "readOnlyHint",
      "destructiveHint",
      "openWorldHint",
    ] as const;
    const violations: string[] = [];

    for (const tool of tools) {
      const annotations = tool.annotations as
        | Record<(typeof requiredHints)[number], unknown>
        | undefined;

      for (const hint of requiredHints) {
        if (typeof annotations?.[hint] !== "boolean") {
          violations.push(`${tool.name}.annotations.${hint}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("publishes an output schema for every tool", () => {
    const violations = tools
      .filter((tool) => tool.outputSchema === undefined)
      .map((tool) => tool.name);

    expect(violations).toEqual([]);
  });

  it("publishes plain object roots for input and output schemas", () => {
    const violations: string[] = [];

    for (const tool of tools) {
      for (const { name, schema } of getPublishedToolSchemas(tool)) {
        const schemaRecord = schema as Record<string, unknown>;
        if (schemaRecord.type !== "object") {
          violations.push(name);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not publish unsupported root-level composition keywords", () => {
    const unsupportedRootKeywords = ["anyOf", "oneOf", "allOf", "enum", "not"];
    const violations: string[] = [];

    for (const tool of tools) {
      for (const { name, schema } of getPublishedToolSchemas(tool)) {
        const schemaRecord = schema as Record<string, unknown>;

        for (const keyword of unsupportedRootKeywords) {
          if (Object.prototype.hasOwnProperty.call(schemaRecord, keyword)) {
            violations.push(`${name}.${keyword}`);
          }
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it("does not publish anyOf anywhere in tool schemas", () => {
    const violations = tools.flatMap((tool) =>
      getPublishedToolSchemas(tool).flatMap(({ name, schema }) =>
        collectSchemaKeywordPaths(schema, "anyOf", name)
      )
    );

    expect(violations).toEqual([]);
  });

  it("publishes items for every array schema", () => {
    const violations = tools.flatMap((tool) =>
      getPublishedToolSchemas(tool).flatMap(({ name, schema }) =>
        collectArraySchemasWithoutItems(schema, name)
      )
    );

    expect(violations).toEqual([]);
  });

  it("publishes inverse tag branch conditions for update_sequence", () => {
    const updateSequenceTool = tools.find(
      (tool) => tool.name === "update_sequence"
    );
    const inputSchema = updateSequenceTool?.inputSchema as
      | Record<string, unknown>
      | undefined;
    const properties = inputSchema?.properties as
      | Record<string, unknown>
      | undefined;
    const branch = properties?.branch as Record<string, unknown> | undefined;
    const branchProperties = branch?.properties as
      | Record<string, unknown>
      | undefined;
    const branches = branchProperties?.branches as
      | Record<string, unknown>
      | undefined;
    const branchItem = branches?.items as Record<string, unknown> | undefined;
    const branchItemProperties = branchItem?.properties as
      | Record<string, unknown>
      | undefined;
    const conditionType = branchItemProperties?.conditionType as
      | Record<string, unknown>
      | undefined;

    expect(conditionType?.enum).toContain("does_not_have_tag");
  });
});

describe("create_api_key tool schema", () => {
  it("exposes permission preset and scopes inputs", () => {
    const tool = tools.find((candidate) => candidate.name === "create_api_key");
    expect(tool).toBeDefined();

    const properties = tool?.inputSchema.properties as
      | Record<string, { type?: string; items?: { type?: string } }>
      | undefined;

    expect(properties?.["preset"]?.type).toBe("string");
    expect(properties?.["scopes"]?.type).toBe("array");
    expect(properties?.["scopes"]?.items?.type).toBe("string");
    expect(tool?.inputSchema.required).toEqual(["companyId"]);
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

describe("update_company tool validation", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes an update_company tool with editable product info fields", () => {
    const updateCompanyTool = tools.find(
      (tool) => tool.name === "update_company"
    );
    const inputSchema = updateCompanyTool?.inputSchema as
      | {
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(updateCompanyTool).toBeDefined();
    expect(inputSchema?.additionalProperties).toBeUndefined();
    expect(inputSchema?.properties).toHaveProperty("primaryColor");
    expect(inputSchema?.properties).toHaveProperty("companyContext");
    expect(inputSchema?.properties).toHaveProperty("toneVoice");
    expect(inputSchema?.properties).toHaveProperty("valueProps");
    expect(inputSchema?.properties).toHaveProperty("fromEmail");
    expect(inputSchema?.properties).toHaveProperty("replyTo");
  });

  it("calls the company PATCH API with editable fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      company: {
        id: "company_123",
        primaryColor: "#0ea5e9",
      },
    });

    const result = await handleToolCall("update_company", {
      companyId: "company_123",
      primaryColor: "#0EA5E9",
      companyContext: "Lifecycle emails for SaaS teams.",
      toneVoice: "clear, direct, warm",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/companies/company_123",
      {
        primaryColor: "#0EA5E9",
        toneVoice: "clear, direct, warm",
        companyContext: "Lifecycle emails for SaaS teams.",
      }
    );
  });

  it("rejects update_company calls without update fields", async () => {
    const result = await handleToolCall("update_company", {
      companyId: "company_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `description`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects invalid update_company primary colors", async () => {
    const result = await handleToolCall("update_company", {
      companyId: "company_123",
      primaryColor: "blue",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`primaryColor` must be a 6-digit hex color"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("forwards account-wide From and Reply-To defaults", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, company: {} });

    const result = await handleToolCall("update_company", {
      companyId: "company_123",
      fromEmail: "hello@example.com",
      fromName: "Acme",
      replyTo: "support@example.com",
      replyToName: "Acme Support",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/companies/company_123",
      {
        fromEmail: "hello@example.com",
        fromName: "Acme",
        replyTo: "support@example.com",
        replyToName: "Acme Support",
      }
    );
  });
});

describe("sending domain tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes and routes canonical sending-domain creation with DNS records", async () => {
    const tool = tools.find(
      (candidate) => candidate.name === "add_sending_domain"
    );
    expect(tool?.inputSchema.required).toEqual(["domain"]);
    expect(tool?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
      openWorldHint: true,
    });

    const website = {
      domain: "mail.example.com",
      status: "not_started",
      dnsRecords: {
        byodkimRecord: {
          name: "sequenzy._domainkey.mail.example.com",
          value: "p=public-key",
        },
        spfRecord: {
          name: "send.mail.example.com",
          value: "v=spf1 include:amazonses.com ~all",
        },
        mxRecord: {
          name: "send.mail.example.com",
          value: "feedback-smtp.us-east-1.amazonses.com",
          priority: 10,
        },
      },
    };
    mockApiRequest.mockResolvedValueOnce({ success: true, website });

    const result = await handleToolCall("add_sending_domain", {
      companyId: "company_123",
      domain: "mail.example.com",
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.["website"]).toEqual(website);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/websites",
      { domain: "mail.example.com" },
      "company_123"
    );
  });

  it("keeps add_website as a compatibility alias", async () => {
    const tool = tools.find((candidate) => candidate.name === "add_website");
    const canonicalTool = tools.find(
      (candidate) => candidate.name === "add_sending_domain"
    );
    expect(tool?.description).toContain("Compatibility alias");
    expect(tool?.inputSchema.required).toEqual(
      canonicalTool?.inputSchema.required
    );
    const website = {
      domain: "mail.example.com",
      dnsRecords: {
        spfRecord: {
          name: "send.mail.example.com",
          value: "v=spf1 include:amazonses.com ~all",
        },
      },
    };
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      website,
    });

    const result = await handleToolCall("add_website", {
      companyId: "company_123",
      domain: "mail.example.com",
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent?.["website"]).toEqual(website);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/websites",
      { domain: "mail.example.com" },
      "company_123"
    );
  });

  it("publishes and routes fresh sending-domain verification", async () => {
    const tool = tools.find(
      (candidate) => candidate.name === "verify_sending_domain"
    );
    expect(tool?.inputSchema.required).toEqual(["domain"]);
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      verified: true,
      website: { domain: "mail.example.com", status: "verified" },
    });

    const result = await handleToolCall("verify_sending_domain", {
      companyId: "company_123",
      domain: "mail.example.com",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/websites/mail.example.com/verify",
      undefined,
      "company_123"
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

  it("passes machine engagement flags through analytics tools", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      stats: { sent: 1 },
    });

    await handleToolCall("get_stats", {
      companyId: "company_123",
      period: "7d",
      includeMachineEngagement: true,
    });
    await handleToolCall("get_campaign_stats", {
      companyId: "company_123",
      campaignId: "camp_123",
      includeMachineEngagement: true,
    });
    await handleToolCall("get_sequence_stats", {
      companyId: "company_123",
      sequenceId: "seq_123",
      includeMachineEngagement: true,
    });
    await handleToolCall("get_ab_test_stats", {
      companyId: "company_123",
      abTestId: "ab_123",
      includeMachineEngagement: true,
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/api/v1/metrics?period=7d&includeMachineEngagement=true",
      undefined,
      "company_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/api/v1/metrics/campaigns/camp_123?includeMachineEngagement=true",
      undefined,
      "company_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      3,
      "GET",
      "/api/v1/metrics/sequences/seq_123?includeMachineEngagement=true",
      undefined,
      "company_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      4,
      "GET",
      "/api/v1/ab-tests/ab_123/stats?includeMachineEngagement=true",
      undefined,
      "company_123"
    );
  });

  it("calls campaign and sequence event APIs with pagination filters", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      events: [],
      pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
    });

    await handleToolCall("list_campaign_events", {
      companyId: "company_123",
      campaignId: "camp_123",
      eventTypes: ["delivery", "click"],
      page: 2,
      limit: 50,
      includeMachineEngagement: true,
    });
    await handleToolCall("list_sequence_events", {
      companyId: "company_123",
      sequenceId: "seq_123",
      eventType: "delivery",
      period: "30d",
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/api/v1/metrics/campaigns/camp_123/events?eventTypes=delivery%2Cclick&page=2&limit=50&includeMachineEngagement=true",
      undefined,
      "company_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/api/v1/metrics/sequences/seq_123/events?eventTypes=delivery&period=30d",
      undefined,
      "company_123"
    );
  });

  it("rejects invalid event types before calling the event APIs", async () => {
    const result = await handleToolCall("list_campaign_events", {
      campaignId: "camp_123",
      eventTypes: ["delivery", "purchase"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`eventTypes` item 2 must be one of send, delivery, bounce, complaint, open, click, unsubscribe, delivery_delay"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
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

describe("subscriber analytics tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("passes machine engagement flags through subscriber detail tools", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: {
        email: "user@example.com",
        emailStats: null,
        activity: [],
        sequenceEnrollments: [],
      },
    });

    await handleToolCall("get_subscriber", {
      companyId: "company_123",
      email: "user@example.com",
      includeMachineEngagement: true,
    });
    await handleToolCall("get_subscriber_activity", {
      companyId: "company_123",
      externalId: "user_123",
      includeMachineEngagement: true,
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "GET",
      "/api/v1/subscribers/user%40example.com?includeMachineEngagement=true",
      undefined,
      "company_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "GET",
      "/api/v1/subscribers/external?includeMachineEngagement=true&externalId=user_123",
      undefined,
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

  it("forwards prompt creation directly to the transactional API", async () => {
    mockApiRequest.mockResolvedValueOnce({
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
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/transactional",
      {
        name: "Password Reset",
        slug: "password-reset",
        prompt: "Create a concise password reset email with RESET_URL.",
        style: "minimal",
        tone: "professional",
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

  it("publishes sending identity update fields in the schema", () => {
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
    expect(inputSchema?.properties).toHaveProperty("fromEmail");
    expect(inputSchema?.properties).toHaveProperty("senderProfileId");
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
    expect(
      (
        inputSchema?.properties?.["targetLists"] as
          | { description?: string }
          | undefined
      )?.description
    ).toContain("{type:'rules'");
    expect(inputSchema?.properties).toHaveProperty("sendTimeOptimization");
    expect(inputSchema?.properties).toHaveProperty("spreadOverHours");
  });

  it("rejects update_campaign calls that omit all supported update fields", async () => {
    const result = await handleToolCall("update_campaign", {
      campaignId: "camp_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one campaign content, sending identity"
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

  it("forwards rules audience targeting to the schedule endpoint", async () => {
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

    const targetLists = {
      type: "rules",
      include: [{ type: "lists", listIds: ["list_123"] }],
      exclude: [{ type: "segments", segmentIds: ["seg_123"] }],
    };
    const result = await handleToolCall("schedule_campaign", {
      companyId: "comp_123",
      campaignId: "camp_123",
      scheduledAt: "2026-06-01T14:00:00Z",
      targetLists,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/schedule",
      {
        scheduledAt: "2026-06-01T14:00:00Z",
        targetLists,
      },
      "comp_123"
    );
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

  it("forwards recurringInterval to the schedule endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: {
        id: "camp_123",
        name: "Monthly digest",
        subject: "Hello",
        status: "scheduled",
      },
      scheduledAt: "2026-06-01T14:00:00.000Z",
    });

    const result = await handleToolCall("schedule_campaign", {
      companyId: "comp_123",
      campaignId: "camp_123",
      scheduledAt: "2026-06-01T14:00:00Z",
      recurringInterval: "monthly",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/schedule",
      {
        scheduledAt: "2026-06-01T14:00:00Z",
        recurringInterval: "monthly",
      },
      "comp_123"
    );
  });

  it("rejects an invalid recurringInterval before hitting the API", async () => {
    const result = await handleToolCall("schedule_campaign", {
      campaignId: "camp_123",
      scheduledAt: "2026-06-01T14:00:00Z",
      recurringInterval: "daily",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`recurringInterval` must be 'weekly' or 'monthly' when calling `schedule_campaign`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("sync rules tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("fetches sync rules", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      syncRules: [],
      isDefault: true,
    });

    const result = await handleToolCall("get_sync_rules", {
      companyId: "comp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/sync-rules",
      undefined,
      "comp_123"
    );
  });

  it("replaces sync rules", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      syncRules: [],
      isDefault: false,
    });

    const syncRules = [
      {
        triggerEvent: "ecommerce.order_placed",
        actions: { addTags: ["vinyl-collector"], removeTags: [] },
        conditions: { purchasedProduct: { tags: ["Vinyl"] } },
      },
    ];
    const result = await handleToolCall("update_sync_rules", {
      companyId: "comp_123",
      syncRules,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sync-rules",
      { syncRules },
      "comp_123"
    );
  });

  it("resets sync rules with null", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      syncRules: [],
      isDefault: true,
    });

    const result = await handleToolCall("update_sync_rules", {
      syncRules: null,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sync-rules",
      { syncRules: null },
      undefined
    );
  });

  it("rejects non-array sync rules before hitting the API", async () => {
    const result = await handleToolCall("update_sync_rules", {
      syncRules: "nope",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`syncRules` must be an array of rules or null when calling `update_sync_rules`."
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
      "Provide exactly one of `prompt`, `html`, or `blocks` when calling `create_template`."
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

  it("forwards prompt template creation directly to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      template: {
        id: "tmpl_123",
        name: "[Template] Welcome",
        subject: "Generated welcome",
        labels: [],
      },
    });

    const result = await handleToolCall("create_template", {
      companyId: "comp_123",
      name: "Welcome",
      prompt: "Welcome new customers",
      style: "branded",
      tone: "friendly",
      previewText: null,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates",
      {
        name: "Welcome",
        prompt: "Welcome new customers",
        style: "branded",
        tone: "friendly",
        previewText: null,
      },
      "comp_123"
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

describe("landing page tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes landing page management tools with plain object schemas", () => {
    const toolNames = tools.map((tool) => tool.name);
    const createTool = tools.find(
      (tool) => tool.name === "create_landing_page"
    );
    const updateTool = tools.find(
      (tool) => tool.name === "update_landing_page"
    );
    const domainTool = tools.find(
      (tool) => tool.name === "update_landing_page_domain_settings"
    );
    const createSchema = createTool?.inputSchema as
      | {
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
          required?: string[];
        }
      | undefined;
    const updateSchema = updateTool?.inputSchema as
      | {
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
          required?: string[];
        }
      | undefined;
    const domainSchema = domainTool?.inputSchema as
      | {
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(toolNames).toContain("list_landing_pages");
    expect(toolNames).toContain("get_landing_page");
    expect(toolNames).toContain("create_landing_page");
    expect(toolNames).toContain("update_landing_page");
    expect(toolNames).toContain("delete_landing_page");
    expect(toolNames).toContain("publish_landing_page");
    expect(toolNames).toContain("unpublish_landing_page");
    expect(toolNames).toContain("connect_landing_page_domain");
    expect(toolNames).toContain("update_landing_page_domain_settings");
    expect(createSchema?.additionalProperties).toBe(false);
    expect(createSchema?.required).toBeUndefined();
    expect(createSchema?.properties).toHaveProperty("content");
    expect(createSchema?.properties).toHaveProperty("template");
    expect(updateSchema?.required).toEqual(["landingPageId"]);
    expect(updateSchema?.additionalProperties).toBe(false);
    expect(updateSchema?.properties).toHaveProperty("content");
    expect(domainSchema?.additionalProperties).toBe(false);
    expect(domainSchema?.properties).toHaveProperty("domain");
    expect(domainSchema?.properties).toHaveProperty("verify");
  });

  it("routes list_landing_pages to the landing page API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      companyId: "comp_123",
      landingPages: [],
    });

    const result = await handleToolCall("list_landing_pages", {
      companyId: "comp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/landing-pages",
      undefined,
      "comp_123"
    );
  });

  it("routes create_landing_page to the landing page API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      landingPage: {
        id: "lp_123",
        companyId: "comp_123",
        name: "Launch",
      },
    });

    const result = await handleToolCall("create_landing_page", {
      companyId: "comp_123",
      name: "Launch",
      template: "waitlist",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/landing-pages",
      {
        name: "Launch",
        template: "waitlist",
      },
      "comp_123"
    );
  });

  it("rejects empty update_landing_page calls before hitting the API", async () => {
    const result = await handleToolCall("update_landing_page", {
      companyId: "comp_123",
      landingPageId: "lp_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `slug`, or `content`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("routes publish_landing_page and unpublish_landing_page", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        landingPage: { id: "lp_123", companyId: "comp_123" },
      })
      .mockResolvedValueOnce({
        success: true,
        landingPage: { id: "lp_123", companyId: "comp_123" },
      });

    await handleToolCall("publish_landing_page", {
      companyId: "comp_123",
      landingPageId: "lp_123",
    });
    await handleToolCall("unpublish_landing_page", {
      companyId: "comp_123",
      landingPageId: "lp_123",
      slug: "draft-page",
    });

    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/v1/landing-pages/lp_123/publish",
      {},
      "comp_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/landing-pages/lp_123/unpublish",
      { slug: "draft-page" },
      "comp_123"
    );
  });

  it("routes landing page domain tools and validates empty settings updates", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      domain: { domain: "pages.example.com" },
    });

    const connectResult = await handleToolCall("connect_landing_page_domain", {
      companyId: "comp_123",
      domain: "pages.example.com",
    });
    const emptyUpdateResult = await handleToolCall(
      "update_landing_page_domain_settings",
      {
        companyId: "comp_123",
      }
    );

    expect(connectResult.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/landing-pages/domain",
      { domain: "pages.example.com" },
      "comp_123"
    );
    expect(emptyUpdateResult.isError).toBe(true);
    expect(emptyUpdateResult.content[0]?.text).toContain(
      "Provide `domain` or `verify: true`"
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
    expect(inputSchema?.properties).toHaveProperty("status");
    expect(inputSchema?.properties).toHaveProperty("sentAt");
    expect(inputSchema?.properties).toHaveProperty("previewText");
    expect(inputSchema?.properties).toHaveProperty("fromEmail");
    expect(inputSchema?.properties).toHaveProperty("replyTo");
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

  it("forwards prompt creation directly to the campaign API", async () => {
    mockApiRequest.mockResolvedValueOnce({
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
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns",
      {
        name: "Launch",
        prompt: "Announce the new dashboard",
        style: "branded",
        tone: "friendly",
        labels: ["edm"],
      },
      "comp_123"
    );
  });

  it("forwards campaign sending identity fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: { id: "camp_123", name: "Launch", subject: "Hello" },
    });

    const result = await handleToolCall("create_campaign", {
      companyId: "comp_123",
      name: "Launch",
      subject: "Hello",
      fromEmail: "hello@example.com",
      fromName: "Acme",
      replyTo: "support@example.com",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns",
      {
        name: "Launch",
        subject: "Hello",
        fromEmail: "hello@example.com",
        fromName: "Acme",
        replyTo: "support@example.com",
      },
      "comp_123"
    );
  });

  it("passes tracking code when creating a prompt-based campaign", async () => {
    mockApiRequest.mockResolvedValueOnce({
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
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns",
      {
        name: "Launch",
        prompt: "Announce the new dashboard",
        trackingCode: "AKL-01May2026",
      },
      undefined
    );
  });

  it("passes imported sent status when creating a prompt-based campaign", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: {
        id: "camp_123",
        name: "Launch",
        subject: "Generated launch subject",
        status: "sent",
        sentAt: "2026-05-01T14:00:00.000Z",
      },
    });

    const result = await handleToolCall("create_campaign", {
      name: "Launch",
      prompt: "Announce the new dashboard",
      status: "sent",
      sentAt: "2026-05-01T14:00:00Z",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns",
      {
        name: "Launch",
        prompt: "Announce the new dashboard",
        status: "sent",
        sentAt: "2026-05-01T14:00:00Z",
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
    expect(inputSchema?.properties).toHaveProperty("durationDays");
    expect(inputSchema?.properties).toHaveProperty("steps");
    expect(inputSchema?.properties).toHaveProperty("sendingWindow");
    expect(inputSchema?.properties).toHaveProperty("stopCondition");
    expect(inputSchema?.properties).toHaveProperty("fromEmail");
    expect(inputSchema?.properties).toHaveProperty("replyTo");
    const steps = inputSchema?.properties?.["steps"] as
      | {
          items?: {
            properties?: Record<string, unknown>;
          };
        }
      | undefined;
    expect(steps?.items?.properties).toHaveProperty("delayMs");
    expect(steps?.items?.properties).toHaveProperty("waitUntil");
    expect(steps?.items?.properties).toHaveProperty("nodeType");
    expect(steps?.items?.properties).toHaveProperty("config");
    const createStepNodeType = steps?.items?.properties?.["nodeType"] as
      | { enum?: string[] }
      | undefined;
    expect(createStepNodeType?.enum).toContain("action_update_attributes");
    const createStepConfig = steps?.items?.properties?.["config"] as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(createStepConfig?.properties).toHaveProperty(
      "customAttributeUpdates"
    );
    expect(createSequenceTool?.description).toContain(
      "dynamically create a provider discount/code"
    );
    const discount = steps?.items?.properties?.["discount"] as
      | {
          properties?: {
            provider?: { enum?: string[]; description?: string };
            codePrefix?: { description?: string };
          };
        }
      | undefined;
    expect(discount?.properties?.provider?.enum).toEqual(["stripe", "shopify"]);
    expect(discount?.properties?.provider?.description).toContain(
      "dynamically create"
    );
    expect(discount?.properties?.codePrefix?.description).toContain(
      "subscriber/token suffix"
    );
    const delay = steps?.items?.properties?.["delay"] as
      | { properties?: Record<string, unknown> }
      | undefined;
    expect(delay?.properties).toHaveProperty("mode");
    expect(delay?.properties).toHaveProperty("untilDateField");
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
    expect(stopCondition?.properties?.type?.enum).toContain("entered_segment");
    expect(stopCondition?.properties?.type?.enum).toContain("field_changed");
    expect(stopCondition?.properties?.value?.type).toEqual(["string", "null"]);
    expect(createSequenceTool?.description).toContain("saas.trial_cancelled");
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
        delayMs: 86_400_000,
        html: "<p>Use {{discount.code}}</p>",
      },
    ];
    const sendingWindow = {
      enabled: true,
      timezone: "Europe/Kiev",
      startTime: "08:00",
      endTime: "20:00",
      days: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    };

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
      sendingWindow,
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
        sendingWindow,
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

  it("creates explicit Update Subscriber steps with event merge tags", async () => {
    const steps = [
      {
        type: "update_subscriber",
        nodeType: "action_update_attributes",
        config: {
          firstName: "{{event.firstName}}",
          customAttributeUpdates: [
            { name: "plan", value: "{{event.plan}}", valueType: "text" },
            { name: "mrr", value: "{{event.amount}}", valueType: "number" },
            {
              name: "active",
              value: "{{event.active}}",
              valueType: "boolean",
            },
          ],
        },
      },
    ];

    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        sequence: {
          id: "seq_123",
          name: "Purchase profile",
          status: "draft",
          emailCount: 0,
          subscriberUpdateCount: 1,
          nodeCount: 3,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        sequence: {
          id: "seq_123",
          name: "Purchase profile",
          status: "draft",
          enrichmentStatus: "complete",
          emailCount: 0,
          enrichedCount: 0,
          nodes: [],
        },
      });

    const result = await handleToolCall("create_sequence", {
      companyId: "comp_123",
      name: "Purchase profile",
      trigger: "event_received",
      eventName: "saas.purchase",
      steps,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/v1/sequences",
      {
        companyId: "comp_123",
        name: "Purchase profile",
        trigger: "event_received",
        eventName: "saas.purchase",
        steps,
      },
      "comp_123"
    );
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
    expect(inputSchema?.properties).toHaveProperty("enrollmentPaused");
    expect(inputSchema?.properties).toHaveProperty("confirmStructuralChange");
    expect(inputSchema?.properties).toHaveProperty("sendingWindow");
    expect(inputSchema?.properties).toHaveProperty("clearSendingWindow");
    expect(inputSchema?.properties).toHaveProperty("bccEmails");
    expect(inputSchema?.properties).toHaveProperty("clearBccEmails");
    expect(inputSchema?.properties).toHaveProperty("fromEmail");
    expect(inputSchema?.properties).toHaveProperty("replyTo");
    expect(inputSchema?.properties).toHaveProperty("stopCondition");
    expect(inputSchema?.properties).toHaveProperty("branch");
    expect(inputSchema?.properties).toHaveProperty("insertSteps");
    expect(inputSchema?.properties).toHaveProperty("subscriberUpdateSteps");
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
    const insertSteps = inputSchema?.properties?.["insertSteps"] as
      | {
          required?: string[];
          properties?: {
            afterNodeId?: unknown;
            steps?: { items?: { properties?: Record<string, unknown> } };
          };
        }
      | undefined;
    expect(insertSteps?.required).toEqual(["steps"]);
    expect(insertSteps?.properties).toHaveProperty("afterNodeId");
    expect(insertSteps?.properties?.steps?.items?.properties).toHaveProperty(
      "subject"
    );
    expect(insertSteps?.properties?.steps?.items?.properties).toHaveProperty(
      "blocks"
    );
    expect(insertSteps?.properties?.steps?.items?.properties).toHaveProperty(
      "waitUntil"
    );
    expect(insertSteps?.properties?.steps?.items?.properties).toHaveProperty(
      "senderProfileId"
    );
    expect(insertSteps?.properties?.steps?.items?.properties).toHaveProperty(
      "replyProfileId"
    );
    const emails = inputSchema?.properties?.["emails"] as
      | { items?: { properties?: Record<string, unknown> } }
      | undefined;
    expect(emails?.items?.properties).toHaveProperty("fromEmail");
    expect(emails?.items?.properties).toHaveProperty("replyTo");
    const insertedStepType = insertSteps?.properties?.steps?.items?.properties
      ?.type as { enum?: string[] } | undefined;
    const insertedStepNodeType = insertSteps?.properties?.steps?.items
      ?.properties?.nodeType as { enum?: string[] } | undefined;
    expect(insertedStepType?.enum).toContain("condition");
    expect(insertedStepType?.enum).not.toContain("ab_test");
    expect(insertedStepNodeType?.enum).toContain("logic_condition");
    expect(insertedStepNodeType?.enum).not.toContain("action_ab_test");
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
    expect(stopCondition?.properties?.type?.enum).toContain("entered_segment");
    expect(stopCondition?.properties?.type?.enum).toContain("field_changed");
    expect(stopCondition?.properties?.value?.type).toEqual(["string", "null"]);
  });

  it("forwards sequence From and Reply-To overrides", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      fromEmail: "hello@example.com",
      fromName: "Acme",
      replyTo: "support@example.com",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        fromEmail: "hello@example.com",
        fromName: "Acme",
        replyTo: "support@example.com",
      },
      "comp_123"
    );
  });

  it("rejects invalid per-step sender identity combinations before hitting the API", async () => {
    const cases: Array<{
      input: Record<string, unknown>;
      expectedMessage: string;
    }> = [
      {
        input: {
          emails: [
            {
              nodeId: "node_email",
              senderProfileId: "sender_123",
              fromEmail: "sender@example.com",
            },
          ],
        },
        expectedMessage: "either `senderProfileId` or `fromEmail`",
      },
      {
        input: {
          insertSteps: {
            afterNodeId: "node_email",
            steps: [
              {
                subject: "Inserted",
                html: "<p>Inserted.</p>",
                replyProfileId: "reply_123",
                replyTo: "reply@example.com",
              },
            ],
          },
        },
        expectedMessage: "either `replyProfileId` or `replyTo`",
      },
      {
        input: {
          branch: {
            afterNodeId: "node_email",
            branches: [
              {
                conditionType: "has_tag",
                tagName: "engaged",
                steps: [
                  {
                    subject: "Branch",
                    html: "<p>Branch.</p>",
                    replyToName: "Support",
                  },
                ],
              },
            ],
          },
        },
        expectedMessage: "`replyToName` requires `replyTo`",
      },
    ];

    for (const testCase of cases) {
      const result = await handleToolCall("update_sequence", {
        companyId: "comp_123",
        sequenceId: "seq_123",
        ...testCase.input,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain(testCase.expectedMessage);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("forwards targeted Update Subscriber config replacements", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });
    const subscriberUpdateSteps = [
      {
        nodeId: "node_update",
        config: {
          customAttributeUpdates: [
            { name: "mrr", value: "{{event.amount}}", valueType: "number" },
          ],
        },
      },
    ];

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      subscriberUpdateSteps,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        subscriberUpdateSteps,
      },
      "comp_123"
    );
  });

  it("passes linear step insertion through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        updatedEmailCount: 0,
        insertedNodeIds: ["node_inserted"],
        insertedEmailIds: ["email_inserted"],
        insertedEmailCount: 1,
      },
    });

    const insertSteps = {
      afterNodeId: "node_migration_email",
      steps: [
        {
          name: "Migration check-in",
          subject: "Need help migrating?",
          blocks: [
            {
              id: "inserted-body",
              type: "text",
              content: "<p>Here is one more migration resource.</p>",
            },
          ],
        },
      ],
    };

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      confirmStructuralChange: true,
      insertSteps,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        confirmStructuralChange: true,
        insertSteps,
      },
      "comp_123"
    );
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

  it("passes enrollment pause updates through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "active",
        enrollmentPaused: true,
      },
    });

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      enrollmentPaused: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        enrollmentPaused: true,
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

  it("maps clearSendingWindow to a null API update", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        sendingWindow: null,
      },
    });

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      clearSendingWindow: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        sendingWindow: null,
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

  it("maps clearBccEmails to a null API update", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        bccEmails: null,
      },
    });

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      clearBccEmails: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        bccEmails: null,
      },
      "comp_123"
    );
  });

  it("forwards bccEmails to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        bccEmails: ["cs-team@example.com", "founder@example.com"],
      },
    });

    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      bccEmails: ["cs-team@example.com", "founder@example.com"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        companyId: "comp_123",
        sequenceId: "seq_123",
        bccEmails: ["cs-team@example.com", "founder@example.com"],
      },
      "comp_123"
    );
  });

  it("rejects clearBccEmails with bccEmails before hitting the API", async () => {
    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      bccEmails: ["cs-team@example.com"],
      clearBccEmails: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `bccEmails` or `clearBccEmails` when calling `update_sequence`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects clearSendingWindow with sendingWindow before hitting the API", async () => {
    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      sendingWindow: {
        enabled: true,
        timezone: "Europe/Kiev",
        startTime: "08:00",
        endTime: "20:00",
      },
      clearSendingWindow: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `sendingWindow` or `clearSendingWindow` when calling `update_sequence`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects branch and linear insertion together before hitting the API", async () => {
    const result = await handleToolCall("update_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      branch: {
        afterNodeId: "node_email_1",
        branches: [{ conditionType: "has_tag", tagName: "activated" }],
        allowEmptyPaths: true,
      },
      insertSteps: {
        afterNodeId: "node_email_1",
        steps: [
          {
            subject: "Inserted",
            blocks: [
              {
                id: "inserted-body",
                type: "text",
                content: "<p>Inserted.</p>",
              },
            ],
          },
        ],
      },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `branch` or `insertSteps` when calling `update_sequence`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("insert_sequence_step tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes a focused insertion schema", () => {
    const insertSequenceStepTool = tools.find(
      (tool) => tool.name === "insert_sequence_step"
    );
    const inputSchema = insertSequenceStepTool?.inputSchema as
      | {
          required?: string[];
          additionalProperties?: boolean;
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["sequenceId"]);
    expect(inputSchema?.additionalProperties).toBe(false);
    expect(inputSchema?.properties).toHaveProperty("afterNodeId");
    expect(inputSchema?.properties).toHaveProperty("confirmStructuralChange");
    expect(inputSchema?.properties).toHaveProperty("subject");
    expect(inputSchema?.properties).toHaveProperty("previewText");
    expect(inputSchema?.properties).toHaveProperty("html");
    expect(inputSchema?.properties).toHaveProperty("blocks");
    expect(inputSchema?.properties).toHaveProperty("delay");
    expect(inputSchema?.properties).toHaveProperty("delayMs");
    expect(inputSchema?.properties).toHaveProperty("waitUntil");
    expect(inputSchema?.properties).toHaveProperty("type");
    expect(inputSchema?.properties).toHaveProperty("text");
    expect(inputSchema?.properties).toHaveProperty("ineligibleAction");
    expect(inputSchema?.properties).toHaveProperty("senderProfileId");
    expect(inputSchema?.properties).toHaveProperty("fromEmail");
    expect(inputSchema?.properties).toHaveProperty("fromName");
    expect(inputSchema?.properties).toHaveProperty("replyProfileId");
    expect(inputSchema?.properties).toHaveProperty("replyTo");
    expect(inputSchema?.properties).toHaveProperty("replyToName");
  });

  it("rejects conflicting sender fields before hitting the API", async () => {
    const result = await handleToolCall("insert_sequence_step", {
      sequenceId: "seq_123",
      subject: "Need help migrating?",
      html: "<p>Hello</p>",
      senderProfileId: "sender_123",
      fromEmail: "sender@example.com",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "either `senderProfileId` or `fromEmail`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects email steps without a subject", async () => {
    const result = await handleToolCall("insert_sequence_step", {
      sequenceId: "seq_123",
      html: "<p>Missing subject</p>",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("subject");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("wraps an SMS step in update_sequence insertSteps", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        updatedEmailCount: 0,
        insertedNodeIds: ["delay_inserted", "node_sms"],
      },
    });

    const result = await handleToolCall("insert_sequence_step", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      type: "sms",
      afterNodeId: "node_email",
      text: "Hey {{FIRST_NAME}}, your order shipped!",
      label: "Shipping text",
      ineligibleAction: "skip",
      delay: { days: 1 },
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        insertSteps: {
          afterNodeId: "node_email",
          steps: [
            {
              type: "sms",
              text: "Hey {{FIRST_NAME}}, your order shipped!",
              label: "Shipping text",
              ineligibleAction: "skip",
              delay: { days: 1 },
            },
          ],
        },
      },
      "comp_123"
    );
  });

  it("rejects SMS steps without text or blocks", async () => {
    const result = await handleToolCall("insert_sequence_step", {
      sequenceId: "seq_123",
      type: "sms",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("text");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("passes smsSteps updates through update_sequence", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "SMS Sequence",
        status: "draft",
        updatedEmailCount: 0,
        updatedSmsStepCount: 1,
      },
    });

    const result = await handleToolCall("update_sequence", {
      sequenceId: "seq_123",
      smsSteps: [
        {
          nodeId: "node_sms",
          text: "Updated message",
          ineligibleAction: "exit",
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        sequenceId: "seq_123",
        smsSteps: [
          {
            nodeId: "node_sms",
            text: "Updated message",
            ineligibleAction: "exit",
          },
        ],
      },
      undefined
    );
  });

  it("wraps one new delayed email step in update_sequence insertSteps", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Activation Sequence",
        status: "draft",
        updatedEmailCount: 0,
        insertedNodeIds: ["delay_inserted", "node_inserted"],
        insertedEmailIds: ["email_inserted"],
        insertedEmailCount: 1,
      },
    });

    const blocks = [
      {
        id: "inserted-body",
        type: "text",
        content: "<p>Here is one more migration resource.</p>",
      },
    ];

    const result = await handleToolCall("insert_sequence_step", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      afterNodeId: "node_migration_email",
      confirmStructuralChange: true,
      delay: { days: 2 },
      name: "Migration check-in",
      subject: "Need help migrating?",
      previewText: "A migration resource",
      blocks,
      fromEmail: "michael@example.com",
      fromName: "Michael",
      replyTo: "support@example.com",
      replyToName: "Support",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        confirmStructuralChange: true,
        insertSteps: {
          afterNodeId: "node_migration_email",
          steps: [
            {
              subject: "Need help migrating?",
              name: "Migration check-in",
              previewText: "A migration resource",
              blocks,
              delay: { days: 2 },
              fromEmail: "michael@example.com",
              fromName: "Michael",
              replyTo: "support@example.com",
              replyToName: "Support",
            },
          ],
        },
      },
      "comp_123"
    );
  });

  it("wraps one new wait-until-date email step in update_sequence insertSteps", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequence: {
        id: "seq_123",
        name: "Renewal Sequence",
        status: "draft",
        updatedEmailCount: 0,
        insertedNodeIds: ["delay_inserted", "node_inserted"],
        insertedEmailIds: ["email_inserted"],
        insertedEmailCount: 1,
      },
    });

    const result = await handleToolCall("insert_sequence_step", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      afterNodeId: "node_renewal_email",
      waitUntil: {
        field: "renews_at",
        direction: "before",
        offset: { days: 2 },
        missingAction: "exit",
      },
      subject: "Renewal reminder",
      html: "<p>Your renewal is coming up.</p>",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_123",
      {
        insertSteps: {
          afterNodeId: "node_renewal_email",
          steps: [
            {
              subject: "Renewal reminder",
              html: "<p>Your renewal is coming up.</p>",
              waitUntil: {
                field: "renews_at",
                direction: "before",
                offset: { days: 2 },
                missingAction: "exit",
              },
            },
          ],
        },
      },
      "comp_123"
    );
  });

  it("rejects insert_sequence_step without email content before hitting the API", async () => {
    const result = await handleToolCall("insert_sequence_step", {
      sequenceId: "seq_123",
      subject: "Need help migrating?",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `insert_sequence_step`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects mixed html and blocks content before hitting the API", async () => {
    const result = await handleToolCall("insert_sequence_step", {
      sequenceId: "seq_123",
      subject: "Need help migrating?",
      html: "<p>Hello</p>",
      blocks: [{ id: "body", type: "text", content: "<p>Hello</p>" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      "Provide either `html` or `blocks` when calling `insert_sequence_step`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("sequence enrollment pause tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes plain object schemas with sequenceId required", () => {
    for (const toolName of [
      "pause_sequence_enrollments",
      "resume_sequence_enrollments",
    ]) {
      const tool = tools.find((candidate) => candidate.name === toolName);
      const inputSchema = tool?.inputSchema as
        | {
            type?: string;
            required?: string[];
            properties?: Record<string, unknown>;
          }
        | undefined;

      expect(inputSchema?.type).toBe("object");
      expect(inputSchema?.required).toEqual(["sequenceId"]);
      expect(inputSchema?.properties).toHaveProperty("companyId");
      expect(inputSchema?.properties).toHaveProperty("sequenceId");
    }
  });

  it("pauses and resumes sequence enrollments through dedicated API routes", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        message: "Sequence enrollment paused",
        sequenceId: "seq_123",
        enrollmentPaused: true,
      })
      .mockResolvedValueOnce({
        success: true,
        message: "Sequence enrollment resumed",
        sequenceId: "seq_123",
        enrollmentPaused: false,
      });

    const pauseResult = await handleToolCall("pause_sequence_enrollments", {
      companyId: "comp_123",
      sequenceId: "seq_123",
    });
    const resumeResult = await handleToolCall("resume_sequence_enrollments", {
      companyId: "comp_123",
      sequenceId: "seq_123",
    });

    expect(pauseResult.isError).toBeUndefined();
    expect(resumeResult.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      1,
      "POST",
      "/api/v1/sequences/seq_123/pause-enrollments",
      undefined,
      "comp_123"
    );
    expect(mockApiRequest).toHaveBeenNthCalledWith(
      2,
      "POST",
      "/api/v1/sequences/seq_123/resume-enrollments",
      undefined,
      "comp_123"
    );
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
    const urlTool = tools.find((tool) => tool.name === "get_app_urls");
    const urlSchema = urlTool?.inputSchema as
      | { properties?: Record<string, unknown> }
      | undefined;
    const result = await handleToolCall("get_app_urls", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      campaignId: "camp_123",
      landingPageId: "lp_123",
      emailSendId: "send_123",
      settingsTab: "integrations",
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      urls: {
        sequence: string;
        campaign: string;
        landingPage: string;
        emailSend: string;
        settingsTab: string;
      };
    };

    expect(urlSchema?.properties).toHaveProperty("landingPageId");
    expect(payload.urls.sequence).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/sequences/seq_123"
    );
    expect(payload.urls.campaign).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/campaign/camp_123"
    );
    expect(payload.urls.landingPage).toBe(
      "https://sequenzy.com/dashboard/company/comp_123/landing-pages/lp_123"
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
                    description?: string;
                  };
                  operator?: {
                    description?: string;
                  };
                  value?: {
                    description?: string;
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
        "emailDelivered",
        "stripeCurrentProduct",
        "stripeTrialProduct",
      ])
    );
    const fieldEnum =
      inputSchema?.properties?.filters?.items?.properties?.field?.enum;
    expect(fieldEnum).not.toContain("stripeTrialStarted");
    expect(fieldEnum).not.toContain("stripeTrialEnds");
    expect(
      inputSchema?.properties?.filters?.items?.properties?.operator?.description
    ).toContain("emailDelivered: is, is_not, at_least, less_than_count");
    expect(
      inputSchema?.properties?.filters?.items?.properties?.operator?.description
    ).toContain(
      "emailBounced: is, is_temporary_bounce, is_permanent_bounce, is_not, at_least, less_than_count"
    );
    expect(
      inputSchema?.properties?.filters?.items?.properties?.operator?.description
    ).toContain("tag: contains, not_contains, is_empty, is_not_empty");
    expect(
      inputSchema?.properties?.filters?.items?.properties?.field?.description
    ).toContain("count:timeRange");
    expect(
      inputSchema?.properties?.filters?.items?.properties?.value?.description
    ).toContain("10:all");
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

  it("rejects unsupported tag operators before hitting the API", async () => {
    const result = await handleToolCall("create_segment", {
      companyId: "comp_123",
      name: "Non-customers",
      filters: [
        {
          field: "tag",
          operator: "is_not",
          value: "customers",
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      'Operator "is_not" is not supported for tag filters'
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects unsupported non-tag operators before hitting the API", async () => {
    const result = await handleToolCall("create_segment", {
      companyId: "comp_123",
      name: "Exact emails",
      filters: [
        {
          field: "email",
          operator: "is",
          value: "alice@example.com",
        },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.type).toBe("text");
    expect(result.content[0]?.text).toContain(
      'Operator "is" is not supported for email filters'
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects invalid segment value formats before hitting the API", async () => {
    const invalidFilters = [
      {
        field: "attribute",
        operator: "is_empty",
        value: "plan",
        expected: 'Attribute filters must use "attributeName:value"',
      },
      {
        field: "event",
        operator: "is",
        value: "saas.purchase",
        expected: 'Event filters must use "eventName:timeRange"',
      },
      {
        field: "stripeCurrentProduct",
        operator: "gt",
        value: "prod_123",
        expected: "Stripe current/trial date filters",
      },
    ];

    for (const invalidFilter of invalidFilters) {
      mockApiRequest.mockClear();
      const result = await handleToolCall("create_segment", {
        companyId: "comp_123",
        name: "Invalid value format",
        filters: [invalidFilter],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.type).toBe("text");
      expect(result.content[0]?.text).toContain(invalidFilter.expected);
      expect(mockApiRequest).not.toHaveBeenCalled();
    }
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

describe("product tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("upserts products through the Commerce API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      upserted: 1,
      products: [],
    });

    await handleToolCall("upsert_products", {
      companyId: "company_123",
      products: [
        { productId: "my-ebook", title: "The Ebook", priceCents: 1900 },
      ],
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/products",
      {
        products: [
          { productId: "my-ebook", title: "The Ebook", priceCents: 1900 },
        ],
      },
      "company_123"
    );
  });

  it("rejects upsert_products without a products array", async () => {
    const result = await handleToolCall("upsert_products", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`products` must be a non-empty array"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("deletes a product by productId", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, deleted: true });

    await handleToolCall("delete_product", {
      productId: "my ebook",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/products/my%20ebook",
      undefined,
      undefined
    );
  });

  it("rejects attach_product_file with both url and filePath", async () => {
    const result = await handleToolCall("attach_product_file", {
      productId: "prod_123",
      url: "https://example.com/file.pdf",
      filePath: "./file.pdf",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `url` or `filePath`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects attach_product_file with neither url nor filePath", async () => {
    const result = await handleToolCall("attach_product_file", {
      productId: "prod_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `url` or `filePath`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects filePath uploads when local file uploads are disabled", async () => {
    const result = await handleToolCall("attach_product_file", {
      productId: "prod_123",
      filePath: "./guide.pdf",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "only supported when the MCP server runs locally"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("attaches an external delivery URL", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, product: {} });

    await handleToolCall("attach_product_file", {
      productId: "prod_123",
      url: "https://example.com/guide.pdf",
      fileName: "guide.pdf",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/products/prod_123/delivery",
      { url: "https://example.com/guide.pdf", fileName: "guide.pdf" },
      undefined
    );
  });
});

describe("campaign lifecycle tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes campaign lifecycle tools", () => {
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).toContain("cancel_campaign");
    expect(toolNames).toContain("pause_campaign");
    expect(toolNames).toContain("resume_campaign");
    expect(toolNames).toContain("delete_campaign");
    expect(toolNames).toContain("duplicate_campaign");
  });

  it("calls the campaign cancel API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: { id: "camp_123", name: "Launch", status: "cancelled" },
    });

    const result = await handleToolCall("cancel_campaign", {
      companyId: "comp_123",
      campaignId: "camp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/cancel",
      undefined,
      "comp_123"
    );
  });

  it("requires campaignId when cancelling a campaign", async () => {
    const result = await handleToolCall("cancel_campaign", {});

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`campaignId` is required when calling `cancel_campaign`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("calls the campaign pause API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: { id: "camp_123", name: "Launch", status: "paused" },
    });

    const result = await handleToolCall("pause_campaign", {
      campaignId: "camp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/pause",
      undefined,
      undefined
    );
  });

  it("forwards spreadOverHours when resuming a campaign", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: { id: "camp_123", name: "Launch", status: "sending" },
    });

    const result = await handleToolCall("resume_campaign", {
      companyId: "comp_123",
      campaignId: "camp_123",
      spreadOverHours: 6,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/resume",
      { spreadOverHours: 6 },
      "comp_123"
    );
  });

  it("resumes a campaign with an empty body when spreadOverHours is omitted", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: { id: "camp_123", name: "Launch", status: "sending" },
    });

    const result = await handleToolCall("resume_campaign", {
      campaignId: "camp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/resume",
      {},
      undefined
    );
  });

  it("rejects invalid spreadOverHours before hitting the API", async () => {
    const result = await handleToolCall("resume_campaign", {
      campaignId: "camp_123",
      spreadOverHours: 100,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`spreadOverHours` must be an integer between 1 and 72 when calling `resume_campaign`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("calls the campaign delete API", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("delete_campaign", {
      companyId: "comp_123",
      campaignId: "camp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/campaigns/camp_123",
      undefined,
      "comp_123"
    );
  });

  it("duplicates a campaign with mode and variantId", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      campaign: { id: "camp_456", name: "Launch (Copy)", status: "draft" },
    });

    const result = await handleToolCall("duplicate_campaign", {
      campaignId: "camp_123",
      mode: "variant",
      variantId: "var_b",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/campaigns/camp_123/duplicate",
      { mode: "variant", variantId: "var_b" },
      undefined
    );
  });

  it("rejects duplicate_campaign variant mode without variantId", async () => {
    const result = await handleToolCall("duplicate_campaign", {
      campaignId: "camp_123",
      mode: "variant",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`variantId` is required when calling `duplicate_campaign` with mode `variant`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("A/B test lifecycle tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes A/B test lifecycle tools", () => {
    const toolNames = tools.map((tool) => tool.name);

    expect(toolNames).toContain("create_ab_test");
    expect(toolNames).toContain("add_ab_test_variant");
    expect(toolNames).toContain("delete_ab_test_variant");
    expect(toolNames).toContain("delete_ab_test");
  });

  it("creates an A/B test with supported fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      abTest: { id: "ab_123", status: "draft" },
    });

    const result = await handleToolCall("create_ab_test", {
      companyId: "comp_123",
      campaignId: "camp_123",
      name: "Subject test",
      testPercentage: 30,
      testDurationMinutes: 60,
      winnerCriteria: "click_rate",
      variants: [{ subject: "Variant B subject" }],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/ab-tests",
      {
        campaignId: "camp_123",
        name: "Subject test",
        testPercentage: 30,
        testDurationMinutes: 60,
        winnerCriteria: "click_rate",
        variants: [{ subject: "Variant B subject" }],
      },
      "comp_123"
    );
  });

  it("rejects out-of-range testPercentage before hitting the API", async () => {
    const result = await handleToolCall("create_ab_test", {
      campaignId: "camp_123",
      testPercentage: 60,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`testPercentage` must be an integer between 5 and 50 when calling `create_ab_test`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects variants without subjects before hitting the API", async () => {
    const result = await handleToolCall("create_ab_test", {
      campaignId: "camp_123",
      variants: [{ previewText: "No subject here" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`variants` item 1 must include a non-empty `subject` when calling `create_ab_test`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("adds a variant to a draft A/B test", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      abTest: { id: "ab_123", status: "draft" },
    });

    const result = await handleToolCall("add_ab_test_variant", {
      abTestId: "ab_123",
      subject: "Variant C subject",
      previewText: "Preview",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/ab-tests/ab_123/variants",
      { subject: "Variant C subject", previewText: "Preview" },
      undefined
    );
  });

  it("deletes an A/B test variant", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      abTest: { id: "ab_123", status: "draft" },
    });

    const result = await handleToolCall("delete_ab_test_variant", {
      abTestId: "ab_123",
      variantId: "var_b",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/ab-tests/ab_123/variants/var_b",
      undefined,
      undefined
    );
  });

  it("deletes an A/B test", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("delete_ab_test", {
      companyId: "comp_123",
      abTestId: "ab_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/ab-tests/ab_123",
      undefined,
      "comp_123"
    );
  });
});

describe("list management tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("updates a list with only the provided fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      list: { id: "list_123", name: "Newsletter", isPrivate: true },
    });

    const result = await handleToolCall("update_list", {
      companyId: "comp_123",
      listId: "list_123",
      name: "Newsletter",
      isPrivate: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/lists/list_123",
      { name: "Newsletter", isPrivate: true },
      "comp_123"
    );
  });

  it("rejects update_list calls without update fields", async () => {
    const result = await handleToolCall("update_list", {
      listId: "list_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `description`, or `isPrivate` when calling `update_list`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("deletes a list", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      removedMemberships: 12,
    });

    const result = await handleToolCall("delete_list", {
      listId: "list_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/lists/list_123",
      undefined,
      undefined
    );
  });

  it("removes subscribers from a list by email", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      removed: 2,
      notFound: ["missing@example.com"],
    });

    const result = await handleToolCall("remove_subscribers_from_list", {
      companyId: "comp_123",
      listId: "list_123",
      emails: ["a@example.com", " b@example.com ", "missing@example.com"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/lists/list_123/subscribers/remove",
      {
        emails: ["a@example.com", "b@example.com", "missing@example.com"],
      },
      "comp_123"
    );
  });

  it("rejects remove_subscribers_from_list calls without emails", async () => {
    const result = await handleToolCall("remove_subscribers_from_list", {
      listId: "list_123",
      emails: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`emails` must include at least one email address when calling `remove_subscribers_from_list`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects remove_subscribers_from_list batches above 500 emails", async () => {
    const emails = Array.from(
      { length: 501 },
      (_, index) => `user${index}@example.com`
    );

    const result = await handleToolCall("remove_subscribers_from_list", {
      listId: "list_123",
      emails,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`emails` must include no more than 500 email addresses when calling `remove_subscribers_from_list`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("update_segment tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("normalizes filters and passes updates through to the API", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      segment: { id: "seg_123", name: "VIPs", filters: [] },
    });

    const result = await handleToolCall("update_segment", {
      companyId: "comp_123",
      segmentId: "seg_123",
      name: "VIPs",
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
      "PATCH",
      "/api/v1/segments/seg_123",
      {
        name: "VIPs",
        filterJoinOperator: "or",
        filters: [
          expect.objectContaining({
            id: expect.any(String),
            field: "tag",
            operator: "contains",
            value: "vip",
          }),
        ],
      },
      "comp_123"
    );
  });

  it("rejects update_segment calls without update fields", async () => {
    const result = await handleToolCall("update_segment", {
      segmentId: "seg_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `filters`, `root`, or `filterJoinOperator` when calling `update_segment`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects update_segment calls with both filters and root", async () => {
    const result = await handleToolCall("update_segment", {
      segmentId: "seg_123",
      filters: [{ field: "tag", operator: "contains", value: "vip" }],
      root: { kind: "group", joinOperator: "and", children: [] },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `filters` or `root` when calling `update_segment`, not both."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects unsupported segment operators before hitting the API", async () => {
    const result = await handleToolCall("update_segment", {
      segmentId: "seg_123",
      filters: [{ field: "tag", operator: "is_not", value: "vip" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      'Operator "is_not" is not supported for tag filters'
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("deletes a segment", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("delete_segment", {
      companyId: "comp_123",
      segmentId: "seg_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/segments/seg_123",
      undefined,
      "comp_123"
    );
  });
});

describe("tag management tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("creates a tag with a color", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      tag: { id: "tag_123", name: "vip", color: "emerald" },
    });

    const result = await handleToolCall("create_tag", {
      companyId: "comp_123",
      name: "vip",
      color: "emerald",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/tags",
      { name: "vip", color: "emerald" },
      "comp_123"
    );
  });

  it("creates a tag without a color", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      tag: { id: "tag_123", name: "vip", color: "gray" },
    });

    const result = await handleToolCall("create_tag", {
      name: "vip",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/tags",
      { name: "vip" },
      undefined
    );
  });

  it("rejects invalid tag colors before hitting the API", async () => {
    const result = await handleToolCall("create_tag", {
      name: "vip",
      color: "magenta",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`color` must be one of gray, red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose when calling `create_tag`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("updates a tag color", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      tag: { id: "tag_123", name: "vip", color: "blue" },
    });

    const result = await handleToolCall("update_tag", {
      tagId: "tag_123",
      color: "blue",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/tags/tag_123",
      { color: "blue" },
      undefined
    );
  });

  it("requires color when updating a tag", async () => {
    const result = await handleToolCall("update_tag", {
      tagId: "tag_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`color` is required when calling `update_tag`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("deletes a tag", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("delete_tag", {
      companyId: "comp_123",
      tagId: "tag_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/tags/tag_123",
      undefined,
      "comp_123"
    );
  });
});

describe("enroll_subscribers_in_sequence tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("publishes optional email and subscriber ID targets", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "enroll_subscribers_in_sequence"
    );
    const inputSchema = tool?.inputSchema as
      | {
          required?: string[];
          properties?: Record<string, unknown>;
        }
      | undefined;

    expect(inputSchema?.required).toEqual(["sequenceId"]);
    expect(inputSchema?.properties).toHaveProperty("emails");
    expect(inputSchema?.properties).toHaveProperty("subscriberIds");
    expect(inputSchema?.properties).toHaveProperty("targetNodeId");
  });

  it("enrolls subscribers with a target node", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      enrolled: 2,
      skipped: 0,
      notFound: [],
      targetNodeId: "node_email_1",
      scheduledFor: "2026-06-11T00:00:00.000Z",
    });

    const result = await handleToolCall("enroll_subscribers_in_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      emails: ["a@example.com", "b@example.com"],
      targetNodeId: "node_email_1",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq_123/enroll",
      {
        emails: ["a@example.com", "b@example.com"],
        targetNodeId: "node_email_1",
      },
      "comp_123"
    );
  });

  it("enrolls subscribers by ID with a target node", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      enrolled: 2,
      skipped: 0,
      notFound: [],
      targetNodeId: "node_email_1",
      scheduledFor: "2026-06-11T00:00:00.000Z",
    });

    const result = await handleToolCall("enroll_subscribers_in_sequence", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      subscriberIds: [" sub_123 ", "sub_456"],
      targetNodeId: "node_email_1",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq_123/enroll",
      {
        subscriberIds: ["sub_123", "sub_456"],
        targetNodeId: "node_email_1",
      },
      "comp_123"
    );
  });

  it("enrolls subscribers by email and ID in one call", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      enrolled: 2,
      skipped: 0,
      notFound: [],
      targetNodeId: "node_email_1",
      scheduledFor: "2026-06-11T00:00:00.000Z",
    });

    const result = await handleToolCall("enroll_subscribers_in_sequence", {
      sequenceId: "seq_123",
      emails: ["a@example.com"],
      subscriberIds: ["sub_123"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq_123/enroll",
      {
        emails: ["a@example.com"],
        subscriberIds: ["sub_123"],
      },
      undefined
    );
  });

  it("rejects enrollment batches above 500 total targets", async () => {
    const emails = Array.from(
      { length: 500 },
      (_, index) => `user${index}@example.com`
    );

    const result = await handleToolCall("enroll_subscribers_in_sequence", {
      sequenceId: "seq_123",
      emails,
      subscriberIds: ["sub_501"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`emails` and `subscriberIds` must include no more than 500 total targets when calling `enroll_subscribers_in_sequence`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects enrollment calls without emails or subscriber IDs", async () => {
    const result = await handleToolCall("enroll_subscribers_in_sequence", {
      sequenceId: "seq_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide `emails` or `subscriberIds` when calling `enroll_subscribers_in_sequence`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects empty subscriber ID arrays", async () => {
    const result = await handleToolCall("enroll_subscribers_in_sequence", {
      sequenceId: "seq_123",
      subscriberIds: [],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`subscriberIds` must include at least one subscriber ID when calling `enroll_subscribers_in_sequence`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("team tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("lists team members", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      members: [],
    });

    const result = await handleToolCall("list_team_members", {
      companyId: "comp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/team",
      undefined,
      "comp_123"
    );
  });

  it("invites a team member with role and billing access", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      invitation: {
        id: "inv_123",
        email: "teammate@example.com",
        role: "admin",
        canManageBilling: true,
        status: "pending",
      },
    });

    const result = await handleToolCall("invite_team_member", {
      companyId: "comp_123",
      email: "teammate@example.com",
      role: "admin",
      canManageBilling: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/team/invitations",
      {
        email: "teammate@example.com",
        role: "admin",
        canManageBilling: true,
      },
      "comp_123"
    );
  });

  it("invites a restricted team member", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      invitation: {
        id: "inv_123",
        email: "limited@example.com",
        role: "restricted",
        canManageBilling: false,
        status: "pending",
      },
    });

    const result = await handleToolCall("invite_team_member", {
      email: "limited@example.com",
      role: "restricted",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/team/invitations",
      {
        email: "limited@example.com",
        role: "restricted",
      },
      undefined
    );
  });

  it("rejects unsupported team roles before hitting the API", async () => {
    const result = await handleToolCall("invite_team_member", {
      email: "teammate@example.com",
      role: "owner",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`role` must be one of admin, viewer, restricted when calling `invite_team_member`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("cancels a team invitation", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("cancel_team_invitation", {
      invitationId: "inv_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/team/invitations/inv_123",
      undefined,
      undefined
    );
  });
});

describe("inbox tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("lists conversations with filters", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      conversations: [],
      pagination: { page: 2, limit: 50, total: 0, totalPages: 0 },
    });

    const result = await handleToolCall("list_conversations", {
      companyId: "comp_123",
      status: "open",
      search: "refund",
      unread: true,
      page: 2,
      limit: 50,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/conversations?status=open&search=refund&unread=true&page=2&limit=50",
      undefined,
      "comp_123"
    );
  });

  it("lists conversations without filters", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      conversations: [],
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    const result = await handleToolCall("list_conversations", {});

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/conversations",
      undefined,
      undefined
    );
  });

  it("gets a conversation by ID", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      conversation: { id: "conv_123", status: "open", messages: [] },
    });

    const result = await handleToolCall("get_conversation", {
      conversationId: "conv_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/conversations/conv_123",
      undefined,
      undefined
    );
  });

  it("replies to a conversation with an outbound message", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      message: { id: "msg_123", type: "outbound" },
    });

    const result = await handleToolCall("reply_to_conversation", {
      companyId: "comp_123",
      conversationId: "conv_123",
      bodyText: "Thanks for reaching out!",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/conversations/conv_123/messages",
      {
        type: "outbound",
        bodyText: "Thanks for reaching out!",
      },
      "comp_123"
    );
  });

  it("adds an internal note to a conversation", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      message: { id: "msg_123", type: "note" },
    });

    const result = await handleToolCall("reply_to_conversation", {
      conversationId: "conv_123",
      type: "note",
      bodyText: "Customer is on the enterprise plan.",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/conversations/conv_123/messages",
      {
        type: "note",
        bodyText: "Customer is on the enterprise plan.",
      },
      undefined
    );
  });

  it("rejects outbound replies without a body before hitting the API", async () => {
    const result = await handleToolCall("reply_to_conversation", {
      conversationId: "conv_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide `bodyText` or `bodyHtml` when calling `reply_to_conversation` with an outbound message."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("updates conversation status", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      conversation: { id: "conv_123", status: "closed" },
    });

    const result = await handleToolCall("update_conversation_status", {
      conversationId: "conv_123",
      status: "closed",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/conversations/conv_123/status",
      { status: "closed" },
      undefined
    );
  });

  it("marks a conversation as read", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      updated: 3,
    });

    const result = await handleToolCall("mark_conversation_read", {
      conversationId: "conv_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/conversations/conv_123/read",
      undefined,
      undefined
    );
  });
});

describe("outbound webhook tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("lists webhooks", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      webhooks: [],
    });

    const result = await handleToolCall("list_webhooks", {
      companyId: "comp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/webhooks",
      undefined,
      "comp_123"
    );
  });

  it("creates a webhook with subscribed events", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      webhook: { id: "wh_123", name: "Prod", status: "enabled" },
      signingSecret: "whsec_test",
    });

    const result = await handleToolCall("create_webhook", {
      companyId: "comp_123",
      name: "Prod",
      url: "https://example.com/webhooks/sequenzy",
      events: ["email.delivered", "email.replied", "subscriber.unsubscribed"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/webhooks",
      {
        name: "Prod",
        url: "https://example.com/webhooks/sequenzy",
        events: ["email.delivered", "email.replied", "subscriber.unsubscribed"],
      },
      "comp_123"
    );

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      signingSecret: string;
    };
    expect(payload.signingSecret).toBe("whsec_test");
  });

  it("rejects unsupported webhook event types before hitting the API", async () => {
    const result = await handleToolCall("create_webhook", {
      name: "Prod",
      url: "https://example.com/webhooks/sequenzy",
      events: ["email.delivered", "campaign.sent"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("`events` item 2 must be one of");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("updates a webhook with provided fields only", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      webhook: { id: "wh_123", status: "disabled" },
    });

    const result = await handleToolCall("update_webhook", {
      webhookId: "wh_123",
      status: "disabled",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/webhooks/wh_123",
      { status: "disabled" },
      undefined
    );
  });

  it("rejects update_webhook calls without update fields", async () => {
    const result = await handleToolCall("update_webhook", {
      webhookId: "wh_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide at least one of `name`, `url`, `events`, or `status` when calling `update_webhook`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("deletes a webhook", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("delete_webhook", {
      webhookId: "wh_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/webhooks/wh_123",
      undefined,
      undefined
    );
  });

  it("sends a webhook test event", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      delivery: { id: "del_123", status: "succeeded" },
    });

    const result = await handleToolCall("test_webhook", {
      webhookId: "wh_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/webhooks/wh_123/test",
      undefined,
      undefined
    );
  });

  it("lists webhook deliveries with a limit", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      deliveries: [],
      limit: 5,
    });

    const result = await handleToolCall("list_webhook_deliveries", {
      webhookId: "wh_123",
      limit: 5,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/webhooks/wh_123/deliveries?limit=5",
      undefined,
      undefined
    );
  });

  it("replays a webhook delivery", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      delivery: { id: "del_123", status: "pending" },
    });

    const result = await handleToolCall("replay_webhook_delivery", {
      companyId: "comp_123",
      webhookId: "wh_123",
      deliveryId: "del_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/webhooks/wh_123/deliveries/del_123/replay",
      undefined,
      "comp_123"
    );
  });
});

describe("audience sync tools", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("registers all audience sync tools", () => {
    const names = new Set(tools.map((tool) => tool.name));

    for (const expected of [
      "list_audience_syncs",
      "list_ad_accounts",
      "create_audience_sync",
      "update_audience_sync",
      "delete_audience_sync",
      "sync_audience_now",
    ]) {
      expect(names.has(expected)).toBe(true);
    }
  });

  it("lists audience syncs", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, audienceSyncs: [] });

    const result = await handleToolCall("list_audience_syncs", {
      companyId: "comp_123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/audience-syncs",
      undefined,
      "comp_123"
    );
  });

  it("rejects create_audience_sync without a segment input before hitting the API", async () => {
    const result = await handleToolCall("create_audience_sync", {
      adAccountId: "act_123",
      audienceName: "Recent buyers",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `segmentId` or `predefinedSegmentId`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects create_audience_sync with both segment inputs", async () => {
    const result = await handleToolCall("create_audience_sync", {
      segmentId: "seg_123",
      predefinedSegmentId: "recent-buyers",
      adAccountId: "act_123",
      audienceName: "Recent buyers",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("creates an audience sync from a predefined template", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      audienceSync: { id: "sync_123" },
    });

    const result = await handleToolCall("create_audience_sync", {
      companyId: "comp_123",
      predefinedSegmentId: "recent-buyers",
      adAccountId: "act_123",
      audienceName: "Sequenzy - Recent buyers",
      frequency: "hourly",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/audience-syncs",
      {
        segmentId: undefined,
        predefinedSegmentId: "recent-buyers",
        adAccountId: "act_123",
        audienceName: "Sequenzy - Recent buyers",
        frequency: "hourly",
      },
      "comp_123"
    );
  });

  it("updates, deletes, and runs a sync via the expected endpoints", async () => {
    mockApiRequest.mockResolvedValue({ success: true });

    await handleToolCall("update_audience_sync", {
      syncId: "sync_123",
      isActive: false,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/audience-syncs/sync_123",
      { isActive: false },
      undefined
    );

    await handleToolCall("delete_audience_sync", { syncId: "sync_123" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/audience-syncs/sync_123",
      undefined,
      undefined
    );

    await handleToolCall("sync_audience_now", { syncId: "sync_123" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/audience-syncs/sync_123/sync",
      undefined,
      undefined
    );
  });
});

describe("send_test_sms tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
  });

  it("posts a test SMS send", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      smsSendId: "sms_test",
      toPhone: "+15550100123",
      message: "Test SMS queued to +15550100123.",
    });

    const result = await handleToolCall("send_test_sms", {
      companyId: "comp_123",
      to: "+15550100123",
      text: "Test from Sequenzy",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sms/test",
      { to: "+15550100123", text: "Test from Sequenzy" },
      "comp_123"
    );
  });

  it("requires a destination phone", async () => {
    const result = await handleToolCall("send_test_sms", {
      text: "Missing phone",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
