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
  "set_integration_list_targeting",
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
    // Retargeting silently changes who future contacts get mailed as, and
    // contacts created under the old targeting are not moved.
    expect(
      byName.get("set_integration_list_targeting")?.annotations?.readOnlyHint
    ).toBe(false);
    expect(
      byName.get("set_integration_list_targeting")?.annotations?.destructiveHint
    ).toBe(true);
  });

  // An agent asked to stop an integration dumping contacts must not be steered
  // to the bulk-sync toggle, which leaves the live webhook writing.
  it("points the sync toggle at list targeting rather than implying it stops ingestion", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const syncDescription =
      byName.get("set_integration_sync_enabled")?.description ?? "";

    expect(syncDescription).toContain("DOES NOT STOP");
    expect(syncDescription).toContain("set_integration_list_targeting");
  });

  // Retargeting lists is easy to over-read as a full stop; the description has
  // to say what it leaves running, or an agent will report the wrong outcome.
  it("states what list targeting does not stop", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const description =
      byName.get("set_integration_list_targeting")?.description ?? "";

    expect(description).toContain("does not stop contacts being created");
    expect(description).toContain("contact_added");
  });

  // Existing-contact behavior differs by provider, so the tool must not give
  // agents a blanket promise in either direction.
  it("documents provider-specific existing-contact targeting", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    const description =
      byName.get("set_integration_list_targeting")?.description ?? "";

    expect(description).toContain("existing contact to the new target lists");
    expect(description).toContain(
      "Stripe applies targeting only when its webhook creates a subscriber"
    );
    // What does still hold, and is worth stating alongside it.
    expect(description).toContain("Nobody is ever removed from a list");
    expect(description).toContain("retroactively");
  });

  it("documents the scope agent-safe keys lack on both write tools", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));

    for (const name of [
      "set_integration_sync_enabled",
      "set_integration_list_targeting",
    ]) {
      expect({
        name,
        documented: (byName.get(name)?.description ?? "").includes(
          "integrations:manage"
        ),
      }).toEqual({ name, documented: true });
    }
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
});

/**
 * Minimal stand-in for the ajv validation MCP clients run over
 * `structuredContent`. Only the top-level type check matters for the bug this
 * guards: a field the API returns as null while the schema says `"string"` or
 * `"array"` fails validation, and the whole tool call is rejected even though
 * the call succeeded.
 */
function findSchemaTypeViolations(
  schema: { properties?: Record<string, unknown> } | undefined,
  payload: Record<string, unknown>
): string[] {
  const properties = schema?.properties ?? {};
  const violations: string[] = [];

  for (const [key, value] of Object.entries(payload)) {
    const declared = properties[key] as { type?: unknown } | undefined;
    const declaredType = declared?.type;
    if (declaredType === undefined) continue;

    const allowed = Array.isArray(declaredType) ? declaredType : [declaredType];
    const actual =
      value === null ? "null" : Array.isArray(value) ? "array" : typeof value;

    if (!allowed.includes(actual)) {
      violations.push(
        `${key}: got ${actual}, schema allows ${allowed.join("|")}`
      );
    }
  }

  return violations;
}

describe("integration tool output schemas", () => {
  const byName = new Map(tools.map((tool) => [tool.name, tool]));

  // A clear-to-default call genuinely returns listIds: null, and the sync
  // toggle returns listTargeting: null for a provider without list targeting.
  // Both are successful responses that a non-nullable schema would reject.
  it("accepts a cleared list targeting response", () => {
    const violations = findSchemaTypeViolations(
      byName.get("set_integration_list_targeting")?.outputSchema,
      {
        success: true,
        integrationId: "int_123",
        provider: "supabase",
        syncEnabled: true,
        listTargeting: "company_default",
        listIds: null,
        changed: true,
        changedFields: ["listIds"],
        message: "New contacts join the workspace default lists.",
      }
    );

    expect(violations).toEqual([]);
  });

  it("accepts a sync toggle response from a provider without list targeting", () => {
    const violations = findSchemaTypeViolations(
      byName.get("set_integration_sync_enabled")?.outputSchema,
      {
        success: true,
        integrationId: "int_123",
        provider: "polar",
        syncEnabled: false,
        listTargeting: null,
        listIds: null,
        changed: true,
        changedFields: ["syncEnabled"],
        message: "Sync disabled for Polar.",
      }
    );

    expect(violations).toEqual([]);
  });

  // The list-targeting tool's description tells agents to read
  // `get_integration.ingestion` first, so it has to be discoverable in that
  // tool's schema rather than only surviving via additionalProperties.
  it("declares the ingestion block on get_integration", () => {
    const properties = byName.get("get_integration")?.outputSchema?.properties;
    const ingestion = properties?.["ingestion"] as
      | { description?: string }
      | undefined;

    expect(properties).toHaveProperty("ingestion");
    expect(ingestion?.description).toContain("listTargeting");
    expect(ingestion?.description).toContain("missingListIds");
  });

  it("still rejects a genuinely wrong type", () => {
    const violations = findSchemaTypeViolations(
      byName.get("set_integration_list_targeting")?.outputSchema,
      {
        integrationId: 42,
        listIds: "list_a",
      }
    );

    expect(violations.length).toBe(2);
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

  it("sends list targeting, including the clear-to-default null", async () => {
    await handleToolCall("set_integration_list_targeting", {
      integrationId: "int_123",
      listIds: ["list_a", "list_b"],
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/integrations/int_123",
      { listIds: ["list_a", "list_b"] },
      undefined
    );

    // `null` must reach the API rather than being treated as "no change",
    // because it is the only way to ask for the workspace default lists.
    await handleToolCall("set_integration_list_targeting", {
      integrationId: "int_123",
      listIds: null,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/integrations/int_123",
      { listIds: null },
      undefined
    );

    // An empty array means "join no list" and must not collapse into null.
    await handleToolCall("set_integration_list_targeting", {
      integrationId: "int_123",
      listIds: [],
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/integrations/int_123",
      { listIds: [] },
      undefined
    );
  });

  // An omitted listIds must not be read as "clear to the workspace default":
  // that would silently widen targeting on a call meant to do nothing.
  it("rejects a targeting call with no listIds", async () => {
    const result = await handleToolCall("set_integration_list_targeting", {
      integrationId: "int_123",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("`listIds` is required");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects a malformed listIds", async () => {
    const result = await handleToolCall("set_integration_list_targeting", {
      integrationId: "int_123",
      listIds: "list_a",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
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
