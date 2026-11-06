/**
 * A run started from the dashboard's Subscribers selection can carry up to
 * 100,000 hand-picked IDs in `audience.includedSubscriberIds`. Agents never
 * need the full list in their context: they get the first few, a truncation
 * flag, and `includedSubscriberCount` (already on every run) for the size.
 */
export const AGENT_INCLUDED_SUBSCRIBER_ID_PREVIEW = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compactRun(run: unknown): unknown {
  if (!isRecord(run) || !isRecord(run["audience"])) return run;
  const ids = run["audience"]["includedSubscriberIds"];
  if (!Array.isArray(ids) || ids.length <= AGENT_INCLUDED_SUBSCRIBER_ID_PREVIEW)
    return run;
  return {
    ...run,
    audience: {
      ...run["audience"],
      includedSubscriberIds: ids.slice(0, AGENT_INCLUDED_SUBSCRIBER_ID_PREVIEW),
      includedSubscriberIdsTruncated: true,
    },
  };
}

/** Compacts `audienceEnrollment` and `audienceEnrollments` in an API response. */
export function compactAudienceEnrollmentResult(result: unknown): unknown {
  if (!isRecord(result)) return result;
  const next = { ...result };
  if ("audienceEnrollment" in next) {
    next["audienceEnrollment"] = compactRun(next["audienceEnrollment"]);
  }
  if (Array.isArray(next["audienceEnrollments"])) {
    next["audienceEnrollments"] = next["audienceEnrollments"].map(compactRun);
  }
  return next;
}
