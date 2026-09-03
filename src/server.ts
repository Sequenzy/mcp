import { McpServer, type ListToolsResult } from "@modelcontextprotocol/server";

import packageJson from "../package.json";

import { handleResourceRead, resources } from "./resources/index.js";
import type { McpRequestContext } from "./runtime.js";
import { withMcpRequestContext } from "./runtime.js";
import { handleToolCall, tools } from "./tools/index.js";
import {
  getToolsForProfile,
  type SequenzyMcpProfile,
} from "./tools/profiles.js";

const LIST_CACHE_HINT = {
  ttlMs: 60_000,
  cacheScope: "public" as const,
};

interface CreateSequenzyMcpServerOptions {
  getRequestContext?: () => McpRequestContext | undefined;
  onRequestContextUpdated?: (
    context: McpRequestContext
  ) => void | Promise<void>;
  profile?: SequenzyMcpProfile;
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
  const profile = options.profile ?? "standard";
  const profileTools = getToolsForProfile(tools, profile);

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
        ...(profile === "openai"
          ? [
              "This OpenAI-reviewed surface accepts only ordinary business, contact, marketing, and commerce data. Never provide payment-card data, health or medical data, government identifiers, biometric or genetic data, authentication credentials or secrets, sensitive demographic data, or precise geolocation. Credential-producing operations and raw outbound-webhook delivery tools are intentionally unavailable here; use the Sequenzy dashboard or local CLI for those workflows.",
            ]
          : []),
        "If you have access to multiple companies, call get_account and then select_company (or pass companyId per call) before other tools.",
        "Sequence A/B step variant bodies are on get_sequence.sequence.emails[].abTest.variants[].blocks when the key has ab_tests:read. get_ab_test is optional for that copy audit; it still returns settings, localization, and stats. Write those bodies with update_ab_test_variant (IDs from the same variants list). If that tool is not in the tool list, enable it on the Sequenzy connector - do not write through update_template or update_sequence_node.",
        ...(profile === "openai"
          ? [
              "Only call submit_feedback when the user explicitly asks you to send feedback to Sequenzy. Before calling it, tell the user that the message goes to the Sequenzy team. Include no subscriber data, message content, identifiers, credentials, raw tool calls, API responses, errors, or debug payloads.",
            ]
          : [
              "Only call submit_feedback when the user explicitly asks you to send feedback to Sequenzy. Before calling it, tell the user that the message goes to the Sequenzy team. Include only reproduction details and resource IDs needed for that report; never include unrelated subscriber data, message content, credentials, raw API payloads, or debug data.",
            ]),
      ].join("\n"),
      cacheHints: {
        "tools/list": LIST_CACHE_HINT,
        "resources/list": LIST_CACHE_HINT,
        "server/discover": LIST_CACHE_HINT,
      },
    }
  );

  server.server.setRequestHandler("tools/list", async () => {
    return { tools: profileTools } as unknown as ListToolsResult;
  });

  server.server.setRequestHandler("tools/call", async (request) => {
    const { name, arguments: args } = request.params;
    return withRequestContext(options, () =>
      handleToolCall(name, args ?? {}, { profile })
    );
  });

  server.server.setRequestHandler("resources/list", async () => {
    return { resources };
  });

  server.server.setRequestHandler("resources/read", async (request) => {
    const { uri } = request.params;
    return withRequestContext(options, () =>
      handleResourceRead(uri, { profile })
    );
  });

  return server;
}

export type { McpRequestContext } from "./runtime.js";
export type { SequenzyMcpProfile } from "./tools/profiles.js";
