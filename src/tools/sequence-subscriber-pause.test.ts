import { AjvJsonSchemaValidator } from "@modelcontextprotocol/server/validators/ajv";
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

function findTool(name: string) {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`${name} is not registered`);
  return tool;
}

function validateOutput(name: string, value: unknown) {
  const tool = findTool(name);
  if (!tool.outputSchema) throw new Error(`${name} has no output schema`);
  return new AjvJsonSchemaValidator().getValidator(tool.outputSchema as never)(
    value
  );
}

const pausedItem = {
  enrollmentId: "tok_1",
  subscriberId: "sub_1",
  subscriberEmail: "ada@example.com",
  currentNodeId: "node_delay",
  status: "paused",
  waitUntil: null,
  pausedAt: "2026-10-22T10:00:00.000Z",
  outcome: "paused",
};

describe("pause_sequence_subscribers / resume_sequence_subscribers tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("declare plain object input schemas with the documented targets", () => {
    for (const name of [
      "pause_sequence_subscribers",
      "resume_sequence_subscribers",
    ]) {
      const schema = findTool(name).inputSchema as {
        type: string;
        required?: string[];
        additionalProperties?: boolean;
        properties: Record<string, unknown>;
        anyOf?: unknown;
        oneOf?: unknown;
      };
      expect(schema.type).toBe("object");
      expect(schema.required).toEqual(["sequenceId"]);
      expect(schema.additionalProperties).toBe(false);
      expect(schema.anyOf).toBeUndefined();
      expect(schema.oneOf).toBeUndefined();
      expect(schema.properties).toHaveProperty("subscriberIds");
      expect(schema.properties).toHaveProperty("emails");
    }
    expect(
      (
        findTool("pause_sequence_subscribers").inputSchema as {
          properties: Record<string, unknown>;
        }
      ).properties
    ).toHaveProperty("reason");
    expect(
      (
        findTool("resume_sequence_subscribers").inputSchema as {
          properties: Record<string, unknown>;
        }
      ).properties
    ).not.toHaveProperty("reason");
  });

  it("forwards a pause with trimmed, de-duplicated targets", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      sequenceId: "seq_123",
      pausedCount: 1,
    });

    const result = await handleToolCall("pause_sequence_subscribers", {
      companyId: "comp_123",
      sequenceId: "seq_123",
      subscriberIds: [" sub_1 ", "sub_1"],
      emails: ["ada@example.com"],
      reason: " Project blocked ",
    });

    expect(result.isError).toBeUndefined();
    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq_123/enrollments/pause",
      {
        subscriberIds: ["sub_1"],
        emails: ["ada@example.com"],
        reason: "Project blocked",
      },
      "comp_123"
    );
  });

  it("forwards a resume to the resume endpoint", async () => {
    mockApiRequest.mockResolvedValueOnce({ success: true });

    await handleToolCall("resume_sequence_subscribers", {
      sequenceId: "seq 1",
      emails: ["ada@example.com"],
    });

    expect(mockApiRequest).toHaveBeenCalledWith(
      "POST",
      "/api/v1/sequences/seq%201/enrollments/resume",
      { emails: ["ada@example.com"] },
      undefined
    );
  });

  it("rejects a call with no targets before hitting the API", async () => {
    const result = await handleToolCall("pause_sequence_subscribers", {
      sequenceId: "seq_123",
      subscriberIds: ["  "],
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain(
      "Provide `subscriberIds`, `emails`, or both"
    );
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("rejects more than 500 combined targets before hitting the API", async () => {
    const result = await handleToolCall("resume_sequence_subscribers", {
      sequenceId: "seq_123",
      subscriberIds: Array.from({ length: 300 }, (_, i) => `sub_${i}`),
      emails: Array.from({ length: 201 }, (_, i) => `u${i}@example.com`),
    });

    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toContain("at most 500");
    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it("classifies pause as reversible and resume as a sending action", () => {
    expect(findTool("pause_sequence_subscribers").annotations).toMatchObject({
      readOnlyHint: false,
      openWorldHint: false,
    });
    expect(findTool("resume_sequence_subscribers").annotations).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: true,
    });
  });

  it("accepts the API's pause and resume responses", () => {
    const base = {
      success: true,
      sequenceId: "seq_123",
      enrollments: [pausedItem],
      notEnrolled: [{ subscriberId: "sub_2", email: null }],
      notFound: { subscriberIds: [], emails: ["nobody@example.com"] },
      message: "Paused 1 enrollment.",
    };
    expect(
      validateOutput("pause_sequence_subscribers", {
        ...base,
        pausedCount: 1,
        alreadyPausedCount: 0,
        inProgressCount: 0,
      })
    ).toMatchObject({ valid: true });
    expect(
      validateOutput("resume_sequence_subscribers", {
        ...base,
        enrollments: [
          {
            ...pausedItem,
            status: "waiting",
            waitUntil: "2026-10-25T10:00:00.000Z",
            pausedAt: null,
            outcome: "resumed",
          },
        ],
        resumedCount: 1,
        notPausedCount: 0,
        sequenceRunning: false,
        enqueuedCount: 0,
        enqueueErrors: [],
      })
    ).toMatchObject({ valid: true });
  });
});

describe("paused enrollments in existing read tools", () => {
  it("lists paused as an accepted enrollment status filter", () => {
    const properties = findTool("list_sequence_enrollments").inputSchema
      .properties as Record<string, { items?: { enum?: string[] } }>;
    expect(properties["status"]?.items?.enum).toContain("paused");
  });

  it("accepts a paused enrollment row with pause fields", () => {
    expect(
      validateOutput("list_sequence_enrollments", {
        success: true,
        sequenceId: "seq_123",
        sequenceName: "Onboarding",
        statuses: ["active", "waiting", "paused"],
        enrollments: [
          {
            enrollmentId: "tok_1",
            sequenceId: "seq_123",
            subscriberId: "sub_1",
            status: "paused",
            currentNodeId: "node_delay",
            currentNodeMissing: false,
            enrollmentStartedAt: "2026-10-01T00:00:00.000Z",
            waitUntil: null,
            pausedAt: "2026-10-22T10:00:00.000Z",
            pauseReason: null,
          },
        ],
      })
    ).toMatchObject({ valid: true });
  });

  it("keeps enrollmentCounts in its shipped closed shape and reports paused separately", () => {
    const enrollmentCounts = {
      active: 1,
      waiting: 2,
      total: 3,
      byCurrentNode: [
        {
          currentNodeId: "node_delay",
          currentNodeMissing: false,
          active: 1,
          waiting: 2,
          total: 3,
        },
      ],
    };
    expect(
      validateOutput("get_sequence_stats", {
        success: true,
        enrollmentCounts,
        pausedEnrollments: {
          total: 1,
          byCurrentNode: [
            {
              currentNodeId: "node_delay",
              currentNodeMissing: false,
              count: 1,
            },
          ],
        },
      })
    ).toMatchObject({ valid: true });

    // Pins why paused counts live outside enrollmentCounts: a published
    // package rejects any extra key inside it.
    expect(
      validateOutput("get_sequence_stats", {
        success: true,
        enrollmentCounts: { ...enrollmentCounts, paused: 1 },
      })
    ).toMatchObject({ valid: false });
  });
});
