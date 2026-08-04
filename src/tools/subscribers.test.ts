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

const { handleToolCall } = await import("./index.js");

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

  it("drops triggerAutomations from bulk_remove_subscriber_tags", async () => {
    mockApiRequest.mockImplementation(async () => ({ success: true }));

    await handleToolCall("bulk_remove_subscriber_tags", {
      tags: ["legacy-plan"],
      subscriberIds: ["sub_1"],
      triggerAutomations: true,
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
