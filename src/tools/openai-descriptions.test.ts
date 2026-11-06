import { describe, expect, it } from "bun:test";

import { toolDefinitions } from "./definitions/index.js";
import { OPENAI_EXCLUDED_TOOL_NAMES } from "./openai-profile.js";
import { getToolsForProfile } from "./profiles.js";

const standardTools = getToolsForProfile(toolDefinitions, "standard");
const openAiTools = getToolsForProfile(toolDefinitions, "openai");

function description(tools: typeof openAiTools, name: string): string {
  return tools.find((tool) => tool.name === name)?.description ?? "";
}

describe("OpenAI tool descriptions", () => {
  it("never point the model at enabling tools on a connector", () => {
    expect(
      openAiTools
        .filter((tool) =>
          /connector/i.test(
            JSON.stringify([tool.description, tool.inputSchema])
          )
        )
        .map((tool) => tool.name)
    ).toEqual([]);
    expect(
      standardTools.some((tool) =>
        JSON.stringify(tool.inputSchema).includes("Sequenzy connector")
      )
    ).toBe(true);
  });

  it("never names a tool this surface omits", () => {
    const references = openAiTools.flatMap((tool) => {
      const text = JSON.stringify([tool.description, tool.inputSchema]);
      return [...OPENAI_EXCLUDED_TOOL_NAMES]
        .filter((name) => new RegExp(`(?<![a-z_])${name}(?![a-z_])`).test(text))
        .map((name) => `${tool.name} -> ${name}`);
    });
    expect(references).toEqual([]);
  });

  it("rewrites A/B variant guidance without losing the write restriction", () => {
    expect(description(openAiTools, "get_sequence")).toContain(
      "edit each variant with update_ab_test_variant; do not write through update_template or update_sequence_node."
    );
    for (const name of [
      "update_ab_test_variant",
      "update_sequence",
      "update_sequence_node",
    ]) {
      expect(description(openAiTools, name)).not.toContain(
        "If update_ab_test_variant is not in the tool list"
      );
    }
  });

  it("does not name create_api_key, which this surface omits", () => {
    expect(description(openAiTools, "get_integration_guide")).not.toContain(
      "create_api_key"
    );
    expect(description(openAiTools, "get_integration_guide")).toContain(
      "needs a Sequenzy API key,"
    );
  });

  it("keeps the connector guidance on the standard surface", () => {
    expect(description(standardTools, "update_ab_test_variant")).toContain(
      "enable it on the Sequenzy connector"
    );
    expect(description(standardTools, "get_integration_guide")).toContain(
      "(create_api_key)"
    );
  });

  it("does not name other products or use selection pressure", () => {
    const flagged = openAiTools.filter((tool) =>
      /ChatGPT|Claude|Mailchimp|\bALWAYS\b|THIS IS THE TOOL/.test(
        tool.description ?? ""
      )
    );
    expect(flagged.map((tool) => tool.name)).toEqual([]);
  });

  it("discloses that the AI generators save the design direction", () => {
    for (const name of [
      "generate_email",
      "generate_subject_lines",
      "generate_sms",
    ]) {
      expect(description(openAiTools, name)).toContain(
        "the first generation for a company also saves its inferred email design direction"
      );
    }
  });

  it("warns about repeated effects on tools that send messages", () => {
    const expectations: Record<string, string> = {
      reply_to_conversation:
        "Each successful outbound call sends another email",
      forward_conversation_message: "Each successful call sends another copy",
      send_test_email: "Each successful call queues another test email",
      send_sequence_test_email:
        "Each successful call sends another set of test emails",
      send_test_sms: "Each successful call sends another text",
      invite_team_member:
        "reissues it with a new link and emails it again; a still-valid pending invitation returns 409",
      schedule_campaign: "cannot send the campaign twice",
    };
    for (const [name, text] of Object.entries(expectations)) {
      expect({ name, text: description(openAiTools, name) }).toEqual({
        name,
        text: expect.stringContaining(text),
      });
    }
  });
});
