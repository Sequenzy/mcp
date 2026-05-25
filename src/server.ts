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
