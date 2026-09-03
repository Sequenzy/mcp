import {
  ATTRIBUTE_PATH_FIELDS,
  CREDENTIAL_FLAG_PREFIXES,
  METADATA_SUFFIXES_BY_CATEGORY,
  NAMED_FIELD_RECORD_PARENTS,
  OMITTED_OUTPUT_FIELD_SUFFIXES,
  OMITTED_OUTPUT_FIELDS,
  REDACTED_VALUE,
  RESTRICTED_FIELD_RULES,
  RESTRICTED_TEXT_RULES,
  STRONG_FIELD_TOKENS,
  type RestrictedCategory,
} from "./openai-profile-rules.js";

export type RestrictedIssue = { category: RestrictedCategory; path: string };

const CREDENTIALS: RestrictedCategory = "authentication credentials or secrets";

export function normalizeFieldName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function isOmittedOutputField(fieldName: string): boolean {
  const normalized = normalizeFieldName(fieldName);
  if (OMITTED_OUTPUT_FIELDS.has(normalized)) return true;
  return OMITTED_OUTPUT_FIELD_SUFFIXES.some((suffix) =>
    normalized.endsWith(suffix)
  );
}

function exactFieldCategory(
  normalized: string
): RestrictedCategory | undefined {
  return RESTRICTED_FIELD_RULES.find(({ pattern }) => pattern.test(normalized))
    ?.category;
}

/**
 * Split one field name into lowercase words on camelCase, underscore, hyphen,
 * space, and letter/digit boundaries: `passportId` and `passport_id` both
 * become `["passport", "id"]`, `ssn4` becomes `["ssn", "4"]`.
 */
export function fieldNameWords(segment: string): string[] {
  return segment
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Match a compound name by its words: a strong token anywhere, or an exact
 * rule matching two or three adjacent words. A match that is followed by a
 * metadata suffix (`apiKeyId`, `creditCardBrand`) or led by a flag prefix
 * (`hasPassword`, `nextToken`) is not restricted.
 */
function compoundFieldCategory(
  words: readonly string[]
): RestrictedCategory | undefined {
  if (words.length < 2) return undefined;
  const first = words[0] ?? "";
  const last = words[words.length - 1] ?? "";

  const accept = (
    category: RestrictedCategory,
    endIndex: number
  ): RestrictedCategory | undefined => {
    if (category === CREDENTIALS && CREDENTIAL_FLAG_PREFIXES.has(first)) {
      return undefined;
    }
    if (endIndex === words.length - 1) return category;
    return METADATA_SUFFIXES_BY_CATEGORY[category]?.has(last)
      ? undefined
      : category;
  };

  for (let index = 0; index < words.length; index++) {
    const word = words[index] ?? "";
    const strong = STRONG_FIELD_TOKENS[word];
    if (strong) {
      const category = accept(strong, index);
      if (category) return category;
    }
    for (const span of [2, 3]) {
      if (index + span > words.length) continue;
      const joined = words.slice(index, index + span).join("");
      const exact = exactFieldCategory(joined);
      if (!exact) continue;
      const category = accept(exact, index + span - 1);
      if (category) return category;
    }
  }
  return undefined;
}

/**
 * Field names may be attribute paths (`profile.ssn`, `billing[cardNumber]`)
 * or compound names (`passport_id`, `userPassword`). The whole name, every
 * path segment, and the words inside each segment are all checked.
 */
export function restrictedFieldCategory(
  fieldName: string
): RestrictedCategory | undefined {
  const whole = exactFieldCategory(normalizeFieldName(fieldName));
  if (whole) return whole;

  for (const segment of fieldName.split(/\.|\[|\]/)) {
    if (!segment) continue;
    const category =
      exactFieldCategory(normalizeFieldName(segment)) ??
      compoundFieldCategory(fieldNameWords(segment));
    if (category) return category;
  }
  return undefined;
}

export function restrictedTextCategory(
  value: string
): RestrictedCategory | undefined {
  return RESTRICTED_TEXT_RULES.find(({ pattern }) => pattern.test(value))
    ?.category;
}

export function restrictedAttributePathCategory(
  value: string
): RestrictedCategory | undefined {
  const path = value.split(":", 1)[0]?.trim();
  return path ? restrictedFieldCategory(path) : undefined;
}

/**
 * Authored copy is allowed to discuss restricted topics, but merge tags are
 * data selectors. Inspect only the expression inside a tag so ordinary prose
 * such as "Medical condition: awareness month" remains usable.
 */
export function restrictedMergeTagCategory(
  value: string
): RestrictedCategory | undefined {
  const expressions = value.matchAll(/\{\{\{?\s*([^{}]+?)\s*\}?\}\}/g);
  for (const match of expressions) {
    const expression = match[1]?.split("|", 1)[0]?.trim();
    if (!expression) continue;
    const attributePath = expression.replace(/^html\./i, "");
    const category = restrictedAttributePathCategory(attributePath);
    if (category) return category;
  }
  return undefined;
}

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function isCredentialUrlComponent(value: string): boolean {
  if (restrictedFieldCategory(value) === CREDENTIALS) return true;

  const normalized = normalizeFieldName(value);
  if (["auth", "code", "key", "sig", "signature"].includes(normalized)) {
    return true;
  }
  return [
    "accessid",
    "accesskeyid",
    "credential",
    "securitytoken",
    "signature",
  ].some((suffix) => normalized.endsWith(suffix));
}

/**
 * A credential can ride in any URL component: userinfo, a query or fragment
 * parameter name, a parameter value (a raw token or a nested URL), or a path
 * such as `/access_token/<secret>`. Path segments are only treated as a
 * credential when a credential-named segment is followed by a value, so
 * `/oauth/token` and `/health` endpoints stay usable.
 */
export function restrictedUrlCategory(
  value: string,
  depth = 0
): RestrictedCategory | undefined {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return undefined;
  }
  if (url.username || url.password) return CREDENTIALS;

  const parameterSets = [
    url.searchParams,
    new URLSearchParams(url.hash.replace(/^#/, "")),
  ];
  for (const parameters of parameterSets) {
    for (const [key, parameterValue] of parameters) {
      if (isCredentialUrlComponent(key)) return CREDENTIALS;
      const keyCategory = restrictedFieldCategory(key);
      if (keyCategory) return keyCategory;
      const valueCategory = restrictedTextCategory(parameterValue);
      if (valueCategory) return valueCategory;
      if (depth < 2) {
        const nestedCategory = restrictedUrlCategory(parameterValue, depth + 1);
        if (nestedCategory) return nestedCategory;
      }
    }
  }

  const segments = url.pathname.split("/").filter(Boolean);
  for (let index = 0; index < segments.length - 1; index++) {
    if (
      isCredentialUrlComponent(safeDecodeUriComponent(segments[index] ?? ""))
    ) {
      return CREDENTIALS;
    }
  }
  return restrictedTextCategory(safeDecodeUriComponent(url.pathname));
}

const EMBEDDED_URL_PATTERN = /https?:\/\/[^\s<>"'`)\]]+/g;

/**
 * URLs are checked wherever they appear, including inside HTML attributes and
 * prose, so `<a href="https://x/?access_token=...">` cannot slip past a
 * whole-string check. HTML-escaped ampersands are unescaped first.
 */
function embeddedUrlCandidate(match: string): string {
  return match.replace(/[.,;:!?]+$/, "").replace(/&amp;/g, "&");
}

export function restrictedEmbeddedUrlCategory(
  text: string
): RestrictedCategory | undefined {
  for (const match of text.match(EMBEDDED_URL_PATTERN) ?? []) {
    const category = restrictedUrlCategory(embeddedUrlCandidate(match));
    if (category) return category;
  }
  return undefined;
}

export function redactRestrictedUrls(text: string): string {
  return text.replace(EMBEDDED_URL_PATTERN, (match) => {
    const trailing = match.match(/[.,;:!?]+$/)?.[0] ?? "";
    return restrictedUrlCategory(embeddedUrlCandidate(match))
      ? `${REDACTED_VALUE}${trailing}`
      : match;
  });
}

/**
 * Records that name a stored field through a well-known property. `parentKey`
 * is the property the record sits under, so `customAttributeUpdates[].name`
 * and `propertyFilters[].path` are recognized at any depth.
 */
export function restrictedRecordIssue(
  record: Record<string, unknown>,
  path: string,
  parentKey: string | undefined
): RestrictedIssue | undefined {
  const attributePath = (
    fieldName: string,
    value: unknown
  ): RestrictedIssue | undefined => {
    if (typeof value !== "string") return undefined;
    const category = restrictedAttributePathCategory(value);
    return category ? { category, path: `${path}.${fieldName}` } : undefined;
  };
  const fieldName = (
    name: string,
    value: unknown
  ): RestrictedIssue | undefined => {
    if (typeof value !== "string") return undefined;
    const category = restrictedFieldCategory(value);
    return category ? { category, path: `${path}.${name}` } : undefined;
  };

  if (record.field === "attribute" || record.type === "field_changed") {
    const issue = attributePath("value", record.value);
    if (issue) return issue;
  }
  if (record.type === "repeat") {
    const issue = attributePath("source", record.source);
    if (issue) return issue;
  }
  for (const key of ATTRIBUTE_PATH_FIELDS) {
    const issue = attributePath(key, record[key]);
    if (issue) return issue;
  }
  if (parentKey === "propertyFilters") {
    const issue = attributePath("path", record.path);
    if (issue) return issue;
  }
  if (record.kind === "form-field") {
    for (const key of ["name", "label", "placeholder"]) {
      const issue = fieldName(key, record[key]);
      if (issue) return issue;
    }
  }
  const namedField = parentKey
    ? NAMED_FIELD_RECORD_PARENTS[parentKey]
    : undefined;
  if (namedField) {
    const issue = fieldName(namedField, record[namedField]);
    if (issue) return issue;
  }
  return undefined;
}
