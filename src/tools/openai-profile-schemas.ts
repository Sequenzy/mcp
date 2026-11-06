import type { JsonSchemaObject } from "../mcp-types.js";

export const OPENAI_RESTRICTED_DATA_NOTICE =
  "Use only ordinary business, contact, marketing, and commerce data. Do not provide payment-card data, health or medical data, government identifiers (such as Social Security or passport numbers), biometric or genetic data, authentication credentials or secrets, sensitive demographic data, or precise geolocation.";

function appendNotice(schema: JsonSchemaObject): JsonSchemaObject {
  return {
    ...schema,
    description: [schema.description, OPENAI_RESTRICTED_DATA_NOTICE]
      .filter(Boolean)
      .join(" "),
  };
}

export function appendOpenAiRestrictedDataNotice(
  schema: JsonSchemaObject
): JsonSchemaObject {
  return appendNotice(schema);
}
