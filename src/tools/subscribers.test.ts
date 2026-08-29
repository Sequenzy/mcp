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
  apiUploadRequest: async () => {
    throw new Error("apiUploadRequest should not be called");
  },
  areLocalFileUploadsEnabled: () => false,
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");

describe("subscriber MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("follows nextCursor instead of counting pages when search_subscribers has no limit", async () => {
    mockApiRequest.mockImplementation(async (_method, path) => {
      if (!path.includes("cursor=")) {
        return {
          success: true,
          subscribers: [{ email: "one@example.com" }],
          pagination: {
            page: 1,
            limit: 1000,
            total: 3,
            totalPages: 3,
            nextCursor: "cursor-2",
            hasMore: true,
          },
        };
      }

      if (path.includes("cursor=cursor-2")) {
        return {
          success: true,
          subscribers: [{ email: "two@example.com" }],
          pagination: {
            page: 1,
            limit: 1000,
            total: null,
            totalPages: null,
            nextCursor: "cursor-3",
            hasMore: true,
          },
        };
      }

      if (path.includes("cursor=cursor-3")) {
        return {
          success: true,
          subscribers: [{ email: "three@example.com" }],
          pagination: {
            page: 1,
            limit: 1000,
            total: null,
            totalPages: null,
            nextCursor: null,
            hasMore: false,
          },
        };
      }

      throw new Error(`Unexpected path: ${path}`);
    });

    const result = await handleToolCall("search_subscribers", {
      status: "active",
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      pagination: { fetchedPages: number; total: number };
      subscribers: Array<{ email: string }>;
    };

    expect(payload.returned).toBe(3);
    expect(payload.pagination.fetchedPages).toBe(3);
    // The count comes from the first page and survives the null-total cursor
    // pages that follow.
    expect(payload.pagination.total).toBe(3);
    expect(payload.subscribers.map((subscriber) => subscriber.email)).toEqual([
      "one@example.com",
      "two@example.com",
      "three@example.com",
    ]);

    // Cursor requests must not also carry a page number.
    const cursorCalls = mockApiRequest.mock.calls.filter((call) =>
      String(call[1]).includes("cursor=")
    );
    expect(cursorCalls).toHaveLength(2);
    for (const call of cursorCalls) {
      expect(String(call[1])).not.toContain("page=");
    }
  });

  it("continues through an empty page that has a next cursor", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subscribers: [],
        pagination: {
          page: 1,
          limit: 1000,
          total: null,
          totalPages: null,
          nextCursor: "cursor-after-empty",
          hasMore: true,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        subscribers: [{ email: "match@example.com" }],
        pagination: {
          page: 1,
          limit: 1000,
          total: null,
          totalPages: null,
          nextCursor: null,
          hasMore: false,
        },
      });

    const result = await handleToolCall("search_subscribers", {});

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(2);
    expect(String(mockApiRequest.mock.calls[1]?.[1])).toContain(
      "cursor=cursor-after-empty"
    );
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      subscribers: Array<{ email: string }>;
    };
    expect(payload.subscribers).toEqual([{ email: "match@example.com" }]);
  });

  it("fails instead of repeating an offset when sparse pages hit the backstop", async () => {
    let requestCount = 0;
    mockApiRequest.mockImplementation(async () => {
      requestCount += 1;
      return {
        success: true,
        subscribers: [{ email: `subscriber-${requestCount}@example.com` }],
        pagination: {
          page: 1,
          limit: 1000,
          total: null,
          totalPages: null,
          nextCursor: `cursor-${requestCount}`,
          hasMore: true,
        },
      };
    });

    const result = await handleToolCall("search_subscribers", {
      limit: 1,
      offset: 999_999,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("follow `pagination.nextCursor`");
    expect(requestCount).toBe(1_000);
  });

  it("fails when the page fallback reaches exactly the offset without a cursor", async () => {
    let requestCount = 0;
    mockApiRequest.mockImplementation(async () => {
      requestCount += 1;
      return {
        success: true,
        subscribers: [{ email: `subscriber-${requestCount}@example.com` }],
        pagination: {
          page: requestCount,
          limit: 1000,
          total: 2_000,
          totalPages: 2_000,
        },
      };
    });

    const result = await handleToolCall("search_subscribers", {
      limit: 1,
      offset: 1_000,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("follow `pagination.nextCursor`");
    expect(requestCount).toBe(1_000);
  });

  it("falls back to page numbers when the server returns no cursor", async () => {
    mockApiRequest.mockImplementation(async (_method, path) => {
      if (path.includes("page=1")) {
        return {
          success: true,
          subscribers: [{ email: "one@example.com" }],
          pagination: { page: 1, limit: 1000, total: 2, totalPages: 2 },
        };
      }

      if (path.includes("page=2")) {
        return {
          success: true,
          subscribers: [{ email: "two@example.com" }],
          pagination: { page: 2, limit: 1000, total: 2, totalPages: 2 },
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
    expect(mockApiRequest.mock.calls[0]?.[1]).toContain("limit=1000");
  });

  it("passes list filters to search_subscribers", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [],
      pagination: { page: 1, limit: 1000, total: 0, totalPages: 0 },
    });

    const result = await handleToolCall("search_subscribers", {
      companyId: "comp_123",
      listName: "Master List",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/subscribers?listName=Master+List&page=1&limit=1000",
      undefined,
      "comp_123"
    );
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      pagination: { total: number; totalPages: number };
    };
    expect(payload.pagination).toMatchObject({ total: 0, totalPages: 0 });
  });

  it("returns the requested window when search_subscribers pages with offset", async () => {
    // 1893 matches at limit 50 is exactly the shape that used to pin every
    // caller to page 1: the response advertised 38 pages with no way to ask
    // for page 2.
    const allEmails = Array.from(
      { length: 1_893 },
      (_value, index) => `subscriber-${index}@example.com`
    );

    mockApiRequest.mockImplementation(async (_method, path) => {
      const requestUrl = new URL(`https://api.test${path}`);
      const pageSize = Number(requestUrl.searchParams.get("limit"));
      const page = Number(requestUrl.searchParams.get("page") ?? "1");
      const start = (page - 1) * pageSize;
      const slice = allEmails
        .slice(start, start + pageSize)
        .map((email) => ({ email }));

      return {
        success: true,
        subscribers: slice,
        pagination: {
          page,
          limit: pageSize,
          total: allEmails.length,
          totalPages: Math.ceil(allEmails.length / pageSize),
          nextCursor: null,
          hasMore: start + slice.length < allEmails.length,
        },
      };
    });

    const result = await handleToolCall("search_subscribers", {
      limit: 50,
      offset: 50,
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      truncated: boolean;
      pagination: {
        page: number;
        limit: number;
        offset: number;
        total: number;
        totalPages: number;
        hasMore: boolean;
        nextOffset: number | null;
        nextCursor: string | null;
      };
      subscribers: Array<{ email: string }>;
    };

    expect(payload.returned).toBe(50);
    expect(payload.subscribers[0]?.email).toBe("subscriber-50@example.com");
    expect(payload.subscribers.at(-1)?.email).toBe("subscriber-99@example.com");
    expect(payload.pagination).toMatchObject({
      page: 2,
      limit: 50,
      offset: 50,
      total: 1_893,
      totalPages: 38,
      hasMore: true,
      nextOffset: 100,
      // A sliced window would resume mid-page, so the cursor is withheld.
      nextCursor: null,
    });
    expect(payload.truncated).toBe(true);
  });

  it("hands back a resumable cursor when search_subscribers stops on a page boundary", async () => {
    mockApiRequest.mockImplementation(async (_method, path) => {
      if (path.includes("cursor=cursor-2")) {
        return {
          success: true,
          subscribers: [{ email: "three@example.com" }],
          pagination: {
            page: 1,
            limit: 2,
            total: null,
            totalPages: null,
            nextCursor: null,
            hasMore: false,
          },
        };
      }

      return {
        success: true,
        subscribers: [
          { email: "one@example.com" },
          { email: "two@example.com" },
        ],
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          totalPages: 2,
          nextCursor: "cursor-2",
          hasMore: true,
        },
      };
    });

    const firstChunk = await handleToolCall("search_subscribers", { limit: 2 });
    const firstPayload = JSON.parse(firstChunk.content[0]?.text ?? "{}") as {
      pagination: { nextCursor: string | null; nextOffset: number | null };
      subscribers: Array<{ email: string }>;
    };

    expect(firstPayload.subscribers).toHaveLength(2);
    expect(firstPayload.pagination.nextCursor).toBe("cursor-2");
    expect(firstPayload.pagination.nextOffset).toBe(2);

    const secondChunk = await handleToolCall("search_subscribers", {
      limit: 2,
      cursor: firstPayload.pagination.nextCursor,
    });
    const secondPayload = JSON.parse(secondChunk.content[0]?.text ?? "{}") as {
      pagination: {
        total: number | null;
        totalPages: number | null;
        hasMore: boolean;
        nextCursor: string | null;
      };
      subscribers: Array<{ email: string }>;
    };

    expect(secondPayload.subscribers.map((s) => s.email)).toEqual([
      "three@example.com",
    ]);
    expect(secondPayload.pagination.hasMore).toBe(false);
    expect(secondPayload.pagination.nextCursor).toBeNull();
    expect(secondPayload.pagination.total).toBeNull();
    expect(secondPayload.pagination.totalPages).toBeNull();
  });

  it("returns an exact cursor for a large cursor-resumed window", async () => {
    mockApiRequest.mockImplementation(async (_method, path) => {
      const requestUrl = new URL(`https://api.test${path}`);
      const limit = Number(requestUrl.searchParams.get("limit"));
      const cursor = requestUrl.searchParams.get("cursor");
      const start = cursor === "cursor-start" ? 0 : 1_000;
      return {
        success: true,
        subscribers: Array.from({ length: limit }, (_value, index) => ({
          email: `subscriber-${start + index}@example.com`,
        })),
        pagination: {
          page: 1,
          limit,
          total: null,
          totalPages: null,
          nextCursor: cursor === "cursor-start" ? "cursor-mid" : "cursor-next",
          hasMore: true,
        },
      };
    });

    const result = await handleToolCall("search_subscribers", {
      limit: 1_500,
      cursor: "cursor-start",
    });

    expect(String(mockApiRequest.mock.calls[0]?.[1])).toContain("limit=1000");
    expect(String(mockApiRequest.mock.calls[1]?.[1])).toContain("limit=500");
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      pagination: { nextCursor: string | null; nextOffset: number | null };
    };
    expect(payload.returned).toBe(1_500);
    expect(payload.pagination.nextCursor).toBe("cursor-next");
    expect(payload.pagination.nextOffset).toBeNull();
  });

  it("stops instead of re-requesting a cursor the server did not advance", async () => {
    // hasMore without a nextCursor should not happen, but `page` is ignored
    // while a cursor is set, so looping here would re-request the same cursor
    // up to the 1,000-request backstop and duplicate every row.
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [{ email: "one@example.com" }],
      pagination: {
        page: 1,
        limit: 1000,
        total: null,
        totalPages: null,
        nextCursor: null,
        hasMore: true,
      },
    });

    const result = await handleToolCall("search_subscribers", {
      cursor: "cursor-2",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      pagination: { hasMore: boolean; nextCursor: string | null };
    };
    expect(payload.returned).toBe(1);
    // Honest about being incomplete rather than silently looping.
    expect(payload.pagination.hasMore).toBe(true);
    expect(payload.pagination.nextCursor).toBeNull();
  });

  it("rejects cursor combined with offset in search_subscribers", async () => {
    const result = await handleToolCall("search_subscribers", {
      limit: 10,
      cursor: "cursor-2",
      offset: 10,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`cursor` cannot be combined with `offset`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects offsets the request backstop cannot reach", async () => {
    for (const args of [
      { limit: 1, offset: 1_000_000 },
      { limit: 50, page: 20_001 },
    ]) {
      const result = await handleToolCall("search_subscribers", args);

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("Use `cursor`");
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("accepts page as an alternative to offset in search_subscribers", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [{ email: "one@example.com" }, { email: "two@example.com" }],
      pagination: {
        page: 1,
        limit: 2,
        total: 2,
        totalPages: 1,
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await handleToolCall("search_subscribers", {
      limit: 1,
      page: 2,
    });

    expect(result.isError).toBeUndefined();
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      pagination: { offset: number; page: number; hasMore: boolean };
      subscribers: Array<{ email: string }>;
    };

    expect(payload.subscribers.map((subscriber) => subscriber.email)).toEqual([
      "two@example.com",
    ]);
    expect(payload.pagination).toMatchObject({
      page: 2,
      offset: 1,
      hasMore: false,
    });
  });

  it("rejects page without limit in search_subscribers", async () => {
    const result = await handleToolCall("search_subscribers", { page: 2 });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("`page` requires `limit`");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects non-positive and fractional search_subscribers limits", async () => {
    for (const limit of [0, -1, 1.5]) {
      const result = await handleToolCall("search_subscribers", { limit });

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain("`limit`");
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("filters search_subscribers by a custom attribute", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [{ email: "pro@example.com" }],
      pagination: {
        page: 1,
        limit: 1000,
        total: null,
        totalPages: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await handleToolCall("search_subscribers", {
      attribute: "plan",
      attributeValue: "pro",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/subscribers?attribute=plan%3Apro&attributeOperator=is&page=1&limit=1000",
      undefined,
      undefined
    );

    // The count-free attribute response still reports an exact total once the
    // walk has drained every match.
    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      pagination: { total: number | null; hasMore: boolean };
    };
    expect(payload.pagination.total).toBe(1);
    expect(payload.pagination.hasMore).toBe(false);
  });

  it("sends a value-less attribute filter for is_not_empty", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [],
      pagination: {
        page: 1,
        limit: 1000,
        total: null,
        totalPages: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await handleToolCall("search_subscribers", {
      attribute: "prem_rouge_sample_received",
      attributeOperator: "is_not_empty",
    });

    expect(result.isError).toBeUndefined();
    expect(String(mockApiRequest.mock.calls[0]?.[1])).toContain(
      "attribute=prem_rouge_sample_received%3A&attributeOperator=is_not_empty"
    );
  });

  it("requires a value for attribute operators that compare one", async () => {
    const result = await handleToolCall("search_subscribers", {
      attribute: "plan",
      attributeOperator: "is",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("`attributeValue`");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("passes the custom attribute filter to search_subscribers", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [],
      pagination: {
        page: 1,
        limit: 1000,
        total: null,
        totalPages: null,
        nextCursor: null,
        hasMore: false,
      },
    });

    const result = await handleToolCall("search_subscribers", {
      attribute: "prem_rouge_sample_received:",
      attributeOperator: "is_not_empty",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/subscribers?attribute=prem_rouge_sample_received%3A&attributeOperator=is_not_empty&page=1&limit=1000",
      undefined,
      undefined
    );
  });

  // Attribute-filtered pulls are cursor-paged, so the server reports no count.
  // Reporting the first page size as the total made a 1-page pull of a 2-page
  // result look complete.
  it("reports the fetched count as the total when the server sends none", async () => {
    mockApiRequest.mockImplementation(async (_method, path) => {
      if (!path.includes("cursor=")) {
        return {
          success: true,
          subscribers: [{ email: "one@example.com" }],
          pagination: {
            page: 1,
            limit: 1,
            total: null,
            totalPages: null,
            nextCursor: "cursor-2",
            hasMore: true,
          },
        };
      }

      return {
        success: true,
        subscribers: [{ email: "two@example.com" }],
        pagination: {
          page: 1,
          limit: 1,
          total: null,
          totalPages: null,
          nextCursor: null,
          hasMore: false,
        },
      };
    });

    const result = await handleToolCall("search_subscribers", {
      attribute: "plan:pro",
    });

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      returned: number;
      truncated: boolean;
      pagination: { total: number };
    };

    expect(payload.returned).toBe(2);
    expect(payload.pagination.total).toBe(2);
    expect(payload.truncated).toBe(false);
  });

  it("reports truncation when a limit stops a count-less pull early", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscribers: [{ email: "one@example.com" }],
      pagination: {
        page: 1,
        limit: 1,
        total: null,
        totalPages: null,
        nextCursor: "cursor-2",
        hasMore: true,
      },
    });

    const result = await handleToolCall("search_subscribers", {
      attribute: "plan:pro",
      limit: 1,
    });

    const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
      truncated: boolean;
      pagination: { total: number | null; totalPages: number | null };
    };

    expect(payload.truncated).toBe(true);
    expect(payload.pagination.total).toBeNull();
    expect(payload.pagination.totalPages).toBeNull();
  });

  // Unsupported arguments used to be dropped, so an agent's filter/sort came
  // back as an unfiltered full-audience dump that looked like a real answer.
  it("rejects invented filter and sort arguments on search_subscribers", async () => {
    const result = await handleToolCall("search_subscribers", {
      filters: [{ field: "tag", operator: "contains", value: "posted" }],
      filterJoinOperator: "and",
      sortBy: "createdAt",
      sortOrder: "desc",
    });

    expect(result.isError).toBe(true);
    const message = result.content[0]?.text ?? "";
    expect(message).toContain(
      "Unsupported fields: `filters`, `filterJoinOperator`, `sortBy`, `sortOrder`."
    );
    expect(message).toContain("create_segment");
    expect(message).toContain("`attribute`");
    expect(message).toContain(
      "attribute-filtered searches are ordered by subscriber ID ascending"
    );
    expect(
      tools.find((tool) => tool.name === "search_subscribers")?.description
    ).toContain("searches with attribute use stable subscriber-ID ascending");
    expect(mockApiRequest).not.toHaveBeenCalled();
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

  it("passes native firstName/lastName fields when adding a subscriber", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: { email: "named@example.com" },
    });

    const result = await handleToolCall("add_subscriber", {
      companyId: "comp_123",
      email: "named@example.com",
      firstName: "Ada",
      lastName: "Lovelace",
      attributes: { plan: "pro" },
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers",
      {
        email: "named@example.com",
        firstName: "Ada",
        lastName: "Lovelace",
        customAttributes: { plan: "pro" },
        tags: undefined,
        lists: undefined,
      },
      "comp_123"
    );
  });

  it("exposes enrollInSequences and REST customAttributes on add_subscriber", () => {
    const tool = tools.find((candidate) => candidate.name === "add_subscriber");
    const properties = tool?.inputSchema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;

    expect(properties?.["enrollInSequences"]?.["type"]).toBe("boolean");
    expect(properties?.["customAttributes"]?.["type"]).toBe("object");
    expect(String(properties?.["attributes"]?.["description"])).toContain(
      "customAttributes"
    );
    expect(tool?.description).toContain("enrollInSequences");
  });

  it("forwards enrollInSequences from add_subscriber to the REST create body", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: { email: "enrolled@example.com" },
    });

    const result = await handleToolCall("add_subscriber", {
      email: "enrolled@example.com",
      tags: ["lead.inflow"],
      listIds: [],
      enrollInSequences: true,
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers",
      {
        email: "enrolled@example.com",
        tags: ["lead.inflow"],
        lists: [],
        enrollInSequences: true,
      },
      undefined
    );
  });

  it("forwards enrollInSequences false so create-and-tag can skip matching sequences", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: { email: "tagged@example.com" },
    });

    await handleToolCall("add_subscriber", {
      email: "tagged@example.com",
      tags: ["lead.inflow"],
      enrollInSequences: false,
    });

    expect(mockApiRequest.mock.calls[0]?.[2]).toEqual({
      email: "tagged@example.com",
      tags: ["lead.inflow"],
      lists: undefined,
      enrollInSequences: false,
    });
  });

  it("accepts REST customAttributes on add_subscriber as an alias for attributes", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: { email: "attrs@example.com" },
    });

    const result = await handleToolCall("add_subscriber", {
      email: "attrs@example.com",
      customAttributes: { plan: "pro" },
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest.mock.calls[0]?.[2]).toEqual({
      email: "attrs@example.com",
      customAttributes: { plan: "pro" },
      tags: undefined,
      lists: undefined,
    });
  });

  it("rejects add_subscriber calls that send both attributes and customAttributes", async () => {
    const result = await handleToolCall("add_subscriber", {
      email: "both@example.com",
      attributes: { plan: "pro" },
      customAttributes: { plan: "pro" },
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `attributes` or `customAttributes`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects a non-boolean enrollInSequences on add_subscriber", async () => {
    const result = await handleToolCall("add_subscriber", {
      email: "bad-flag@example.com",
      enrollInSequences: "true",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`enrollInSequences` must be a boolean"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("reports when add_subscriber cannot apply an existing contact's requested status", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      subscriber: {
        email: "existing@example.com",
        status: "active",
        created: false,
        updated: false,
        skipped: true,
      },
    });

    const result = await handleToolCall("add_subscriber", {
      email: "existing@example.com",
      status: "unsubscribed",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Use update_subscriber to change an existing contact's status"
    );
  });

  it("queues full CRM records with create_subscriber_import", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      import: { id: "import_123", status: "running" },
    });

    const result = await handleToolCall("create_subscriber_import", {
      companyId: "comp_123",
      fileName: "copper-export.csv",
      duplicateStrategy: "merge",
      listIds: ["list_123"],
      optInMode: "confirmed",
      subscribers: [
        {
          email: "coach@example.com",
          externalId: "copper-23",
          firstName: "Ari",
          lastName: "Tan",
          tags: ["copper"],
          customAttributes: { source: "Copper" },
        },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/imports",
      {
        fileName: "copper-export.csv",
        duplicateStrategy: "merge",
        listIds: ["list_123"],
        optInMode: "confirmed",
        subscribers: [
          {
            email: "coach@example.com",
            externalId: "copper-23",
            firstName: "Ari",
            lastName: "Tan",
            tags: ["copper"],
            customAttributes: { source: "Copper" },
          },
        ],
      },
      "comp_123"
    );
  });

  it("gets subscriber import progress", async () => {
    mockApiRequest.mockResolvedValue({
      success: true,
      import: { id: "import_123", status: "completed" },
    });

    const result = await handleToolCall("get_subscriber_import", {
      companyId: "comp_123",
      importId: "import/123",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/subscribers/imports/import%2F123",
      undefined,
      "comp_123"
    );
  });

  it("rejects malformed subscriber import records before calling the API", async () => {
    const result = await handleToolCall("create_subscriber_import", {
      subscribers: [{ firstName: "Missing email" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Subscriber record 0 must include an email or a phone number"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("accepts a phone-only subscriber import record", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      data: { id: "imp_1", status: "queued" },
    });

    const result = await handleToolCall("create_subscriber_import", {
      subscribers: [{ phone: "+14155550123" }],
    });

    expect(result.isError).toBeFalsy();
    expect(mockApiRequest).toHaveBeenCalled();
  });

  it("updates native firstName/lastName fields on update_subscriber", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      firstName: "Grace",
      lastName: "",
    });

    expect(mockApiRequest.mock.calls).toHaveLength(1);
    expect(mockApiRequest.mock.calls[0]?.[0]).toBe("PATCH");
    expect(mockApiRequest.mock.calls[0]?.[2]).toEqual({
      firstName: "Grace",
      lastName: "",
    });
  });

  it("updates the native phone field on update_subscriber", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    await handleToolCall("update_subscriber", {
      companyId: "comp_123",
      email: "detail@example.com",
      phone: "351 234 5678",
      phoneCountry: "it",
      smsConsent: true,
    });

    expect(mockApiRequest.mock.calls).toHaveLength(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/subscribers/detail%40example.com",
      { phone: "351 234 5678", phoneCountry: "it", smsConsent: true },
      "comp_123"
    );
  });

  it("forwards an empty phone on update_subscriber so the API can clear it", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      phone: "",
    });

    expect(mockApiRequest.mock.calls[0]?.[2]).toEqual({ phone: "" });
  });

  it("passes phoneCountry through add_subscriber", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    await handleToolCall("add_subscriber", {
      email: "new@example.com",
      phone: "351 234 5678",
      phoneCountry: "IT",
    });

    const body = mockApiRequest.mock.calls[0]?.[2] as Record<string, unknown>;
    expect(body["phone"]).toBe("351 234 5678");
    expect(body["phoneCountry"]).toBe("IT");
  });

  it("updates subscriber status without requiring a profile read", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      subscriber: { email: "suppress@example.com", status: "unsubscribed" },
    });

    const result = await handleToolCall("update_subscriber", {
      companyId: "comp_123",
      email: "suppress@example.com",
      status: "unsubscribed",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/subscribers/suppress%40example.com",
      { status: "unsubscribed" },
      "comp_123"
    );
  });

  it("keeps status when updating tags on a subscriber", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        subscriber: {
          email: "detail@example.com",
          tags: ["lead"],
          customAttributes: null,
        },
      })
      .mockResolvedValueOnce({ success: true });

    await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      status: "unsubscribed",
      addTags: ["lost-to-competitor"],
    });

    expect(mockApiRequest.mock.calls).toHaveLength(2);
    expect(mockApiRequest.mock.calls[1]?.[2]).toEqual({
      status: "unsubscribed",
      tags: ["lead", "lost-to-competitor"],
    });
  });

  it("rejects an invalid subscriber status before making an API request", async () => {
    const result = await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      status: "suppressed",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("must be one of");
    expect(mockApiRequest).not.toHaveBeenCalled();
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

  it("uses REST replacement semantics for customAttributes on update_subscriber", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    const result = await handleToolCall("update_subscriber", {
      email: "detail@example.com",
      customAttributes: { plan: "pro" },
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/subscribers/detail%40example.com",
      {
        customAttributes: { plan: "pro" },
      },
      undefined
    );
  });

  it("documents the distinct merge and replace semantics for update attributes", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "update_subscriber"
    );
    const properties = tool?.inputSchema.properties as
      | Record<string, Record<string, unknown>>
      | undefined;

    expect(String(properties?.["attributes"]?.["description"])).toContain(
      "merge"
    );
    expect(String(properties?.["customAttributes"]?.["description"])).toContain(
      "Replaces"
    );
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
    expect(mockApiRequest.mock.calls[0]?.[2]).toEqual({
      status: "unsubscribed",
    });
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

  it("lists, adds, and deletes subscriber notes", async () => {
    mockApiRequest
      .mockResolvedValueOnce({
        success: true,
        notes: [{ id: "note-1", body: "Asked about enterprise" }],
      })
      .mockResolvedValueOnce({
        success: true,
        note: { id: "note-2", body: "Prefers monthly digest" },
      })
      .mockResolvedValueOnce({
        success: true,
        deleted: true,
        id: "note-2",
      });

    const listResult = await handleToolCall("list_subscriber_notes", {
      email: "notes@example.com",
    });
    const addResult = await handleToolCall("add_subscriber_note", {
      companyId: "comp_123",
      externalId: "gid://shopify/Customer/123",
      body: " Prefers monthly digest ",
    });
    const deleteResult = await handleToolCall("delete_subscriber_note", {
      companyId: "comp_123",
      noteId: "note-2",
    });

    expect(listResult.isError).toBeUndefined();
    expect(addResult.isError).toBeUndefined();
    expect(deleteResult.isError).toBeUndefined();
    expect(mockApiRequest.mock.calls[0]).toEqual([
      "GET",
      "/api/v1/subscribers/notes%40example.com/notes",
      undefined,
      undefined,
    ]);
    expect(mockApiRequest.mock.calls[1]).toEqual([
      "POST",
      "/api/v1/subscribers/external/notes?externalId=gid%3A%2F%2Fshopify%2FCustomer%2F123",
      { body: "Prefers monthly digest" },
      "comp_123",
    ]);
    expect(mockApiRequest.mock.calls[2]).toEqual([
      "DELETE",
      "/api/v1/subscribers/notes/note-2",
      undefined,
      "comp_123",
    ]);
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

  it("rejects add_subscribers_to_list calls with more than 500 emails before hitting the API", async () => {
    const result = await handleToolCall("add_subscribers_to_list", {
      listId: "list_123",
      emails: Array.from(
        { length: 501 },
        (_value, index) => `batch-${index}@example.com`
      ),
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "`emails` must include no more than 500 email addresses"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
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

  it("posts a custom event for one subscriber via trigger_subscriber_event", async () => {
    mockApiRequest.mockImplementation(async () => ({
      success: true,
      event: { name: "invoice.paid", created: true },
    }));

    const result = await handleToolCall("trigger_subscriber_event", {
      email: " qa@example.com ",
      event: "invoice.paid",
      properties: { invoice: { id: "inv_123" } },
      attributes: { plan: "pro" },
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/events",
      {
        email: "qa@example.com",
        event: "invoice.paid",
        properties: { invoice: { id: "inv_123" } },
        customAttributes: { plan: "pro" },
      },
      undefined
    );
  });

  it("publishes both live and historical event response fields", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "trigger_subscriber_event"
    );
    const properties = tool?.outputSchema?.properties;

    expect(properties).toHaveProperty("event");
    expect(properties).toHaveProperty("duplicate");
    expect(properties).toHaveProperty("historical");
    expect(properties).toHaveProperty("events");
    expect(properties).toHaveProperty("inserted");
    expect(properties).toHaveProperty("duplicates");
  });

  it("rejects trigger_subscriber_event without a subscriber identifier", async () => {
    const result = await handleToolCall("trigger_subscriber_event", {
      event: "invoice.paid",
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide either `email` or `externalId`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("posts several events for one subscriber via trigger_subscriber_events", async () => {
    mockApiRequest.mockImplementation(async () => ({ success: true }));

    await handleToolCall("trigger_subscriber_events", {
      externalId: "ext_1",
      events: [{ name: "trial.started" }, { name: "invoice.paid" }],
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/events/bulk",
      {
        externalId: "ext_1",
        events: [{ name: "trial.started" }, { name: "invoice.paid" }],
      },
      undefined
    );
  });

  it("imports events for many subscribers in one call", async () => {
    mockApiRequest.mockImplementation(async () => ({
      success: true,
      total: 2,
      recorded: 2,
      duplicates: 0,
      failed: 0,
      subscribers: 2,
    }));

    await handleToolCall("import_subscriber_events", {
      events: [
        {
          email: "one@example.com",
          name: "purchase_completed",
          eventId: "order_1",
          occurredAt: "2026-08-01T12:00:00Z",
        },
        {
          externalId: "user_42",
          name: "purchase_completed",
          eventId: "order_2",
        },
      ],
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/events/imports",
      {
        events: [
          {
            email: "one@example.com",
            name: "purchase_completed",
            eventId: "order_1",
            occurredAt: "2026-08-01T12:00:00Z",
          },
          {
            externalId: "user_42",
            name: "purchase_completed",
            eventId: "order_2",
          },
        ],
      },
      undefined
    );
  });

  it("preserves structured recovery details for a partial events import", async () => {
    const partialResult = {
      success: false,
      total: 2,
      recorded: 1,
      duplicates: 0,
      failed: 1,
      subscribers: 2,
      failures: [{ index: 1, error: "identity conflict" }],
      error: "identity conflict",
    };
    mockApiRequest.mockResolvedValueOnce(partialResult);

    const result = await handleToolCall("import_subscriber_events", {
      events: [
        { email: "one@example.com", name: "purchase", eventId: "event-1" },
        { email: "two@example.com", name: "purchase", eventId: "event-2" },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(partialResult);
    expect(result.content[0]?.text).toContain('"failed": 1');
    expect(result.content[0]?.text).toContain('"index": 1');
  });

  it("preserves structured recovery details for post-write side-effect failures", async () => {
    const partialResult = {
      success: false,
      total: 1,
      recorded: 1,
      duplicates: 0,
      failed: 0,
      sideEffectFailed: 1,
      subscribers: 1,
      sideEffectFailures: [{ index: 0, stages: ["automation-triggering"] }],
      error:
        "One or more events were recorded, but downstream side effects failed.",
    };
    mockApiRequest.mockResolvedValueOnce(partialResult);

    const result = await handleToolCall("import_subscriber_events", {
      events: [
        { email: "one@example.com", name: "purchase", eventId: "event-1" },
      ],
    });

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual(partialResult);
    expect(result.content[0]?.text).toContain('"sideEffectFailed": 1');
  });

  it("accepts and forwards warehouse nulls in event imports", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      total: 1,
      recorded: 1,
      duplicates: 0,
      failed: 0,
      sideEffectFailed: 0,
      subscribers: 1,
    });
    const events = [
      {
        email: null,
        externalId: "user-1",
        name: "purchase",
        occurredAt: null,
        eventId: "event-1",
      },
    ];

    await handleToolCall("import_subscriber_events", { events });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/events/imports",
      { events },
      undefined
    );
  });

  it("publishes nullable warehouse fields in the event import schema", () => {
    const tool = tools.find(
      (candidate) => candidate.name === "import_subscriber_events"
    );
    const schema = tool?.inputSchema as {
      properties?: {
        events?: {
          items?: {
            properties?: Record<
              string,
              { type?: unknown; description?: string }
            >;
          };
        };
      };
    };
    const eventProperties = schema.properties?.events?.items?.properties;

    expect(eventProperties?.["email"]?.type).toEqual(["string", "null"]);
    expect(eventProperties?.["externalId"]?.type).toEqual(["string", "null"]);
    expect(eventProperties?.["occurredAt"]?.type).toEqual(["string", "null"]);
    expect(tool?.description).toContain(
      "externalId-only rows must identify an existing contact"
    );
    expect(tool?.description).toContain("whole group live");
    expect(eventProperties?.["occurredAt"]?.description).toContain(
      "every row for that contact"
    );
    expect(tool?.outputSchema?.properties?.["sideEffectFailed"]).toMatchObject({
      description: expect.stringContaining("orthogonal to receipt accounting"),
    });
  });

  it("keeps request-level events import failures on the MCP error path", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: false,
      error: "request failed",
    });

    const result = await handleToolCall("import_subscriber_events", {
      events: [
        { email: "one@example.com", name: "purchase", eventId: "event-1" },
      ],
    });

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toBeUndefined();
    expect(result.content[0]?.text).toContain("request failed");
  });

  it("rejects an events import row without identity before calling the API", async () => {
    const result = await handleToolCall("import_subscriber_events", {
      events: [{ name: "purchase_completed", eventId: "event-1" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "must include an `email` or an `externalId`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects an events import row without eventId before calling the API", async () => {
    const result = await handleToolCall("import_subscriber_events", {
      events: [{ email: "one@example.com", name: "purchase_completed" }],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("non-empty `eventId`");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects more than 25 imported events before calling the API", async () => {
    const result = await handleToolCall("import_subscriber_events", {
      events: Array.from({ length: 26 }, (_value, index) => ({
        email: `contact-${index}@example.com`,
        name: "purchase",
        eventId: `event-${index}`,
      })),
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("at most 25 events");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("accepts exactly 25 retry-safe imported events", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      total: 25,
      recorded: 25,
      duplicates: 0,
      failed: 0,
      subscribers: 25,
    });
    const events = Array.from({ length: 25 }, (_value, index) => ({
      email: `contact-${index}@example.com`,
      name: "purchase",
      eventId: `event-${index}`,
    }));

    const result = await handleToolCall("import_subscriber_events", { events });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/events/imports",
      { events },
      undefined
    );
  });

  it("passes the import idempotency key through", async () => {
    mockApiRequest.mockImplementation(async () => ({
      success: true,
      import: { id: "import-1" },
    }));

    await handleToolCall("create_subscriber_import", {
      subscribers: [{ email: "one@example.com" }],
      idempotencyKey: "nightly-sync-2026-08-25",
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/imports",
      expect.objectContaining({
        idempotencyKey: "nightly-sync-2026-08-25",
      }),
      undefined
    );
  });

  it("posts a bulk tag add with only the identifier lists that were provided", async () => {
    mockApiRequest.mockImplementation(async () => ({ success: true }));

    await handleToolCall("bulk_add_subscriber_tags", {
      tags: [" derived-churn "],
      emails: ["one@example.com", " two@example.com "],
      triggerAutomations: false,
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/bulk/tags/add",
      {
        tags: ["derived-churn"],
        emails: ["one@example.com", "two@example.com"],
        triggerAutomations: false,
      },
      undefined
    );
  });

  // Removing a tag never enrolls anyone, so the argument used to be dropped
  // silently. Rejecting it tells the caller the request was not honoured.
  it("rejects triggerAutomations on bulk_remove_subscriber_tags", async () => {
    mockApiRequest.mockImplementation(async () => ({ success: true }));

    const result = await handleToolCall("bulk_remove_subscriber_tags", {
      tags: ["legacy-plan"],
      subscriberIds: ["sub_1"],
      triggerAutomations: true,
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Unsupported field: `triggerAutomations`."
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("removes tags when only supported arguments are given", async () => {
    mockApiRequest.mockImplementation(async () => ({ success: true }));

    await handleToolCall("bulk_remove_subscriber_tags", {
      tags: ["legacy-plan"],
      subscriberIds: ["sub_1"],
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/subscribers/bulk/tags/remove",
      { tags: ["legacy-plan"], subscriberIds: ["sub_1"] },
      undefined
    );
  });

  it("rejects bulk tag calls without any subscriber identifiers", async () => {
    const result = await handleToolCall("bulk_add_subscriber_tags", {
      tags: ["vip"],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide `emails`, `externalIds`, or `subscriberIds`"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
