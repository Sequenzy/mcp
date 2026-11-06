#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { formatMcpError } from "./error-output.js";
import {
  createMissingApiKeyError,
  enableLocalFileUploads,
  hasConfiguredApiKey,
} from "./runtime.js";
import { createSequenzyMcpServer } from "./server.js";
import { createStdioTransport } from "./stdio-transport.js";

export {
  apiRequest,
  getSelectedCompanyId,
  setSelectedCompanyId,
  withMcpRequestContext,
} from "./runtime.js";
export { createSequenzyMcpServer } from "./server.js";

function main() {
  // Start without a key so the client still lists the tools and each call
  // explains how to sign up and connect, rather than showing a dead server.
  const apiKeyMissing = !hasConfiguredApiKey();
  if (apiKeyMissing) {
    console.error(formatMcpError(createMissingApiKeyError()));
  }

  // The stdio server runs on the user's machine, so tools may read local
  // files (e.g. attach_product_file with filePath). The hosted remote MCP
  // server never enables this.
  enableLocalFileUploads();

  serveStdio(() => createSequenzyMcpServer({ apiKeyMissing }), {
    transport: createStdioTransport(),
  });
  console.error("Sequenzy MCP server running on stdio");
}

try {
  main();
} catch (error) {
  console.error(formatMcpError(error));
  process.exit(1);
}
