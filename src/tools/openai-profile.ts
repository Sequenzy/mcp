import type { JsonSchemaObject, Tool } from "../mcp-types.js";

import {
  appendOpenAiRestrictedDataNotice,
  createOpenAiAccountOutputSchema,
  createOpenAiFeedbackInputSchema,
} from "./openai-profile-schemas.js";

export { OPENAI_RESTRICTED_DATA_NOTICE } from "./openai-profile-schemas.js";

/**
 * High-risk or unsubmitted operations that must remain unavailable on the
 * OpenAI-reviewed surface even though they stay on standard MCP.
 */
export const OPENAI_EXCLUDED_TOOL_NAMES: ReadonlySet<string> = new Set([
  "connect_integration",
  "create_api_key",
  "create_webhook",
  "list_webhook_deliveries",
  "replay_webhook_delivery",
  "rotate_sequence_inbound_webhook_secret",
]);

type ProtectedInput = {
  name: string;
  scanAttributePath?: boolean;
  scanText?: boolean;
};

const PROTECTED_INPUTS_BY_TOOL: Readonly<
  Record<string, readonly ProtectedInput[]>
> = {
  add_subscriber: [
    { name: "attributes", scanText: true },
    { name: "customAttributes", scanText: true },
  ],
  create_subscriber_import: [{ name: "subscribers", scanText: true }],
  update_subscriber: [
    { name: "attributes", scanText: true },
    { name: "customAttributes", scanText: true },
  ],
  add_subscriber_note: [{ name: "body", scanText: true }],
  trigger_subscriber_event: [
    { name: "properties", scanText: true },
    { name: "attributes", scanText: true },
  ],
  trigger_subscriber_events: [
    { name: "events", scanText: true },
    { name: "attributes", scanText: true },
  ],
  import_subscriber_events: [{ name: "events", scanText: true }],
  search_subscribers: [
    { name: "attribute", scanAttributePath: true, scanText: true },
    { name: "attributeValue", scanText: true },
  ],
  create_segment: [
    { name: "filters", scanText: true },
    { name: "root", scanText: true },
  ],
  update_segment: [
    { name: "filters", scanText: true },
    { name: "root", scanText: true },
  ],
  create_campaign: [
    { name: "targetLists", scanText: true },
    { name: "campaignData", scanText: true },
    { name: "computedLists", scanText: true },
  ],
  update_campaign: [
    { name: "targetLists", scanText: true },
    { name: "campaignData", scanText: true },
    { name: "computedLists", scanText: true },
  ],
  schedule_campaign: [{ name: "targetLists", scanText: true }],
  create_campaign_goal: [
    { name: "attributePath", scanAttributePath: true },
    { name: "attributeValue", scanText: true },
    { name: "attributePreviousValue", scanText: true },
    { name: "eventPropertyName", scanAttributePath: true },
  ],
  update_campaign_goal: [
    { name: "attributePath", scanAttributePath: true },
    { name: "attributeValue", scanText: true },
    { name: "attributePreviousValue", scanText: true },
    { name: "eventPropertyName", scanAttributePath: true },
  ],
  create_sequence_goal: [
    { name: "attributePath", scanAttributePath: true },
    { name: "attributeValue", scanText: true },
    { name: "attributePreviousValue", scanText: true },
    { name: "eventPropertyName", scanAttributePath: true },
  ],
  update_sequence_goal: [
    { name: "attributePath", scanAttributePath: true },
    { name: "attributeValue", scanText: true },
    { name: "attributePreviousValue", scanText: true },
    { name: "eventPropertyName", scanAttributePath: true },
  ],
  render_email: [
    { name: "subscriber", scanText: true },
    { name: "variables", scanText: true },
  ],
  send_email: [{ name: "variables", scanText: true }],
  update_form: [{ name: "blocks" }],
  create_popup: [{ name: "blocks" }],
  update_popup: [{ name: "blocks" }],
  create_landing_page: [{ name: "content" }],
  update_landing_page: [{ name: "content" }],
  publish_landing_page: [{ name: "content" }],
  unpublish_landing_page: [{ name: "content" }],
  create_sequence: [
    { name: "enrollmentFieldPath", scanAttributePath: true },
    { name: "propertyFilters", scanText: true },
    { name: "stopCondition" },
    { name: "customIntegration", scanText: true },
    { name: "steps" },
  ],
  update_sequence: [
    { name: "enrollmentFieldPath", scanAttributePath: true },
    { name: "trigger", scanText: true },
    { name: "propertyFilters", scanText: true },
    { name: "customIntegration", scanText: true },
    { name: "branch" },
    { name: "insertSteps" },
    { name: "subscriberUpdateSteps" },
    { name: "stopCondition" },
  ],
  update_sequence_node: [{ name: "changes" }],
  update_sequence_nodes: [{ name: "updates" }],
  insert_sequence_step: [
    { name: "config", scanText: true },
    { name: "headers", scanText: true },
    { name: "body", scanText: true },
    { name: "fieldName", scanAttributePath: true },
    { name: "fieldValue", scanText: true },
    { name: "includeAttributes", scanAttributePath: true },
    { name: "branches", scanText: true },
    { name: "elseSteps", scanText: true },
  ],
  configure_sequence_inbound_webhook: [
    { name: "fieldMapping", scanText: true },
    { name: "samplePayload", scanText: true },
  ],
  submit_feedback: [
    { name: "message", scanText: true },
    { name: "context", scanText: true },
  ],
};

type RestrictedCategory =
  | "authentication credentials or secrets"
  | "biometric or genetic data"
  | "government identifiers"
  | "health or medical data"
  | "payment or financial-account data"
  | "precise geolocation"
  | "sensitive demographic data";

const RESTRICTED_FIELD_RULES: ReadonlyArray<{
  category: RestrictedCategory;
  pattern: RegExp;
}> = [
  {
    category: "government identifiers",
    pattern:
      /^(ssn|socialsecurity(number)?|governmentid|nationalid|passport(number)?|driverlicen[cs]e(number)?|taxid|tin)$/,
  },
  {
    category: "payment or financial-account data",
    pattern:
      /^(cardnumber|creditcard(number)?|debitcard(number)?|paymentcard(number)?|pan|cvv|cvc|cardsecuritycode|bankaccount(number)?|routingnumber|iban)$/,
  },
  {
    category: "health or medical data",
    pattern:
      /^(health|healthcondition|medical|medicalcondition|diagnosis|diagnoses|patientid|prescription|medication|treatment|healthinsurance|medicalrecord(number)?)$/,
  },
  {
    category: "biometric or genetic data",
    pattern:
      /^(biometric(s)?|fingerprint|faceprint|voiceprint|retinascan|genetic(data)?|dna)$/,
  },
  {
    category: "authentication credentials or secrets",
    pattern:
      /^(password|passcode|pin|otp|onetimepassword|mfacode|x?apikey|personalapikey|profileapitoken|x?accesstoken|refreshtoken|x?authtoken|x?authorization|credential(s)?|secret|token|clientsecret|secretkey|signingsecret|x?webhooksecret|webhooksignature|privatetoken|rawkey|plainkey)$/,
  },
  {
    category: "sensitive demographic data",
    pattern:
      /^(race|ethnicity|religion|religiousbelief|sexualorientation|genderidentity|politicalaffiliation|politicalopinion|unionmembership|disability)$/,
  },
  {
    category: "precise geolocation",
    pattern:
      /^(latitude|longitude|latlng|coordinates|gps|geolocation|preciselocation)$/,
  },
];

const RESTRICTED_TEXT_RULES: ReadonlyArray<{
  category: RestrictedCategory;
  pattern: RegExp;
}> = [
  {
    category: "government identifiers",
    pattern:
      /\b(?:ssn|social security(?: number)?|passport(?: number)?|government id)\s*[:#-]\s*\S+/i,
  },
  {
    category: "payment or financial-account data",
    pattern:
      /\b(?:card number|credit card|debit card|cvv|cvc|bank account|routing number|iban)\s*[:#-]\s*\S+/i,
  },
  {
    category: "health or medical data",
    pattern:
      /\b(?:diagnosis|medical condition|health condition|patient id|prescription|medication)\s*[:#-]\s*\S+/i,
  },
  {
    category: "biometric or genetic data",
    pattern:
      /\b(?:fingerprint|faceprint|voiceprint|retina scan|biometric|genetic data|dna)\s*[:#-]\s*\S+/i,
  },
  {
    category: "authentication credentials or secrets",
    pattern:
      /\b(?:password|passcode|one[- ]time password|otp|mfa code|api key|access token|refresh token|client secret|authorization)\s*[:=]\s*\S+/i,
  },
  {
    category: "authentication credentials or secrets",
    pattern:
      /\b(?:Bearer\s+[A-Za-z0-9._~+/=-]{12,}|seq_(?:user_)?[A-Za-z0-9_-]{12,}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,})\b/,
  },
];

const OMITTED_OUTPUT_FIELDS = new Set([
  "accountid",
  "debug",
  "debuginfo",
  "diagnostic",
  "diagnostics",
  "errordetails",
  "errorstack",
  "headers",
  "internaldetails",
  "internalid",
  "lasterror",
  "lastresponsebody",
  "lastsyncerror",
  "metadata",
  "payload",
  "rawdetails",
  "rawpayload",
  "rawrequest",
  "rawresponse",
  "requestbody",
  "requestheaders",
  "requestid",
  "responsebody",
  "responseheaders",
  "sessionid",
  "stack",
  "stacktrace",
  "traceid",
  "userid",
]);

const SECRET_ENDPOINT_TOOLS = new Set([
  "get_sequence_inbound_webhook",
  "configure_sequence_inbound_webhook",
]);

const OMIT_SANITIZED_VALUE = Symbol("omit-sanitized-value");

function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isOmittedOutputField(normalizedFieldName: string): boolean {
  if (OMITTED_OUTPUT_FIELDS.has(normalizedFieldName)) return true;
  return [
    "accountid",
    "internalid",
    "requestid",
    "sessionid",
    "traceid",
    "userid",
  ].some((suffix) => normalizedFieldName.endsWith(suffix));
}

function restrictedFieldCategory(
  fieldName: string
): RestrictedCategory | undefined {
  const normalized = normalizeFieldName(fieldName);
  return RESTRICTED_FIELD_RULES.find(({ pattern }) => pattern.test(normalized))
    ?.category;
}

function restrictedTextCategory(value: string): RestrictedCategory | undefined {
  return RESTRICTED_TEXT_RULES.find(({ pattern }) => pattern.test(value))
    ?.category;
}

function restrictedAttributePathCategory(
  value: string
): RestrictedCategory | undefined {
  const path = value.split(":", 1)[0]?.trim();
  if (!path) return undefined;

  for (const segment of path.split(/\.|\[|\]/).filter(Boolean)) {
    const category = restrictedFieldCategory(segment);
    if (category) return category;
  }
  return undefined;
}

function restrictedSemanticField(
  record: Record<string, unknown>,
  path: string
): { category: RestrictedCategory; path: string } | undefined {
  if (record.field === "attribute" && typeof record.value === "string") {
    const category = restrictedAttributePathCategory(record.value);
    if (category) return { category, path: `${path}.value` };
  }

  if (record.type === "field_changed" && typeof record.value === "string") {
    const category = restrictedAttributePathCategory(record.value);
    if (category) return { category, path: `${path}.value` };
  }

  for (const fieldName of ["fieldName", "attributeKey"] as const) {
    const fieldValue = record[fieldName];
    if (typeof fieldValue !== "string") continue;
    const category = restrictedAttributePathCategory(fieldValue);
    if (category) return { category, path: `${path}.${fieldName}` };
  }

  if (Array.isArray(record.customAttributeKeys)) {
    for (let index = 0; index < record.customAttributeKeys.length; index++) {
      const key = record.customAttributeKeys[index];
      if (typeof key !== "string") continue;
      const category = restrictedAttributePathCategory(key);
      if (category) {
        return { category, path: `${path}.customAttributeKeys[${index}]` };
      }
    }
  }

  if (record.kind === "form-field") {
    for (const fieldName of ["name", "label", "placeholder"] as const) {
      const fieldValue = record[fieldName];
      if (typeof fieldValue !== "string") continue;
      const category = restrictedFieldCategory(fieldValue);
      if (category) return { category, path: `${path}.${fieldName}` };
    }
  }

  if (
    /(?:^|\.)(?:customAttributeUpdates|customFields)\[\d+\]$/.test(path) &&
    typeof record.name === "string"
  ) {
    const category = restrictedFieldCategory(record.name);
    if (category) return { category, path: `${path}.name` };
  }

  return undefined;
}

function scanProtectedValue(
  value: unknown,
  path: string,
  scanText: boolean
): { category: RestrictedCategory; path: string } | undefined {
  if (typeof value === "string") {
    if (!scanText) return undefined;
    const category = restrictedTextCategory(value);
    return category ? { category, path } : undefined;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const issue = scanProtectedValue(
        value[index],
        `${path}[${index}]`,
        scanText
      );
      if (issue) return issue;
    }
    return undefined;
  }

  if (value === null || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const semanticIssue = restrictedSemanticField(record, path);
  if (semanticIssue) return semanticIssue;

  for (const [key, nestedValue] of Object.entries(record)) {
    const nestedPath = `${path}.${key}`;
    const category = restrictedFieldCategory(key);
    if (category) return { category, path: nestedPath };

    const issue = scanProtectedValue(nestedValue, nestedPath, scanText);
    if (issue) return issue;
  }

  return undefined;
}

function scanProtectedAttributePaths(
  value: unknown,
  path: string
): { category: RestrictedCategory; path: string } | undefined {
  if (typeof value === "string") {
    const category = restrictedAttributePathCategory(value);
    return category ? { category, path } : undefined;
  }

  if (!Array.isArray(value)) return undefined;
  for (let index = 0; index < value.length; index++) {
    const issue = scanProtectedAttributePaths(value[index], `${path}[${index}]`);
    if (issue) return issue;
  }
  return undefined;
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
    for (const { name } of PROTECTED_INPUTS_BY_TOOL[tool.name] ?? []) {
      const property = properties[name];
      if (property === null || typeof property !== "object") continue;
      properties[name] = appendOpenAiRestrictedDataNotice(
        property as JsonSchemaObject
      );
    }
    inputSchema = { ...inputSchema, properties };
  }

  const descriptionOverrides: Readonly<Record<string, string>> = {
    get_sequence_inbound_webhook:
      "Read the non-secret mapping, sample payload, setup status, and dashboard URL for a sequence inbound webhook. The credential-bearing endpoint URL is omitted from this OpenAI surface.",
    configure_sequence_inbound_webhook:
      "Create or update the mapping and sample attached to a sequence inbound_webhook trigger. The response omits the endpoint secret and credential-bearing URL; a human can copy it from the returned sequence dashboard URL.",
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
  for (const input of PROTECTED_INPUTS_BY_TOOL[toolName] ?? []) {
    const value = args[input.name];
    if (value === undefined) continue;
    if (input.scanAttributePath) {
      const issue = scanProtectedAttributePaths(
        value,
        `${toolName}.${input.name}`
      );
      if (issue) {
        throw new Error(
          `Restricted personal data was blocked in ${issue.path} (${issue.category}). Remove it and retry with ordinary business, contact, marketing, or commerce data only.`
        );
      }
    }
    const issue = scanProtectedValue(
      value,
      `${toolName}.${input.name}`,
      input.scanText === true
    );
    if (!issue) continue;

    throw new Error(
      `Restricted personal data was blocked in ${issue.path} (${issue.category}). Remove it and retry with ordinary business, contact, marketing, or commerce data only.`
    );
  }
}

const TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS = new Set([
  "add_subscriber_note",
  "get_conversation",
  "get_subscriber",
  "list_conversations",
  "list_poll_responses",
  "list_subscriber_notes",
  "reply_to_conversation",
]);

function shouldScanOutputText(toolName: string, path: string): boolean {
  if (TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS.has(toolName)) return true;
  return /(?:^|\.)(?:attributes|customAttributes|fieldMapping|properties|samplePayload)(?:\.|\[|$)/.test(
    path
  );
}

function sanitizeOutputValue(
  toolName: string,
  value: unknown,
  path: string
): unknown | typeof OMIT_SANITIZED_VALUE {
  if (typeof value === "string") {
    return shouldScanOutputText(toolName, path) && restrictedTextCategory(value)
      ? "[redacted restricted data]"
      : value;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const sanitized = sanitizeOutputValue(
        toolName,
        item,
        `${path}[${index}]`
      );
      return sanitized === OMIT_SANITIZED_VALUE ? [] : [sanitized];
    });
  }

  if (value === null || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (restrictedSemanticField(record, path)) return OMIT_SANITIZED_VALUE;

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(record)) {
    const normalizedKey = normalizeFieldName(key);
    if (isOmittedOutputField(normalizedKey)) continue;
    if (
      SECRET_ENDPOINT_TOOLS.has(toolName) &&
      path === "webhook" &&
      (normalizedKey === "url" || normalizedKey === "webhookurl")
    ) {
      continue;
    }

    const metadataApiKey =
      normalizedKey === "apikey" &&
      nestedValue !== null &&
      typeof nestedValue === "object";
    if (restrictedFieldCategory(key) && !metadataApiKey) continue;

    const nestedPath = path ? `${path}.${key}` : key;
    const sanitizedValue = sanitizeOutputValue(
      toolName,
      nestedValue,
      nestedPath
    );
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
  const sanitized = sanitizeOutputValue(toolName, projected, "");
  return sanitized === OMIT_SANITIZED_VALUE ? null : sanitized;
}
