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
const { MUSE_TOOL_NAMES } = await import("./muse-profile.js");
const { geofenceToolDefinitions } = await import("./definitions/geofences.js");
const { getSegmentGeofenceValueValidationError } =
  await import("./segment-validation.js");

const GEOFENCE_TOOLS = [
  "list_geofences",
  "get_geofence",
  "create_geofence",
  "update_geofence",
  "delete_geofence",
  "import_geofences",
];

function errorText(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  return content?.[0]?.text ?? "";
}

describe("geofence MCP tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
    mockApiRequest.mockResolvedValue({ success: true });
  });

  it("registers every tool with a plain object schema", () => {
    const names = tools.map((tool) => tool.name);
    for (const name of GEOFENCE_TOOLS) expect(names).toContain(name);
    for (const tool of geofenceToolDefinitions) {
      expect(tool.inputSchema.type).toBe("object");
      expect(JSON.stringify(tool.inputSchema)).not.toContain("anyOf");
    }
  });

  it("keeps geofence tools off the OpenAI and Muse connectors", () => {
    for (const name of GEOFENCE_TOOLS) {
      expect(OPENAI_EXCLUDED_TOOL_NAMES.has(name)).toBe(true);
      expect(MUSE_TOOL_NAMES).not.toContain(name);
    }
  });

  it.each([
    [
      "list_geofences",
      { group: "stores", active: false, limit: 50, cursor: "g9" },
      "GET",
      "/api/v1/geofences?group=stores&active=false&limit=50&cursor=g9",
      undefined,
    ],
    ["list_geofences", {}, "GET", "/api/v1/geofences", undefined],
    [
      "get_geofence",
      { geofenceId: "geo 1" },
      "GET",
      "/api/v1/geofences/geo%201",
      undefined,
    ],
    [
      "create_geofence",
      {
        name: "Soho",
        latitude: 51.5,
        longitude: -0.1,
        radiusMeters: 200,
        dwellSeconds: null,
        group: "stores",
        active: true,
      },
      "POST",
      "/api/v1/geofences",
      {
        name: "Soho",
        latitude: 51.5,
        longitude: -0.1,
        radiusMeters: 200,
        dwellSeconds: null,
        group: "stores",
        active: true,
      },
    ],
    [
      "update_geofence",
      { geofenceId: "g1", externalId: null },
      "PATCH",
      "/api/v1/geofences/g1",
      { externalId: null },
    ],
    [
      "delete_geofence",
      { geofenceId: "g1" },
      "DELETE",
      "/api/v1/geofences/g1",
      undefined,
    ],
    [
      "import_geofences",
      { geofences: [{ externalId: "s-1", radiusMeters: 300 }] },
      "POST",
      "/api/v1/geofences/import",
      { geofences: [{ externalId: "s-1", radiusMeters: 300 }] },
    ],
  ])("%s calls the API", async (name, args, method, path, body) => {
    await handleToolCall(name, { companyId: "c1", ...args });
    expect(mockApiRequest).toHaveBeenCalledWith(method, path, body, "c1");
  });

  it.each([
    ["update_geofence", { geofenceId: "g1" }, "at least one field"],
    [
      "create_geofence",
      { name: "x", latitude: "51", longitude: 0, radiusMeters: 200 },
      "`latitude` must be a number",
    ],
    [
      "update_geofence",
      { geofenceId: "g1", dwellSeconds: "60" },
      "`dwellSeconds` must be a number or null",
    ],
    [
      "update_geofence",
      { geofenceId: "g1", group: 5 },
      "`group` must be a string or null",
    ],
    [
      "update_geofence",
      { geofenceId: "g1", active: "yes" },
      "`active` must be true or false",
    ],
    ["list_geofences", { limit: 0 }, "`limit` must be a whole number"],
    ["list_geofences", { active: "true" }, "`active` must be true or false"],
    ["import_geofences", { geofences: [] }, "non-empty array"],
    [
      "import_geofences",
      { geofences: Array.from({ length: 1001 }, () => ({})) },
      "at most 1,000",
    ],
    [
      "import_geofences",
      { geofences: ["x"] },
      "`geofences[0]` must be an object",
    ],
  ])(
    "%s rejects bad input before calling the API",
    async (name, args, message) => {
      const result = await handleToolCall(name, args);
      expect(errorText(result)).toContain(message);
      expect(mockApiRequest).not.toHaveBeenCalled();
    }
  );

  it("forwards import rows unchanged so the API reports bad rows one by one", async () => {
    const rows = [
      { externalId: "s-1", latitude: "51", name: "" },
      { externalId: "s-2", radiusMeters: 300 },
    ];
    await handleToolCall("import_geofences", {
      companyId: "c1",
      geofences: rows,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/geofences/import",
      { geofences: rows },
      "c1"
    );
  });

  it("validates geofence segment filter values", () => {
    expect(
      getSegmentGeofenceValueValidationError("is", "entered:any:30d")
    ).toBeNull();
    expect(
      getSegmentGeofenceValueValidationError(
        "is_not",
        "exited:group=stores:all"
      )
    ).toBeNull();
    expect(
      getSegmentGeofenceValueValidationError(
        "at_least",
        "dwelled:id=g1,g2:2:90d"
      )
    ).toBeNull();
    expect(
      getSegmentGeofenceValueValidationError("is", "entered:any:2:30d")
    ).toContain("transition:target:timeRange");
    expect(
      getSegmentGeofenceValueValidationError("at_least", "entered:any:30d")
    ).toContain("count");
    expect(
      getSegmentGeofenceValueValidationError("is", "walked:any:30d")
    ).not.toBeNull();
  });
});
