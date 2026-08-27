#!/usr/bin/env node
import { serveStdio } from "@modelcontextprotocol/server/stdio";

import { formatMcpError } from "./error-output.js";
import { assertConfiguredApiKey, enableLocalFileUploads } from "./runtime.js";
import { createSequenzyMcpServer } from "./server.js";

export {
  apiRequest,
  getSelectedCompanyId,
  setSelectedCompanyId,
  withMcpRequestContext,
} from "./runtime.js";
export { createSequenzyMcpServer } from "./server.js";

function main() {
  assertConfiguredApiKey();

  // The stdio server runs on the user's machine, so tools may read local
  // files (e.g. attach_product_file with filePath). The hosted remote MCP
  // server never enables this.
  enableLocalFileUploads();

  serveStdio(() => createSequenzyMcpServer());
  console.error("Sequenzy MCP server running on stdio");
}

try {
  main();
} catch (error) {
  console.error(formatMcpError(error));
  process.exit(1);
}
