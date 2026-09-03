import type { Tool } from "../mcp-types.js";

import { withOpenAiToolProfile } from "./openai-profile.js";

export type SequenzyMcpProfile = "standard" | "openai";

/**
 * The standard profile is the full public MCP contract. The OpenAI profile is
 * derived from the same definitions so fixes do not fork, then removes or
 * narrows only the fields and operations that are unsuitable for app review.
 */
export function getToolsForProfile(
  tools: readonly Tool[],
  profile: SequenzyMcpProfile
): Tool[] {
  if (profile === "standard") return [...tools];

  return tools
    .map(withOpenAiToolProfile)
    .filter((tool): tool is Tool => tool !== null);
}
