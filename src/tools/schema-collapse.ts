import type { JsonSchemaObject } from "../mcp-types.js";

/** Repeated subtrees at or above this size are collapsed after their first use. */
const MIN_COLLAPSED_SCHEMA_LENGTH = 4000;

function isSchemaObject(value: unknown): value is JsonSchemaObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Sequence tools embed the same large step and email-block schemas in several
 * branch and path fields. Keep the first copy in each tool and point later
 * copies at it, so tools/list stays small. A collapsed copy keeps its type and
 * description and only drops constraints, so every input accepted before is
 * still accepted; the server validates nested steps itself.
 */
export function collapseRepeatedSchemas(
  schema: JsonSchemaObject
): JsonSchemaObject {
  const firstPathByShape = new Map<string, string>();

  const visit = (node: unknown, path: string): unknown => {
    if (Array.isArray(node)) return node.map((item) => visit(item, path));
    if (!isSchemaObject(node)) return node;

    // Copies differ only in the field's own description, which is kept.
    const { description: _description, ...body } = node;
    const shape = JSON.stringify(body);
    if (path && shape.length >= MIN_COLLAPSED_SCHEMA_LENGTH) {
      const firstPath = firstPathByShape.get(shape);
      if (firstPath) {
        return {
          ...(typeof node.type === "string" ? { type: node.type } : {}),
          description: [
            node.description,
            `Same schema as \`${firstPath}\` in this tool.`,
          ]
            .filter(Boolean)
            .join(" "),
        };
      }
      firstPathByShape.set(shape, path);
    }

    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        if (key === "properties" && isSchemaObject(value)) {
          return [
            key,
            Object.fromEntries(
              Object.entries(value).map(([name, child]) => [
                name,
                visit(child, path ? `${path}.${name}` : name),
              ])
            ),
          ];
        }
        return [key, visit(value, key === "items" ? `${path}[]` : path)];
      })
    );
  };

  return visit(schema, "") as JsonSchemaObject;
}
