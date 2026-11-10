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

describe("engagement hour windows", () => {
  it("accepts hours on every engagement value shape", () => {
    for (const [operator, value] of [
      ["is", "24h"],
      ["is_not", "1h"],
      ["at_least", "2:24h"],
      ["less_than_count", "1:12h"],
      ["is", "marketing:48h"],
      ["is", "8760h"],
    ] as const) {
      expect(
        getSegmentFilterValidationError({
          field: "emailClicked",
          operator,
          value,
        })
      ).toBeNull();
    }
  });

  it("rejects out-of-range hours and hours on event and push filters", () => {
    for (const value of ["0h", "8761h", "1.5h"]) {
      expect(
        getSegmentFilterValidationError({
          field: "emailOpened",
          operator: "is",
          value,
        })
      ).toContain("hour windows go up to 8760h");
    }
    expect(
      getSegmentFilterValidationError({
        field: "pushClicked",
        operator: "is",
        value: "24h",
      })
    ).toContain("pushClicked filters must use");
    expect(
      getSegmentFilterValidationError({
        field: "event",
        operator: "is",
        value: "saas.purchase:24h",
      })
    ).toContain("eventName:timeRange");
  });
});

describe("push segment filters", () => {
  it("accepts device platforms and time ranges", () => {
    expect(
      getSegmentFilterValidationError({
        field: "pushDevice",
        operator: "is",
        value: "ios",
      })
    ).toBeNull();
    expect(
      getSegmentFilterValidationError({
        field: "pushClicked",
        operator: "is_not",
        value: "30d",
      })
    ).toBeNull();
  });

  it("rejects unknown platforms, bad ranges and count operators", () => {
    expect(
      getSegmentFilterValidationError({
        field: "pushDevice",
        operator: "is",
        value: "watch",
      })
    ).toContain("any, web, ios, android");
    expect(
      getSegmentFilterValidationError({
        field: "pushSent",
        operator: "is",
        value: "campaign:abc",
      })
    ).toContain("time range");
    expect(
      getSegmentFilterValidationError({
        field: "pushClicked",
        operator: "is",
        value: "3000000d",
      })
    ).toContain("up to 36500d");
    expect(
      getSegmentFilterValidationError({
        field: "pushDelivered",
        operator: "at_least",
        value: "2:30d",
      })
    ).toContain("not supported");
  });
});

describe("phone segment filter validation", () => {
  it("accepts phone prefix, substring and country filters", () => {
    for (const filter of [
      { field: "phone", operator: "starts_with", value: "+44" },
      { field: "phone", operator: "not_starts_with", value: "+1 415" },
      { field: "phone", operator: "contains", value: "555" },
      { field: "phone", operator: "not_contains", value: "555" },
      { field: "phone", operator: "is_not_empty", value: "" },
      { field: "phoneCountry", operator: "is", value: "GB" },
      { field: "phoneCountry", operator: "is_not", value: "US,CA" },
    ]) {
      expect(getSegmentFilterValidationError(filter)).toBeNull();
    }
  });

  it("rejects operators the phone fields do not support", () => {
    expect(
      getSegmentFilterValidationError({
        field: "phone",
        operator: "is",
        value: "+44",
      })
    ).toContain('Operator "is" is not supported for phone filters');
    expect(
      getSegmentFilterValidationError({
        field: "phoneCountry",
        operator: "starts_with",
        value: "GB",
      })
    ).toContain("Use one of: is, is_not");
    expect(
      getSegmentFilterValidationError({
        field: "phoneCountry",
        operator: "is",
        value: " ",
      })
    ).not.toBeNull();
  });
});
