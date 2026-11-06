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
const { handleEmailReferenceTools } =
  await import("./handlers/email-references.js");

describe("list_email_references", () => {
  beforeEach(() => mockApiRequest.mockReset());

  it("is a read-only tool with a plain object schema", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "list_email_references"
    );
    expect(tool?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
    });
    expect(tool?.inputSchema.type).toBe("object");
    expect(tool?.inputSchema.required).toEqual(["kind"]);
    expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
    expect(Object.keys(tool?.outputSchema?.properties ?? {})).toEqual(
      expect.arrayContaining(["scope", "profile", "brands", "emails"])
    );
    // The competitor tools are gone: brands like the company are ranked
    // on every call instead of stored.
    expect(
      tools.filter((candidate) => candidate.name.includes("competitor"))
    ).toEqual([]);
  });

  it("forwards kind, scope, search, page, subtype and limit with the company override", async () => {
    mockApiRequest.mockResolvedValue({ success: true, emails: [] });
    await handleToolCall("list_email_references", {
      companyId: "co",
      kind: "campaign",
      scope: "all",
      search: "black friday",
      page: 2,
      subtype: "sale",
      limit: 10,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/references?kind=campaign&scope=all&q=black+friday&page=2&subtype=sale&limit=10",
      undefined,
      "co"
    );
    await handleToolCall("list_email_references", { kind: "sequence" });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/references?kind=sequence",
      undefined,
      undefined
    );
  });

  it("leaves other tools alone", async () => {
    expect(await handleEmailReferenceTools("list_campaigns", {})).toEqual({
      handled: false,
      result: undefined,
    });
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
