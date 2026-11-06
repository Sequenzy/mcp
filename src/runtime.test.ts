import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import { McpApiError } from "./error-output";
import {
  apiRequest,
  apiUploadRequest,
  createMissingApiKeyError,
  hasConfiguredApiKey,
  setSelectedCompanyId,
  withMcpRequestContext,
} from "./runtime";

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
  it("retries a read that hits a deploy swap but never a write or upload", async () => {
    const fetchMock = mock(async () =>
      fetchMock.mock.calls.length === 1
        ? new Response("Bad Gateway", { status: 502 })
        : Response.json({ id: "acct" })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    expect(await apiRequest<{ id: string }>("GET", "/api/v1/account")).toEqual({
      id: "acct",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    for (const upload of [false, true]) {
      const failing = mock(
        async () => new Response("Bad Gateway", { status: 502 })
      );
      globalThis.fetch = failing as unknown as typeof fetch;
      const pending = upload
        ? apiUploadRequest(
            "/api/v1/media/upload-bytes?key=x",
            Uint8Array.from([1]),
            "image/png"
          )
        : apiRequest("POST", "/api/v1/subscribers", { email: "a@b.co" });
      await Promise.resolve(
        expect(pending).rejects.toMatchObject({ statusCode: 502 })
      );
      expect(failing).toHaveBeenCalledTimes(1);
    }
  });
  it("exposes retry hints for both request paths without repeating side effects", async () => {
    for (const upload of [false, true]) {
      const fetchMock = mock(async () =>
        Response.json(
          { error: "Temporarily unavailable", code: "BUSY" },
          { status: 503, headers: { "Retry-After": "11" } }
        )
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;
      const pending = upload
        ? apiUploadRequest(
            "/api/v1/media/upload-bytes?key=x",
            Uint8Array.from([1]),
            "image/png",
            "company-b"
          )
        : apiRequest(
            "POST",
            "/api/v1/transactional/send",
            { slug: "receipt" },
            "company-b",
            { "Idempotency-Key": "logical-send" }
          );
      await Promise.resolve(
        expect(pending).rejects.toMatchObject({
          statusCode: 503,
          code: "BUSY",
          retryAfterSeconds: 11,
        })
      );
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });
});

describe("hasConfiguredApiKey", () => {
  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env["SEQUENZY_API_KEY"];
    } else {
      process.env["SEQUENZY_API_KEY"] = originalApiKey;
    }
  });

  it("reads the environment and the per-request context", async () => {
    delete process.env["SEQUENZY_API_KEY"];
    expect(hasConfiguredApiKey()).toBe(false);
    expect(
      await withMcpRequestContext({ apiKey: "seq_ctx_key" }, async () =>
        hasConfiguredApiKey()
      )
    ).toBe(true);

    process.env["SEQUENZY_API_KEY"] = "seq_env_key";
    expect(hasConfiguredApiKey()).toBe(true);
  });

  it("builds the auth-required error used by startup and every request", () => {
    const error = createMissingApiKeyError();
    expect(error).toBeInstanceOf(McpApiError);
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe("MCP_AUTH_REQUIRED");
  });
});
