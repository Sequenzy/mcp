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

  it("adds subscribers to a list from an email array", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      listId: "list_123",
      processed: 2,
      addedToList: 2,
      failed: 0,
      results: [],
    });

    const result = await handleToolCall("add_subscribers_to_list", {
      companyId: "comp_123",
      listId: "list_123",
      emails: ["one@example.com", "two@example.com"],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/lists/list_123/subscribers",
      {
        emails: ["one@example.com", "two@example.com"],
        duplicateStrategy: "skip",
        enrollInSequences: false,
        optInMode: "default",
      },
      "comp_123"
    );
  });

  it("rejects invalid add_subscribers_to_list duplicate strategies before hitting the API", async () => {
    const result = await handleToolCall("add_subscribers_to_list", {
      listId: "list_123",
      emails: ["one@example.com"],
      duplicateStrategy: "append",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`duplicateStrategy` must be one of skip, merge, overwrite"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("chunks add_subscribers_to_list calls with more than 100 emails", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        listId: "list_123",
        total: 100,
        processed: 100,
        created: 100,
        updated: 0,
        skipped: 0,
        addedToList: 100,
        failed: 0,
        duplicateInputCount: 0,
        ignoredBlankCount: 0,
        results: [],
      })
      .mockResolvedValueOnce({
        success: true,
        listId: "list_123",
        total: 1,
        processed: 1,
        created: 1,
        updated: 0,
        skipped: 0,
        addedToList: 1,
        failed: 0,
        duplicateInputCount: 0,
        ignoredBlankCount: 0,
        results: [],
      });

    const result = await handleToolCall("add_subscribers_to_list", {
      listId: "list_123",
      emails: Array.from(
        { length: 101 },
        (_value, index) => `batch-${index}@example.com`
      ),
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect((mockApiRequest.mock.calls[0]?.[2] as { emails: string[] }).emails).toHaveLength(100);
    expect((mockApiRequest.mock.calls[1]?.[2] as { emails: string[] }).emails).toHaveLength(1);

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      total: number;
      processed: number;
      addedToList: number;
    };
    expect(payload.total).toBe(101);
    expect(payload.processed).toBe(101);
    expect(payload.addedToList).toBe(101);
  });

  it("rejects add_subscribers_to_list calls with non-string email items before hitting the API", async () => {
    const result = await handleToolCall("add_subscribers_to_list", {
      listId: "list_123",
      emails: ["one@example.com", { email: "two@example.com" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`emails` item 2 must be a string"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
