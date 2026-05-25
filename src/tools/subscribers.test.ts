import { beforeEach, describe, expect, it, mock } from "bun:test";

type ApiRequestMock = (
  method: string,
  path: string,
  body?: unknown,
  companyIdOverride?: string
) => Promise<unknown>;

const mockApiRequest = mock<ApiRequestMock>(async () => {
  throw new Error("apiRequest should not be called");
});

await mock.module("../runtime.js", () => ({
  apiRequest: mockApiRequest,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall } = await import("./index.js");

describe("subscriber MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("fetches all subscriber pages when search_subscribers has no limit", async () => {
    mockApiRequest.mockImplementation(async (_method, path) => {
      if (path.includes("page=1")) {
        return {
          success: true,
          subscribers: [{ email: "one@example.com" }],
          pagination: { page: 1, limit: 100, total: 2, totalPages: 2 },
        };
      }

      if (path.includes("page=2")) {
        return {
          success: true,
          subscribers: [{ email: "two@example.com" }],
          pagination: { page: 2, limit: 100, total: 2, totalPages: 2 },
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const result = await handleToolCall("search_subscribers", {
      tags: ["vip"],
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      pagination: { fetchedPages: number };
      subscribers: Array<{ email: string }>;
    };

    expect(payload.returned).toBe(2);
    expect(payload.pagination.fetchedPages).toBe(2);
    expect(payload.subscribers.map((subscriber) => subscriber.email)).toEqual([
      "one@example.com",
      "two@example.com",
    ]);
  });

  it("builds get_subscriber_activity from the detailed subscriber response", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: {
        email: "detail@example.com",
        emailStats: { sent: 1, opened: 1 },
        activity: [{ eventType: "custom", eventName: "saas.purchase" }],
        sequenceEnrollments: [{ sequenceName: "Welcome" }],
      },
    });

    const result = await handleToolCall("get_subscriber_activity", {
      email: "detail@example.com",
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      email: string;
      emailStats: { sent: number; opened: number };
      activity: Array<{ eventName?: string }>;
      sequenceEnrollments: Array<{ sequenceName: string }>;
    };

    expect(payload.email).toBe("detail@example.com");
    expect(payload.emailStats.sent).toBe(1);
    expect(payload.activity[0]?.eventName).toBe("saas.purchase");
    expect(payload.sequenceEnrollments[0]?.sequenceName).toBe("Welcome");
  });

  it("merges existing custom attributes when updating a subscriber", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subscriber: {
          email: "detail@example.com",
          tags: ["vip"],
          customAttributes: {
            plan: "starter",
            region: "us",
          },
        },
      })
      .mockResolvedValueOnce({ success: true });

    await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      attributes: {
        plan: "pro",
      },
    });

    expect(mockApiRequest.mock.calls).toHaveLength(2);
    expect(mockApiRequest.mock.calls[0]?.[0]).toBe("GET");
    expect(mockApiRequest.mock.calls[1]?.[0]).toBe("PATCH");
    expect(mockApiRequest.mock.calls[1]?.[1]).toBe(
      "/api/v1/subscribers/detail%40example.com"
    );
    expect(mockApiRequest.mock.calls[1]?.[2]).toEqual({
      customAttributes: {
        plan: "pro",
        region: "us",
      },
    });
  });

  it("normalizes removed tags before diffing against the current subscriber tags", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subscriber: {
          email: "detail@example.com",
          tags: ["vip-customers", "trial"],
          customAttributes: null,
        },
      })
      .mockResolvedValueOnce({ success: true });

    await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      removeTags: ["VIP Customers"],
    });

    expect(mockApiRequest.mock.calls).toHaveLength(2);
    expect(mockApiRequest.mock.calls[1]?.[0]).toBe("PATCH");
    expect(mockApiRequest.mock.calls[1]?.[2]).toEqual({
      tags: ["trial"],
    });
  });

  it("uses patch for unsubscribe and delete for hard removal", async () => {
    mockApiRequest.mockResolvedValue({ success: true });

    await handleToolCall("remove_subscriber", {
      email: "soft@example.com",
    });
    await handleToolCall("remove_subscriber", {
      email: "hard@example.com",
      hardDelete: true,
    });

    expect(mockApiRequest.mock.calls[0]?.[0]).toBe("PATCH");
    expect(mockApiRequest.mock.calls[0]?.[1]).toBe(
      "/api/v1/subscribers/soft%40example.com"
    );
    expect(mockApiRequest.mock.calls[1]?.[0]).toBe("DELETE");
    expect(mockApiRequest.mock.calls[1]?.[1]).toBe(
      "/api/v1/subscribers/hard%40example.com"
    );
  });

  it("uses external ID routes when email is omitted", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: {
        email: "detail@example.com",
        tags: [],
        customAttributes: null,
      },
    });

    await handleToolCall("get_subscriber", {
      externalId: "gid://shopify/Customer/123",
    });
    await handleToolCall("remove_subscriber", {
      externalId: "gid://shopify/Customer/123",
      hardDelete: true,
    });

    expect(mockApiRequest.mock.calls[0]?.[0]).toBe("GET");
    expect(mockApiRequest.mock.calls[0]?.[1]).toBe(
      "/api/v1/subscribers/external?externalId=gid%3A%2F%2Fshopify%2FCustomer%2F123"
    );
    expect(mockApiRequest.mock.calls[1]?.[0]).toBe("DELETE");
    expect(mockApiRequest.mock.calls[1]?.[1]).toBe(
      "/api/v1/subscribers/external?externalId=gid%3A%2F%2Fshopify%2FCustomer%2F123"
    );
  });
});
