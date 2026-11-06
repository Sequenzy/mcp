import { describe, expect, it } from "bun:test";

import {
  AGENT_INCLUDED_SUBSCRIBER_ID_PREVIEW,
  compactAudienceEnrollmentResult,
} from "./audience-enrollment-output.js";

const ids = (count: number) =>
  Array.from({ length: count }, (_, index) => `sub_${index}`);

function run(includedSubscriberIds?: string[]) {
  return {
    id: "run_1",
    status: "completed",
    includedSubscriberCount: includedSubscriberIds?.length ?? 0,
    audience: {
      type: "rules",
      include: [],
      ...(includedSubscriberIds ? { includedSubscriberIds } : {}),
    },
  };
}

describe("compactAudienceEnrollmentResult", () => {
  it("keeps the first IDs of a long hand-picked list and flags the cut", () => {
    const result = compactAudienceEnrollmentResult({
      success: true,
      audienceEnrollment: run(ids(5000)),
    }) as {
      audienceEnrollment: ReturnType<typeof run> & {
        audience: Record<string, unknown>;
      };
    };
    expect(result.audienceEnrollment.includedSubscriberCount).toBe(5000);
    expect(result.audienceEnrollment.audience).toEqual({
      type: "rules",
      include: [],
      includedSubscriberIds: ids(AGENT_INCLUDED_SUBSCRIBER_ID_PREVIEW),
      includedSubscriberIdsTruncated: true,
    });
  });

  it("compacts every run in a list and leaves short or absent lists alone", () => {
    const short = run(ids(AGENT_INCLUDED_SUBSCRIBER_ID_PREVIEW));
    const none = run();
    const result = compactAudienceEnrollmentResult({
      success: true,
      audienceEnrollments: [run(ids(100)), short, none, null],
    }) as { audienceEnrollments: unknown[] };
    expect(
      (result.audienceEnrollments[0] as ReturnType<typeof run>).audience
    ).toMatchObject({ includedSubscriberIdsTruncated: true });
    expect(result.audienceEnrollments.slice(1)).toEqual([short, none, null]);
  });

  it("passes through estimates, nulls and non-object results", () => {
    const estimate = { success: true, matchingCount: 3 };
    expect(compactAudienceEnrollmentResult(estimate)).toEqual(estimate);
    expect(
      compactAudienceEnrollmentResult({ audienceEnrollment: null })
    ).toEqual({ audienceEnrollment: null });
    expect(compactAudienceEnrollmentResult("text")).toBe("text");
  });
});
