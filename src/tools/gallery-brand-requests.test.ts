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
const { handleGalleryBrandRequestTools } =
  await import("./handlers/gallery-brand-requests.js");

describe("gallery brand request tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  it("registers the tools with plain object schemas and the right hints", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    expect(
      byName.get("list_gallery_brand_requests")?.annotations
    ).toMatchObject({ readOnlyHint: true });
    // Asking again replaces the stored note, so it is not purely additive.
    expect(byName.get("request_gallery_brand")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
    });
    expect(
      byName.get("remove_gallery_brand_request")?.annotations
    ).toMatchObject({ readOnlyHint: false, destructiveHint: true });
    for (const name of [
      "list_gallery_brand_requests",
      "request_gallery_brand",
      "remove_gallery_brand_request",
    ]) {
      const tool = byName.get(name);
      expect(tool?.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
      expect(tool?.outputSchema?.properties).toBeDefined();
    }
  });

  it("lists, requests and removes through the API", async () => {
    await handleToolCall("list_gallery_brand_requests", {
      companyId: "company_1",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/gallery/brand-requests",
      undefined,
      "company_1"
    );
    await handleToolCall("request_gallery_brand", {
      website: "linear.app",
      note: "Onboarding",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/gallery/brand-requests",
      { website: "linear.app", note: "Onboarding" },
      undefined
    );
    await handleToolCall("request_gallery_brand", { website: "notion.so" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/gallery/brand-requests",
      { website: "notion.so" },
      undefined
    );
    await handleToolCall("remove_gallery_brand_request", { id: "req/1" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/gallery/brand-requests/req%2F1",
      undefined,
      undefined
    );
  });

  it("requires a website and an id, and leaves other tools alone", async () => {
    const missing = await handleToolCall("request_gallery_brand", {});
    expect(missing.isError).toBe(true);
    const noId = await handleToolCall("remove_gallery_brand_request", {});
    expect(noId.isError).toBe(true);
    expect(
      mockApiRequest.mock.calls.some(([, path]) =>
        path.startsWith("/api/v1/gallery/")
      )
    ).toBe(false);
    expect(await handleGalleryBrandRequestTools("list_templates", {})).toEqual({
      handled: false,
      result: undefined,
    });
  });
});
