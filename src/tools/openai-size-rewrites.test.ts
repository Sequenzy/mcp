import { describe, expect, it } from "bun:test";

import { toolDefinitions } from "./definitions/index.js";
import {
  blockConditionsHint,
  emailBlockGuidanceHint,
  pollBlockHint,
  videoBlockHint,
} from "./descriptions.js";
import {
  OPENAI_SHARED_BLOCK_GUIDANCE_TOOLS,
  openAiBlockConditionsHint,
  openAiPollBlockHint,
  openAiVideoBlockHint,
  shareOpenAiBlockGuidance,
} from "./openai-size-rewrites.js";
import { getToolsForProfile } from "./profiles.js";

const standardTools = getToolsForProfile(toolDefinitions, "standard");
const openAiTools = getToolsForProfile(toolDefinitions, "openai");

function schemaText(tools: typeof openAiTools, name: string): string {
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return JSON.stringify(tool.inputSchema);
}

function count(text: string, part: string): number {
  return text.split(part).length - 1;
}

// JSON-escaped, as it appears inside a serialized schema.
const inSchema = (text: string) => JSON.stringify(text).slice(1, -1);

describe("OpenAI block guidance size", () => {
  it("lists shorter poll, condition and video hints on the OpenAI surface only", () => {
    const standard = schemaText(standardTools, "create_template");
    const openAi = schemaText(openAiTools, "create_template");

    for (const hint of [pollBlockHint, blockConditionsHint, videoBlockHint]) {
      expect(standard).toContain(inSchema(hint));
      expect(openAi).not.toContain(inSchema(hint));
    }
    for (const hint of [
      openAiPollBlockHint,
      openAiBlockConditionsHint,
      openAiVideoBlockHint,
    ]) {
      expect(openAi).toContain(inSchema(hint));
    }
    // The dropped detail stays reachable through the block reference tool.
    expect(openAiPollBlockHint).toContain("get_email_block_schema");
    expect(openAiPollBlockHint).toContain("allowMultiple: true");
    expect(openAiBlockConditionsHint).toContain("conditionFields: true");
    expect(openAiBlockConditionsHint).toContain("conditional-group");
  });

  it("keeps full guidance on main authoring tools and points to it elsewhere", () => {
    const fullMarker = "Minimal valid core examples";
    for (const name of [
      "create_template",
      "update_template",
      "create_campaign",
      "update_campaign",
      "create_sequence",
      "update_sequence",
      "insert_sequence_step",
      "create_transactional_email",
      "update_transactional_email",
    ]) {
      expect(count(schemaText(openAiTools, name), fullMarker)).toBe(1);
    }
    for (const name of OPENAI_SHARED_BLOCK_GUIDANCE_TOOLS) {
      const text = schemaText(openAiTools, name);
      expect(count(text, fullMarker)).toBe(0);
      expect(text).toContain(
        "is the same as for the `blocks` field of create_template"
      );
      // Standard MCP still lists the full guidance on the same tool.
      expect(count(schemaText(standardTools, name), fullMarker)).toBe(1);
    }
    expect(schemaText(openAiTools, "update_sequence")).toContain(
      "is the same as for the first `blocks` field in this tool"
    );
  });

  it("only rewrites description text, never schema structure", () => {
    for (const name of [
      ...OPENAI_SHARED_BLOCK_GUIDANCE_TOOLS,
      "update_sequence",
    ]) {
      const strip = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(strip);
        if (value === null || typeof value !== "object") return value;
        return Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => key !== "description")
            .map(([key, nested]) => [key, strip(nested)])
        );
      };
      const tool = openAiTools.find((candidate) => candidate.name === name);
      const unshared = shareOpenAiBlockGuidance(
        "",
        tool?.inputSchema,
        "\u0000"
      );
      expect(strip(tool?.inputSchema)).toEqual(strip(unshared));
    }
  });

  it("replaces the guidance after its first use within a tool", () => {
    const schema = {
      type: "object",
      properties: {
        a: { type: "array", description: `First.${emailBlockGuidanceHint}` },
        b: { type: "array", description: `Second.${emailBlockGuidanceHint}` },
        c: { type: "string", description: "Unrelated." },
      },
    };
    const main = shareOpenAiBlockGuidance(
      "create_template",
      schema,
      emailBlockGuidanceHint
    );
    expect(main.properties.a.description).toBe(schema.properties.a.description);
    expect(main.properties.b.description).toStartWith("Second. The rest of");
    expect(main.properties.b.description).toContain("first `blocks` field");
    expect(main.properties.c).toEqual(schema.properties.c);

    const shared = shareOpenAiBlockGuidance(
      "create_email_component",
      schema,
      emailBlockGuidanceHint
    );
    expect(shared.properties.a.description).toStartWith("First. The rest of");
    expect(shared.properties.a.description).toContain("create_template");
    expect(shared.properties.b.description).toContain("create_template");
  });

  it("shortens the shared companyId description", () => {
    const companyId = (tools: typeof openAiTools) =>
      tools.find((tool) => tool.name === "get_sync_rules")?.inputSchema
        .properties?.["companyId"];
    expect(companyId(openAiTools)).toMatchObject({
      description: "Company ID. Defaults to the selected company.",
    });
    expect(companyId(standardTools)).toMatchObject({
      description:
        "Company ID. If not provided, uses the currently selected company.",
    });
  });
});
