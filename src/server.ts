import { McpServer, type ListToolsResult } from "@modelcontextprotocol/server";

import packageJson from "../package.json";

import {
  APP_RESOURCE_URI,
  appResource,
  readAppResource,
} from "./app-resource.js";
import {
  buildMcpErrorResult,
  formatMcpError,
  MCP_SIGNUP_URL,
} from "./error-output.js";
import { handleResourceRead, resources } from "./resources/index.js";
import type { McpRequestContext } from "./runtime.js";
import { createMissingApiKeyError, withMcpRequestContext } from "./runtime.js";
import { handleToolCall, tools } from "./tools/index.js";
import {
  getToolsForProfile,
  type SequenzyMcpProfile,
} from "./tools/profiles.js";

const LIST_CACHE_HINT = {
  ttlMs: 60_000,
  cacheScope: "public" as const,
};

/**
 * Handshake identity that clients and MCP directories show for the server.
 * Directories match store listings to a server by `websiteUrl` and name.
 */
export const SERVER_INFO = {
  name: "sequenzy",
  title: "Sequenzy",
  description:
    "Email marketing for SaaS and apps: manage subscribers, lists, segments, campaigns, automated sequences, templates, transactional email and delivery stats.",
  websiteUrl: "https://www.sequenzy.com",
  icons: [
    {
      src: "https://www.sequenzy.com/logo.png",
      mimeType: "image/png",
      sizes: ["256x256"],
    },
  ],
};

interface CreateSequenzyMcpServerOptions {
  /** The stdio server started without an API key; tell the agent how to fix it. */
  apiKeyMissing?: boolean;
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
    { ...SERVER_INFO, version: packageJson.version },
    {
      capabilities: {
        tools: { listChanged: false },
        resources: { listChanged: false },
      },
      instructions: [
        "Sequenzy email marketing MCP server: manage subscribers, campaigns, sequences, templates, and delivery stats.",
        ...(options.apiKeyMissing
          ? [
              `No Sequenzy API key is configured, so every tool returns MCP_AUTH_REQUIRED. Before calling tools, tell the user to create a free account at ${MCP_SIGNUP_URL} (or sign in), then run \`npx @sequenzy/setup\`, or add a key from Settings > API Keys as SEQUENZY_API_KEY in this MCP server's environment and restart the client.`,
            ]
          : []),
        ...(profile === "openai"
          ? [
              "This connector accepts only ordinary business, contact, marketing, and commerce data. Never provide payment-card data, health or medical data, government identifiers, biometric or genetic data, authentication credentials or secrets, sensitive demographic data, or precise geolocation; tools reject recognizable values, and a rejected value must not be retried under another field. API keys, webhook secrets, storage and warehouse credentials, and push credentials are entered and viewed only in the Sequenzy dashboard; no tool here accepts or returns them. Web tracking keys are publishable browser keys, not API credentials.",
              "Tools act on the selected company by default. Call get_account when the user asks which companies they can access, names another company, or a tool reports that a company must be chosen; then use select_company or pass companyId.",
            ]
          : [
              "Keys with access to multiple companies need a target company: get_account lists them, select_company chooses one, or companyId can be passed per call.",
            ]),
        ...(profile === "muse"
          ? [
              "This connector carries the everyday email marketing tools. Some tool descriptions mention tools that are not in this list (A/B tests, sequence graph editing, integrations, landing pages and more); those are on the full Sequenzy MCP server at https://api.sequenzy.com/v1/mcp or in the Sequenzy dashboard, so tell the user where to do that instead of guessing another tool.",
            ]
          : [
              `Sequence A/B step variant bodies are on get_sequence.sequence.emails[].abTest.variants[].blocks when the ${profile === "openai" ? "connection" : "key"} has ab_tests:read. get_ab_test is optional for that copy audit; it still returns settings, localization, and stats. Write those bodies with update_ab_test_variant (IDs from the same variants list).${
                profile === "openai"
                  ? ""
                  : " If that tool is not in the tool list, it can be enabled on the Sequenzy connector;"
              } update_template and update_sequence_node do not edit variant bodies.`,
            ]),
        ...(profile !== "standard"
          ? []
          : [
              "submit_feedback delivers a message to the Sequenzy team and is intended for user-requested feedback; it needs only the reproduction details and resource IDs for that report, not unrelated subscriber data, message content, credentials, raw API payloads, or debug data.",
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
    // A stdio server cannot gain a key without a restart, so answer before any
    // tool runs: some tools validate input or build URLs locally and would
    // otherwise send the agent somewhere other than the signup steps.
    if (options.apiKeyMissing) {
      const error = createMissingApiKeyError();
      const includeDetails = profile !== "openai";
      return {
        isError: true,
        structuredContent: buildMcpErrorResult(error, {
          includeDetails,
          reviewedSurface: profile === "openai",
        }),
        content: [
          {
            type: "text",
            text: formatMcpError(error, {
              includeDetails,
              reviewedSurface: profile === "openai",
            }),
          },
        ],
      };
    }
    return withRequestContext(options, () =>
      handleToolCall(name, args ?? {}, { profile })
    );
  });

  server.server.setRequestHandler("resources/list", async () => {
    return { resources: [...resources, appResource] };
  });

  server.server.setRequestHandler("resources/read", async (request) => {
    const { uri } = request.params;
    if (uri === APP_RESOURCE_URI) return readAppResource(profile);
    return withRequestContext(options, () =>
      handleResourceRead(uri, { profile })
    );
  });

  return server;
}

export type { McpRequestContext } from "./runtime.js";
export type { SequenzyMcpProfile } from "./tools/profiles.js";
