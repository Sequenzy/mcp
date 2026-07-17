import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { formatMcpError } from "../error-output.js";

import { toolDefinitions } from "./definitions/index.js";
import { toolHandlers } from "./handlers/index.js";
import {
  addAppUrlsToToolResult,
  extractResultError,
  toStructuredContent,
  withRequiredToolHints,
  withToolOutputSchema,
} from "./internal.js";
import type { SequenzyToolCallResult } from "./output-schemas.js";
import { addRawHtmlWarning } from "./raw-html-warning.js";

export const tools: Tool[] = toolDefinitions
  .map(withToolOutputSchema)
  .map(withRequiredToolHints);

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<SequenzyToolCallResult> {
  try {
    let result: unknown;
    let handled = false;

    for (const handler of toolHandlers) {
      const response = await handler(name, args);
      if (response.handled) {
        result = response.result;
        handled = true;
        break;
      }
    }

    if (!handled) {
      throw new Error(`Unknown tool: ${name}`);
    }

    const resultError = extractResultError(result);
    if (resultError) {
      throw resultError;
    }

    result = addRawHtmlWarning(name, args, result);
    result = await addAppUrlsToToolResult(name, args, result);

    return {
      structuredContent: toStructuredContent(result),
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: formatMcpError(error),
        },
      ],
    };
  }
}
