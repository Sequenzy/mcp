import { beforeEach, describe, expect, it, mock } from "bun:test";

type ApiRequestMock = (
  method: string,
  path: string,
  body?: unknown,
  companyId?: string
) => Promise<unknown>;

const mockApiRequest = mock<ApiRequestMock>(async () => {
  throw new Error("apiRequest should not be called");
});

await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: mockApiRequest,
  apiUploadRequest: mock(async () => {
    throw new Error("apiUploadRequest should not be called");
  }),
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");

interface PropertySchema {
  type?: string | string[];
  enum?: string[];
  items?: { properties?: Record<string, PropertySchema> };
}

function findProperties(name: string): Record<string, PropertySchema> {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`${name} is not registered`);
  const schema = tool.inputSchema as {
    type: string;
    properties: Record<string, PropertySchema>;
  };
  expect(schema.type).toBe("object");
  expect(JSON.stringify(schema)).not.toContain('"anyOf"');
  return schema.properties;
}

describe("the not_subscribed contact status", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("is offered wherever a tool takes an email status, next to every status it took before", () => {
    expect(findProperties("add_subscriber")["status"]?.enum).toEqual([
      "active",
      "not_subscribed",
      "unsubscribed",
      "bounced",
    ]);
    expect(findProperties("update_subscriber")["status"]?.enum).toEqual([
      "active",
      "not_subscribed",
      "unsubscribed",
      "bounced",
      "complained",
    ]);
  });

  it("creates a contact with the status", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      subscriber: { email: "shopper@example.com", status: "not_subscribed" },
    });

    const result = await handleToolCall("add_subscriber", {
      companyId: "comp_123",
      email: "shopper@example.com",
      status: "not_subscribed",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledTimes(1);
    expect(mockApiRequest.mock.calls[0]?.[0]).toBe("POST");
    expect(mockApiRequest.mock.calls[0]?.[2]).toMatchObject({
      email: "shopper@example.com",
      status: "not_subscribed",
    });
  });

  it("sets the status on an existing contact", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      subscriber: { email: "shopper@example.com", status: "not_subscribed" },
    });

    const result = await handleToolCall("update_subscriber", {
      companyId: "comp_123",
      email: "shopper@example.com",
      status: "not_subscribed",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/subscribers/shopper%40example.com",
      { status: "not_subscribed" },
      "comp_123"
    );
  });

  it("still rejects a status that does not exist before calling the API", async () => {
    const result = await handleToolCall("update_subscriber", {
      email: "shopper@example.com",
      status: "never_subscribed",
    });

    expect(result.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});

describe("the sequence sendToNotSubscribed setting", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("is a boolean on create and a boolean or null on update", () => {
    expect(findProperties("create_sequence")["sendToNotSubscribed"]?.type).toBe(
      "boolean"
    );
    expect(
      findProperties("update_sequence")["sendToNotSubscribed"]?.type
    ).toEqual(["boolean", "null"]);
  });

  it("sends the choice when creating a sequence", async () => {
    // The tool reads the sequence back after creating it.
    mockApiRequest.mockResolvedValue({
      success: true,
      sequence: { id: "seq_123", status: "draft", sendToNotSubscribed: true },
    });

    const result = await handleToolCall("create_sequence", {
      companyId: "comp_123",
      name: "Welcome",
      trigger: "contact_added",
      sendToNotSubscribed: true,
      steps: [{ subject: "Welcome", html: "<p>Hi</p>" }],
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest.mock.calls[0]?.[0]).toBe("POST");
    expect(mockApiRequest.mock.calls[0]?.[1]).toBe("/api/v1/sequences");
    expect(mockApiRequest.mock.calls[0]?.[2]).toMatchObject({
      sendToNotSubscribed: true,
    });
  });

  it.each([true, false, null])(
    "sends %p when updating a sequence",
    async (sendToNotSubscribed) => {
      mockApiRequest.mockResolvedValue({
        success: true,
        sequence: { id: "seq_123", status: "draft" },
      });

      const result = await handleToolCall("update_sequence", {
        companyId: "comp_123",
        sequenceId: "seq_123",
        sendToNotSubscribed,
      });

      expect(result.isError).toBeUndefined();
      const update = mockApiRequest.mock.calls.find(
        (call) => call[0] === "PUT"
      );
      expect(update?.[1]).toBe("/api/v1/sequences/seq_123");
      expect(update?.[2]).toEqual({ sendToNotSubscribed });
    }
  );
});
