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
const { handleAccountHealthTools } =
  await import("./handlers/account-health.js");

const NAMES = [
  "get_account_health",
  "update_account_health_settings",
  "run_account_health_check",
  "update_account_health_insight",
  "create_account_health_fix",
  "submit_account_health_feedback",
];

describe("account health tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  it("registers plain object schemas with output schemas and the right hints", () => {
    const byName = new Map(tools.map((tool) => [tool.name, tool]));
    expect(byName.get("get_account_health")?.annotations).toMatchObject({
      readOnlyHint: true,
    });
    expect(byName.get("create_account_health_fix")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: false,
    });
    // A run resolves, reopens and rewrites findings; feedback replaces the
    // earlier rating and reaches the Sequenzy team.
    expect(byName.get("run_account_health_check")?.annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    });
    expect(
      byName.get("submit_account_health_feedback")?.annotations
    ).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    });
    for (const name of [
      "update_account_health_settings",
      "update_account_health_insight",
    ]) {
      expect(byName.get(name)?.annotations).toMatchObject({
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
    for (const name of NAMES) {
      const tool = byName.get(name);
      expect(tool?.inputSchema.type).toBe("object");
      expect(tool?.inputSchema.properties).toBeDefined();
      const schema = JSON.stringify(tool?.inputSchema);
      for (const keyword of ["anyOf", "oneOf", "allOf", '"not"']) {
        expect(schema).not.toContain(keyword);
      }
      expect(tool?.outputSchema?.properties).toBeDefined();
    }
  });

  it("reads the report and queues a check", async () => {
    await handleToolCall("get_account_health", { companyId: "company_1" });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "GET",
      "/api/v1/account-health",
      undefined,
      "company_1"
    );
    await handleToolCall("run_account_health_check", {});
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/account-health/runs",
      undefined,
      undefined
    );
  });

  it("sends only the settings that were passed", async () => {
    await handleToolCall("update_account_health_settings", {
      enabled: false,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/account-health/settings",
      { enabled: false },
      undefined
    );
    await handleToolCall("update_account_health_settings", {
      autonomy: "report_only",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/account-health/settings",
      { autonomy: "report_only" },
      undefined
    );
  });

  it("acts on an insight and requires its id and action", async () => {
    await handleToolCall("update_account_health_insight", {
      insightId: "ins/1",
      action: "snooze",
      snoozeDays: 30,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/account-health/insights/ins%2F1",
      { action: "snooze", snoozeDays: 30 },
      undefined
    );
    await handleToolCall("update_account_health_insight", {
      insightId: "ins_2",
      action: "dismiss",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PATCH",
      "/api/v1/account-health/insights/ins_2",
      { action: "dismiss" },
      undefined
    );
    await Promise.resolve(
      expect(
        handleAccountHealthTools("update_account_health_insight", {
          action: "dismiss",
        })
      ).rejects.toThrow()
    );
  });

  it("ignores other tools", async () => {
    expect(await handleAccountHealthTools("list_campaigns", {})).toEqual({
      handled: false,
      result: undefined,
    });
  });

  it("builds the fix sequence through the API", async () => {
    await handleToolCall("create_account_health_fix", {
      insightId: "ins/1",
      companyId: "company_1",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/account-health/insights/ins%2F1/fix",
      undefined,
      "company_1"
    );
    await Promise.resolve(
      expect(
        handleAccountHealthTools("create_account_health_fix", {})
      ).rejects.toThrow()
    );
  });

  it("sends feedback, passing the comment only when given", async () => {
    await handleToolCall("submit_account_health_feedback", {
      insightId: "ins/1",
      rating: "not_useful",
      comment: "We already send this from Stripe",
      companyId: "company_1",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/account-health/insights/ins%2F1/feedback",
      { rating: "not_useful", comment: "We already send this from Stripe" },
      "company_1"
    );
    await handleToolCall("submit_account_health_feedback", {
      insightId: "ins_2",
      rating: "useful",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/account-health/insights/ins_2/feedback",
      { rating: "useful" },
      undefined
    );
    await handleToolCall("submit_account_health_feedback", {
      insightId: "ins_2",
      rating: "useful",
      comment: null,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "POST",
      "/api/v1/account-health/insights/ins_2/feedback",
      { rating: "useful", comment: null },
      undefined
    );
    await Promise.resolve(
      expect(
        handleAccountHealthTools("submit_account_health_feedback", {
          insightId: "ins_2",
        })
      ).rejects.toThrow()
    );
  });
});
