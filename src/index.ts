#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { resources, handleResourceRead } from "./resources/index.js";
import { tools, handleToolCall } from "./tools/index.js";

const API_URL = process.env.SEQUENZY_API_URL ?? "https://api.sequenzy.com";
const API_KEY = process.env.SEQUENZY_API_KEY;

// Currently selected company ID (set via select_company tool)
let selectedCompanyId: string | null = null;

if (!API_KEY) {
  console.error("Error: SEQUENZY_API_KEY environment variable is required");
  console.error("Run `npx @sequenzy/setup` to configure your API key.");
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
    version: "0.0.1",
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// API client for making requests
export async function apiRequest<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
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

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
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
  console.error("Fatal error:", error);
  process.exit(1);
});
