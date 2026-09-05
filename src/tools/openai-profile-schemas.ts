import type { JsonSchemaObject, Tool } from "../mcp-types.js";

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

export function createOpenAiFeedbackInputSchema(
  tool: Tool
): Tool["inputSchema"] {
  const properties = tool.inputSchema.properties ?? {};
  return {
    type: "object",
    properties: {
      companyId: properties.companyId,
      message: appendNotice({
        ...(properties.message as JsonSchemaObject),
        description:
          "The generalized product feedback. Do not include subscriber or account data, content, identifiers, credentials, tool arguments, API responses, or debug details.",
      }),
      category: properties.category,
      context: appendNotice({
        ...(properties.context as JsonSchemaObject),
        description:
          "Optional generalized workflow context and tool names only. Do not include user text verbatim, identifiers, content, tool arguments, API responses, errors, or debug details.",
      }),
    },
    required: ["message"],
    additionalProperties: false,
  };
}

export function createOpenAiAccountOutputSchema(): JsonSchemaObject {
  const stringProperty = (description: string): JsonSchemaObject => ({
    type: "string",
    description,
  });

  return {
    type: "object",
    description:
      "Privacy-minimized account and company-selection data returned by get_account.",
    properties: {
      success: { type: "boolean" },
      message: stringProperty("User-facing status message."),
      note: stringProperty("User-facing recovery guidance."),
      currentCompanyId: { type: ["string", "null"] },
      selectedCompanyId: { type: ["string", "null"] },
      companies: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: stringProperty("Company ID used by select_company."),
            name: stringProperty("Company display name."),
            role: stringProperty("The connected user's workspace role."),
            url: stringProperty("Company dashboard URL."),
            settingsUrl: stringProperty("Company settings URL."),
            subscriptionUrl: stringProperty(
              "Company subscription-management URL."
            ),
          },
          required: ["id", "name"],
          additionalProperties: false,
        },
      },
      apiKeyPermissions: {
        type: "object",
        description:
          "Permission capabilities without the connected user's ID or active API-key identity.",
        properties: {
          preset: stringProperty("Current permission preset."),
          description: stringProperty("Human-readable permission summary."),
          fullAccess: { type: "boolean" },
          selectedScopeCount: { type: "number" },
          currentScopeCount: { type: "number" },
          scopes: {
            type: ["array", "null"],
            items: { type: "string" },
          },
          canDiscoverMarketingWork: { type: "boolean" },
          missingMarketingReadScopes: {
            type: "array",
            items: { type: "string" },
          },
          canSendLive: { type: "boolean" },
          missingLiveDeliveryScopes: {
            type: "array",
            items: { type: "string" },
          },
          liveDeliveryBlockedByRole: { type: "boolean" },
          manageUrl: { type: ["string", "null"] },
        },
        additionalProperties: false,
      },
    },
    additionalProperties: false,
  };
}

export function appendOpenAiRestrictedDataNotice(
  schema: JsonSchemaObject
): JsonSchemaObject {
  return appendNotice(schema);
}
