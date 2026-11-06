import { describe, expect, it } from "bun:test";

import { OPENAI_TOOL_JUSTIFICATIONS } from "./openai-justifications/index.js";
import { getToolsForProfile } from "./profiles.js";

import { tools } from "./index.js";

const openAiTools = getToolsForProfile(tools, "openai");
const openAiNames = openAiTools.map((tool) => tool.name);

describe("OpenAI annotation justifications", () => {
  it("covers exactly the tools on the OpenAI surface", () => {
    expect(
      openAiNames.filter((name) => !OPENAI_TOOL_JUSTIFICATIONS[name])
    ).toEqual([]);
    expect(
      Object.keys(OPENAI_TOOL_JUSTIFICATIONS).filter(
        (name) => !openAiNames.includes(name)
      )
    ).toEqual([]);
  });

  it("gives every hint a short, specific, submission-ready reason", () => {
    const problems: string[] = [];
    const seen = new Map<string, string>();
    for (const [name, entry] of Object.entries(OPENAI_TOOL_JUSTIFICATIONS)) {
      for (const field of ["readOnly", "destructive", "openWorld"] as const) {
        const text = entry[field];
        if (!text || text.trim().length < 20) {
          problems.push(`${name}.${field} is missing or too short`);
        }
        if (text.length > 400) problems.push(`${name}.${field} is too long`);
      }
      if (entry.effects !== undefined && entry.effects.length > 240) {
        problems.push(`${name}.effects is too long`);
      }
      for (const text of Object.values(entry)) {
        if (text.includes("—")) problems.push(`${name} has an em dash`);
      }
      // The rejected submission reused boilerplate across tools. Effects
      // sentences may repeat: tools with the same side effect share one.
      for (const text of [entry.readOnly, entry.destructive, entry.openWorld]) {
        const previous = seen.get(text);
        if (previous && text.length > 80) {
          problems.push(`${name} repeats ${previous}`);
        }
        seen.set(text, name);
      }
    }
    expect(problems).toEqual([]);
  });

  it("states each tool's effects in its OpenAI description only", () => {
    const standard = new Map(
      getToolsForProfile(tools, "standard").map((tool) => [tool.name, tool])
    );
    for (const tool of openAiTools) {
      const effects = OPENAI_TOOL_JUSTIFICATIONS[tool.name]?.effects;
      if (!effects) continue;
      expect({
        name: tool.name,
        ends: tool.description?.endsWith(effects),
      }).toEqual({ name: tool.name, ends: true });
      expect(standard.get(tool.name)?.description ?? "").not.toContain(effects);
      // The appended sentence must not run on from the original text.
      const before = tool.description?.slice(0, -effects.length).trimEnd();
      expect({ name: tool.name, ends: /[.!?]$/.test(before ?? "") }).toEqual({
        name: tool.name,
        ends: true,
      });
    }
  });
});
