import { describe, expect, it } from "bun:test";

import { toolDefinitions } from "./index.js";

describe("MCP tool definitions count", () => {
  // The /agent landing page (packages/front/src/app/(content)/agent/page.tsx)
  // advertises "200+ tools" / "more than 200 email marketing operations".
  // This pins the floor behind that claim: if tools are ever trimmed below
  // 200, update the landing copy in the same change instead of shipping a
  // stale marketing number.
  it("keeps the '200+ tools' landing-page claim truthful", () => {
    expect(toolDefinitions.length).toBeGreaterThanOrEqual(200);
  });
});
