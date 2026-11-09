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
  apiUploadRequest: mock(async () => undefined),
  getSelectedCompanyId: () => null,
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");
const { inAppToolDefinitions } = await import("./definitions/in-app.js");

describe("in-app MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    [
      "list_in_app_messages",
      { companyId: "c1", email: "ava@example.com", kind: "card", limit: 5 },
      "GET",
      "/api/v1/in-app/messages?email=ava%40example.com&kind=card&limit=5&deliver=false",
      undefined,
    ],
    [
      "record_in_app_event",
      { companyId: "c1", messageId: "m/1", type: "dismissed" },
      "POST",
      "/api/v1/in-app/messages/m%2F1/events",
      { type: "dismissed" },
    ],
    [
      "validate_in_app_html",
      { companyId: "c1", html: "<p>{{${first_name}}}</p>" },
      "POST",
      "/api/v1/in-app/html/validate",
      { html: "<p>{{${first_name}}}</p>" },
    ],
    [
      "delete_in_app_message",
      { companyId: "c1", messageId: "m1" },
      "DELETE",
      "/api/v1/in-app/messages/m1",
      undefined,
    ],
    [
      "get_in_app_step_stats",
      { companyId: "c1", stepId: "n1" },
      "GET",
      "/api/v1/in-app/steps/n1/stats",
      undefined,
    ],
    [
      "list_in_app_templates",
      { companyId: "c1" },
      "GET",
      "/api/v1/in-app/templates",
      undefined,
    ],
    [
      "write_in_app_copy",
      {
        companyId: "c1",
        brief: "trial ends soon",
        format: "banner",
        hasImage: false,
      },
      "POST",
      "/api/v1/in-app/copy",
      { brief: "trial ends soon", format: "banner", hasImage: false },
    ],
  ];

  for (const [tool, args, method, path, body] of cases) {
    it(`${tool} calls ${method} ${path.split("?")[0]}`, async () => {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBeUndefined();
      expect(mockApiRequest).toHaveBeenCalledWith(method, path, body, "c1");
    });
  }

  it("covers every in-app tool", () => {
    const names = inAppToolDefinitions.map((tool) => tool.name);
    expect(names.sort()).toEqual(cases.map(([tool]) => tool).sort());
    for (const name of names) {
      expect(tools.some((tool) => tool.name === name)).toBe(true);
    }
  });

  it("validates required inputs before calling the API", async () => {
    for (const [tool, args] of [
      ["list_in_app_messages", { companyId: "c1", kind: "card" }],
      ["record_in_app_event", { companyId: "c1", messageId: "m1" }],
      ["delete_in_app_message", { companyId: "c1" }],
      ["get_in_app_step_stats", { companyId: "c1" }],
    ] as const) {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("inserts in-app sequence steps", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });
    const result = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "in_app",
      afterNodeId: "n1",
      kind: "message",
      format: "banner",
      position: "top",
      title: "Trial ends soon",
      buttons: [{ label: "Upgrade", url: "https://example.com/upgrade" }],
      data: { screen: "billing" },
    });
    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/s1",
      {
        insertSteps: {
          afterNodeId: "n1",
          steps: [
            {
              type: "in_app",
              kind: "message",
              format: "banner",
              position: "top",
              title: "Trial ends soon",
              buttons: [
                { label: "Upgrade", url: "https://example.com/upgrade" },
              ],
              data: { screen: "billing" },
            },
          ],
        },
      },
      "c1"
    );
    const empty = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "in_app",
    });
    expect(empty.isError).toBe(true);
  });

  it("lists html items and records click button ids", async () => {
    await handleToolCall("list_in_app_messages", {
      companyId: "c1",
      email: "ava@example.com",
      formats: ["modal", "html"],
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/in-app/messages?email=ava%40example.com&formats=modal%2Chtml&deliver=false",
      undefined,
      "c1"
    );
    await handleToolCall("record_in_app_event", {
      companyId: "c1",
      messageId: "m1",
      type: "clicked",
      buttonId: "0",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/in-app/messages/m1/events",
      { type: "clicked", buttonId: "0" },
      "c1"
    );
  });

  it("inserts custom HTML in-app steps and requires their html", async () => {
    const missing = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "in_app",
      format: "html",
      title: "Survey",
    });
    expect(missing.isError).toBe(true);
    expect(mockApiRequest).not.toHaveBeenCalled();

    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });
    const result = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "in_app",
      format: "html",
      title: "Survey",
      html: "<p>Hi</p>",
      showCloseButton: false,
    });
    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/s1",
      {
        insertSteps: {
          steps: [
            {
              type: "in_app",
              format: "html",
              title: "Survey",
              html: "<p>Hi</p>",
              showCloseButton: false,
            },
          ],
        },
      },
      "c1"
    );
  });
});
