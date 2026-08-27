import { describe, expect, it } from "bun:test";

import type { Tool } from "../mcp-types.js";

import {
  sequenceEmailStepIdentityProperties,
  sequencePathStepSchema,
} from "./content-validation";
import { abTestToolDefinitions } from "./definitions/ab-tests";
import { sequenceBasicToolDefinitions } from "./definitions/sequences-basic";
import { sequenceEditingToolDefinitions } from "./definitions/sequences-editing";
import {
  blockConditionsHint,
  blockFieldWarningsHint,
  buttonColorHint,
  emailBlocksDescription,
  pollBlockHint,
  rawHtmlContentWarning,
  companyEmailThemeSchema,
  sequenceNodeChangesSchema,
  sequenceStepBlocksFormatHint,
  sequenceStepBlocksFormatHintForNodeChanges,
  sequenceStepEmailThemeSchema,
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

  it("separates the button color guidance from the warnings promise", () => {
    // The button/styles distinction is true everywhere; the `warnings` promise
    // is only true on routes that validate blocks through the shared parser.
    expect(buttonColorHint).toContain("buttonTextColor");
    expect(buttonColorHint).not.toContain("warnings");
    expect(emailBlocksDescription).toContain(blockFieldWarningsHint);
  });

  it("documents poll styling fields on every block-authoring surface", () => {
    for (const field of [
      "accentColor",
      "optionRadius",
      "questionColor",
      "fontFamily",
      "optionFontSize",
      "questionFontSize",
    ]) {
      expect(pollBlockHint).toContain(`\`${field}\``);
      expect(emailBlocksDescription).toContain(`\`${field}\``);
    }
    expect(pollBlockHint).toContain("weights are 100-900");
    expect(pollBlockHint).toContain("allowMultiple: true");
    expect(pollBlockHint).toContain("cannot use option images");
    expect(pollBlockHint).toContain("delivery-safe size limit");
  });
});

function blockPropertyDescriptions(tools: Tool[]): string[] {
  const descriptions: string[] = [];

  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (typeof value !== "object" || value === null) {
      return;
    }

    for (const [key, child] of Object.entries(value)) {
      if (
        key === "blocks" &&
        typeof child === "object" &&
        child !== null &&
        typeof (child as { description?: unknown }).description === "string"
      ) {
        descriptions.push((child as { description: string }).description);
      }
      visit(child);
    }
  };

  visit(tools);
  return descriptions;
}

describe("block field warnings promise", () => {
  // Sequence email steps validate through `parseEmailBlocksPayload` and report
  // advisory `warnings`, so an agent editing one has to be told to read them -
  // otherwise it reads a 2xx as "every field I sent took effect".
  it("is present on sequence email block properties", () => {
    const descriptions = blockPropertyDescriptions([
      ...sequenceBasicToolDefinitions,
      ...sequenceEditingToolDefinitions,
    ]).filter((description) => description.includes("Sequenzy email blocks"));

    expect(descriptions.length).toBeGreaterThan(0);
    for (const description of descriptions) {
      expect(description).toContain(blockFieldWarningsHint);
    }
  });

  // SMS steps are a different content pipeline and are not parsed through the
  // shared email block schema, so the promise must not leak onto them.
  it("is absent from sequence SMS block properties", () => {
    const descriptions = blockPropertyDescriptions(
      sequenceEditingToolDefinitions
    ).filter((description) => description.includes("SMS content blocks"));

    expect(descriptions.length).toBeGreaterThan(0);
    for (const description of descriptions) {
      expect(description).not.toContain(blockFieldWarningsHint);
    }
  });

  it("is present on A/B test tools, whose routes do report warnings", () => {
    const descriptions = blockPropertyDescriptions(abTestToolDefinitions);

    expect(descriptions.length).toBeGreaterThan(0);
    for (const description of descriptions) {
      expect(description).toContain(blockFieldWarningsHint);
    }
  });
});

describe("sequence step block format hint", () => {
  // Only the sequence step update routes re-apply managed chrome on write, so
  // the contract belongs on the replacement block fields.
  it("is present on replacement email block properties", () => {
    const descriptions = blockPropertyDescriptions(
      sequenceEditingToolDefinitions
    ).filter((description) =>
      description.includes("Replacement Sequenzy email blocks")
    );

    expect(descriptions.length).toBeGreaterThan(0);
    for (const description of descriptions) {
      expect(description).toContain(sequenceStepBlocksFormatHint);
    }
  });

  // SMS steps have a `blocks` field of their own that never gains a logo or a
  // footer, so the email format contract must not leak onto it.
  it("is absent from sequence SMS block properties", () => {
    const descriptions = blockPropertyDescriptions(
      sequenceEditingToolDefinitions
    ).filter((description) => description.includes("SMS content blocks"));

    expect(descriptions.length).toBeGreaterThan(0);
    for (const description of descriptions) {
      expect(description).not.toContain(sequenceStepBlocksFormatHint);
    }
  });

  // The node changes description covers every node type, including action_sms,
  // so an unscoped hint there reads as applying to SMS blocks too.
  it("is scoped to action_email in the generic node changes description", () => {
    expect(sequenceNodeChangesSchema.description).toContain(
      sequenceStepBlocksFormatHintForNodeChanges
    );
    expect(sequenceStepBlocksFormatHintForNodeChanges).toStartWith(
      " For action_email:"
    );
  });
});

describe("sequence step emailTheme schema", () => {
  it("advertises the same theme fields as the company-wide theme", () => {
    // The two surfaces write the same stored shape. If they drift, an agent
    // that learned the keys from update_company sends a per-email patch whose
    // fields are silently rejected as unsupported.
    expect(Object.keys(sequenceStepEmailThemeSchema.properties)).toEqual(
      Object.keys(companyEmailThemeSchema.properties)
    );
    expect(sequenceStepEmailThemeSchema.type).toEqual(["object", "null"]);
    expect(JSON.stringify(sequenceStepEmailThemeSchema.properties)).toContain(
      '"background"'
    );
    expect(JSON.stringify(sequenceStepEmailThemeSchema.properties)).toContain(
      '"content"'
    );
    expect(
      sequenceStepEmailThemeSchema.properties.colors.properties.content
        .description
    ).toContain("preserve its current value");
  });

  it("states that the patch is per-email and that null clears it", () => {
    const description = sequenceStepEmailThemeSchema.description;
    expect(description).toContain("company-wide default is left untouched");
    expect(description).toContain("null");
    expect(sequenceNodeChangesSchema.properties.emailTheme).toBe(
      sequenceStepEmailThemeSchema
    );
  });

  it("offers emailTheme on every sequence email step update surface", () => {
    const stepArrays = ["emails", "steps"] as const;
    const updateSequence = sequenceEditingToolDefinitions.find(
      (tool) => tool.name === "update_sequence"
    );
    for (const key of stepArrays) {
      const arraySchema = (
        updateSequence?.inputSchema.properties as Record<
          string,
          { items?: { properties?: Record<string, unknown> } }
        >
      )[key];
      expect(arraySchema?.items?.properties).toHaveProperty("emailTheme");
    }
  });
});

describe("sequence step Reply-To identity descriptions", () => {
  it("documents replyToName as a per-step override on updates and inserted steps", () => {
    expect(
      sequenceEmailStepIdentityProperties.replyToName.description
    ).toContain("display name override");
    expect(sequencePathStepSchema.properties.replyToName.description).toContain(
      "display name override"
    );
  });
});
