#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

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

async function main() {
  assertConfiguredApiKey();

  // The stdio server runs on the user's machine, so tools may read local
  // files (e.g. attach_product_file with filePath). The hosted remote MCP
  // server never enables this.
  enableLocalFileUploads();

  const server = createSequenzyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sequenzy MCP server running on stdio");
}

main().catch((error) => {
  console.error(formatMcpError(error));
  process.exit(1);
});
