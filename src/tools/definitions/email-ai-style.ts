import type { Tool } from "../../mcp-types.js";

const companyId = {
  type: "string",
  description: "Company ID; defaults to the selected company.",
};
const expectedStyleId = {
  type: ["string", "null"],
  description:
    "revisionId from get_email_ai_style. Use null only for an initial save with no stored style. On conflict, read and review again before retrying.",
};

export const emailAiStyleToolDefinitions: Tool[] = [
  {
    name: "get_email_ai_style",
    description:
      "Get the company's saved AI email appearance, revisionId and canManage. Read this before replacing or clearing a style. No active style returns null; an unsupported version can still have a revisionId for recovery.",
    inputSchema: {
      type: "object",
      properties: { companyId },
      additionalProperties: false,
    },
  },
  {
    name: "save_email_ai_style",
    description:
      "Save an email's appearance as the company default for future AI generation. Captures fonts, colors, spacing and block treatments, without copying its content or modifying existing emails. Requires emails:write and access to the source email. Replaces only expectedStyleId; get and review the current style before replacing. Plain-text choices and explicit style requests take precedence during generation.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        emailId: {
          type: "string",
          description:
            "Source email ID (including campaign, sequence or transactional email IDs); must belong to this company and be visible to you.",
        },
        expectedStyleId,
        canvas: {
          type: "object",
          description:
            "Optional unsaved canvas snapshot. Omit to capture the stored email. Include all four fields when provided; validated by the API using the same schema as the editor.",
          properties: {
            blocks: {
              type: "array",
              items: { type: "object", additionalProperties: true },
              description:
                "Native email blocks, up to 500 and 500,000 serialized characters. Use get_email_block_schema for block shapes.",
            },
            theme: {
              type: "object",
              additionalProperties: true,
              description:
                "Complete email theme: presetId, colors, typography and layout, as returned by an email or saved style.",
            },
            fontFamily: { type: "string", description: "Email font stack." },
            emailPreset: { type: "string", enum: ["branded", "minimal"] },
          },
          required: ["blocks", "theme", "fontFamily", "emailPreset"],
          additionalProperties: false,
        },
      },
      required: ["emailId", "expectedStyleId"],
      additionalProperties: false,
    },
  },
  {
    name: "clear_email_ai_style",
    description:
      "Clear the company's saved AI appearance and restore normal defaults for future generations. Existing emails stay unchanged. Requires emails:write. Get and review the current style first; a conflict must not be retried automatically.",
    inputSchema: {
      type: "object",
      properties: {
        companyId,
        expectedStyleId: {
          type: "string",
          description: "Nonempty revisionId returned by get_email_ai_style.",
        },
      },
      required: ["expectedStyleId"],
      additionalProperties: false,
    },
  },
];
