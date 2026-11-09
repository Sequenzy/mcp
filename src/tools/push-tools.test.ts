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
const { OPENAI_EXCLUDED_TOOL_NAMES } = await import("./openai-profile.js");
const { pushToolDefinitions } = await import("./definitions/push.js");

describe("push MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  const cases: [string, Record<string, unknown>, string, string, unknown][] = [
    [
      "get_push_settings",
      { companyId: "c1" },
      "GET",
      "/api/v1/push/settings",
      undefined,
    ],
    [
      "update_web_push_settings",
      { companyId: "c1", enabled: true },
      "PUT",
      "/api/v1/push/settings/web",
      { enabled: true },
    ],
    [
      "set_apns_credentials",
      {
        companyId: "c1",
        keyId: "ABC123DEFG",
        teamId: "DEF123GHIJ",
        bundleId: "com.example.app",
        privateKey: "-----BEGIN PRIVATE KEY-----",
        environment: "sandbox",
      },
      "PUT",
      "/api/v1/push/settings/ios",
      {
        keyId: "ABC123DEFG",
        teamId: "DEF123GHIJ",
        bundleId: "com.example.app",
        privateKey: "-----BEGIN PRIVATE KEY-----",
        environment: "sandbox",
      },
    ],
    [
      "remove_apns_credentials",
      { companyId: "c1" },
      "DELETE",
      "/api/v1/push/settings/ios",
      undefined,
    ],
    [
      "set_fcm_credentials",
      { companyId: "c1", serviceAccount: "{}" },
      "PUT",
      "/api/v1/push/settings/android",
      { serviceAccount: "{}" },
    ],
    [
      "remove_fcm_credentials",
      { companyId: "c1" },
      "DELETE",
      "/api/v1/push/settings/android",
      undefined,
    ],
    [
      "list_push_devices",
      { companyId: "c1", email: "a@b.co", platform: "ios", limit: 10 },
      "GET",
      "/api/v1/push/devices?email=a%40b.co&platform=ios&limit=10",
      undefined,
    ],
    [
      "register_push_device",
      { companyId: "c1", platform: "ios", token: "abcd", email: "a@b.co" },
      "POST",
      "/api/v1/push/devices",
      { platform: "ios", token: "abcd", email: "a@b.co" },
    ],
    [
      "remove_push_device",
      { companyId: "c1", deviceId: "d/1" },
      "DELETE",
      "/api/v1/push/devices/d%2F1",
      undefined,
    ],
    [
      "send_test_push",
      { companyId: "c1", email: "a@b.co", title: "Hi", platforms: ["web"] },
      "POST",
      "/api/v1/push/test",
      { email: "a@b.co", title: "Hi", platforms: ["web"] },
    ],
    [
      "list_push_campaigns",
      { companyId: "c1", status: "sent" },
      "GET",
      "/api/v1/push/campaigns?status=sent",
      undefined,
    ],
    [
      "get_push_campaign",
      { companyId: "c1", campaignId: "p1" },
      "GET",
      "/api/v1/push/campaigns/p1",
      undefined,
    ],
    [
      "create_push_campaign",
      {
        companyId: "c1",
        name: "Sale",
        title: "24h",
        targetLists: { type: "all" },
      },
      "POST",
      "/api/v1/push/campaigns",
      { name: "Sale", targetLists: { type: "all" }, title: "24h" },
    ],
    [
      "update_push_campaign",
      { companyId: "c1", campaignId: "p1", body: "New", url: null },
      "PATCH",
      "/api/v1/push/campaigns/p1",
      { body: "New", url: null },
    ],
    [
      "estimate_push_campaign_recipients",
      { companyId: "c1", targetLists: { type: "all" } },
      "POST",
      "/api/v1/push/campaigns/estimate",
      { targetLists: { type: "all" } },
    ],
    [
      "send_push_campaign",
      {
        companyId: "c1",
        campaignId: "p1",
        scheduledAt: "2030-01-01T00:00:00Z",
      },
      "POST",
      "/api/v1/push/campaigns/p1/send",
      { scheduledAt: "2030-01-01T00:00:00Z" },
    ],
    [
      "unschedule_push_campaign",
      { companyId: "c1", campaignId: "p1" },
      "POST",
      "/api/v1/push/campaigns/p1/unschedule",
      undefined,
    ],
    [
      "cancel_push_campaign",
      { companyId: "c1", campaignId: "p1" },
      "POST",
      "/api/v1/push/campaigns/p1/cancel",
      undefined,
    ],
    [
      "duplicate_push_campaign",
      { companyId: "c1", campaignId: "p1", name: "Copy" },
      "POST",
      "/api/v1/push/campaigns/p1/duplicate",
      { name: "Copy" },
    ],
    [
      "get_push_campaign_stats",
      { companyId: "c1", campaignId: "p1" },
      "GET",
      "/api/v1/push/campaigns/p1/stats",
      undefined,
    ],
    [
      "translate_push_campaign",
      { companyId: "c1", campaignId: "p1", locales: ["de"], overwrite: true },
      "POST",
      "/api/v1/push/campaigns/p1/translate",
      { locales: ["de"], overwrite: true },
    ],
    [
      "translate_push_content",
      {
        companyId: "c1",
        title: "Hi",
        localizations: [{ locale: "fr", title: "Salut", body: "" }],
      },
      "POST",
      "/api/v1/push/translate",
      {
        title: "Hi",
        localizations: [{ locale: "fr", title: "Salut", body: "" }],
      },
    ],
  ];

  for (const [tool, args, method, path, body] of cases) {
    it(`${tool} calls ${method} ${path.split("?")[0]}`, async () => {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBeUndefined();
      expect(mockApiRequest).toHaveBeenCalledWith(method, path, body, "c1");
    });
  }

  it("covers every push tool", () => {
    const pushTools = pushToolDefinitions.map((tool) => tool.name);
    expect(pushTools.sort()).toEqual(cases.map(([tool]) => tool).sort());
    for (const name of pushTools) {
      expect(tools.some((tool) => tool.name === name)).toBe(true);
    }
  });

  it("passes push campaign timing through to update and send", async () => {
    await handleToolCall("update_push_campaign", {
      companyId: "c1",
      campaignId: "p1",
      sendTimeOptimization: true,
      sendTimeWindowHours: 6,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/push/campaigns/p1",
      { sendTimeOptimization: true, sendTimeWindowHours: 6 },
      "c1"
    );
    await handleToolCall("send_push_campaign", {
      companyId: "c1",
      campaignId: "p1",
      scheduledAt: "2030-01-01T13:00:00Z",
      sendInRecipientTimezone: true,
      scheduledTimezone: "America/New_York",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/push/campaigns/p1/send",
      {
        scheduledAt: "2030-01-01T13:00:00Z",
        sendInRecipientTimezone: true,
        scheduledTimezone: "America/New_York",
      },
      "c1"
    );
  });

  it("asks the estimate for timing coverage when requested", async () => {
    await handleToolCall("estimate_push_campaign_recipients", {
      companyId: "c1",
      targetLists: { type: "all" },
      includeTimingCoverage: true,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/push/campaigns/estimate",
      { targetLists: { type: "all" }, includeTimingCoverage: true },
      "c1"
    );
  });

  it("declares timing inputs as plain properties", () => {
    for (const name of ["update_push_campaign", "send_push_campaign"]) {
      const tool = pushToolDefinitions.find((entry) => entry.name === name);
      const properties = tool?.inputSchema.properties as Record<
        string,
        { type: unknown }
      >;
      expect(properties["sendInRecipientTimezone"]?.type).toBe("boolean");
      expect(properties["scheduledTimezone"]?.type).toEqual(["string", "null"]);
      expect(properties["sendTimeOptimization"]?.type).toBe("boolean");
      expect(properties["sendTimeWindowHours"]?.type).toBe("integer");
    }
  });

  it("validates required inputs before calling the API", async () => {
    for (const [tool, args] of [
      ["update_web_push_settings", { companyId: "c1" }],
      ["send_test_push", { companyId: "c1", title: "Hi" }],
      ["estimate_push_campaign_recipients", { companyId: "c1" }],
      ["get_push_campaign", { companyId: "c1" }],
      ["translate_push_content", { companyId: "c1" }],
      ["translate_push_campaign", { companyId: "c1" }],
    ] as const) {
      const result = await handleToolCall(tool, args);
      expect(result.isError).toBe(true);
    }
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("keeps credential tools off the OpenAI-reviewed surface", () => {
    expect(OPENAI_EXCLUDED_TOOL_NAMES.has("set_apns_credentials")).toBe(true);
    expect(OPENAI_EXCLUDED_TOOL_NAMES.has("set_fcm_credentials")).toBe(true);
    expect(OPENAI_EXCLUDED_TOOL_NAMES.has("send_push_campaign")).toBe(false);
  });

  it("passes language versions on push campaigns and sequence steps", async () => {
    const localizations = [{ locale: "de", title: "Hallo", body: "" }];
    await handleToolCall("update_push_campaign", {
      companyId: "c1",
      campaignId: "p1",
      localizations,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PATCH",
      "/api/v1/push/campaigns/p1",
      { localizations },
      "c1"
    );
    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });
    await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "push",
      title: "Hi",
      localizations,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/sequences/s1",
      {
        insertSteps: {
          steps: [{ type: "push", title: "Hi", localizations }],
        },
      },
      "c1"
    );
  });

  it("inserts push sequence steps", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true, sequence: {} });
    const result = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "push",
      afterNodeId: "n1",
      title: "Welcome",
      body: "Tap to start",
      url: "https://example.com",
      platforms: ["ios"],
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
              type: "push",
              title: "Welcome",
              body: "Tap to start",
              url: "https://example.com",
              platforms: ["ios"],
            },
          ],
        },
      },
      "c1"
    );
    const empty = await handleToolCall("insert_sequence_step", {
      companyId: "c1",
      sequenceId: "s1",
      type: "push",
    });
    expect(empty.isError).toBe(true);
  });
});
