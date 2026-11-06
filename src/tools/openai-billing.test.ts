import { describe, expect, it, mock } from "bun:test";

const mockApiRequest = mock(async (..._args: unknown[]): Promise<unknown> => ({
  success: true,
}));

await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: mockApiRequest,
  apiUploadRequest: async () => undefined,
  getSelectedCompanyId: () => "company_123",
  setSelectedCompanyId: () => undefined,
}));

const { formatMcpError, McpApiError } = await import("../error-output.js");
const { handleResourceRead } = await import("../resources/index.js");
const { handleToolCall, tools } = await import("./index.js");
const { projectOpenAiToolResult } = await import("./openai-profile.js");
const { getToolsForProfile } = await import("./profiles.js");

const standardTools = getToolsForProfile(tools, "standard");
const openAiTools = getToolsForProfile(tools, "openai");
const API_KEY_TOOLS = [
  "list_api_keys",
  "update_api_key",
  "revoke_api_key",
  "delete_api_key",
  "request_api_key_handoff",
];
const SUBSCRIPTION_URL =
  "https://sequenzy.com/dashboard/company/company_123/account?tab=subscription";

describe("OpenAI surface billing and key management", () => {
  it("hides API key management tools only on the OpenAI surface", () => {
    const openAiNames = new Set(openAiTools.map((tool) => tool.name));
    const standardNames = new Set(standardTools.map((tool) => tool.name));
    for (const name of API_KEY_TOOLS) {
      expect({ name, openai: openAiNames.has(name) }).toEqual({
        name,
        openai: false,
      });
      expect({ name, standard: standardNames.has(name) }).toEqual({
        name,
        standard: true,
      });
    }
  });

  it("publishes no subscription or upgrade links in OpenAI output schemas", () => {
    expect(
      openAiTools
        .filter((tool) =>
          /subscriptionUrl|subscription, upgrade/.test(
            JSON.stringify(tool.outputSchema ?? {})
          )
        )
        .map((tool) => tool.name)
    ).toEqual([]);
    expect(
      JSON.stringify(
        standardTools.find((tool) => tool.name === "get_company")?.outputSchema
      )
    ).toContain("subscriptionUrl");
  });

  it("describes branding and app URLs without upgrade or billing guidance", () => {
    for (const name of ["get_company", "get_app_urls"]) {
      const tool = openAiTools.find((candidate) => candidate.name === name);
      expect(
        JSON.stringify([tool?.description, tool?.inputSchema])
      ).not.toMatch(/upgrade|subscription|billing/i);
    }
  });

  it("removes subscription URLs and upgrade actions from OpenAI results", () => {
    const projected = projectOpenAiToolResult("get_company", {
      success: true,
      company: {
        id: "company_123",
        url: "https://sequenzy.com/dashboard/company/company_123",
        subscriptionUrl: SUBSCRIPTION_URL,
        emailBranding: {
          visible: true,
          removalEntitled: false,
          reason: "free_plan",
          managedBy: "owner_subscription",
          removalAction: "upgrade",
          subscriptionTier: "free",
          subscriptionStatus: "active",
          subscriptionUrl: SUBSCRIPTION_URL,
        },
      },
      appUrls: {
        routeTemplates: {
          subscription:
            "/dashboard/company/{companyId}/account?tab=subscription",
          settings: "/dashboard/company/{companyId}/settings",
        },
        urls: {
          subscription: SUBSCRIPTION_URL,
          settings:
            "https://sequenzy.com/dashboard/company/company_123/settings",
        },
      },
      subscriptionUrl: null,
      note: "Upgrade details live under account?tab=subscription in the dashboard.",
    });

    expect(projected).toEqual({
      success: true,
      company: {
        id: "company_123",
        url: "https://sequenzy.com/dashboard/company/company_123",
        emailBranding: {
          visible: true,
          removalEntitled: false,
          reason: "free_plan",
        },
      },
      appUrls: {
        routeTemplates: {
          settings: "/dashboard/company/{companyId}/settings",
        },
        urls: {
          settings:
            "https://sequenzy.com/dashboard/company/company_123/settings",
        },
      },
      note: "Upgrade details live under account?tab=subscription in the dashboard.",
    });
  });

  it("drops subscription URLs from get_account companies", () => {
    const projected = projectOpenAiToolResult("get_account", {
      success: true,
      companies: [
        {
          id: "company_123",
          name: "Acme",
          settingsUrl: "https://sequenzy.com/settings",
          subscriptionUrl: SUBSCRIPTION_URL,
        },
      ],
    }) as { companies: Array<Record<string, unknown>> };

    expect(projected.companies).toEqual([
      {
        id: "company_123",
        name: "Acme",
        settingsUrl: "https://sequenzy.com/settings",
      },
    ]);
  });

  it("rejects billing aliases for get_app_urls only on the OpenAI surface", async () => {
    for (const settingsTab of ["billing", " Subscription "]) {
      const result = await handleToolCall(
        "get_app_urls",
        { companyId: "company_123", settingsTab },
        { profile: "openai" }
      );
      expect(result.isError).toBe(true);
    }

    const standard = await handleToolCall(
      "get_app_urls",
      { companyId: "company_123", settingsTab: "billing" },
      { profile: "standard" }
    );
    expect(standard.isError).not.toBe(true);
    expect(JSON.stringify(standard)).toContain("tab=subscription");

    const allowed = await handleToolCall(
      "get_app_urls",
      { companyId: "company_123", settingsTab: "integrations" },
      { profile: "openai" }
    );
    expect(allowed.isError).not.toBe(true);
    expect(JSON.stringify(allowed)).toContain("settings");
    expect(JSON.stringify(allowed)).not.toContain("tab=subscription");
  });

  it("does not send the model to hidden key tools from a scope error", () => {
    const error = () =>
      new McpApiError(
        "API key is missing required scope: api_keys:manage",
        403,
        '{"error":"API key is missing required scope: api_keys:manage"}'
      );
    const openAiMessage = formatMcpError(error(), {
      includeDetails: false,
      reviewedSurface: true,
    });
    for (const name of API_KEY_TOOLS) {
      expect(openAiMessage).not.toContain(name);
    }
    expect(openAiMessage).toContain("`apiKeyPermissions.manageUrl`");
    expect(openAiMessage).toContain("`api_keys:manage`");

    const standardMessage = formatMcpError(error());
    expect(standardMessage).toContain("update_api_key");
    expect(standardMessage).toContain("request_api_key_handoff");
  });

  it("keeps a customer's own subscription link in email content", () => {
    const customerUrl = "https://app.customer.com/account?tab=subscription";
    expect(
      projectOpenAiToolResult("get_template", {
        success: true,
        template: {
          blocks: [{ type: "button", text: "Manage plan", url: customerUrl }],
        },
      })
    ).toEqual({
      success: true,
      template: {
        blocks: [{ type: "button", text: "Manage plan", url: customerUrl }],
      },
    });
  });

  it("leaves customer copy that resembles metadata wording unchanged", () => {
    const copy = "Update your profile, company settings, or subscription.";
    expect(
      projectOpenAiToolResult("get_template", {
        template: { blocks: [{ type: "text", content: copy }] },
      })
    ).toEqual({ template: { blocks: [{ type: "text", content: copy }] } });
  });

  it("rewrites connector guidance inside OpenAI results", () => {
    const note =
      "Read variant copy from get_sequence. If update_ab_test_variant is not in the MCP tool list, enable it on the Sequenzy connector rather than writing through update_template.";
    expect(
      projectOpenAiToolResult("get_sequence", {
        success: true,
        sequence: { nodes: [{ updateHints: { notes: [note] } }] },
      })
    ).toEqual({
      success: true,
      sequence: {
        nodes: [
          { updateHints: { notes: ["Read variant copy from get_sequence."] } },
        ],
      },
    });
  });

  it("wires the reviewed-surface hints into OpenAI tool and resource errors", async () => {
    const scopeError = () =>
      new McpApiError(
        "API key is missing required scope: campaigns:read",
        403,
        '{"error":"API key is missing required scope: campaigns:read"}'
      );

    mockApiRequest.mockRejectedValueOnce(scopeError());
    const openAiTool = await handleToolCall(
      "list_campaigns",
      { companyId: "company_123" },
      { profile: "openai" }
    );
    mockApiRequest.mockRejectedValueOnce(scopeError());
    const openAiResource = await handleResourceRead("sequenzy://tags", {
      profile: "openai",
    });
    for (const text of [
      JSON.stringify(openAiTool),
      openAiResource.contents[0]?.text ?? "",
    ]) {
      expect(text).toContain("apiKeyPermissions.manageUrl");
      for (const name of API_KEY_TOOLS) expect(text).not.toContain(name);
    }

    mockApiRequest.mockRejectedValueOnce(scopeError());
    const standardTool = await handleToolCall(
      "list_campaigns",
      { companyId: "company_123" },
      { profile: "standard" }
    );
    expect(JSON.stringify(standardTool)).toContain("update_api_key");
  });

  it("omits connector guidance from the A/B variant error hint", () => {
    const error = () =>
      new McpApiError(
        "This copy belongs to an A/B test variant. Call update_ab_test_variant.",
        400,
        undefined,
        "AB_TEST_VARIANT_CONTENT_EDIT"
      );
    const openAi = formatMcpError(error(), {
      includeDetails: false,
      reviewedSurface: true,
    });
    expect(openAi).not.toContain("connector");
    expect(openAi).toContain(
      "Do not retry with `update_template`, `update_sequence_node`, or another email tool."
    );
    expect(formatMcpError(error())).toContain(
      "enable it on the Sequenzy connector - do not retry with `update_template`"
    );
  });
});
