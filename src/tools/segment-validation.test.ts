import { describe, expect, it } from "bun:test";

import { getSegmentFilterValidationError } from "./segment-validation";

describe("engagement segment filter validation", () => {
  it("accepts marketing and transactional presence scopes", () => {
    expect(
      getSegmentFilterValidationError({
        field: "emailOpened",
        operator: "is",
        value: "marketing:all",
      })
    ).toBeNull();
    expect(
      getSegmentFilterValidationError({
        field: "emailSent",
        operator: "is_not",
        value: "transactional:7d",
      })
    ).toBeNull();
  });

  it("rejects malformed scopes and scoped count operators locally", () => {
    expect(
      getSegmentFilterValidationError({
        field: "emailOpened",
        operator: "is",
        value: "marketing:recently",
      })
    ).toContain("marketing:<timeRange>");
    expect(
      getSegmentFilterValidationError({
        field: "emailOpened",
        operator: "at_least",
        value: "marketing:30d",
      })
    ).toContain("cannot be combined");
  });

  it("rejects count thresholds with non-numeric suffixes", () => {
    expect(
      getSegmentFilterValidationError({
        field: "emailOpened",
        operator: "at_least",
        value: "10junk:30d",
      })
    ).toContain("count:timeRange");
  });
});
