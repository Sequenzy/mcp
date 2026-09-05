const DOCS_ROOT = "https://docs.sequenzy.com";
const MCP_DOCS_URL = `${DOCS_ROOT}/concepts/mcp`;
const AUTH_DOCS_URL = `${DOCS_ROOT}/authentication`;
const DASHBOARD_URL = "https://sequenzy.com/dashboard";

interface McpErrorDescriptor {
  title: string;
  description: string;
  howToFix: string;
  docsUrl: string;
}

export interface McpApiErrorContext {
  title?: string;
  description?: string;
  howToFix?: string;
  docsUrl?: string;
}

export class McpApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public rawDetails?: string,
    public code?: string,
    public context?: McpApiErrorContext
  ) {
    super(message);
    this.name = "McpApiError";
  }
}

function normalizeMcpError(error: unknown): {
  message: string;
  statusCode?: number;
  code?: string;
  rawDetails?: string;
  context?: McpApiErrorContext;
} {
  if (error instanceof McpApiError) {
    return {
      message: error.message,
      statusCode: error.statusCode,
      code: error.code,
      rawDetails: error.rawDetails,
      context: error.context,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: String(error),
  };
}

function getSafeLocalErrorDetails(error: unknown): string | undefined {
  if (!(error instanceof Error) || error instanceof McpApiError) {
    return undefined;
  }

  const message = error.message.trim();
  if (!message) return undefined;

  return message
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[redacted email]")
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/g, "Bearer [redacted]")
    .replace(/\bseq_(?:user_)?[A-Za-z0-9_-]{8,}\b/g, "[redacted key]");
}

function extractMissingApiKeyScopes(message: string): string[] {
  const match = message.match(/api key is missing required scopes?:\s*(.+)$/i);
  if (!match?.[1]) {
    return [];
  }

  // Deduped: a message may name the same scope twice (once as the missing
  // scope, once in the guidance that follows it).
  return [...new Set(match[1].match(/[a-z_]+:[a-z_]+/gi) ?? [])];
}

function describeMcpError(
  error: unknown,
  includeApiContext: boolean
): McpErrorDescriptor {
  const normalized = normalizeMcpError(error);
  const message = normalized.message.trim() || "Unknown error";
  const lowerMessage = message.toLowerCase();

  if (
    includeApiContext &&
    (normalized.context?.title ||
      normalized.context?.description ||
      normalized.context?.howToFix ||
      normalized.context?.docsUrl)
  ) {
    return {
      title:
        normalized.context.title ??
        (normalized.statusCode === 409
          ? "Request conflict"
          : "API request failed"),
      description:
        normalized.context.description ??
        "The Sequenzy API could not complete this request.",
      howToFix:
        normalized.context.howToFix ??
        "Review the requested operation, adjust the tool input, and retry.",
      docsUrl: normalized.context.docsUrl ?? MCP_DOCS_URL,
    };
  }

  if (
    normalized.code === "MCP_AUTH_REQUIRED" ||
    lowerMessage.includes("sequenzy_api_key environment variable is required")
  ) {
    return {
      title: "Missing MCP API key",
      description:
        "The MCP server started without a Sequenzy API key, so it cannot authenticate any tool or resource request.",
      howToFix:
        "Add `SEQUENZY_API_KEY` to the MCP server environment, or run `npx @sequenzy/setup` to configure the integration automatically.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (normalized.statusCode === 401 || normalized.code === "UNAUTHORIZED") {
    return {
      title: "Authentication failed",
      description:
        "The MCP server reached Sequenzy, but the current API key was rejected.",
      howToFix:
        "Replace `SEQUENZY_API_KEY` with a valid personal API key, then restart the MCP client so it reconnects with fresh credentials.",
      docsUrl: AUTH_DOCS_URL,
    };
  }

  if (normalized.code === "COMPANY_CREATE_REQUIRES_PERSONAL_KEY") {
    return {
      title: "Personal account key required",
      description:
        "Company creation is account-level and cannot be performed with a company/workspace-scoped API key.",
      howToFix:
        "Create or use a personal account key beginning with `seq_user_` from Account → API Keys, replace `SEQUENZY_API_KEY`, reconnect the MCP client, and retry `create_company`; alternatively, create the company in the Sequenzy dashboard. Widening the current company key or selecting another company will not fix this restriction.",
      docsUrl: AUTH_DOCS_URL,
    };
  }

  const missingApiKeyScopes = extractMissingApiKeyScopes(message);
  if (missingApiKeyScopes.length > 0) {
    const scopeList = missingApiKeyScopes
      .map((scope) => `\`${scope}\``)
      .join(", ");
    const presetGuidance = missingApiKeyScopes.every((scope) =>
      scope.endsWith(":read")
    )
      ? "the Read-only or Safer agent access preset"
      : "Safer agent access when it covers the task, or Custom permissions";
    // Key management is the one gap the agent cannot talk its way around: the
    // scope needed to widen the key is the scope that is missing. Point at the
    // handoff tool instead of leaving the operator to navigate the dashboard.
    const keyManagementGuidance = missingApiKeyScopes.includes(
      "api_keys:manage"
    )
      ? ` This operation manages API keys, so the missing scope cannot be granted through the API by the key that is missing it. If the active key has \`account:read\`, call \`request_api_key_handoff\` to get a dashboard link that opens the create-key form prefilled with the name and permissions you need, pass \`replaceApiKeyId: "current"\` when rotating, and hand the URL to the workspace owner. It creates nothing and never returns a key. If the handoff tool is also denied because \`account:read\` is missing, open ${DASHBOARD_URL} directly and choose the matching API Keys page.`
      : "";

    return {
      title: "API key permission required",
      description: `The current API key is valid, but this operation requires the missing ${missingApiKeyScopes.length === 1 ? "scope" : "scopes"}: ${scopeList}.`,
      howToFix: `Permissions can be widened on the key you are already using - no replacement key and no client restart. Call \`get_account\` to read \`apiKeyPermissions\`, then have the key owner open \`apiKeyPermissions.manageUrl\` and enable ${scopeList} on the connected key. The URL opens Account → API Keys for a personal key and workspace Settings → API Keys for a company key without returning the key's internal identity through MCP. If \`get_account\` also requires \`account:read\`, open ${DASHBOARD_URL} directly and choose the matching API Keys page. A company key that already holds \`api_keys:manage\` can instead call \`list_api_keys\`, find the entry where \`isCurrent\` is true, and call \`update_api_key\` with that entry's \`id\`. Personal keys cannot be changed through \`update_api_key\`. \`scopes\` and \`preset\` REPLACE the whole selection, so pass every scope in \`apiKeyPermissions.scopes\` plus ${scopeList}, or a preset covering all of them (${presetGuidance}). Then retry the same tool call - the API reloads the key's permissions on a denied request, so the retry succeeds without reconnecting. Issuing a replacement key and swapping \`SEQUENZY_API_KEY\`, or reauthorizing a hosted OAuth connection with wider permissions, also works but is not required.${keyManagementGuidance}`,
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (normalized.statusCode === 403 || lowerMessage.includes("access denied")) {
    return {
      title: "Access denied",
      description:
        "The current API key is valid, but it does not have permission to access the requested company or action.",
      howToFix:
        "Use an API key that belongs to the right account, or select a company the key can access before retrying the tool call.",
      docsUrl: AUTH_DOCS_URL,
    };
  }

  if (
    lowerMessage.includes("no company available") ||
    lowerMessage.includes("company not found")
  ) {
    return {
      title: "Company selection required",
      description:
        "The MCP server could not resolve a company for this request.",
      howToFix:
        "Call `get_account` to inspect available companies, then call `select_company`, or pass `companyId` explicitly in the next tool call.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (normalized.statusCode === 404 || lowerMessage.includes("not found")) {
    return {
      title: "Requested resource not found",
      description:
        "Sequenzy could not find the requested campaign, template, sequence, company, or subscriber.",
      howToFix:
        "List or fetch the resource collection first, then retry the tool with a confirmed ID or email value.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (lowerMessage.includes("already exists")) {
    return {
      title: "Resource already exists",
      description:
        "Sequenzy rejected this MCP request because it would create a duplicate resource.",
      howToFix:
        "List the existing resources first, reuse the matching resource when appropriate, or retry with a unique name or domain.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (normalized.statusCode === 409) {
    return {
      title: "Request conflict",
      description:
        "Sequenzy rejected this request because the resource changed or an operation is already in progress.",
      howToFix:
        "Refresh the resource state, choose the lifecycle action allowed by its current status, and retry at most once.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (
    normalized.code === "AB_TEST_VARIANT_CONTENT_EDIT" ||
    (lowerMessage.includes("update_ab_test_variant") &&
      (lowerMessage.includes("a/b test") || lowerMessage.includes("ab test")))
  ) {
    return {
      title: "A/B variant copy cannot be edited here",
      description:
        "This sequence step stores its email copy on A/B test variants, so the attempted write target cannot update it.",
      howToFix:
        "Call `update_ab_test_variant` with `abTestId` and `variantId` from `get_sequence.sequence.emails[].abTest.variants` (or `get_ab_test`). Repeat once per variant for a whole-step rewrite. If the sequence is live or the test has activity, pass `confirmLiveChange: true`. Needs `ab_tests:write` and `sequences:write`, both on Safer agent access. If `update_ab_test_variant` is not in the MCP tool list, enable it on the Sequenzy connector - do not retry with `update_template`, `update_sequence_node`, or another email tool.",
      docsUrl: `${MCP_DOCS_URL}#editing-the-content-of-a-sequence-ab-step`,
    };
  }

  if (normalized.statusCode === 429 || lowerMessage.includes("rate limit")) {
    return {
      title: "Rate limited",
      description:
        "Sequenzy temporarily slowed this MCP request because too many requests were sent too quickly.",
      howToFix:
        "Wait briefly before retrying. If the client is looping, reduce retries or add backoff before the next tool call.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (
    normalized.code === "NETWORK_ERROR" ||
    lowerMessage.includes("fetch failed")
  ) {
    return {
      title: "Network or configuration error",
      description:
        "The MCP server could not reach the Sequenzy API from this environment.",
      howToFix:
        "Check connectivity and verify `SEQUENZY_API_URL` if you override it in the MCP environment.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (
    lowerMessage.includes("unknown tool") ||
    lowerMessage.includes("unknown resource")
  ) {
    return {
      title: "Unsupported MCP request",
      description:
        "The client asked for a tool or resource name that this Sequenzy MCP server does not expose.",
      howToFix:
        "Refresh the client's tool list and call only the names returned by `list_tools` or `list_resources`.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (
    lowerMessage.includes("is required") ||
    lowerMessage.includes("invalid")
  ) {
    return {
      title: "Invalid MCP input",
      description:
        "The tool call was missing a required field or included an invalid value.",
      howToFix:
        "Review the tool schema, supply the missing argument, and retry the request with corrected input.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  if (normalized.statusCode && normalized.statusCode >= 500) {
    return {
      title: "Sequenzy server error",
      description:
        "The request reached Sequenzy, but the server could not complete it successfully.",
      howToFix:
        "Retry once. If it still fails, consult the docs before escalating.",
      docsUrl: MCP_DOCS_URL,
    };
  }

  return {
    title: "Tool execution failed",
    description: "The MCP server could not complete the requested operation.",
    howToFix: "Review the tool input or credentials and retry.",
    docsUrl: MCP_DOCS_URL,
  };
}

interface FormatMcpErrorOptions {
  includeDetails?: boolean;
}

export function formatMcpError(
  error: unknown,
  options: FormatMcpErrorOptions = {}
): string {
  const includeDetails = options.includeDetails ?? true;
  const descriptor = describeMcpError(error, includeDetails);
  const normalized = normalizeMcpError(error);
  const details = includeDetails
    ? normalized.rawDetails?.trim() || normalized.message.trim()
    : getSafeLocalErrorDetails(error);

  return [
    `Sequenzy MCP error: ${descriptor.title}`,
    `Description: ${descriptor.description}`,
    `How to fix: ${descriptor.howToFix}`,
    `Docs: ${descriptor.docsUrl}`,
    ...(details ? [`Details: ${details}`] : []),
  ].join("\n");
}
