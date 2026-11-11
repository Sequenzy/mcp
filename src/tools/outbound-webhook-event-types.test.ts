import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "bun:test";

import { OUTBOUND_WEBHOOK_EVENT_TYPES } from "./descriptions.js";

// The MCP package ships standalone, so it keeps its own copy of the shared
// event list. Inside the monorepo, read the shared source to keep the copy
// from drifting; the standalone distribution copy has no shared package and
// skips the check.
const SHARED_SOURCE = join(
  import.meta.dir,
  "../../../shared/src/types/outbound-webhooks.ts"
);

function sharedEventTypes(): string[] {
  const source = readFileSync(SHARED_SOURCE, "utf8");
  const start = source.indexOf("export const OUTBOUND_WEBHOOK_EVENT_TYPES = [");
  const end = source.indexOf("] as const;", start);
  return [...source.slice(start, end).matchAll(/^\s*"([^"]+)",/gm)].map(
    (match) => match[1] ?? ""
  );
}

describe("OUTBOUND_WEBHOOK_EVENT_TYPES", () => {
  it.skipIf(!existsSync(SHARED_SOURCE))(
    "matches the shared outbound webhook event list",
    () => {
      const shared = sharedEventTypes();
      expect(shared).toContain("poll.commented");
      const mcp: string[] = [...OUTBOUND_WEBHOOK_EVENT_TYPES];
      expect(mcp).toEqual(shared);
    }
  );
});
