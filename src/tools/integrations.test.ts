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

const INTEGRATION_TOOL_NAMES = [
  "connect_integration",
  "get_integration",
  "list_integration_capabilities",
  "list_integration_activity",
  "set_integration_sync_enabled",
  "sync_integration",
  "get_integration_pixel",
  "activate_integration_pixel",
];

describe("integration tool definitions", () => {
  it("registers every integration tool", () => {
    const names = new Set(tools.map((tool) => tool.name));
    for (const name of INTEGRATION_TOOL_NAMES) {
      expect({ name, registered: names.has(name) }).toEqual({
        name,
        registered: true,
      });
    }
  });

  it("classifies read and write hints correctly", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    for (const name of [
      "get_integration",
      "list_integration_capabilities",
      "list_integration_activity",
      "get_integration_pixel",
    ]) {
      expect({
        name,
        readOnly: byName.get(name)?.annotations?.readOnlyHint,
      }).toEqual({ name, readOnly: true });
    }

    expect(
      byName.get("set_integration_sync_enabled")?.annotations?.readOnlyHint
    ).toBe(false);
    // Pausing bulk imports changes account behavior, so clients should confirm.
    expect(
      byName.get("set_integration_sync_enabled")?.annotations?.destructiveHint
    ).toBe(true);
    expect(byName.get("sync_integration")?.annotations?.openWorldHint).toBe(
      true
    );
    // Both pixel tools call the Shopify Admin API in-request, so neither can
    // be answered from our own state.
    expect(
      byName.get("get_integration_pixel")?.annotations?.openWorldHint
    ).toBe(true);
    expect(
      byName.get("activate_integration_pixel")?.annotations?.openWorldHint
    ).toBe(true);
    expect(
      byName.get("activate_integration_pixel")?.annotations?.readOnlyHint
    ).toBe(false);
    // Installing a pixel only adds tracking; nothing existing is removed.
    expect(
      byName.get("activate_integration_pixel")?.annotations?.destructiveHint
    ).toBe(false);
  });

  it("requires the arguments each tool cannot work without", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    expect(byName.get("get_integration")?.inputSchema.required).toEqual([
      "integrationId",
    ]);
    expect(
      byName.get("set_integration_sync_enabled")?.inputSchema.required
    ).toEqual(["integrationId", "syncEnabled"]);
    expect(byName.get("sync_integration")?.inputSchema.required).toEqual([
      "integrationId",
    ]);
    // Every connectable provider needs a webhook secret; everything else is
    // provider-specific and validated server-side.
    expect(byName.get("connect_integration")?.inputSchema.required).toEqual([
      "provider",
      "webhookSecret",
    ]);
    // The catalog must be callable with no arguments - it is the discovery
    // tool used before anything is connected.
    expect(
      byName.get("list_integration_capabilities")?.inputSchema.required
    ).toBeUndefined();
  });

  it("publishes Segment connect and history contracts", () => {
    const connectTool = tools.find(
      (tool) => tool.name === "connect_integration"
    );
    const providerSchema = connectTool?.inputSchema.properties?.["provider"] as
      | { enum?: string[] }
      | undefined;
    const historyInput = connectTool?.inputSchema.properties?.[
      "historyImport"
    ] as
      | {
          properties?: Record<string, unknown>;
          required?: string[];
        }
      | undefined;
    const historyOutput = connectTool?.outputSchema?.properties?.["history"] as
      | { description?: string }
      | undefined;

    expect(providerSchema?.enum).toContain("segment");
    expect(historyInput?.properties).toHaveProperty("region");
    expect(historyInput?.properties).toHaveProperty("spaceId");
    expect(historyInput?.properties).toHaveProperty("profileApiToken");
    expect(historyInput?.required).toEqual(["region"]);
    expect(historyOutput?.description).toContain("PostHog and Segment");
  });
});

describe("integration tool routing", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockImplementation(async () => ({ success: true }));
  });

  it("fetches integration detail by id", async () => {
    await handleToolCall("get_integration", { integrationId: "int_123" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/int_123",
      undefined,
      undefined
    );
  });

  it("url-encodes the integration id", async () => {
    await handleToolCall("get_integration", { integrationId: "int/123" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/int%2F123",
      undefined,
      undefined
    );
  });

  it("passes the company override through", async () => {
    await handleToolCall("get_integration", {
      integrationId: "int_123",
      companyId: "comp_1",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/int_123",
      undefined,
      "comp_1"
    );
  });

  it("requests the catalog with no filters by default", async () => {
    await handleToolCall("list_integration_capabilities", {});

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/catalog",
      undefined,
      undefined
    );
  });

  it("applies catalog filters", async () => {
    await handleToolCall("list_integration_capabilities", {
      provider: "stripe",
      category: "payments",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/catalog?provider=stripe&category=payments",
      undefined,
      undefined
    );
  });

  it("applies activity filters", async () => {
    await handleToolCall("list_integration_activity", {
      integrationId: "int_123",
      status: "failed",
      limit: 50,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/activity?integrationId=int_123&status=failed&limit=50",
      undefined,
      undefined
    );
  });

  it("sends the sync toggle as a PATCH body", async () => {
    await handleToolCall("set_integration_sync_enabled", {
      integrationId: "int_123",
      syncEnabled: false,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/integrations/int_123",
      { syncEnabled: false },
      undefined
    );
  });

  it("reads pixel state without writing", async () => {
    await handleToolCall("get_integration_pixel", { integrationId: "int_123" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/integrations/int_123/pixel",
      undefined,
      undefined
    );
  });

  it("activates the pixel with a POST to the same path", async () => {
    await handleToolCall("activate_integration_pixel", {
      integrationId: "int_123",
      companyId: "comp_1",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/integrations/int_123/pixel",
      undefined,
      "comp_1"
    );
  });

  it("rejects a missing syncEnabled instead of disabling sync", async () => {
    const result = await handleToolCall("set_integration_sync_enabled", {
      integrationId: "int_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`syncEnabled` must be a boolean when calling `set_integration_sync_enabled`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("posts a connect with only the provided fields", async () => {
    await handleToolCall("connect_integration", {
      provider: "paddle",
      apiKey: "pdl_key",
      webhookSecret: "pdl_whsec",
      providerAccountId: "seller-1",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/integrations/connect",
      {
        provider: "paddle",
        webhookSecret: "pdl_whsec",
        apiKey: "pdl_key",
        providerAccountId: "seller-1",
      },
      undefined
    );
  });

  it("passes the PostHog history import through on connect", async () => {
    await handleToolCall("connect_integration", {
      provider: "posthog",
      webhookSecret: "ph_whsec",
      historyImport: { region: "us", projectId: "123", personalApiKey: "phx" },
    });

    const body = mockApiRequest.mock.calls[0]?.[2] as {
      historyImport?: unknown;
    };
    expect(body.historyImport).toEqual({
      region: "us",
      projectId: "123",
      personalApiKey: "phx",
    });
  });

  it("passes the Segment history import through on connect", async () => {
    await handleToolCall("connect_integration", {
      provider: "segment",
      webhookSecret: "segment-shared-secret",
      historyImport: {
        region: "eu",
        spaceId: "spa_segment",
        profileApiToken: "segment-profile-token",
      },
    });

    const body = mockApiRequest.mock.calls[0]?.[2] as {
      historyImport?: unknown;
    };
    expect(body.historyImport).toEqual({
      region: "eu",
      spaceId: "spa_segment",
      profileApiToken: "segment-profile-token",
    });
  });

  it("rejects a connect without a webhook secret before calling the API", async () => {
    const result = await handleToolCall("connect_integration", {
      provider: "clerk",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("posts to the sync endpoint", async () => {
    await handleToolCall("sync_integration", { integrationId: "int_123" });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/integrations/int_123/sync",
      undefined,
      undefined
    );
  });
});
