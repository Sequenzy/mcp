import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  type Notification,
  type Request,
  type ServerNotification,
  type ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import packageJson from "../package.json";

import { handleResourceRead, resources } from "./resources/index.js";
import type { McpRequestContext } from "./runtime.js";
import { withMcpRequestContext } from "./runtime.js";
import { handleToolCall, tools } from "./tools/index.js";

type SequenzyRequestHandlerExtra = RequestHandlerExtra<
  ServerRequest | Request,
  ServerNotification | Notification
>;

interface CreateSequenzyMcpServerOptions {
  getRequestContext?: (
    extra: SequenzyRequestHandlerExtra
  ) => McpRequestContext | undefined;
  onRequestContextUpdated?: (
    context: McpRequestContext,
    extra: SequenzyRequestHandlerExtra
  ) => void | Promise<void>;
}

async function withRequestContext<T>(
  extra: SequenzyRequestHandlerExtra,
  options: CreateSequenzyMcpServerOptions,
  callback: () => Promise<T>
): Promise<T> {
  const context = options.getRequestContext?.(extra) ?? {};

  try {
    return await withMcpRequestContext(context, callback);
  } finally {
    await options.onRequestContextUpdated?.(context, extra);
  }
}

export function createSequenzyMcpServer(
  options: CreateSequenzyMcpServerOptions = {}
) {
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
      instructions: [
        "Sequenzy email marketing MCP server: manage subscribers, campaigns, sequences, templates, and delivery stats.",
        "If you have access to multiple companies, call get_account and then select_company (or pass companyId per call) before other tools.",
        "IMPORTANT: whenever the user wanted to accomplish something and these tools did not expose functionality for it (missing tool, missing argument, unsupported workflow, or broken behavior), call submit_feedback describing the gap before finishing the task. The Sequenzy team reads every submission and uses it to decide what to build next.",
      ].join("\n"),
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    return withRequestContext(extra, options, () =>
      handleToolCall(name, args ?? {})
    );
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return { resources };
  });

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (request, extra) => {
      const { uri } = request.params;
      return withRequestContext(extra, options, () => handleResourceRead(uri));
    }
  );

  return server;
}

export type { McpRequestContext } from "./runtime.js";
