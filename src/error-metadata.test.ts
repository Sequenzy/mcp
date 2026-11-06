import { describe, expect, it } from "bun:test";

import { getErrorCode, parseRetryAfter } from "./error-metadata.js";

describe("Retry-After hints", () => {
  it("accepts seconds and HTTP dates, including elapsed dates", () => {
    const now = Date.parse("Mon, 07 Sep 2026 22:00:00 GMT");
    expect(parseRetryAfter(" 17 ", now)).toBe(17);
    expect(parseRetryAfter("0", now)).toBe(0);
    expect(parseRetryAfter("Mon, 07 Sep 2026 22:00:02 GMT", now + 1)).toBe(2);
    expect(parseRetryAfter("Mon, 07 Sep 2026 21:00:00 GMT", now)).toBe(0);
  });
  it("ignores missing, malformed, negative and unbounded hints", () => {
    for (const value of [
      null,
      "",
      " ",
      "-1",
      "1.5",
      "Infinity",
      "NaN",
      "1e3",
      "garbage",
      "9999999999999999999999",
      "Mon, 99 Foo 2026 22:00:00 GMT",
      "Mon, 31 Feb 2030 00:00:00 GMT",
    ]) {
      expect(parseRetryAfter(value)).toBeUndefined();
    }
  });
});

describe("machine error codes", () => {
  it("preserves bounded API codes and falls back for invalid codes", () => {
    expect(getErrorCode("SENDER_UNVERIFIED", 400, "LOCAL_ERROR")).toBe(
      "SENDER_UNVERIFIED"
    );
    expect(getErrorCode("seq_user_private", 401, "LOCAL_ERROR")).toBe(
      "UNAUTHORIZED"
    );
    expect(getErrorCode(undefined, undefined, "LOCAL_ERROR")).toBe(
      "LOCAL_ERROR"
    );
    for (const [status, code] of [
      [0, "NETWORK_ERROR"],
      [400, "VALIDATION_ERROR"],
      [422, "VALIDATION_ERROR"],
      [401, "UNAUTHORIZED"],
      [403, "FORBIDDEN"],
      [404, "NOT_FOUND"],
      [409, "CONFLICT"],
      [429, "RATE_LIMITED"],
      [500, "SERVER_ERROR"],
      [503, "SERVER_ERROR"],
      [418, "HTTP_ERROR"],
    ] as const) {
      expect(getErrorCode(undefined, status, "LOCAL_ERROR")).toBe(code);
    }
  });
});
