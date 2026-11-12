import { describe, expect, it } from "bun:test";

import { MUSE_TOOL_NAMES, outlineOutputSchema } from "./muse-profile.js";
import { getToolsForProfile } from "./profiles.js";

import { handleToolCall, tools } from "./index.js";

// Muse rejected the ~1.6 MB standard listing as too large and publishes no
// limit; ~171 KB was accepted before output schema outlines were added.
const MUSE_LIST_BYTE_BUDGET = 250_000;

describe("Muse MCP profile", () => {
  const museTools = getToolsForProfile(tools, "muse");

  it("lists every named tool from the standard surface, once", () => {
    const standardNames = new Set(tools.map((tool) => tool.name));
    expect(MUSE_TOOL_NAMES.filter((name) => !standardNames.has(name))).toEqual(
      []
    );
    expect(new Set(MUSE_TOOL_NAMES).size).toBe(MUSE_TOOL_NAMES.length);
    expect(museTools.map((tool) => tool.name).sort()).toEqual(
      [...MUSE_TOOL_NAMES].sort()
    );
  });

  it("keeps tools/list under the byte budget", () => {
    expect(JSON.stringify({ tools: museTools }).length).toBeLessThan(
      MUSE_LIST_BYTE_BUDGET
    );
  });

  it("outlines output schemas and keeps input schemas and annotations", () => {
    for (const tool of museTools) {
      expect(tool.outputSchema?.type).toBe("object");
      expect(JSON.stringify(tool.outputSchema)).not.toContain('"description"');
      expect(tool.inputSchema.type).toBe("object");
      expect(tool.annotations).toBeDefined();
    }
    const standardCampaign = tools.find(
      (tool) => tool.name === "create_campaign"
    );
    const museCampaign = museTools.find(
      (tool) => tool.name === "create_campaign"
    );
    expect(museCampaign?.description).toBe(standardCampaign?.description);
    expect(Object.keys(museCampaign?.outputSchema?.properties ?? {})).toEqual(
      Object.keys(standardCampaign?.outputSchema?.properties ?? {})
    );
  });

  it("only loosens output schemas, so standard results still validate", () => {
    const schema = {
      type: "object",
      description: "Result.",
      required: ["campaign"],
      additionalProperties: false,
      properties: {
        campaign: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            stats: {
              type: "object",
              properties: { sent: { type: "number", minimum: 0 } },
            },
          },
        },
        tags: { type: "array", items: { type: "string", enum: ["a"] } },
      },
    };
    expect(outlineOutputSchema(schema)).toEqual({
      type: "object",
      required: ["campaign"],
      properties: {
        campaign: {
          type: "object",
          required: ["id"],
          properties: {
            id: { type: "string" },
            stats: { type: "object", properties: { sent: {} } },
          },
        },
        tags: { type: "array", items: { type: "string", enum: ["a"] } },
      },
    });
  });

  it("leaves the standard surface unchanged", () => {
    const standard = getToolsForProfile(tools, "standard");
    expect(standard.length).toBe(tools.length);
    expect(
      standard.find((tool) => tool.name === "create_campaign")?.outputSchema
    ).toBeDefined();
  });

  it("refuses tools that are not on the Muse surface", async () => {
    const result = await handleToolCall(
      "update_sequence",
      { sequenceId: "seq_1" },
      { profile: "muse" }
    );
    expect(result.isError).toBe(true);
    expect(JSON.stringify(result.content)).toContain(
      "Tool is not available on this MCP surface: update_sequence"
    );
  });
});
