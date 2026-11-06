import { APP_RESOURCE_URI } from "../../app-resource.js";
import type { Tool } from "../../mcp-types.js";

const emailProperties = {
  companyId: {
    type: "string" as const,
    description: "Company ID. If omitted, uses the currently selected company.",
  },
  sequenceId: { type: "string" as const, description: "Sequence ID." },
  emailId: {
    type: "string" as const,
    description:
      "The email's ID: get_sequence.sequence.emails[].emailId, or edit_sequence_emails.emails[].emailId.",
  },
};

const variationIdProperty = {
  variationId: { type: "string" as const, description: "Variation ID." },
};

const INTRO =
  "Design variations of one email of a sequence: alternative versions to compare before choosing one, like the Emails view of the sequence editor. They never change the email until use_sequence_email_variation.";

export const sequenceEmailVariationToolDefinitions: Tool[] = [
  {
    name: "list_sequence_email_variations",
    description: `${INTRO} Lists the email's variations oldest first with status (generating, ready, failed), label (V1, V2, ...), name, summary, blocks, emailTheme and fontFamily (its own look, or null for the email's), and inUse (the email has exactly this content). In MCP Apps clients it shows them side by side, rendered, with buttons to use one. Poll it after generate_sequence_email_variations until none is generating; one still generating after 10 minutes is reported as failed. render_email with sequenceId, nodeId and variationId renders one.`,
    inputSchema: {
      type: "object",
      properties: emailProperties,
      required: ["sequenceId", "emailId"],
      additionalProperties: false,
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  },
  {
    name: "generate_sequence_email_variations",
    description: `Design variations of a sequence email (see list_sequence_email_variations). Starts designing count (1 to 4, default 3) variations of the email as saved, from prompt ("a few bolder versions", "try other layouts"). Returns them at once with status generating; they finish in the background in about a minute. In MCP Apps clients it shows them as they finish. Refused for an email written in HTML (change it with edit_sequence_emails) and for A/B test steps.`,
    inputSchema: {
      type: "object",
      properties: {
        ...emailProperties,
        prompt: {
          type: "string",
          description:
            "What the variations should explore, up to 2,000 characters.",
        },
        count: {
          type: "integer",
          minimum: 1,
          maximum: 4,
          description: "How many variations, 1 to 4. Defaults to 3.",
        },
        style: {
          type: "string",
          enum: ["close", "fresh", "bold"],
          description:
            "How far to move from the email: close keeps its style and structure; fresh tries other structures in the brand's colors and fonts; bold also gives each its own look. Defaults to fresh.",
        },
      },
      required: ["sequenceId", "emailId", "prompt"],
      additionalProperties: false,
    },
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
  },
  {
    name: "use_sequence_email_variation",
    description: `Uses a design variation of a sequence email (see list_sequence_email_variations). Saves a ready variation's design (blocks, theme and font) into the email, which keeps its own subject and preview text. With scope all, every other email of the sequence also takes the variation's style exactly (theme, font and the style of each kind of block) while keeping its own words; emails written in HTML keep theirs. Returns emails[] with status (changed or unchanged), saved, summary and error per email. dryRun returns the result without saving. On an active sequence, saved changes go out with the next sends. An email saved elsewhere meanwhile comes back with saved:false and an error instead of being overwritten.`,
    inputSchema: {
      type: "object",
      properties: {
        ...emailProperties,
        ...variationIdProperty,
        scope: {
          type: "string",
          enum: ["email", "all"],
          description:
            "email (default): only this email. all: every other email of the sequence takes its style too.",
        },
        dryRun: {
          type: "boolean",
          description: "Return the result without saving anything.",
        },
      },
      required: ["sequenceId", "emailId", "variationId"],
      additionalProperties: false,
    },
  },
  {
    name: "discard_sequence_email_variation",
    description: `Discards a design variation of a sequence email, so it no longer lists. The email is unchanged.`,
    inputSchema: {
      type: "object",
      properties: { ...emailProperties, ...variationIdProperty },
      required: ["sequenceId", "emailId", "variationId"],
      additionalProperties: false,
    },
  },
];
