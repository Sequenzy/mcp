import { McpServer, type ListToolsResult } from "@modelcontextprotocol/server";

import packageJson from "../package.json";

import { handleResourceRead, resources } from "./resources/index.js";
import type { McpRequestContext } from "./runtime.js";
import { withMcpRequestContext } from "./runtime.js";
import { handleToolCall, tools } from "./tools/index.js";

const LIST_CACHE_HINT = {
  ttlMs: 60_000,
  cacheScope: "public" as const,
};

interface CreateSequenzyMcpServerOptions {
  getRequestContext?: () => McpRequestContext | undefined;
  onRequestContextUpdated?: (
    context: McpRequestContext
  ) => void | Promise<void>;
}

async function withRequestContext<T>(
  options: CreateSequenzyMcpServerOptions,
  callback: () => Promise<T>
): Promise<T> {
  const context = options.getRequestContext?.();

  // The stdio server has no per-request context: one process serves one user,
  // so its company selection lives in the module-level runtime state for the
  // life of the process. Entering the AsyncLocalStorage scope with an empty
  // object would shadow that state - `getSelectedCompanyId` branches on the
  // store existing, not on it holding a selection - so `select_company` would
  // write into a throwaway object and every later call would read back `null`.
  if (!context) {
    return callback();
  }

  try {
    return await withMcpRequestContext(context, callback);
  } finally {
    await options.onRequestContextUpdated?.(context);
  }
}

export function createSequenzyMcpServer(
  options: CreateSequenzyMcpServerOptions = {}
) {
  const server = new McpServer(
    {
      name: "sequenzy",
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      instructions: [
        "Sequenzy email marketing MCP server: manage subscribers, campaigns, sequences, templates, and delivery stats.",
        "If you have access to multiple companies, call get_account and then select_company (or pass companyId per call) before other tools.",
        "Sequence A/B step summaries on get_sequence include variant IDs, subjects, preview text, and blockCount when the key has ab_tests:read; call get_ab_test for every variant's full blocks before auditing or rewriting copy. Write those bodies with update_ab_test_variant. If that tool is not in the tool list, enable it on the Sequenzy connector - do not write through update_template or update_sequence_node.",
        "IMPORTANT: whenever the user wanted to accomplish something and these tools did not expose functionality for it (missing tool, missing argument, unsupported workflow, or broken behavior), call submit_feedback describing the gap before finishing the task. When a tool call produced a wrong or unexpected result, include userIntent, toolCalls, expected, actual, and resourceIds in the submission so the team can reproduce it. The Sequenzy team reads every submission and uses it to decide what to build next.",
      ].join("\n"),
      cacheHints: {
        "tools/list": LIST_CACHE_HINT,
        "resources/list": LIST_CACHE_HINT,
        "server/discover": LIST_CACHE_HINT,
      },
    }
  );

  server.server.setRequestHandler("tools/list", async () => {
    return { tools } as unknown as ListToolsResult;
  });

  server.server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;
    return withRequestContext(options, () => handleToolCall(name, args ?? {}));
  });

  server.server.setRequestHandler("resources/list", async () => {
    return { resources };
  });

  server.server.setRequestHandler("resources/read", async (request) => {
    const { uri } = request.params;
    return withRequestContext(options, () => handleResourceRead(uri));
  });

  return server;
}

export type { McpRequestContext } from "./runtime.js";
