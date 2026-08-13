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

  it("formats missing write scopes with the in-place widening workflow", () => {
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
    expect(message).toContain("Call `get_account`");
    expect(message).toContain("`apiKeyPermissions.manageUrl`");
    expect(message).toContain("Account → API Keys");
    expect(message).toContain("workspace Settings → API Keys");
    expect(message).toContain("If `get_account` also requires `account:read`");
    expect(message).toContain("https://sequenzy.com/dashboard");
    // Key permissions became editable in place, and the API refreshes them on
    // the denied path. Telling an agent to mint a new key and restart the
    // client turns a one-retry fix into abandoned work.
    expect(message).toContain("no replacement key and no client restart");
    expect(message).toContain("`update_api_key`");
    expect(message).toContain("activeKey.type` is `company`");
    expect(message).toContain(
      "Personal keys cannot be changed through `update_api_key`"
    );
    expect(message).toContain("REPLACE the whole selection");
    expect(message).toContain("retry the same tool call");
    expect(message).not.toContain("cannot be edited in place");
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

  // The key-management scope is the one gap in-place widening cannot close: the
  // scope needed to grant it is the scope that is missing. Without this pointer
  // an agent loops on `update_api_key`, which fails for the same reason.
  it("points a blocked key-management call at the handoff tool", () => {
    const message = formatMcpError(
      new McpApiError(
        "API key is missing required scope: api_keys:manage",
        403,
        '{"error":"API key is missing required scope: api_keys:manage"}'
      )
    );

    expect(message).toContain("`request_api_key_handoff`");
    expect(message).toContain('`replaceApiKeyId: "current"`');
    expect(message).toContain("creates nothing and never returns a key");
    expect(message).toContain("If the active key has `account:read`");
    expect(message).toContain(
      "If the handoff tool is also denied because `account:read` is missing"
    );
    expect(message).toContain("https://sequenzy.com/dashboard");
  });

  it("leaves the handoff pointer out of unrelated scope failures", () => {
    const message = formatMcpError(
      new McpApiError("API key is missing required scope: templates:write", 403)
    );

    expect(message).not.toContain("request_api_key_handoff");
  });

  it("provides a dashboard fallback when account metadata is unavailable", () => {
    const message = formatMcpError(
      new McpApiError("API key is missing required scope: account:read", 403)
    );

    expect(message).toContain("`account:read`");
    expect(message).toContain("https://sequenzy.com/dashboard");
    expect(message).toContain("choose the matching API Keys page");
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
