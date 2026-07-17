import { describe, expect, it } from "bun:test";

import { rawHtmlContentWarning } from "./descriptions.js";
import { addRawHtmlWarning } from "./raw-html-warning.js";

describe("addRawHtmlWarning", () => {
  it("warns when authoring a campaign with raw HTML", () => {
    expect(
      addRawHtmlWarning(
        "create_campaign",
        { html: "<p>Hello</p>" },
        { success: true, campaign: { id: "campaign-1" } }
      )
    ).toMatchObject({ warnings: [rawHtmlContentWarning] });
  });

  it("detects raw HTML in nested sequence steps", () => {
    expect(
      addRawHtmlWarning(
        "insert_sequence_step",
        { steps: [{ type: "email", htmlContent: "<p>Hello</p>" }] },
        { success: true }
      )
    ).toMatchObject({ warnings: [rawHtmlContentWarning] });
  });

  it("does not warn for native blocks or direct transactional sends", () => {
    const result = { success: true };
    expect(addRawHtmlWarning("create_campaign", { blocks: [] }, result)).toBe(
      result
    );
    expect(addRawHtmlWarning("send_email", { html: "<p>Hi</p>" }, result)).toBe(
      result
    );
  });
});
