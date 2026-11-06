import { describe, expect, it } from "bun:test";

import { buildUpdateCompanyBody } from "./argument-validation";
describe("company footer rename contract", () => {
  it("forwards opt-in and leaves existing calls unchanged", () => {
    const input = {
      name: "Grove",
      renameMatchingFooters: true,
      previousCompanyName: "Linear",
    };
    expect(buildUpdateCompanyBody(input)).toEqual(input);
    expect(buildUpdateCompanyBody({ name: "Grove" })).toEqual({
      name: "Grove",
    });
  });
  it("rejects invalid and incomplete consent", () => {
    for (const input of [
      { renameMatchingFooters: true },
      { name: "Grove", renameMatchingFooters: true },
      { renameMatchingFooters: "yes" },
      { previousCompanyName: null },
    ]) {
      expect(() => buildUpdateCompanyBody(input)).toThrow();
    }
  });
});
