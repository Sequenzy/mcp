#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import packageJson from "../package.json";

import {
  formatMcpError,
  McpApiError,
  type McpApiErrorContext,
} from "./error-output.js";
import { resources, handleResourceRead } from "./resources/index.js";
import { tools, handleToolCall } from "./tools/index.js";

const API_URL = process.env.SEQUENZY_API_URL ?? "https://api.sequenzy.com";
const API_KEY = process.env.SEQUENZY_API_KEY;

// Currently selected company ID (set via select_company tool)
let selectedCompanyId: string | null = null;

if (!API_KEY) {
  console.error(
    formatMcpError(
      new McpApiError(
        "SEQUENZY_API_KEY environment variable is required",
        401,
        undefined,
        "MCP_AUTH_REQUIRED"
      )
    )
  );
  process.exit(1);
}

/**
 * Get the currently selected company ID
 */
export function getSelectedCompanyId(): string | null {
  return selectedCompanyId;
}

/**
 * Set the currently selected company ID
 */
export function setSelectedCompanyId(companyId: string | null): void {
  selectedCompanyId = companyId;
}

// Create the MCP server
const server = new Server(
  {
    name: "sequenzy",
    version: packageJson.version,
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// API client for making requests
function getStringField(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function formatStructuredDetails(value: unknown): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  return JSON.stringify(value);
}

function parseApiErrorPayload(raw: string): {
  message: string;
  code?: string;
  details?: string;
  context?: McpApiErrorContext;
} {
  if (!raw.trim()) {
    return { message: "Request failed" };
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | string;

    if (typeof parsed === "string") {
      return { message: parsed };
    }

    const nestedError =
      typeof parsed.error === "object" && parsed.error !== null
        ? (parsed.error as Record<string, unknown>)
        : undefined;

    const code =
      getStringField(parsed, "code") ??
      (nestedError ? getStringField(nestedError, "code") : undefined);
    const message =
      (typeof parsed.error === "string" ? parsed.error : undefined) ??
      (nestedError ? getStringField(nestedError, "message") : undefined) ??
      getStringField(parsed, "message") ??
      getStringField(parsed, "error") ??
      raw;
    const howToFix =
      getStringField(parsed, "howToFix") ??
      getStringField(parsed, "resolution");
    const context: McpApiErrorContext = {
      ...(getStringField(parsed, "title")
        ? { title: getStringField(parsed, "title") }
        : {}),
      ...(getStringField(parsed, "description")
        ? { description: getStringField(parsed, "description") }
        : {}),
      ...(howToFix ? { howToFix } : {}),
      ...(getStringField(parsed, "docsUrl")
        ? { docsUrl: getStringField(parsed, "docsUrl") }
        : {}),
    };
    const details = formatStructuredDetails(parsed.details);

    if (Object.keys(context).length > 0 || details) {
      return {
        message,
        ...(code ? { code } : {}),
        ...(details ? { details } : {}),
        ...(Object.keys(context).length > 0 ? { context } : {}),
      };
    }

    if (typeof parsed.error === "string") {
      return {
        message: parsed.error,
        ...(code ? { code } : {}),
      };
    }

    if (nestedError) {
      return {
        message,
        ...(code ? { code } : {}),
      };
    }

    return {
      message,
      ...(code ? { code } : {}),
    };
  } catch {
    return { message: raw };
  }
}

export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  body?: unknown,
  companyIdOverride?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${API_KEY}`,
  };

  // Use override if provided, otherwise use selected company ID
  const effectiveCompanyId = companyIdOverride ?? selectedCompanyId;
  if (effectiveCompanyId) {
    headers["x-company-id"] = effectiveCompanyId;
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new McpApiError(
      error instanceof Error ? error.message : "Failed to reach Sequenzy API",
      0,
      undefined,
      "NETWORK_ERROR"
    );
  }

  if (!response.ok) {
    const rawError = await response.text();
    const parsedError = parseApiErrorPayload(rawError);
    throw new McpApiError(
      parsedError.message,
      response.status,
      parsedError.details ?? rawError,
      parsedError.code,
      parsedError.context
    );
  }

  return response.json() as Promise<T>;
}

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args ?? {});
});

// List available resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources };
});

// Read resource content
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  return handleResourceRead(uri);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sequenzy MCP server running on stdio");
}

main().catch((error) => {
  console.error(formatMcpError(error));
  process.exit(1);
});
