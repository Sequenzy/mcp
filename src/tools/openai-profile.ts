import type { JsonSchemaObject, Tool } from "../mcp-types.js";

import {
  isOmittedOutputField,
  normalizeFieldName,
  redactRestrictedUrls,
  restrictedAttributePathCategory,
  restrictedEmbeddedUrlCategory,
  restrictedFieldCategory,
  restrictedMergeTagCategory,
  restrictedRecordIssue,
  restrictedTextCategory,
  type RestrictedIssue,
} from "./openai-profile-matchers.js";
import {
  ATTRIBUTE_PATH_LIST_FIELDS,
  DATA_BEARING_FIELDS,
  DATA_BEARING_FIELDS_BY_TOOL,
  FEEDBACK_IDENTIFIER_RULES,
  LANDING_PAGE_PREVIEW_PATH_PREFIX,
  LANDING_PAGE_PREVIEW_TOOLS,
  NOTICE_INPUT_FIELDS,
  OPENAI_EXCLUDED_TOOL_NAMES,
  REDACTED_VALUE,
  SECRET_ENDPOINT_TOOLS,
  TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS,
} from "./openai-profile-rules.js";
import {
  appendOpenAiRestrictedDataNotice,
  createOpenAiAccountOutputSchema,
  createOpenAiFeedbackInputSchema,
} from "./openai-profile-schemas.js";

export { OPENAI_EXCLUDED_TOOL_NAMES } from "./openai-profile-rules.js";
export { OPENAI_RESTRICTED_DATA_NOTICE } from "./openai-profile-schemas.js";

type ScanContext = {
  toolName: string;
  path: string;
  /** The property this value sits under; array items inherit the array's key. */
  key?: string;
  /** True once inside a data-bearing field, where labelled prose is checked. */
  textScanned: boolean;
};

function isDataBearing(toolName: string, key: string): boolean {
  return (
    DATA_BEARING_FIELDS.has(key) ||
    DATA_BEARING_FIELDS_BY_TOOL[toolName]?.has(key) === true
  );
}

/**
 * One recursive pass over every argument of every tool. Structural rules
 * (field names, attribute paths, named records, merge tags, embedded URLs)
 * apply everywhere; labelled-prose rules apply only under data-bearing fields
 * so authored campaign copy is left alone.
 */
function scanInputValue(
  value: unknown,
  ctx: ScanContext
): RestrictedIssue | undefined {
  if (typeof value === "string") {
    const urlCategory = restrictedEmbeddedUrlCategory(value);
    if (urlCategory) return { category: urlCategory, path: ctx.path };
    const mergeTagCategory = restrictedMergeTagCategory(value);
    if (mergeTagCategory) return { category: mergeTagCategory, path: ctx.path };
    if (ctx.key && ATTRIBUTE_PATH_LIST_FIELDS.has(ctx.key)) {
      const category = restrictedAttributePathCategory(value);
      if (category) return { category, path: ctx.path };
    }
    if (ctx.textScanned) {
      const category = restrictedTextCategory(value);
      if (category) return { category, path: ctx.path };
    }
    return undefined;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const issue = scanInputValue(value[index], {
        ...ctx,
        path: `${ctx.path}[${index}]`,
      });
      if (issue) return issue;
    }
    return undefined;
  }

  if (value === null || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const recordIssue = restrictedRecordIssue(record, ctx.path, ctx.key);
  if (recordIssue) return recordIssue;

  for (const [key, nestedValue] of Object.entries(record)) {
    const path = `${ctx.path}.${key}`;
    const category = restrictedFieldCategory(key);
    if (category) return { category, path };

    const issue = scanInputValue(nestedValue, {
      toolName: ctx.toolName,
      path,
      key,
      textScanned: ctx.textScanned || isDataBearing(ctx.toolName, key),
    });
    if (issue) return issue;
  }
  return undefined;
}

function restrictedDataError(issue: RestrictedIssue): Error {
  return new Error(
    `Restricted personal data was blocked in ${issue.path} (${issue.category}). Remove it and retry with ordinary business, contact, marketing, or commerce data only.`
  );
}

function feedbackIdentifierError(path: string, label: string): Error {
  return new Error(
    `Feedback on this MCP surface must not include subscriber or account identifiers, but ${path} contains ${label}. Remove it and describe the issue in general terms.`
  );
}

export function withOpenAiToolProfile(tool: Tool): Tool | null {
  if (OPENAI_EXCLUDED_TOOL_NAMES.has(tool.name)) return null;

  let inputSchema =
    tool.name === "submit_feedback"
      ? createOpenAiFeedbackInputSchema(tool)
      : {
          ...tool.inputSchema,
          properties: { ...tool.inputSchema.properties },
        };

  if (tool.name !== "submit_feedback") {
    const properties = inputSchema.properties ?? {};
    for (const [name, property] of Object.entries(properties)) {
      if (
        !NOTICE_INPUT_FIELDS.has(name) &&
        DATA_BEARING_FIELDS_BY_TOOL[tool.name]?.has(name) !== true
      ) {
        continue;
      }
      if (property === null || typeof property !== "object") continue;
      const profiledProperty = appendOpenAiRestrictedDataNotice(
        property as JsonSchemaObject
      );
      properties[name] =
        tool.name === "cancel_sequence_enrollments" && name === "fieldValues"
          ? {
              ...profiledProperty,
              description: `${profiledProperty.description ?? ""} On this MCP surface, fieldPath is required whenever fieldValues is provided.`,
            }
          : profiledProperty;
    }
    inputSchema = { ...inputSchema, properties };
  }

  if (tool.name === "render_email") {
    const properties = { ...inputSchema.properties };
    delete properties.subscriberId;
    inputSchema = { ...inputSchema, properties };
  }

  const descriptionOverrides: Readonly<Record<string, string>> = {
    get_sequence_inbound_webhook:
      "Read the non-secret mapping, sample payload, setup status, and dashboard URL for a sequence inbound webhook. The credential-bearing endpoint URL is omitted from this OpenAI surface.",
    configure_sequence_inbound_webhook:
      "Create or update the mapping and sample attached to a sequence inbound_webhook trigger. The response omits the endpoint secret and credential-bearing URL; a human can copy it from the returned sequence dashboard URL.",
    render_email:
      "Render an email with a sample contact or caller-supplied, policy-checked subscriber and variables. Rendering against a stored subscriber ID is unavailable on this OpenAI surface because stored custom attributes cannot be inspected before personalization.",
    submit_feedback:
      "Send generalized product feedback to the Sequenzy team only when the user explicitly asks. Tell the user where it goes before calling. Include no subscriber or account data, content, identifiers, credentials, raw tool calls, API responses, errors, or debug payloads.",
  };

  return {
    ...tool,
    ...(descriptionOverrides[tool.name]
      ? { description: descriptionOverrides[tool.name] }
      : {}),
    inputSchema,
    ...(tool.name === "get_account"
      ? { outputSchema: createOpenAiAccountOutputSchema() }
      : {}),
  };
}

export function assertOpenAiInputPolicy(
  toolName: string,
  args: Record<string, unknown>
): void {
  if (toolName === "render_email" && args.subscriberId !== undefined) {
    throw new Error(
      "`subscriberId` is unavailable on this MCP surface. Use a policy-compliant inline `subscriber`, or omit it to render with sample data."
    );
  }

  if (
    toolName === "cancel_sequence_enrollments" &&
    args.fieldValues !== undefined &&
    (typeof args.fieldPath !== "string" || !args.fieldPath.trim())
  ) {
    throw new Error(
      "`fieldPath` is required with `fieldValues` on this MCP surface so restricted personal-data selectors can be checked before cancellation."
    );
  }

  const issue = scanInputValue(args, {
    toolName,
    path: toolName,
    textScanned: false,
  });
  if (issue) throw restrictedDataError(issue);

  if (toolName === "submit_feedback") {
    for (const fieldName of ["message", "context"] as const) {
      const value = args[fieldName];
      if (typeof value !== "string") continue;
      const rule = FEEDBACK_IDENTIFIER_RULES.find(({ pattern }) =>
        pattern.test(value)
      );
      if (rule) {
        throw feedbackIdentifierError(`${toolName}.${fieldName}`, rule.label);
      }
    }
  }
}

const OMIT_SANITIZED_VALUE = Symbol("omit-sanitized-value");

function isLandingPagePreviewUrl(value: string): boolean {
  try {
    return new URL(value).pathname.startsWith(LANDING_PAGE_PREVIEW_PATH_PREFIX);
  } catch {
    return false;
  }
}

function sanitizeOutputValue(
  value: unknown,
  ctx: ScanContext
): unknown | typeof OMIT_SANITIZED_VALUE {
  if (typeof value === "string") {
    if (restrictedMergeTagCategory(value)) return REDACTED_VALUE;
    if (ctx.textScanned && restrictedTextCategory(value)) return REDACTED_VALUE;
    const previewExempt =
      ctx.key === "previewUrl" &&
      LANDING_PAGE_PREVIEW_TOOLS.has(ctx.toolName) &&
      isLandingPagePreviewUrl(value);
    return previewExempt ? value : redactRestrictedUrls(value);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const sanitized = sanitizeOutputValue(item, {
        ...ctx,
        path: `${ctx.path}[${index}]`,
      });
      return sanitized === OMIT_SANITIZED_VALUE ? [] : [sanitized];
    });
  }

  if (value === null || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (restrictedRecordIssue(record, ctx.path, ctx.key)) {
    return OMIT_SANITIZED_VALUE;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(record)) {
    const normalizedKey = normalizeFieldName(key);
    if (isOmittedOutputField(key)) continue;
    if (
      SECRET_ENDPOINT_TOOLS.has(ctx.toolName) &&
      ctx.path === "webhook" &&
      (normalizedKey === "url" || normalizedKey === "webhookurl")
    ) {
      continue;
    }

    const metadataApiKey =
      normalizedKey === "apikey" &&
      nestedValue !== null &&
      typeof nestedValue === "object";
    if (restrictedFieldCategory(key) && !metadataApiKey) continue;

    if (ATTRIBUTE_PATH_LIST_FIELDS.has(key) && Array.isArray(nestedValue)) {
      sanitized[key] = nestedValue.filter(
        (item) =>
          typeof item !== "string" ||
          restrictedAttributePathCategory(item) === undefined
      );
      continue;
    }

    const path = ctx.path ? `${ctx.path}.${key}` : key;
    const sanitizedValue = sanitizeOutputValue(nestedValue, {
      toolName: ctx.toolName,
      path,
      key,
      textScanned: ctx.textScanned || isDataBearing(ctx.toolName, key),
    });
    if (sanitizedValue !== OMIT_SANITIZED_VALUE) {
      sanitized[key] = sanitizedValue;
    }
  }
  return sanitized;
}

function readSafeCompanies(value: unknown): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  const allowedFields = [
    "id",
    "name",
    "role",
    "url",
    "settingsUrl",
    "subscriptionUrl",
  ] as const;

  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") {
      return [];
    }

    const company: Record<string, string> = {};
    for (const field of allowedFields) {
      if (typeof record[field] === "string") company[field] = record[field];
    }
    return [company];
  });
}

function readSafeApiKeyPermissions(
  value: unknown
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const allowedFields = [
    "preset",
    "description",
    "fullAccess",
    "selectedScopeCount",
    "currentScopeCount",
    "scopes",
    "canDiscoverMarketingWork",
    "missingMarketingReadScopes",
    "canSendLive",
    "missingLiveDeliveryScopes",
    "liveDeliveryBlockedByRole",
    "manageUrl",
  ] as const;
  const safe: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (record[field] !== undefined) safe[field] = record[field];
  }
  return safe;
}

function projectOpenAiAccountResult(result: unknown): unknown {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return result;
  }

  const record = result as Record<string, unknown>;
  const projected: Record<string, unknown> = {
    success: record.success === true,
    companies: readSafeCompanies(record.companies),
    currentCompanyId:
      typeof record.currentCompanyId === "string"
        ? record.currentCompanyId
        : null,
    selectedCompanyId:
      typeof record.selectedCompanyId === "string"
        ? record.selectedCompanyId
        : null,
  };
  const permissions = readSafeApiKeyPermissions(record.apiKeyPermissions);
  if (permissions) projected.apiKeyPermissions = permissions;
  for (const field of ["message", "note"] as const) {
    if (typeof record[field] === "string") projected[field] = record[field];
  }
  return projected;
}

export function projectOpenAiToolResult(
  toolName: string,
  result: unknown
): unknown {
  const projected =
    toolName === "get_account" ? projectOpenAiAccountResult(result) : result;
  const sanitized = sanitizeOutputValue(projected, {
    toolName,
    path: "",
    textScanned: TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS.has(toolName),
  });
  return sanitized === OMIT_SANITIZED_VALUE ? null : sanitized;
}
