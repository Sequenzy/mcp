import { describe, expect, it } from "bun:test";

import { formatMcpError, McpApiError } from "./error-output.js";

describe("formatMcpError", () => {
  it("formats missing MCP API key errors with setup guidance", () => {
    const message = formatMcpError(
      new McpApiError(
        "SEQUENZY_API_KEY environment variable is required",
        401,
        undefined,
        "MCP_AUTH_REQUIRED"
      )
    );

    expect(message).toContain("Sequenzy MCP error: Missing MCP API key");
    expect(message).toContain("npx @sequenzy/setup");
    expect(message).toContain("https://docs.sequenzy.com/concepts/mcp");
  });

  it("formats company-selection failures with explicit next steps", () => {
    const message = formatMcpError(
      new Error("No company available. Create or select a company first.")
    );

    expect(message).toContain("Sequenzy MCP error: Company selection required");
    expect(message).toContain("Call `get_account`");
    expect(message).toContain("https://docs.sequenzy.com/concepts/mcp");
  });

  it("formats rejected API keys with authentication docs", () => {
    const message = formatMcpError(
      new McpApiError(
        "Invalid API key",
        401,
        '{"error":"Invalid API key"}',
        "UNAUTHORIZED"
      )
    );

    expect(message).toContain("Sequenzy MCP error: Authentication failed");
    expect(message).toContain("https://docs.sequenzy.com/authentication");
    expect(message).toContain('Details: {"error":"Invalid API key"}');
  });

  it("formats structured API conflicts with API-provided recovery guidance", () => {
    const message = formatMcpError(
      new McpApiError(
        "Segment name already exists",
        409,
        '{"segmentName":"VIP"}',
        "SEGMENT_NAME_ALREADY_EXISTS",
        {
          title: "Segment name already exists",
          description:
            'A saved segment named "VIP" already exists in this company.',
          howToFix:
            "Use the existing segment id, call list_segments before creating, or retry create_segment with a different name.",
          docsUrl: "https://docs.sequenzy.com/api-reference/segments/create",
        }
      )
    );

    expect(message).toContain(
      "Sequenzy MCP error: Segment name already exists"
    );
    expect(message).toContain('Description: A saved segment named "VIP"');
    expect(message).toContain("How to fix: Use the existing segment id");
    expect(message).toContain(
      "Docs: https://docs.sequenzy.com/api-reference/segments/create"
    );
    expect(message).toContain('Details: {"segmentName":"VIP"}');
  });
});
