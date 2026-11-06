import { describe, expect, it } from "bun:test";

import {
  buildMcpErrorResult,
  formatMcpError,
  MCP_SIGNUP_URL,
  McpApiError,
} from "./error-output.js";

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
    expect(message).toContain(MCP_SIGNUP_URL);
    expect(MCP_SIGNUP_URL).toBe(
      "https://sequenzy.com/sign-up?utm_source=mcp&utm_medium=mcp-no-key"
    );
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
    expect(message).toContain("`list_api_keys`");
    expect(message).toContain("`isCurrent`");
    expect(message).toContain(
      "Personal keys cannot be changed through `update_api_key`"
    );
    expect(message).toContain("REPLACE the whole selection");
    expect(message).toContain("retry the same tool call");
    expect(message).not.toContain("cannot be edited in place");
    expect(message).toContain(
      "https://docs.sequenzy.com/concepts/mcp-permissions#recover-from-missing-permissions"
    );
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

  it("formats company creation key-type failures with personal-key guidance", () => {
    const message = formatMcpError(
      new McpApiError(
        "This API key is scoped to a single company, so it cannot create another one.",
        403,
        '{"error":"company key cannot create companies"}',
        "COMPANY_CREATE_REQUIRES_PERSONAL_KEY"
      )
    );

    expect(message).toContain(
      "Sequenzy MCP error: Personal account key required"
    );
    expect(message).toContain("`seq_user_`");
    expect(message).toContain("Account → API Keys");
    expect(message).toContain("replace `SEQUENZY_API_KEY`");
    expect(message).toContain("reconnect the MCP client");
    expect(message).toContain("create the company in the Sequenzy dashboard");
    expect(message).toContain("selecting another company will not fix");
    expect(message).not.toContain("select a company the key can access");
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

  it("omits nested API diagnostics only for the OpenAI profile", () => {
    const error = new McpApiError(
      "Request failed for person@example.com",
      500,
      JSON.stringify({
        requestId: "request_private_123",
        traceId: "trace_private_123",
        subscriber: { email: "person@example.com" },
      })
    );
    const standardMessage = formatMcpError(error);
    const openAiMessage = formatMcpError(error, { includeDetails: false });

    expect(standardMessage).toContain("request_private_123");
    expect(standardMessage).toContain("person@example.com");
    expect(openAiMessage).toContain("Sequenzy server error");
    expect(openAiMessage).not.toContain("request_private_123");
    expect(openAiMessage).not.toContain("trace_private_123");
    expect(openAiMessage).not.toContain("person@example.com");
    expect(openAiMessage).not.toContain("Details:");
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

  it("redirects A/B variant write dead-ends at update_ab_test_variant", () => {
    const message = formatMcpError(
      new McpApiError(
        'This copy belongs to an A/B test variant, so update_template cannot change it. Call update_ab_test_variant. Pass abTestId "ab-1". If update_ab_test_variant is not in your MCP tool list, enable it on the Sequenzy connector - do not retry with update_template, update_sequence_node, or any other email tool.',
        400,
        undefined,
        "AB_TEST_VARIANT_CONTENT_EDIT"
      )
    );

    expect(message).toContain(
      "Sequenzy MCP error: A/B variant copy cannot be edited here"
    );
    expect(message).toContain("`update_ab_test_variant`");
    expect(message).toContain("enable it on the Sequenzy connector");
    expect(message).toContain("do not retry with `update_template`");
    expect(message).toContain("confirmLiveChange");
    expect(message).toContain("Safer agent access");
    expect(message).toContain(
      "https://docs.sequenzy.com/concepts/mcp-tools#editing-the-content-of-a-sequence-ab-step"
    );
  });
});

describe("structured MCP errors", () => {
  it("includes safe recovery fields, status, API code and retry hint", () => {
    expect(
      buildMcpErrorResult(
        new McpApiError(
          "slow down",
          429,
          "private",
          "RATE_LIMITED",
          undefined,
          4
        )
      )
    ).toMatchObject({
      success: false,
      error: { code: "RATE_LIMITED", statusCode: 429, retryAfterSeconds: 4 },
    });
    expect(
      JSON.stringify(
        buildMcpErrorResult(new McpApiError("slow down", 429, "private"))
      )
    ).not.toContain("private");
  });
  it("omits unavailable status and retry information for local failures", () => {
    expect(buildMcpErrorResult(new Error("name is required"))).toMatchObject({
      success: false,
      error: { code: "TOOL_ERROR" },
    });
    expect(buildMcpErrorResult("unknown").error).not.toHaveProperty(
      "statusCode"
    );
    expect(buildMcpErrorResult(new Error("unknown")).error).not.toHaveProperty(
      "retryAfterSeconds"
    );
  });
  it("does not echo backend messages, details or context into the strict profile", () => {
    const failure = new McpApiError(
      "alice@example.com seq_user_supersecret123",
      403,
      "private subscriber data",
      "FORBIDDEN",
      {
        title: "private title",
        description: "private description",
        howToFix: "private recovery",
        docsUrl: "https://private.example",
      }
    );
    const result = buildMcpErrorResult(failure, { includeDetails: false });
    expect(result.error.code).toBe("FORBIDDEN");
    const serialized = JSON.stringify(result);
    for (const secret of [
      "alice@example.com",
      "seq_user_supersecret123",
      "private",
    ])
      expect(serialized).not.toContain(secret);
    expect(result.error.docsUrl).toContain("docs.sequenzy.com");
    expect(buildMcpErrorResult(failure).error.message).toBe(
      "private description"
    );
  });
});

it("strict-profile machine codes cannot echo sensitive API data", () => {
  for (const code of [
    "SSN_123_45_6789",
    "CARD_4111111111111111",
    "SECRET_TOKEN_ABC123456789",
  ]) {
    const failure = new McpApiError("private", 403, undefined, code);
    expect(
      buildMcpErrorResult(failure, { includeDetails: false }).error.code
    ).toBe("FORBIDDEN");
    expect(buildMcpErrorResult(failure).error.code).toBe(code);
  }
});

describe("segment reference limit errors", () => {
  // The API body a too-deep segment count returns, as the MCP runtime parses it.
  const apiFailure = (code: string) =>
    new McpApiError(
      "Segment references are nested too deeply. A segment filter can reference other segments up to 16 levels deep, and the reference to segment seg_q would be level 17 (chain: seg_b > seg_q).",
      400,
      '{"limit":"depth","segmentId":"seg_q","referenceChain":["seg_b"],"maxDepth":16,"maxReferences":1000}',
      code,
      {
        title: "Segment references nested too deeply",
        description:
          "Segment references are nested too deeply. A segment filter can reference other segments up to 16 levels deep, and the reference to segment seg_q would be level 17 (chain: seg_b > seg_q).",
        howToFix:
          "Copy the conditions of an inner segment into its parent instead of referencing it to reduce the nesting.",
      }
    );

  it("shows the API explanation, fix and details in the full profile", () => {
    const message = formatMcpError(
      apiFailure("SEGMENT_REFERENCE_DEPTH_EXCEEDED")
    );

    expect(message).toContain(
      "Sequenzy MCP error: Segment references nested too deeply"
    );
    expect(message).toContain("chain: seg_b > seg_q");
    expect(message).toContain("Copy the conditions of an inner segment");
    expect(message).toContain('"segmentId":"seg_q"');
  });

  it("keeps actionable guidance and the code in the strict profile", () => {
    for (const code of [
      "SEGMENT_REFERENCE_DEPTH_EXCEEDED",
      "SEGMENT_REFERENCE_COUNT_EXCEEDED",
    ]) {
      const result = buildMcpErrorResult(apiFailure(code), {
        includeDetails: false,
      });

      expect(result.error).toMatchObject({
        code,
        statusCode: 400,
        howToFix: expect.stringContaining("Retrying will not help"),
        docsUrl: expect.stringContaining("/api-reference/segments/count"),
      });
      expect(JSON.stringify(result)).not.toContain("seg_q");
    }
  });

  it("gives total-reference failures their own guidance in the strict profile", () => {
    const text = formatMcpError(
      apiFailure("SEGMENT_REFERENCE_COUNT_EXCEEDED"),
      { includeDetails: false }
    );

    expect(text).toContain("Sequenzy MCP error: Too many segment references");
    expect(text).toContain("reference fewer segments");
    expect(text).not.toContain("nested too deeply");
    expect(text).not.toContain("shallower");
  });
});
