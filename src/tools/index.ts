import {
  formatDefaultedCompanyNote,
  withCompanyDefaultCollector,
} from "../company-default-notice.js";
import { buildMcpErrorResult, formatMcpError } from "../error-output.js";
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
  getOpenAiToolTarget,
  projectOpenAiToolResult,
  withOpenAiDefaultArguments,
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
  // Renamed and split OpenAI-surface tools share the handler of their source.
  const target =
    profile === "openai" ? getOpenAiToolTarget(name) : { handlerName: name };
  const handlerName = target.handlerName;
  try {
    const tool = getToolsForProfile(tools, profile).find(
      (candidate) => candidate.name === name
    );
    if (!tool) {
      throw new Error(`Tool is not available on this MCP surface: ${name}`);
    }
    assertKnownToolArguments(name, args, tool.inputSchema);
    let handlerArgs = target.action ? { ...args, action: target.action } : args;
    if (profile === "openai") {
      assertOpenAiInputPolicy(handlerName, handlerArgs);
      handlerArgs = withOpenAiDefaultArguments(handlerName, handlerArgs);
    }

    let result: unknown;
    let handled = false;

    const { defaultedCompanyId } = await withCompanyDefaultCollector(
      async () => {
        for (const handler of toolHandlers) {
          const response = await handler(handlerName, handlerArgs);
          if (response.handled) {
            result = response.result;
            handled = true;
            break;
          }
        }
      }
    );

    if (!handled) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Event imports intentionally use HTTP 200 for row-level partial failure
    // so callers retain the counts and indices needed for a safe retry. Keep
    // that narrowly shaped response structured; request-level failures still
    // flow through the normal MCP error path.
    const resultError = isRecoverablePartialResult(handlerName, result)
      ? null
      : extractResultError(result);
    if (resultError) {
      throw resultError;
    }

    result = addRawHtmlWarning(handlerName, handlerArgs, result);
    result = await addAppUrlsToToolResult(handlerName, handlerArgs, result);
    if (profile === "openai") {
      result = projectOpenAiToolResult(handlerName, result);
    }

    return {
      structuredContent: toStructuredContent(result),
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
        // A separate text block, so structuredContent and the JSON above
        // keep exactly the fields they always had.
        ...(defaultedCompanyId
          ? [
              {
                type: "text" as const,
                text: formatDefaultedCompanyNote(defaultedCompanyId),
              },
            ]
          : []),
      ],
    };
  } catch (error) {
    // Handler and policy messages use the original name; show the caller the
    // name it called.
    if (handlerName !== name && error instanceof Error) {
      error.message = error.message.replaceAll(handlerName, name);
    }
    return {
      isError: true,
      structuredContent: buildMcpErrorResult(error, {
        includeDetails: profile !== "openai",
        reviewedSurface: profile === "openai",
      }),
      content: [
        {
          type: "text",
          text: formatMcpError(error, {
            includeDetails: profile !== "openai",
            reviewedSurface: profile === "openai",
          }),
        },
      ],
    };
  }
}
