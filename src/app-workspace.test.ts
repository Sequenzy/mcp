import { afterEach, describe, expect, it } from "bun:test";

import { APP_RESOURCE_URI } from "./app-resource";
import { setSelectedCompanyId } from "./runtime";
import { handleToolCall, tools } from "./tools/index";
import { getToolsForProfile } from "./tools/profiles";

const originalFetch = globalThis.fetch;
const originalKey = process.env["SEQUENZY_API_KEY"];
const originalUrl = process.env["SEQUENZY_API_URL"];
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env["SEQUENZY_API_KEY"];
  else process.env["SEQUENZY_API_KEY"] = originalKey;
  if (originalUrl === undefined) delete process.env["SEQUENZY_API_URL"];
  else process.env["SEQUENZY_API_URL"] = originalUrl;
  setSelectedCompanyId(null);
});

const account = {
  success: true,
  companies: [
    { id: "co_a", name: "Acme", role: "owner", plan: "pro" },
    { id: "co_b", name: "Beta" },
  ],
  currentCompanyId: "co_a",
};

/** Answers by path; a number answers with that status instead. */
function route(responses: Record<string, unknown>) {
  process.env["SEQUENZY_API_KEY"] = "test-key";
  process.env["SEQUENZY_API_URL"] = "https://api.example.test";
  const requests: Request[] = [];
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const request = new Request(input as never, init);
    requests.push(request);
    const path = new URL(request.url).pathname;
    const body = responses[path];
    if (typeof body === "number")
      return Response.json(
        { success: false, error: "Missing scope: sequences:read" },
        { status: body }
      );
    return Response.json(body ?? { success: true });
  }) as typeof fetch;
  return requests;
}

const lists = {
  "/api/v1/account": account,
  "/api/v1/sequences": {
    success: true,
    sequences: [
      {
        id: "seq_1",
        name: "Welcome",
        status: "active",
        effectiveStatus: "live",
        emailCount: 3,
        nodes: [{ id: "big" }],
        triggerConfig: { secret: "not-for-the-list" },
      },
    ],
    pagination: { total: 120 },
  },
  "/api/v1/campaigns": {
    success: true,
    campaigns: [
      { id: "cmp_1", name: "Launch", subject: "We shipped", status: "sent" },
    ],
  },
};

describe("open_sequenzy", () => {
  it("opens the selected company with trimmed lists", async () => {
    const requests = route(lists);
    setSelectedCompanyId("co_b");
    const result = await handleToolCall("open_sequenzy", {});
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toEqual({
      mode: "home",
      companyId: "co_b",
      companyName: "Beta",
      companies: [
        { id: "co_a", name: "Acme" },
        { id: "co_b", name: "Beta" },
      ],
      sequences: {
        items: [
          {
            id: "seq_1",
            name: "Welcome",
            status: "active",
            effectiveStatus: "live",
            emailCount: 3,
          },
        ],
        total: 120,
      },
      campaigns: {
        items: [
          {
            id: "cmp_1",
            name: "Launch",
            subject: "We shipped",
            status: "sent",
          },
        ],
        total: 1,
      },
    });
    expect(JSON.stringify(result)).not.toContain("not-for-the-list");
    const [accountRequest, ...listRequests] = requests;
    expect(accountRequest.headers.get("x-company-id")).toBeNull();
    expect(listRequests.map((request) => request.method)).toEqual([
      "GET",
      "GET",
    ]);
    for (const request of listRequests)
      expect(request.headers.get("x-company-id")).toBe("co_b");
    expect(listRequests.map((request) => request.url).sort()).toEqual([
      "https://api.example.test/api/v1/campaigns?limit=25",
      "https://api.example.test/api/v1/sequences?limit=50",
    ]);
  });

  it("uses an explicit company over the selection, and the key default when the selection is stale", async () => {
    route(lists);
    setSelectedCompanyId("co_b");
    const explicit = await handleToolCall("open_sequenzy", {
      companyId: "co_a",
    });
    expect(explicit.structuredContent).toMatchObject({ companyId: "co_a" });

    setSelectedCompanyId("co_deleted");
    const stale = await handleToolCall("open_sequenzy", {});
    expect(stale.structuredContent).toMatchObject({
      companyId: "co_a",
      companyName: "Acme",
    });
  });

  it("refuses a company outside the account before reading any list", async () => {
    const requests = route(lists);
    const result = await handleToolCall("open_sequenzy", {
      companyId: "co_other",
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result)).toContain("not available");
    expect(requests).toHaveLength(1);
  });

  it("rejects unknown arguments", async () => {
    const requests = route(lists);
    const result = await handleToolCall("open_sequenzy", { filePath: "/x" });
    expect(result.isError).toBe(true);
    expect(requests).toHaveLength(0);
  });

  it("shows one list when the other cannot be read", async () => {
    route({ ...lists, "/api/v1/sequences": 403 });
    const result = await handleToolCall("open_sequenzy", {});
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent as Record<
      string,
      { items: unknown[]; total: number; error?: string }
    >;
    expect(data["sequences"]).toMatchObject({ items: [], total: 0 });
    expect(data["sequences"].error).toContain("sequences:read");
    expect(data["campaigns"].items).toHaveLength(1);
  });

  it("returns an empty workspace for an account without companies", async () => {
    const requests = route({
      "/api/v1/account": {
        success: true,
        companies: [],
        currentCompanyId: null,
      },
    });
    const result = await handleToolCall("open_sequenzy", {});
    expect(result.structuredContent).toMatchObject({
      mode: "home",
      companyId: null,
      companies: [],
    });
    expect(requests).toHaveLength(1);
  });

  it("fails like other reads when the account cannot be read", async () => {
    route({ "/api/v1/account": 401 });
    const result = await handleToolCall("open_sequenzy", {});
    expect(result.isError).toBe(true);
  });

  it("is a read-only global entry point on the standard surface only", () => {
    const tool = getToolsForProfile(tools, "standard").find(
      (item) => item.name === "open_sequenzy"
    );
    expect(tool?._meta).toEqual({
      ui: { resourceUri: APP_RESOURCE_URI },
      "openai/ui": { entrypoints: [{ type: "global" }] },
    });
    expect(tool?.title?.length).toBeLessThanOrEqual(60);
    expect(tool?.title).not.toMatch(/claude|anthropic/i);
    expect(tool?.inputSchema.required ?? []).toEqual([]);
    expect(tool?.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
    });
    for (const profile of ["openai", "muse"] as const)
      expect(
        getToolsForProfile(tools, profile).some(
          (item) => item.name === "open_sequenzy"
        )
      ).toBe(false);
  });
});
