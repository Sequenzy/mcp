const DOCS_ROOT = "https://docs.sequenzy.com";
const MCP_DOCS_URL = `${DOCS_ROOT}/concepts/mcp`;
const AUTH_DOCS_URL = `${DOCS_ROOT}/authentication`;

interface McpErrorDescriptor {
  title: string;
  description: string;
  howToFix: string;
  docsUrl: string;
  details: string;
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

function describeMcpError(error: unknown): McpErrorDescriptor {
  const normalized = normalizeMcpError(error);
  const message = normalized.message.trim() || "Unknown error";
  const lowerMessage = message.toLowerCase();
  const details = normalized.rawDetails?.trim() || message;

  if (
    normalized.context?.title ||
    normalized.context?.description ||
    normalized.context?.howToFix ||
    normalized.context?.docsUrl
  ) {
    return {
      title:
        normalized.context.title ??
        (normalized.statusCode === 409
          ? "Request conflict"
          : "API request failed"),
      description: normalized.context.description ?? message,
      howToFix:
        normalized.context.howToFix ??
        "Review the details below, adjust the tool input, and retry.",
      docsUrl: normalized.context.docsUrl ?? MCP_DOCS_URL,
      details,
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
      details,
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
      details,
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
      details,
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
      details,
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
      details,
    };
  }

  if (
    normalized.statusCode === 409 ||
    lowerMessage.includes("already exists")
  ) {
    return {
      title: "Resource already exists",
      description:
        "Sequenzy rejected this MCP request because it would create a duplicate resource.",
      howToFix:
        "List the existing resources first, reuse the matching resource when appropriate, or retry with a unique name or domain.",
      docsUrl: MCP_DOCS_URL,
      details,
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
      details,
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
      details,
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
      details,
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
      details,
    };
  }

  if (normalized.statusCode && normalized.statusCode >= 500) {
    return {
      title: "Sequenzy server error",
      description:
        "The request reached Sequenzy, but the server could not complete it successfully.",
      howToFix:
        "Retry once. If it still fails, keep the details below and consult the docs before escalating.",
      docsUrl: MCP_DOCS_URL,
      details,
    };
  }

  return {
    title: "Tool execution failed",
    description: "The MCP server could not complete the requested operation.",
    howToFix:
      "Review the details below, adjust the tool input or credentials, and retry.",
    docsUrl: MCP_DOCS_URL,
    details,
  };
}

export function formatMcpError(error: unknown): string {
  const descriptor = describeMcpError(error);

  return [
    `Sequenzy MCP error: ${descriptor.title}`,
    `Description: ${descriptor.description}`,
    `How to fix: ${descriptor.howToFix}`,
    `Docs: ${descriptor.docsUrl}`,
    `Details: ${descriptor.details}`,
  ].join("\n");
}
