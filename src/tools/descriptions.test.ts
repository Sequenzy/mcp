import { describe, expect, it } from "bun:test";

import { blockConditionsHint } from "./descriptions";

describe("blockConditionsHint", () => {
  it("documents render-time and server-evaluated condition fields", () => {
    for (const field of [
      "variable",
      "attribute",
      "segment",
      "event",
      "tag",
      "list",
      "emailOpened",
      "stripeProduct",
      "commerceProduct",
    ]) {
      expect(blockConditionsHint).toContain(`"${field}"`);
    }
  });

  it("documents server-evaluated operator and fallback behavior", () => {
    expect(blockConditionsHint).toContain("at_least");
    expect(blockConditionsHint).toContain("less_than_count");
    expect(blockConditionsHint).toContain("is_temporary_bounce");
    expect(blockConditionsHint).toContain("without a stored subscriber match");
  });
});
