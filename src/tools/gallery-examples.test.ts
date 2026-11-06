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
const { handleGalleryExampleTools } =
  await import("./handlers/gallery-examples.js");

describe("gallery example tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("registers both tools as mutating, non-destructive tools with plain object schemas", () => {
    for (const name of [
      "create_template_from_example",
      "create_sequence_from_example",
    ]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool).toBeDefined();
      expect(tool?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
      });
      expect(tool?.inputSchema.type).toBe("object");
      expect(tool?.inputSchema.required).toBeUndefined();
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
      expect(tool?.outputSchema?.properties).toHaveProperty("example");
    }
  });

  it("registers the previews as open-world, non-destructive tools", () => {
    for (const name of [
      "preview_template_from_example",
      "preview_sequence_from_example",
    ]) {
      const tool = tools.find((candidate) => candidate.name === name);
      expect(tool?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
      });
      expect(tool?.inputSchema.type).toBe("object");
      expect(tool?.inputSchema.required).toBeUndefined();
      expect(JSON.stringify(tool?.inputSchema)).not.toContain("anyOf");
      expect(tool?.inputSchema.properties).toHaveProperty("website");
      expect(tool?.inputSchema.properties).not.toHaveProperty("name");
      expect(tool?.outputSchema?.properties).toHaveProperty("preview");
    }
  });

  it("forwards previews with the company override", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      preview: { brandName: "Acme", website: null },
    });
    const result = await handleToolCall("preview_template_from_example", {
      companyId: "company_1",
      brand: "linear",
      email: "welcome",
      website: "acme.com",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates/from-example/preview",
      { brand: "linear", website: "acme.com", email: "welcome" },
      "company_1"
    );
    expect(result.isError).toBeFalsy();

    await handleToolCall("preview_sequence_from_example", {
      url: "https://sequenzy.com/email-examples/brands/linear/sequences/onboarding",
      brief: "Trial",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/sequences/from-example/preview",
      {
        url: "https://sequenzy.com/email-examples/brands/linear/sequences/onboarding",
        brief: "Trial",
      },
      undefined
    );
  });

  it("forwards a template remix with the company override", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      template: { id: "email_1", name: "Welcome" },
      example: { brand: "Linear" },
    });
    const result = await handleToolCall("create_template_from_example", {
      companyId: "company_1",
      brand: "linear",
      email: "welcome",
      brief: "Mention the trial",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/templates/from-example",
      { brand: "linear", brief: "Mention the trial", email: "welcome" },
      "company_1"
    );
    expect(result.isError).toBeFalsy();
    expect(JSON.stringify(result.structuredContent)).toContain(
      "/dashboard/company/company_1/emails/email_1"
    );
  });

  it("forwards a sequence clone by url with style", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      sequence: { id: "seq_1", name: "Onboarding sequence" },
    });
    await handleToolCall("create_sequence_from_example", {
      companyId: "company_1",
      url: "https://sequenzy.com/email-examples/brands/linear/sequences/onboarding",
      emailStyle: "plain",
      name: "Onboarding",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/from-example",
      {
        url: "https://sequenzy.com/email-examples/brands/linear/sequences/onboarding",
        name: "Onboarding",
        emailStyle: "plain",
      },
      "company_1"
    );
  });

  it("forwards the chosen steps of a sequence clone", async () => {
    mockApiRequest.mockResolvedValue({ success: true });
    await handleToolCall("create_sequence_from_example", {
      brand: "linear",
      sequence: "onboarding",
      stepNumbers: [1, 3],
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/from-example",
      { brand: "linear", sequence: "onboarding", stepNumbers: [1, 3] },
      undefined
    );
    // Malformed choices reach the API, which rejects them, instead of being
    // dropped into a default clone of the first 12 emails.
    await handleToolCall("create_sequence_from_example", {
      brand: "linear",
      sequence: "onboarding",
      stepNumbers: "1,3",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/from-example",
      { brand: "linear", sequence: "onboarding", stepNumbers: "1,3" },
      undefined
    );
    // Clients that send null for unset parameters get the default clone.
    await handleToolCall("create_sequence_from_example", {
      brand: "linear",
      sequence: "welcome",
      stepNumbers: null,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/from-example",
      { brand: "linear", sequence: "welcome" },
      undefined
    );
    const tool = tools.find(
      (candidate) => candidate.name === "create_sequence_from_example"
    );
    expect(tool?.inputSchema.properties?.["stepNumbers"]).toMatchObject({
      type: "array",
      items: { type: "integer" },
    });
  });

  it("leaves other tools to other handlers", async () => {
    expect(await handleGalleryExampleTools("create_template", {})).toEqual({
      handled: false,
      result: undefined,
    });
  });

  it("rejects unknown arguments and surfaces API errors", async () => {
    const unknown = await handleToolCall("create_template_from_example", {
      url: "https://sequenzy.com/email-examples/brands/a/emails/b",
      html: "<p>x</p>",
    });
    expect(unknown.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();

    mockApiRequest.mockRejectedValue(
      new Error("Email gallery email not found")
    );
    const failed = await handleToolCall("create_sequence_from_example", {
      brand: "linear",
      sequence: "missing",
    });
    expect(failed.isError).toBe(true);
    expect(JSON.stringify(failed.content)).toContain("not found");
  });
});
