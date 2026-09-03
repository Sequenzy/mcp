import type { JsonSchemaObject } from "../mcp-types.js";

import { toolDefinitions } from "./definitions/index.js";

const SUBSCRIBER_SORT_GUIDANCE =
  "Ordinary searches are ordered newest-created first; attribute-filtered searches are ordered by subscriber ID ascending. Sort the returned array yourself if you need another order.";

/**
 * Unknown-argument rejection.
 *
 * MCP clients are free to send arguments a tool never declared, and the JSON
 * schema published with each tool is advisory - nothing in the protocol
 * enforces it. Handlers read the arguments they know about and ignore the
 * rest, so an invented `filters` or `sortBy` used to come back as a silently
 * unfiltered, unsorted result set that looked like a real answer. Rejecting
 * the call is the only outcome an agent can act on.
 */

/**
 * Extra guidance for arguments agents commonly invent, keyed by tool then
 * argument. Appended after the generic "supported arguments" line.
 */
const ARGUMENT_HINTS: Record<string, Record<string, string>> = {
  search_subscribers: {
    filters:
      "Use the tags, list/listId/listName, status, and attribute arguments for single conditions, or create_segment plus segmentId for compound, OR, engagement, or event conditions.",
    filterJoinOperator:
      "The supported arguments always combine with AND. Use create_segment plus segmentId for OR logic.",
    sortBy: SUBSCRIBER_SORT_GUIDANCE,
    sortOrder: SUBSCRIBER_SORT_GUIDANCE,
    sort: SUBSCRIBER_SORT_GUIDANCE,
    order: SUBSCRIBER_SORT_GUIDANCE,
    attributes:
      'Filter on one attribute at a time with attribute: "attributeName:value".',
    customAttributes:
      'Filter on one attribute at a time with attribute: "attributeName:value".',
    page: "Omit limit to fetch every page automatically, or set limit to cap the result size.",
    offset:
      "Omit limit to fetch every page automatically, or set limit to cap the result size.",
    cursor:
      "Omit limit to fetch every page automatically, or set limit to cap the result size.",
  },
};

let knownArgumentsByTool: Map<string, Set<string>> | null = null;

function getKnownArguments(toolName: string): Set<string> | null {
  knownArgumentsByTool ??= new Map(
    toolDefinitions.map((tool) => {
      const properties = tool.inputSchema.properties;
      return [
        tool.name,
        new Set(
          properties && typeof properties === "object"
            ? Object.keys(properties)
            : []
        ),
      ] as const;
    })
  );

  return knownArgumentsByTool.get(toolName) ?? null;
}

export function assertKnownToolArguments(
  toolName: string,
  args: Record<string, unknown>,
  inputSchema?: JsonSchemaObject
): void {
  const schemaProperties = inputSchema?.properties;
  const known = schemaProperties
    ? new Set(Object.keys(schemaProperties))
    : getKnownArguments(toolName);
  // An unregistered tool name is reported by the dispatcher itself.
  if (!known) {
    return;
  }

  const unknownKeys = Object.keys(args ?? {}).filter((key) => !known.has(key));
  if (unknownKeys.length === 0) {
    return;
  }

  const hints = ARGUMENT_HINTS[toolName] ?? {};
  const guidance = [
    ...new Set(unknownKeys.flatMap((key) => (hints[key] ? [hints[key]] : []))),
  ];

  const supported =
    known.size > 0
      ? `Supported arguments: ${[...known].map((key) => `\`${key}\``).join(", ")}.`
      : `\`${toolName}\` takes no arguments.`;

  throw new Error(
    [
      `Unsupported field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys
        .map((key) => `\`${key}\``)
        .join(", ")}.`,
      `\`${toolName}\` rejects arguments it does not support rather than ignoring them, because ignoring them would return a result that silently does not match the request.`,
      supported,
      ...guidance,
    ].join(" ")
  );
}
