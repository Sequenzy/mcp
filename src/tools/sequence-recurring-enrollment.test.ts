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

const storedSchedule = {
  enabled: true,
  audience: { type: "segment", segmentId: "seg_low_balance" },
  schedule: {
    frequency: "monthly",
    weekdays: [],
    monthDays: [1, "last"],
    time: "10:00",
    timezone: "Europe/London",
  },
  enabledAt: "2026-11-04T09:00:00.000Z",
  nextRunAt: "2026-11-30T10:00:00.000Z",
  lastRunAt: null,
  lastRunId: null,
  lastSkippedAt: null,
  lastSkipReason: null,
};

const savedResponse = {
  success: true,
  recurringEnrollment: storedSchedule,
  description: "Monthly on the 1st and the last day at 10:00 (Europe/London)",
  upcomingRuns: ["2026-11-30T10:00:00.000Z", "2026-12-01T10:00:00.000Z"],
  message: "Monthly on the 1st and the last day at 10:00 (Europe/London).",
};

describe("recurring sequence schedule tools", () => {
  beforeEach(() => {
    mockApiRequest.mockReset();
  });

  it("publishes plain object input schemas", () => {
    for (const name of [
      "get_sequence_recurring_enrollment",
      "set_sequence_recurring_enrollment",
    ]) {
      const schema = findTool(name).inputSchema as {
        type: string;
        required?: string[];
        anyOf?: unknown;
        oneOf?: unknown;
        allOf?: unknown;
      };
      expect(schema.type).toBe("object");
      expect(schema.required).toEqual(["sequenceId"]);
      expect(schema.anyOf).toBeUndefined();
      expect(schema.oneOf).toBeUndefined();
      expect(schema.allOf).toBeUndefined();
      expect(JSON.stringify(schema)).not.toContain('"anyOf"');
    }
  });

  it("classifies the read and the write", () => {
    expect(
      findTool("get_sequence_recurring_enrollment").annotations
    ).toMatchObject({
      readOnlyHint: true,
    });
    expect(
      findTool("set_sequence_recurring_enrollment").annotations
    ).toMatchObject({
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    });
  });

  it("reads the schedule", async () => {
    mockApiRequest.mockResolvedValueOnce(savedResponse);
    const result = await handleToolCall("get_sequence_recurring_enrollment", {
      companyId: "comp_1",
      sequenceId: "seq 1",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "GET",
      "/api/v1/sequences/seq%201/recurring-enrollment",
      undefined,
      "comp_1"
    );
    expect(result.structuredContent).toMatchObject({
      recurringEnrollment: storedSchedule,
    });
    expect(
      validateOutput(
        "get_sequence_recurring_enrollment",
        result.structuredContent
      )
    ).toMatchObject({ valid: true });
    expect(
      validateOutput("get_sequence_recurring_enrollment", {
        success: true,
        recurringEnrollment: null,
        description: null,
        upcomingRuns: [],
      })
    ).toMatchObject({ valid: true });
  });

  it("saves a monthly schedule with the last day", async () => {
    mockApiRequest.mockResolvedValueOnce(savedResponse);
    const result = await handleToolCall("set_sequence_recurring_enrollment", {
      sequenceId: "seq_1",
      audience: { type: "segment", segmentId: "seg_low_balance" },
      frequency: "monthly",
      monthDays: [1],
      lastDayOfMonth: true,
      time: " 10:00 ",
      timezone: "Europe/London",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_1/recurring-enrollment",
      {
        audience: { type: "segment", segmentId: "seg_low_balance" },
        schedule: {
          frequency: "monthly",
          time: "10:00",
          timezone: "Europe/London",
          monthDays: [1, "last"],
        },
      },
      undefined
    );
    expect(
      validateOutput(
        "set_sequence_recurring_enrollment",
        result.structuredContent
      )
    ).toMatchObject({ valid: true });
  });

  it("saves weekly and daily schedules and passes enabled", async () => {
    mockApiRequest.mockResolvedValue(savedResponse);
    await handleToolCall("set_sequence_recurring_enrollment", {
      sequenceId: "seq_1",
      audience: { type: "all" },
      frequency: "weekly",
      weekdays: [1, 5],
      time: "09:00",
      timezone: "UTC",
      enabled: false,
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/sequences/seq_1/recurring-enrollment",
      {
        enabled: false,
        audience: { type: "all" },
        schedule: {
          frequency: "weekly",
          time: "09:00",
          timezone: "UTC",
          weekdays: [1, 5],
        },
      },
      undefined
    );
    await handleToolCall("set_sequence_recurring_enrollment", {
      sequenceId: "seq_1",
      audience: { type: "all" },
      frequency: "daily",
      weekdays: [3],
      time: "09:00",
      timezone: "UTC",
    });
    expect(mockApiRequest).toHaveBeenLastCalledWith(
      "PUT",
      "/api/v1/sequences/seq_1/recurring-enrollment",
      {
        audience: { type: "all" },
        schedule: { frequency: "daily", time: "09:00", timezone: "UTC" },
      },
      undefined
    );
  });

  it("passes an end date and who re-enters", async () => {
    mockApiRequest.mockResolvedValueOnce({
      ...savedResponse,
      enrollmentMode: "one_time",
    });
    const result = await handleToolCall("set_sequence_recurring_enrollment", {
      sequenceId: "seq_1",
      audience: { type: "all" },
      frequency: "daily",
      time: "09:00",
      timezone: "UTC",
      endsAt: "2027-06-30T23:59:00Z",
      enrollmentMode: "one_time",
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "PUT",
      "/api/v1/sequences/seq_1/recurring-enrollment",
      {
        audience: { type: "all" },
        schedule: { frequency: "daily", time: "09:00", timezone: "UTC" },
        endsAt: "2027-06-30T23:59:00Z",
        enrollmentMode: "one_time",
      },
      undefined
    );
    expect(
      validateOutput(
        "set_sequence_recurring_enrollment",
        result.structuredContent
      )
    ).toMatchObject({ valid: true });
  });

  it("removes the schedule without needing the other fields", async () => {
    mockApiRequest.mockResolvedValueOnce({
      success: true,
      recurringEnrollment: null,
      description: null,
      upcomingRuns: [],
      message: "Recurring schedule removed.",
    });
    await handleToolCall("set_sequence_recurring_enrollment", {
      sequenceId: "seq_1",
      remove: true,
    });
    expect(mockApiRequest).toHaveBeenCalledWith(
      "DELETE",
      "/api/v1/sequences/seq_1/recurring-enrollment",
      undefined,
      undefined
    );
  });

  it.each([
    [{ frequency: "daily", time: "10:00", timezone: "UTC" }, "audience"],
    [
      { audience: { type: "all" }, time: "10:00", timezone: "UTC" },
      "frequency",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "hourly",
        time: "10:00",
        timezone: "UTC",
      },
      "frequency",
    ],
    [
      { audience: { type: "all" }, frequency: "daily", timezone: "UTC" },
      "time",
    ],
    [
      { audience: { type: "all" }, frequency: "daily", time: "10:00" },
      "timezone",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "weekly",
        time: "10:00",
        timezone: "UTC",
      },
      "weekdays",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "monthly",
        time: "10:00",
        timezone: "UTC",
      },
      "monthDays",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "monthly",
        monthDays: "1",
        time: "10:00",
        timezone: "UTC",
      },
      "monthDays",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "daily",
        time: "10:00",
        timezone: "UTC",
        enabled: "yes",
      },
      "enabled",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "daily",
        time: "10:00",
        timezone: "UTC",
        endsAt: "someday",
      },
      "endsAt",
    ],
    [
      {
        audience: { type: "all" },
        frequency: "daily",
        time: "10:00",
        timezone: "UTC",
        enrollmentMode: "matching_field",
      },
      "enrollmentMode",
    ],
  ])("explains invalid arguments %#", async (args, field) => {
    const result = await handleToolCall("set_sequence_recurring_enrollment", {
      sequenceId: "seq_1",
      ...args,
    });
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain(field);
    expect(mockApiRequest).not.toHaveBeenCalled();
  });
});
