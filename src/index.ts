#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { formatMcpError } from "./error-output.js";
import { assertConfiguredApiKey } from "./runtime.js";
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

  const server = createSequenzyMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Sequenzy MCP server running on stdio");
}

main().catch((error) => {
  console.error(formatMcpError(error));
  process.exit(1);
});
