import type { Readable, Writable } from "node:stream";

import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import { IMAGE_ASSET_MAX_BASE64_INPUT_LENGTH } from "./tools/media-assets.js";

export function createStdioTransport(stdin?: Readable, stdout?: Writable) {
  // Accepted whitespace can occupy the input budget, and JSON can escape each
  // character as six bytes. The transport grows on demand; this is only a cap.
  const maxBufferSize = IMAGE_ASSET_MAX_BASE64_INPUT_LENGTH * 6 + 64 * 1024;
  return new StdioServerTransport(stdin, stdout, { maxBufferSize });
}
