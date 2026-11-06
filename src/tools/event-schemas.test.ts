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

describe("get_event_schema tool", () => {
  beforeEach(() => {
    mockApiRequest.mockClear();
    mockApiRequest.mockResolvedValue({ success: true, events: [] });
  });

  it("is registered as a read-only tool", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "get_event_schema"
    );

    expect(tool).toBeDefined();
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.outputSchema?.properties).toHaveProperty("events");
    expect(tool?.inputSchema.properties?.["provider"]).toMatchObject({
      enum: ["shopify", "woocommerce", "manual", "api", "stripe"],
    });
  });

  it("lists documented events when no name is given", async () => {
    await handleToolCall("get_event_schema", {});

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/events/schemas",
      undefined,
      undefined
    );
  });

  it("forwards the event name, provider, and company", async () => {
    await handleToolCall("get_event_schema", {
      eventName: "ecommerce.browse_abandoned",
      provider: "shopify",
      companyId: "company_123",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/events/schemas?eventName=ecommerce.browse_abandoned&provider=shopify",
      undefined,
      "company_123"
    );
  });

  it("forwards a Stripe browse-abandonment provider filter", async () => {
    await handleToolCall("get_event_schema", {
      eventName: "ecommerce.browse_abandoned",
      provider: "stripe",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/events/schemas?eventName=ecommerce.browse_abandoned&provider=stripe",
      undefined,
      undefined
    );
  });

  it("passes a custom event name through instead of rejecting it locally", async () => {
    const result = await handleToolCall("get_event_schema", {
      eventName: "saas.quota_exceeded",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/events/schemas?eventName=saas.quota_exceeded",
      undefined,
      undefined
    );
  });
});

describe("get_event_sample", () => {
  it("exposes a read-only object schema and recorded payload output", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "get_event_sample"
    );
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.inputSchema).toMatchObject({
      type: "object",
      required: ["eventName"],
    });
    expect(tool?.outputSchema?.properties).toHaveProperty("sample");
  });
  it("forwards exact custom names/company and returns nested payloads unchanged", async () => {
    const response = {
      eventName: "cart & order",
      sample: {
        eventTime: "2024-01-01T00:00:00Z",
        subscriberId: "sub",
        properties: { tickets: [{ id: 1 }], note: null },
      },
    };
    mockApiRequest.mockResolvedValue(response);
    const result = await handleToolCall("get_event_sample", {
      eventName: "cart & order",
      companyId: "company",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/events/sample?eventName=cart+%26+order",
      undefined,
      "company"
    );
    expect(JSON.stringify(result)).toContain("tickets");
    expect(result.isError).toBeUndefined();
  });
  it("rejects blank names without a request", async () => {
    mockApiRequest.mockClear();
    const result = await handleToolCall("get_event_sample", { eventName: " " });
    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
  it("preserves empty results and reports backend errors", async () => {
    mockApiRequest.mockResolvedValue({ eventName: "none", sample: null });
    expect(
      JSON.stringify(
        await handleToolCall("get_event_sample", { eventName: "none" })
      )
    ).toContain("sample");
    mockApiRequest.mockRejectedValue(new Error("Service unavailable"));
    expect(
      (await handleToolCall("get_event_sample", { eventName: "none" })).isError
    ).toBe(true);
  });
});
