import { describe, expect, it } from "bun:test";

import {
  blockConditionsHint,
  emailBlocksDescription,
  rawHtmlContentWarning,
} from "./descriptions";

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

  it("includes required ids in every example condition", () => {
    expect(blockConditionsHint).toContain('{ "id": "c2", "field": "segment"');
    expect(blockConditionsHint).toContain('{ "id": "c3", "field": "tag"');
    expect(blockConditionsHint).toContain('{ "id": "c4", "field": "event"');
  });
});

describe("email authoring descriptions", () => {
  it("shows minimal valid examples for every core block", () => {
    expect(emailBlocksDescription).toContain(
      '{"type":"heading","content":"Title","level":1}'
    );
    expect(emailBlocksDescription).toContain('{"type":"text","content":');
    expect(emailBlocksDescription).toContain(
      '{"type":"button","text":"Click Me"'
    );
    expect(emailBlocksDescription).toContain('"widthType":"percent"');
    expect(emailBlocksDescription).toContain(
      "button uses `text` but also accepts `content` as an alias"
    );
    expect(emailBlocksDescription).toContain(
      "Image `widthType` accepts `percent` or `px`"
    );
  });

  it("explains the raw HTML branding tradeoff", () => {
    expect(rawHtmlContentWarning).toContain("one opaque block");
    expect(rawHtmlContentWarning).toContain("does not add a company logo");
    expect(rawHtmlContentWarning).toContain("theme-driven block design");
  });
});
