/**
 * Arguments for set_sequence_recurring_enrollment. The tool takes flat
 * fields (and `lastDayOfMonth` instead of a "last" entry, so `monthDays`
 * stays a plain number array); the REST API takes `{ enabled, audience,
 * schedule }`. The API validates the schedule itself, so this only checks
 * shapes it can explain better than a 400.
 */

const TOOL = "set_sequence_recurring_enrollment";

export function isSequenceRecurringEnrollmentRemoval(
  args: Record<string, unknown>
): boolean {
  return args.remove === true || args.remove === "true";
}

export function buildSequenceRecurringEnrollmentBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const audience = args.audience;
  if (
    typeof audience !== "object" ||
    audience === null ||
    Array.isArray(audience) ||
    typeof (audience as Record<string, unknown>).type !== "string"
  ) {
    throw new Error(
      `Provide \`audience\` with a \`type\` of all, lists, segment, filtered, or rules when calling \`${TOOL}\`, or pass remove true to delete the schedule.`
    );
  }
  const frequency = args.frequency;
  if (
    frequency !== "daily" &&
    frequency !== "weekly" &&
    frequency !== "monthly"
  ) {
    throw new Error(
      `\`frequency\` must be daily, weekly, or monthly when calling \`${TOOL}\`.`
    );
  }
  if (typeof args.time !== "string" || !args.time.trim()) {
    throw new Error(
      `\`time\` must be a 24-hour "HH:MM" string such as "10:00" when calling \`${TOOL}\`.`
    );
  }
  if (typeof args.timezone !== "string" || !args.timezone.trim()) {
    throw new Error(
      `\`timezone\` must be an IANA timezone such as "Europe/London" when calling \`${TOOL}\`.`
    );
  }
  if (args.enabled !== undefined && typeof args.enabled !== "boolean") {
    throw new Error(`\`enabled\` must be a boolean when calling \`${TOOL}\`.`);
  }
  if (
    args.endsAt !== undefined &&
    args.endsAt !== null &&
    (typeof args.endsAt !== "string" || Number.isNaN(Date.parse(args.endsAt)))
  ) {
    throw new Error(
      `\`endsAt\` must be an ISO 8601 date-time when calling \`${TOOL}\`.`
    );
  }
  if (
    args.enrollmentMode !== undefined &&
    args.enrollmentMode !== "unlimited" &&
    args.enrollmentMode !== "one_time"
  ) {
    throw new Error(
      `\`enrollmentMode\` must be unlimited or one_time when calling \`${TOOL}\`.`
    );
  }

  const schedule: Record<string, unknown> = {
    frequency,
    time: args.time.trim(),
    timezone: args.timezone.trim(),
  };
  if (frequency === "weekly") {
    if (!Array.isArray(args.weekdays) || args.weekdays.length === 0) {
      throw new Error(
        `Weekly schedules need \`weekdays\`, e.g. [1, 5] for Monday and Friday, when calling \`${TOOL}\`.`
      );
    }
    schedule.weekdays = args.weekdays;
  }
  if (frequency === "monthly") {
    const days = Array.isArray(args.monthDays) ? [...args.monthDays] : [];
    if (args.monthDays !== undefined && !Array.isArray(args.monthDays)) {
      throw new Error(
        `\`monthDays\` must be an array of days 1 to 31 when calling \`${TOOL}\`.`
      );
    }
    if (args.lastDayOfMonth === true && !days.includes("last")) {
      days.push("last");
    }
    if (days.length === 0) {
      throw new Error(
        `Monthly schedules need \`monthDays\` (1 to 31) and/or \`lastDayOfMonth\` true when calling \`${TOOL}\`.`
      );
    }
    schedule.monthDays = days;
  }

  return {
    ...(args.enabled !== undefined ? { enabled: args.enabled } : {}),
    audience,
    schedule,
    ...(typeof args.endsAt === "string" ? { endsAt: args.endsAt } : {}),
    ...(args.enrollmentMode !== undefined
      ? { enrollmentMode: args.enrollmentMode }
      : {}),
  };
}
