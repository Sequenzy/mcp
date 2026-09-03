/**
 * Data tables for the OpenAI-reviewed MCP profile.
 *
 * What this profile guarantees, and what it does not:
 *
 * - It rejects and redacts restricted personal data that is *recognizable by
 *   shape*: field names built from English tokens (`passport_id`,
 *   `user.ssn`, `api_secret`), labelled prose (`Diagnosis: ...`), known
 *   credential shapes (Sequenzy keys, JWTs, bearer tokens), coordinate
 *   pairs, and credential-bearing URLs anywhere in a string.
 * - Structural rules are keyed by field name and applied recursively to every
 *   argument of every tool, so a new nesting or a new tool does not need a
 *   registry entry to be covered.
 * - It does not attempt to understand free prose without a label, non-English
 *   field names, or a client that deliberately obfuscates values. Those are
 *   covered by the published usage restriction, not by this filter.
 */

export type RestrictedCategory =
  | "authentication credentials or secrets"
  | "biometric or genetic data"
  | "government identifiers"
  | "health or medical data"
  | "payment or financial-account data"
  | "precise geolocation"
  | "sensitive demographic data";

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

/**
 * Single words that mark a field as restricted wherever they appear in a
 * compound name (`passport_id`, `ssn_number`, `user_password`). Ambiguous
 * words such as `pin`, `race`, `health`, `long`, or `fingerprint` are
 * deliberately absent: they only match as an exact field name below, so
 * `pin_code`, `race_id`, `health_score`, and `device_fingerprint` stay usable.
 */
export const STRONG_FIELD_TOKENS: Readonly<Record<string, RestrictedCategory>> =
  {
    ssn: "government identifiers",
    passport: "government identifiers",
    cvv: "payment or financial-account data",
    cvc: "payment or financial-account data",
    iban: "payment or financial-account data",
    diagnosis: "health or medical data",
    diagnoses: "health or medical data",
    prescription: "health or medical data",
    prescriptions: "health or medical data",
    medication: "health or medical data",
    medications: "health or medical data",
    patient: "health or medical data",
    biometric: "biometric or genetic data",
    biometrics: "biometric or genetic data",
    faceprint: "biometric or genetic data",
    voiceprint: "biometric or genetic data",
    genetic: "biometric or genetic data",
    genome: "biometric or genetic data",
    password: "authentication credentials or secrets",
    passwords: "authentication credentials or secrets",
    passwd: "authentication credentials or secrets",
    pwd: "authentication credentials or secrets",
    passcode: "authentication credentials or secrets",
    secret: "authentication credentials or secrets",
    secrets: "authentication credentials or secrets",
    token: "authentication credentials or secrets",
    otp: "authentication credentials or secrets",
    credential: "authentication credentials or secrets",
    credentials: "authentication credentials or secrets",
    ethnicity: "sensitive demographic data",
    religion: "sensitive demographic data",
    religious: "sensitive demographic data",
    sexual: "sensitive demographic data",
    political: "sensitive demographic data",
    disability: "sensitive demographic data",
    disabilities: "sensitive demographic data",
    latitude: "precise geolocation",
    longitude: "precise geolocation",
    lat: "precise geolocation",
    lng: "precise geolocation",
    lon: "precise geolocation",
    coordinates: "precise geolocation",
    coords: "precise geolocation",
    geolocation: "precise geolocation",
  };

/**
 * Exact matches against a whole normalized field name, a path segment, or an
 * adjacent pair/triple of words inside a compound name.
 */
export const RESTRICTED_FIELD_RULES: ReadonlyArray<{
  category: RestrictedCategory;
  pattern: RegExp;
}> = [
  {
    category: "government identifiers",
    pattern:
      /^(ssn|socialsecurity(number)?|governmentid(number)?|nationalid(number)?|passport(number|id)?|drivers?licen[cs]e(number)?|taxid|taxidentification(number)?|tin)$/,
  },
  {
    category: "payment or financial-account data",
    pattern:
      /^(cardnumber|creditcard(number)?|debitcard(number)?|paymentcard(number)?|pan|cvv|cvc|cardsecuritycode|bankaccount(number)?|routingnumber|iban)$/,
  },
  {
    category: "health or medical data",
    pattern:
      /^(health|healthcondition|medical|medicalcondition|medicalhistory|mentalhealth|diagnosis|diagnoses|patientid|prescription|medication|treatment|healthinsurance|healthrecord|medicalrecord(number)?|bloodtype)$/,
  },
  {
    category: "biometric or genetic data",
    pattern:
      /^(biometric(s)?|fingerprint|faceprint|voiceprint|retinascan|genetic(data)?|dna)$/,
  },
  {
    category: "authentication credentials or secrets",
    pattern:
      /^(password|passcode|pin|otp|onetimepassword|mfacode|x?apikey|apisecret|personalapikey|profileapitoken|x?accesstoken|refreshtoken|x?authtoken|x?authorization|credential(s)?|secret|token|clientsecret|secretkey|privatekey|signingkey|signingsecret|x?webhooksecret|webhooksignature|privatetoken|rawkey|plainkey)$/,
  },
  {
    category: "sensitive demographic data",
    pattern:
      /^(race|ethnicity|religion|religiousbelief|sexualorientation|genderidentity|politicalaffiliation|politicalopinion|unionmember(ship)?|disability)$/,
  },
  {
    category: "precise geolocation",
    pattern:
      /^(lat|lng|lon|long|latitude|longitude|latlng|latlon|coordinates|coords|geocoordinates|gpscoordinates|geopoint|gps|geolocation|preciselocation)$/,
  },
];

/**
 * Trailing words that turn a credential or payment compound into harmless
 * metadata about it: `apiKeyId`, `tokenExpiresAt`, `creditCardBrand`,
 * `cardNumberMasked`. Identifier, health, biometric, demographic, and
 * geolocation names get no such exemption because `passport_id` and
 * `patient_id` are the restricted value itself.
 */
export const METADATA_SUFFIXES_BY_CATEGORY: Partial<
  Record<RestrictedCategory, ReadonlySet<string>>
> = {
  "authentication credentials or secrets": new Set([
    "id",
    "ids",
    "name",
    "type",
    "prefix",
    "count",
    "at",
    "enabled",
    "required",
    "status",
    "hint",
    "label",
    "url",
    "length",
    "expires",
    "expiry",
    "expiration",
    "updated",
    "created",
    "rotated",
    "set",
    "exists",
    "present",
    "verified",
    "valid",
    "masked",
    "mask",
    "policy",
    "strength",
    "permission",
    "permissions",
    "scope",
    "scopes",
    "preset",
  ]),
  "payment or financial-account data": new Set([
    "brand",
    "type",
    "last4",
    "last",
    "network",
    "funding",
    "country",
    "masked",
    "mask",
  ]),
};

/**
 * Leading words that make a credential compound a flag or a cursor rather than
 * a secret: `hasPassword`, `isTokenValid`, `nextToken`, `pageToken`.
 */
export const CREDENTIAL_FLAG_PREFIXES: ReadonlySet<string> = new Set([
  "has",
  "is",
  "requires",
  "needs",
  "can",
  "should",
  "allow",
  "allows",
  "uses",
  "with",
  "without",
  "next",
  "page",
  "continuation",
  "pagination",
  "cursor",
  "prev",
  "previous",
]);

export const RESTRICTED_TEXT_RULES: ReadonlyArray<{
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
  {
    category: "sensitive demographic data",
    pattern:
      /\b(?:race|ethnicity|religion|religious belief|sexual orientation|gender identity|political (?:affiliation|opinion|party)|union membership|disability)\s*[:#-]\s*\S+/i,
  },
  {
    category: "precise geolocation",
    pattern:
      /\b(?:latitude|longitude|lat|lng|lon|gps(?: coordinates)?|coordinates|coords|geolocation|precise location)\s*[:#=-]\s*-?\d/i,
  },
  {
    // A bare decimal coordinate pair such as `38.7223, -9.1393`. Four or more
    // decimals keeps ordinary prices and measurements out of this rule.
    category: "precise geolocation",
    pattern:
      /(?:^|[^\d.-])-?(?:90(?:\.0+)?|[1-8]?\d\.\d{4,})\s*,\s*-?(?:180(?:\.0+)?|1[0-7]\d\.\d{4,}|[1-9]?\d\.\d{4,})(?![\d.])/,
  },
];

/**
 * The OpenAI feedback schema promises generalized feedback with no subscriber
 * or account identifiers, so feedback text is also checked for the identifier
 * shapes Sequenzy uses: email addresses, cuid2 resource IDs, and UUIDs.
 * Standard MCP keeps its structured `resourceIds` field for that purpose.
 */
export const FEEDBACK_IDENTIFIER_RULES: ReadonlyArray<{
  label: string;
  pattern: RegExp;
}> = [
  {
    label: "an email address",
    pattern:
      /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/,
  },
  {
    label: "a UUID",
    pattern:
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
  },
  { label: "a resource ID", pattern: /\b[a-z][a-z0-9]{23,}\b/ },
];

/**
 * Output fields removed wholesale: diagnostics, raw transport payloads, and
 * internal identity. `providerAccountId` and similar provider-side IDs are
 * deliberately not matched by the suffix list.
 */
export const OMITTED_OUTPUT_FIELDS: ReadonlySet<string> = new Set([
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

export const OMITTED_OUTPUT_FIELD_SUFFIXES: readonly string[] = [
  "internalid",
  "requestid",
  "sessionid",
  "traceid",
  "userid",
];

/**
 * Fields whose string value names a stored attribute or event property. On
 * input the path is checked; on output a record carrying a restricted path is
 * removed entirely. `path` counts only inside `propertyFilters`, and `value`
 * only on attribute conditions, so ordinary URL paths and values stay intact.
 */
export const ATTRIBUTE_PATH_FIELDS: ReadonlySet<string> = new Set([
  "attribute",
  "attributeKey",
  "attributePath",
  "enrollmentFieldPath",
  "entryFieldPath",
  "eventFieldPath",
  "eventPropertyName",
  "fieldName",
  "fieldPath",
]);

/**
 * Fields whose array value lists attribute or event-property names. On input
 * every item is checked; on output restricted items are filtered out.
 */
export const ATTRIBUTE_PATH_LIST_FIELDS: ReadonlySet<string> = new Set([
  "customAttributeKeys",
  "entryEventPropertyKeys",
  "eventPropertyKeys",
  "fieldSnapshotKeys",
  "includeAttributes",
]);

/**
 * Records under these parents name a stored field with `name` or `key`
 * (`customAttributeUpdates[].name`, `customFields[].name`,
 * `outputFields[].key`).
 */
export const NAMED_FIELD_RECORD_PARENTS: Readonly<Record<string, string>> = {
  customAttributeUpdates: "name",
  customFields: "name",
  outputFields: "key",
};

/**
 * Fields that carry per-contact data rather than authored copy. Every string
 * underneath is checked against the labelled-prose rules on input and
 * redacted on output. Campaign, template, block, and step copy is not listed,
 * so a subject line about "Medical condition: awareness month" stays usable.
 */
export const DATA_BEARING_FIELDS: ReadonlySet<string> = new Set([
  "attributePreviousValue",
  "attributeValue",
  "attributes",
  "body",
  "bodyHtml",
  "bodyText",
  "campaignData",
  "computedLists",
  "customAttributes",
  "customIntegration",
  "events",
  "fieldMapping",
  "fieldValue",
  "fieldValues",
  "filters",
  "headers",
  "properties",
  "propertyFilters",
  "reason",
  "root",
  "samplePayload",
  "subscriber",
  "subscribers",
  "targetLists",
  "trigger",
  "variables",
]);

/** Per-tool additions to {@link DATA_BEARING_FIELDS}. */
export const DATA_BEARING_FIELDS_BY_TOOL: Readonly<
  Record<string, ReadonlySet<string>>
> = {
  reply_to_conversation: new Set(["subject"]),
  submit_feedback: new Set(["context", "message"]),
};

/** Tools whose whole result is individual free text. */
export const TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS: ReadonlySet<string> = new Set([
  "add_subscriber_note",
  "get_conversation",
  "get_subscriber",
  "list_conversations",
  "list_poll_responses",
  "list_subscriber_notes",
  "reply_to_conversation",
]);

/**
 * Top-level input properties that receive the restricted-data notice in the
 * published schema. Enforcement does not depend on this list; it only decides
 * where the notice is shown.
 */
export const NOTICE_INPUT_FIELDS: ReadonlySet<string> = new Set([
  ...DATA_BEARING_FIELDS,
  ...ATTRIBUTE_PATH_FIELDS,
  ...ATTRIBUTE_PATH_LIST_FIELDS,
  "blocks",
  "branch",
  "branches",
  "changes",
  "config",
  "content",
  "elseSteps",
  "emails",
  "insertSteps",
  "outputFields",
  "steps",
  "stopCondition",
  "subscriberUpdateSteps",
  "updates",
  "url",
  "variants",
]);

export const SECRET_ENDPOINT_TOOLS: ReadonlySet<string> = new Set([
  "get_sequence_inbound_webhook",
  "configure_sequence_inbound_webhook",
]);

/**
 * Landing-page tools return `previewUrl`, a Sequenzy-signed unlisted link
 * under `/lp/preview/` that the tools exist to hand back. Only that exact
 * shape is exempt from output URL redaction.
 */
export const LANDING_PAGE_PREVIEW_TOOLS: ReadonlySet<string> = new Set([
  "create_landing_page",
  "duplicate_landing_page",
  "get_landing_page",
  "list_landing_pages",
  "publish_landing_page",
  "render_landing_page",
  "unpublish_landing_page",
  "update_landing_page",
]);

export const LANDING_PAGE_PREVIEW_PATH_PREFIX = "/lp/preview/";

export const REDACTED_VALUE = "[redacted restricted data]";
