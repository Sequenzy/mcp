import { beforeEach, describe, expect, it, mock } from "bun:test";

const request = mock(
  async (
    _method: string,
    _path: string,
    _body?: unknown,
    _company?: string
  ): Promise<unknown> => ({ success: true })
);
await mock.module("../runtime.js", () => ({
  apiRequest: request,
  apiUploadRequest: async () => ({}),
  areLocalFileUploadsEnabled: () => false,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));
const { handleToolCall, tools } = await import("./index.js");
const blocks = [{ id: "footer", type: "footer", address: "New address" }];
const application = {
  scopes: ["sequences", "campaigns", "transactional", "templates"],
  includeCustomized: false,
};

describe("footer preview and apply MCP tools", () => {
  beforeEach(() => request.mockClear());
  it("registers a read-only visual preview with compatible object schemas", () => {
    const preview = tools.find(
      (tool) => tool.name === "preview_default_email_component"
    );
    expect(preview?.annotations?.readOnlyHint).toBe(true);
    expect(preview?.inputSchema.type).toBe("object");
    expect(JSON.stringify(preview?.inputSchema)).not.toContain('"anyOf"');
    expect(preview?.description).toContain("before/after HTML");
    expect(preview?.outputSchema).toBeDefined();
  });
  it("passes proposed blocks, scopes and visual sample through without a write", async () => {
    const sample = { id: "email-1", kind: "email" };
    request.mockResolvedValueOnce({
      success: true,
      application: { token: "token", counts: {}, affected: [], skipped: [] },
      renderedPreview: {
        footerHtml: "<p>New address</p>",
        samples: [],
        note: "Layout preview",
      },
    });
    const result = await handleToolCall("preview_default_email_component", {
      companyId: "company-1",
      slot: "footer",
      blocks,
      application,
      renderPreview: true,
      sample,
      name: "Footer",
      description: "Description",
    });
    expect(result.isError).toBeUndefined();
    expect(request).toHaveBeenCalledWith(
      "POST",
      "/api/v1/email-components/defaults/footer/preview",
      {
        blocks,
        application,
        renderPreview: true,
        sample,
        name: "Footer",
        description: "Description",
      },
      "company-1"
    );
    expect(JSON.stringify(result)).toContain("New address");
  });
  it("applies exactly the reviewed token and surfaces conflicts", async () => {
    request.mockResolvedValueOnce({
      success: true,
      component: { id: "footer" },
      application: { token: "token", counts: {}, affected: [], skipped: [] },
    });
    await handleToolCall("set_default_email_component", {
      companyId: "company-1",
      slot: "footer",
      blocks,
      application,
      previewToken: "token",
    });
    expect(request).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/email-components/defaults/footer",
      { blocks, application, previewToken: "token" },
      "company-1"
    );
    request.mockRejectedValueOnce(
      new Error(
        "The footer or affected emails changed. Preview again before applying."
      )
    );
    const result = await handleToolCall("set_default_email_component", {
      slot: "footer",
      blocks,
      application,
      previewToken: "token",
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("Preview again");
    expect(request).toHaveBeenCalledTimes(2);
  });
  it("preserves the existing future-only tool invocation", async () => {
    await handleToolCall("set_default_email_component", {
      slot: "footer",
      blocks,
    });
    expect(request).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/email-components/defaults/footer",
      { blocks },
      undefined
    );
  });
  it("validates required blocks before requesting a preview", async () => {
    const result = await handleToolCall("preview_default_email_component", {
      slot: "footer",
      application,
    });
    expect(result.isError).toBe(true);
    expect(request).not.toHaveBeenCalled();
  });
});
