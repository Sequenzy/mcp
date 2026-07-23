import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { McpApiError } from "./error-output";
import { apiRequest, apiUploadRequest, setSelectedCompanyId } from "./runtime";

const originalApiKey = process.env["SEQUENZY_API_KEY"];
const originalApiUrl = process.env["SEQUENZY_API_URL"];
const originalFetch = globalThis.fetch;

describe("apiUploadRequest", () => {
  beforeEach(() => {
    process.env["SEQUENZY_API_KEY"] = "seq_test_key";
    process.env["SEQUENZY_API_URL"] = "https://api.example.com";
    setSelectedCompanyId(null);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env["SEQUENZY_API_KEY"];
    } else {
      process.env["SEQUENZY_API_KEY"] = originalApiKey;
    }
    if (originalApiUrl === undefined) {
      delete process.env["SEQUENZY_API_URL"];
    } else {
      process.env["SEQUENZY_API_URL"] = originalApiUrl;
    }
    globalThis.fetch = originalFetch;
    setSelectedCompanyId(null);
  });

  it("uploads bytes to the configured API with the selected company", async () => {
    const fetchMock = mock(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        Response.json({ success: true }, { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    const bytes = Uint8Array.from([1, 2, 3]);

    await apiUploadRequest(
      "https://api.example.com/api/v1/media/upload-bytes?key=image.png",
      bytes,
      "image/png",
      "company_123"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0] ?? [];
    expect(target?.toString()).toBe(
      "https://api.example.com/api/v1/media/upload-bytes?key=image.png"
    );
    expect(init).toMatchObject({
      method: "PUT",
      headers: {
        Authorization: "Bearer seq_test_key",
        "Content-Type": "image/png",
        "x-company-id": "company_123",
      },
    });
    expect(init?.body).toBe(bytes);
  });

  it("pins a returned authenticated upload endpoint to the configured API origin", async () => {
    const fetchMock = mock(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        Response.json({ success: true }, { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await apiUploadRequest(
      "https://app.example.com/api/v1/media/upload-bytes?key=image.png",
      Uint8Array.from([1, 2, 3]),
      "image/png",
      "company_123"
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target] = fetchMock.mock.calls[0] ?? [];
    expect(target?.toString()).toBe(
      "https://api.example.com/api/v1/media/upload-bytes?key=image.png"
    );
  });

  it("refuses to send API credentials to another origin", async () => {
    const fetchMock = mock(
      async (_input: string | URL | Request, _init?: RequestInit) =>
        new Response(null, { status: 200 })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    let uploadError: unknown;
    try {
      await apiUploadRequest(
        "https://uploads.example.com/image.png",
        Uint8Array.from([1]),
        "image/png"
      );
    } catch (error) {
      uploadError = error;
    }

    expect(uploadError).toBeInstanceOf(Error);
    expect(uploadError instanceof Error ? uploadError.message : "").toContain(
      "configured Sequenzy API"
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("preserves structured unschedule conflict recovery guidance", async () => {
    globalThis.fetch = mock(async () =>
      Response.json(
        {
          success: false,
          code: "CAMPAIGN_UNSCHEDULE_CONFLICT",
          error: "Campaign can no longer be unscheduled",
          title: "Campaign can no longer be unscheduled",
          description: "Delivery has already started.",
          resolution: "Call get_campaign to refresh status.",
          docsUrl:
            "https://docs.sequenzy.com/api-reference/campaigns/unschedule",
          details: { campaignId: "campaign-1" },
        },
        { status: 409 }
      )
    ) as unknown as typeof fetch;

    let caught: unknown;
    try {
      await apiRequest("POST", "/api/v1/campaigns/campaign-1/unschedule");
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(McpApiError);
    expect(caught).toMatchObject({
      statusCode: 409,
      code: "CAMPAIGN_UNSCHEDULE_CONFLICT",
      context: {
        title: "Campaign can no longer be unscheduled",
        description: "Delivery has already started.",
        howToFix: "Call get_campaign to refresh status.",
      },
    });
  });
});
