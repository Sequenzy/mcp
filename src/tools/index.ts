import { formatMcpError } from "../error-output.js";
import type { Tool } from "../mcp-types.js";

import { toolDefinitions } from "./definitions/index.js";
import { toolHandlers } from "./handlers/index.js";
import {
  addAppUrlsToToolResult,
  extractResultError,
  toStructuredContent,
  withRequiredToolHints,
  withToolOutputSchema,
} from "./internal.js";
import {
  assertOpenAiInputPolicy,
  projectOpenAiToolResult,
} from "./openai-profile.js";
import type { SequenzyToolCallResult } from "./output-schemas.js";
import { getToolsForProfile, type SequenzyMcpProfile } from "./profiles.js";
import { addRawHtmlWarning } from "./raw-html-warning.js";
import { assertKnownToolArguments } from "./unknown-arguments.js";

export const tools: Tool[] = toolDefinitions
  .map(withToolOutputSchema)
  .map(withRequiredToolHints);

interface HandleToolCallOptions {
  profile?: SequenzyMcpProfile;
}

function isRecoverablePartialResult(name: string, result: unknown): boolean {
  if (
    name !== "import_subscriber_events" ||
    result === null ||
    typeof result !== "object"
  ) {
    return false;
  }

  const record = result as Record<string, unknown>;
  return (
    record.success === false &&
    typeof record.total === "number" &&
    typeof record.recorded === "number" &&
    typeof record.duplicates === "number" &&
    typeof record.failed === "number" &&
    typeof record.subscribers === "number" &&
    ((record.failed > 0 && Array.isArray(record.failures)) ||
      (typeof record.sideEffectFailed === "number" &&
        record.sideEffectFailed > 0 &&
        Array.isArray(record.sideEffectFailures)))
  );
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  options: HandleToolCallOptions = {}
): Promise<SequenzyToolCallResult> {
  const profile = options.profile ?? "standard";
  try {
    const tool = getToolsForProfile(tools, profile).find(
      (candidate) => candidate.name === name
    );
    if (!tool) {
      throw new Error(`Tool is not available on this MCP surface: ${name}`);
    }

    assertKnownToolArguments(name, args, tool.inputSchema);
    if (profile === "openai") {
      assertOpenAiInputPolicy(name, args);
    }

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

    // Event imports intentionally use HTTP 200 for row-level partial failure
    // so callers retain the counts and indices needed for a safe retry. Keep
    // that narrowly shaped response structured; request-level failures still
    // flow through the normal MCP error path.
    const resultError = isRecoverablePartialResult(name, result)
      ? null
      : extractResultError(result);
    if (resultError) {
      throw resultError;
    }

    result = addRawHtmlWarning(name, args, result);
    result = await addAppUrlsToToolResult(name, args, result);
    if (profile === "openai") {
      result = projectOpenAiToolResult(name, result);
    }

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
          text: formatMcpError(error, {
            includeDetails: profile !== "openai",
          }),
        },
      ],
    };
  }
}
