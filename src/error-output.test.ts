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

  it("formats missing write scopes with a replacement-key workflow", () => {
    const message = formatMcpError(
      new McpApiError(
        "API key is missing required scope: templates:write",
        403,
        '{"error":"API key is missing required scope: templates:write"}'
      )
    );

    expect(message).toContain(
      "Sequenzy MCP error: API key permission required"
    );
    expect(message).toContain("`templates:write`");
    expect(message).toContain("call `get_account`");
    expect(message).toContain("`apiKeyPermissions.manageUrl`");
    expect(message).toContain("`companies[].settingsUrl`");
    expect(message).toContain("If `get_account` also requires `account:read`");
    expect(message).toContain("https://sequenzy.com/dashboard");
    expect(message).toContain("Existing key permissions cannot be edited");
    expect(message).toContain("replace `SEQUENZY_API_KEY`");
    expect(message).toContain("For hosted OAuth MCP");
    expect(message).toContain("disconnect and reauthorize");
  });

  it("formats multiple missing read scopes with safe preset guidance", () => {
    const message = formatMcpError(
      new McpApiError(
        "API key is missing required scopes: campaigns:read, sequences:read, landing_pages:read",
        403
      )
    );

    expect(message).toContain("`campaigns:read`");
    expect(message).toContain("`sequences:read`");
    expect(message).toContain("`landing_pages:read`");
    expect(message).toContain("Read-only or Safer agent access preset");
  });

  it("provides a dashboard fallback when account metadata is unavailable", () => {
    const message = formatMcpError(
      new McpApiError("API key is missing required scope: account:read", 403)
    );

    expect(message).toContain("`account:read`");
    expect(message).toContain("https://sequenzy.com/dashboard");
    expect(message).toContain("MCP setup or Settings → API Keys");
  });

  it("keeps wrong-company access failures on company guidance", () => {
    const message = formatMcpError(
      new McpApiError("Access denied to the requested company", 403)
    );

    expect(message).toContain("Sequenzy MCP error: Access denied");
    expect(message).toContain("select a company the key can access");
    expect(message).not.toContain("API key permission required");
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

  it("uses campaign refresh guidance for unschedule conflicts", () => {
    const message = formatMcpError(
      new McpApiError(
        "Campaign can no longer be unscheduled",
        409,
        '{"campaignId":"campaign-1"}',
        "CAMPAIGN_UNSCHEDULE_CONFLICT",
        {
          title: "Campaign can no longer be unscheduled",
          description:
            "Delivery has already started or the campaign scheduling state changed.",
          howToFix:
            "Call get_campaign to refresh status, then use pause_campaign or cancel_campaign if delivery is sending.",
          docsUrl:
            "https://docs.sequenzy.com/api-reference/campaigns/unschedule",
        }
      )
    );

    expect(message).toContain(
      "Sequenzy MCP error: Campaign can no longer be unscheduled"
    );
    expect(message).toContain("Call get_campaign to refresh status");
    expect(message).toContain("pause_campaign or cancel_campaign");
    expect(message).not.toContain("choose a unique");
  });

  it("does not describe unstructured lifecycle conflicts as duplicates", () => {
    const message = formatMcpError(
      new McpApiError("Campaign status changed", 409)
    );

    expect(message).toContain("Sequenzy MCP error: Request conflict");
    expect(message).toContain("Refresh the resource state");
    expect(message).not.toContain("Resource already exists");
    expect(message).not.toContain("unique name or domain");
  });
});
