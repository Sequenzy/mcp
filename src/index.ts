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

import { formatMcpError, McpApiError } from "./error-output.js";
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
function parseApiErrorPayload(raw: string): { message: string; code?: string } {
  if (!raw.trim()) {
    return { message: "Request failed" };
  }

  try {
    const parsed = JSON.parse(raw) as
      | {
          message?: string;
          error?:
            | string
            | {
                code?: string;
                message?: string;
              };
          code?: string;
        }
      | string;

    if (typeof parsed === "string") {
      return { message: parsed };
    }

    if (typeof parsed.error === "string") {
      return {
        message: parsed.error,
        code: parsed.code,
      };
    }

    if (parsed.error && typeof parsed.error === "object") {
      return {
        message: parsed.error.message ?? parsed.message ?? raw,
        code: parsed.error.code ?? parsed.code,
      };
    }

    return {
      message: parsed.message ?? raw,
      code: parsed.code,
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
      rawError,
      parsedError.code
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
