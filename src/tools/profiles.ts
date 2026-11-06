import type { Tool } from "../mcp-types.js";

import { getMuseTools } from "./muse-profile.js";
import { withOpenAiToolProfiles } from "./openai-profile.js";
import { collapseRepeatedSchemas } from "./schema-collapse.js";

export type SequenzyMcpProfile = "standard" | "openai" | "muse";

/**
 * The standard profile is the full public MCP contract. The OpenAI profile is
 * derived from the same definitions so fixes do not fork, then removes or
 * narrows only the fields and operations that are unsuitable for app review.
 * The Muse profile is a smaller subset of the standard surface (see
 * muse-profile.ts).
 */
export function getToolsForProfile(
  tools: readonly Tool[],
  profile: SequenzyMcpProfile
): Tool[] {
  if (profile === "standard") {
    // Sequence tools repeat large nested step schemas; later copies point at
    // the first. Accepted inputs are unchanged: collapsed copies only loosen.
    return tools.map((tool) => ({
      ...tool,
      inputSchema: collapseRepeatedSchemas(
        tool.inputSchema
      ) as Tool["inputSchema"],
    }));
  }

  if (profile === "muse") {
    return getMuseTools(tools);
  }

  return tools.flatMap(withOpenAiToolProfiles);
}
