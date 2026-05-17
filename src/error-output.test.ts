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
});
