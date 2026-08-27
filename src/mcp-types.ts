import type { ToolAnnotations } from "@modelcontextprotocol/server";

export type { ToolAnnotations };

export type JsonSchemaObject = {
  type?: string | string[];
  properties?: Record<string, JsonSchemaObject | unknown>;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaObject | unknown;
  items?: JsonSchemaObject | unknown;
  description?: string;
  $schema?: string;
  [key: string]: unknown;
};

/**
 * v2's public `Tool` type uses a recursive JSON-schema value that rejects the
 * `as const` enum tuples and nested JSON Schema objects our definitions use.
 * Keep a structural tool shape for Sequenzy definitions; the wire payload is
 * unchanged.
 */
export type Tool = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: JsonSchemaObject & {
    type: "object";
  };
  outputSchema?: JsonSchemaObject;
  annotations?: ToolAnnotations;
};
