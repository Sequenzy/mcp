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
const { handleGalleryWatchlistTools } =
  await import("./handlers/gallery-watchlist.js");

const NAMES = [
  "list_watched_brands",
  "watch_brand",
  "unwatch_brand",
  "list_watched_brand_emails",
];

describe("gallery watchlist tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  it("registers the tools with plain object schemas and the right hints", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    for (const name of ["list_watched_brands", "list_watched_brand_emails"]) {
      expect(byName.get(name)?.annotations).toMatchObject({
        readOnlyHint: true,
        idempotentHint: true,
      });
    }
    for (const name of ["watch_brand", "unwatch_brand"]) {
      expect(byName.get(name)?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
    for (const name of NAMES) {
      const tool = byName.get(name);
      expect(tool?.inputSchema.type).toBe("object");
      expect(tool?.inputSchema.properties).toBeDefined();
      const schema = JSON.stringify(tool?.inputSchema);
      for (const keyword of ["anyOf", "oneOf", "allOf", '"not"', '"enum"']) {
        expect(schema).not.toContain(keyword);
      }
      expect(tool?.outputSchema?.properties).toBeDefined();
    }
    expect(
      byName.get("list_watched_brand_emails")?.outputSchema?.properties?.[
        "nextCursor"
      ]
    ).toMatchObject({ type: ["string", "null"] });
  });

  it("lists, watches and unwatches through the API", async () => {
    await handleToolCall("list_watched_brands", { companyId: "company_1" });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/gallery/watchlist",
      undefined,
      "company_1"
    );
    await handleToolCall("watch_brand", {
      website: "linear.app",
      note: "Launches",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/gallery/watchlist",
      { website: "linear.app", note: "Launches" },
      undefined
    );
    await handleToolCall("watch_brand", { website: "notion.so" });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/gallery/watchlist",
      { website: "notion.so" },
      undefined
    );
    await handleToolCall("unwatch_brand", { id: "req/1" });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "DELETE",
      "/api/v1/gallery/watchlist/req%2F1",
      undefined,
      undefined
    );
  });

  it("passes the email filters as query parameters", async () => {
    await handleToolCall("list_watched_brand_emails", {});
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/gallery/watchlist/emails",
      undefined,
      undefined
    );
    await handleToolCall("list_watched_brand_emails", {
      companyId: "company_1",
      domain: "linear.app",
      since: "2026-10-01",
      limit: 10,
      cursor: "2026-10-03T09:41:00.000Z_abc",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/gallery/watchlist/emails?domain=linear.app&since=2026-10-01&cursor=2026-10-03T09%3A41%3A00.000Z_abc&limit=10",
      undefined,
      "company_1"
    );
  });

  it("requires a website and an id", async () => {
    const missing = await handleToolCall("watch_brand", {});
    expect(missing.isError).toBe(true);
    expect(JSON.stringify(missing.content)).toContain("website");
    const noId = await handleToolCall("unwatch_brand", {});
    expect(noId.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("leaves other tools alone", async () => {
    expect(
      await handleGalleryWatchlistTools("list_email_references", {})
    ).toEqual({ handled: false, result: undefined });
  });
});
