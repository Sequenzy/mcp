import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockApiRequest = mock(async (..._args: unknown[]): Promise<unknown> => ({
  enrollments: [],
}));

await mock.module("../runtime.js", () => ({
  areLocalFileUploadsEnabled: () => false,
  apiRequest: mockApiRequest,
  apiUploadRequest: async () => undefined,
  getSelectedCompanyId: () => "company_123",
  setSelectedCompanyId: () => undefined,
}));

const { handleToolCall, tools } = await import("./index.js");
const { withOpenAiDefaultArguments } = await import("./openai-profile.js");
const { getToolsForProfile } = await import("./profiles.js");

function inputProperty(
  profile: "standard" | "openai",
  toolName: string,
  property: string
) {
  const tool = getToolsForProfile(tools, profile).find(
    (candidate) => candidate.name === toolName
  );
  return tool?.inputSchema.properties?.[property];
}

function requestedPath(): string {
  return String(mockApiRequest.mock.calls.at(-1)?.[1]);
}

beforeEach(() => {
  mockApiRequest.mockClear();
});

// OpenAI holds a published tool whose definition changes until it reviews it
// again, so these must stay byte-identical to the approved plugin 1.0.4 text.
describe("OpenAI-approved tool definitions", () => {
  it("lists list_email_sends bounceType exactly as approved", () => {
    expect(inputProperty("openai", "list_email_sends", "bounceType")).toEqual({
      type: "string",
      description: "Bounce type: Permanent or Transient.",
    });
    expect(
      JSON.stringify(
        inputProperty("standard", "list_email_sends", "bounceType")
      )
    ).toContain("Blocked");
  });

  it("lists list_sequence_enrollments status exactly as approved", () => {
    expect(
      inputProperty("openai", "list_sequence_enrollments", "status")
    ).toEqual({
      type: "array",
      items: {
        type: "string",
        enum: ["active", "waiting", "completed", "failed", "cancelled"],
      },
      description:
        "Enrollment statuses to include. Defaults to active and waiting, which is every contact still moving through the sequence.",
    });
    expect(
      JSON.stringify(
        inputProperty("standard", "list_sequence_enrollments", "status")
      )
    ).toContain("paused");
  });
});

describe("OpenAI default arguments", () => {
  it("lists only active and waiting enrollments when status is omitted", async () => {
    const result = await handleToolCall(
      "list_sequence_enrollments",
      { sequenceId: "seq_1" },
      { profile: "openai" }
    );

    expect(result.isError).not.toBe(true);
    expect(requestedPath()).toBe(
      "/api/v1/sequences/seq_1/enrollments?status=active%2Cwaiting"
    );
  });

  it("keeps an explicit status on the OpenAI surface", async () => {
    await handleToolCall(
      "list_sequence_enrollments",
      { sequenceId: "seq_1", status: ["completed"] },
      { profile: "openai" }
    );

    expect(requestedPath()).toBe(
      "/api/v1/sequences/seq_1/enrollments?status=completed"
    );
  });

  it("leaves the standard surface on the API default", async () => {
    await handleToolCall(
      "list_sequence_enrollments",
      { sequenceId: "seq_1" },
      { profile: "standard" }
    );

    expect(requestedPath()).toBe("/api/v1/sequences/seq_1/enrollments");
  });

  it("returns arguments unchanged for tools without defaults", () => {
    const args = { sequenceId: "seq_1" };
    expect(withOpenAiDefaultArguments("list_email_sends", args)).toBe(args);
    const explicit = { status: ["failed"] };
    expect(
      withOpenAiDefaultArguments("list_sequence_enrollments", explicit)
    ).toBe(explicit);
  });
});
