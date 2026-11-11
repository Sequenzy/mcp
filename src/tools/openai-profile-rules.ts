import { OPENAI_SIZE_TEXT_REWRITES } from "./openai-size-rewrites.js";

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
  // Not yet submitted for OpenAI app review.
  "open_sequenzy",
  "connect_integration",
  "create_api_key",
  // Accept storage or warehouse credentials.
  "create_data_export",
  "update_data_export",
  "create_warehouse_connection",
  "update_warehouse_connection",
  // Returns arbitrary rows from the customer's warehouse, unprojected.
  "preview_warehouse_query",
  "create_webhook",
  // Geofences carry place coordinates; the connector forbids precise
  // geolocation, so they stay on standard MCP and the dashboard.
  "list_geofences",
  "get_geofence",
  "create_geofence",
  "update_geofence",
  "delete_geofence",
  "import_geofences",
  "list_webhook_deliveries",
  // Unprojected user-submitted payloads/CSV are available on standard MCP only.
  "list_capture_submissions",
  "replay_webhook_delivery",
  "rotate_sequence_inbound_webhook_secret",
  // API key lifecycle stays in the dashboard. The ChatGPT connection is itself
  // a key, so revoking or rescoping here could cut off the session mid-task.
  "list_api_keys",
  "update_api_key",
  "revoke_api_key",
  "delete_api_key",
  "request_api_key_handoff",
  // Take another provider's API key, or contact CSV files, as input.
  "create_push_import",
  "add_push_import_rows",
  // Take customer private keys (APNs .p8, Firebase service account) as input.
  "set_apns_credentials",
  "set_fcm_credentials",
  // Compatibility alias of add_sending_domain.
  "add_website",
  // OpenAI's scan treats free-form feedback to Sequenzy as analytics
  // collection rather than a user-requested operation.
  "submit_feedback",
  // An app-backend call whose required device token is a credential this
  // surface rejects, so it could never succeed here.
  "register_push_device",
]);

/**
 * Names the OpenAI-reviewed surface uses in place of legacy names its tool
 * scan reported as unclear. Standard MCP keeps the original names; calls are
 * mapped back before validation, handling, and projection.
 */
export const OPENAI_TOOL_RENAMES: Readonly<Record<string, string>> = {
  list_websites: "list_sending_domains",
  check_website: "get_sending_domain",
  // It creates a draft; nothing is sent until the draft is scheduled.
  resend_campaign_to_non_openers: "create_non_opener_resend_draft",
  // It also sets the brand prefix and link shortening, not just the label.
  update_sms_number_label: "update_sms_number_settings",
};

/**
 * Input fields held at the definition OpenAI approved. Any change to a
 * published tool's definition holds that tool back until OpenAI reviews it
 * again, so these fields keep the approved text until the next plugin
 * submission includes the newer wording (Soft and Blocked bounce types, and
 * the paused enrollment status).
 */
export const OPENAI_APPROVED_INPUT_PROPERTIES: Readonly<
  Record<string, Readonly<Record<string, Readonly<Record<string, unknown>>>>>
> = {
  list_email_sends: {
    bounceType: {
      type: "string",
      description: "Bounce type: Permanent or Transient.",
    },
  },
  list_sequence_enrollments: {
    status: {
      type: "array",
      items: {
        type: "string",
        enum: ["active", "waiting", "completed", "failed", "cancelled"],
      },
      description:
        "Enrollment statuses to include. Defaults to active and waiting, which is every contact still moving through the sequence.",
    },
  },
};

/**
 * Arguments filled in on the OpenAI surface when the caller omits them, so a
 * call does what the approved definition above says. The API's default
 * enrollment statuses also include paused.
 */
export const OPENAI_DEFAULT_ARGUMENTS: Readonly<
  Record<string, Readonly<Record<string, unknown>>>
> = {
  list_sequence_enrollments: { status: ["active", "waiting"] },
};

export interface OpenAiSplitTool {
  name: string;
  action: string;
  description: string;
  properties: readonly string[];
  required: readonly string[];
  /** Field descriptions worded for this single operation. */
  propertyDescriptions: Readonly<Record<string, string>>;
}

const REVISION_NOTE =
  "Edits are checked against graphRevision from get_sequence, so changes made in the meantime are never overwritten.";
const CONFIRM_NOTE =
  "For an active sequence, set confirmStructuralChange once the user approves the change.";
const CONFIRM_FIELD =
  "Set to true for an active sequence after the user approves this change.";
const AFTER_FIELD =
  "Place it right after this step. That step must have a single next step. Use either afterNodeId or beforeNodeId.";
const BEFORE_FIELD =
  "Place it right before this step, so every path into that step passes through it first; useful for placing a step below a branch. Use either afterNodeId or beforeNodeId.";

/**
 * Single-operation tools the OpenAI-reviewed surface lists in place of a
 * multi-operation tool, so each operation is exposed and reviewed on its own.
 * Each fixes the source tool's `action`, keeps only the fields that operation
 * uses, and runs the source tool's handler.
 */
export const OPENAI_SPLIT_TOOLS: Readonly<
  Record<string, readonly OpenAiSplitTool[]>
> = {
  edit_sequence_graph: [
    {
      name: "move_sequence_step",
      action: "move_node",
      description: `Reorder a sequence by moving one step so it runs right after or before another step. Branch steps themselves can't be moved. ${REVISION_NOTE} ${CONFIRM_NOTE}`,
      properties: [
        "companyId",
        "sequenceId",
        "graphRevision",
        "nodeId",
        "afterNodeId",
        "beforeNodeId",
        "confirmStructuralChange",
      ],
      required: ["sequenceId", "graphRevision", "nodeId"],
      propertyDescriptions: {
        nodeId: "The step to move.",
        afterNodeId: AFTER_FIELD,
        beforeNodeId: BEFORE_FIELD,
        confirmStructuralChange: CONFIRM_FIELD,
      },
    },
    {
      name: "duplicate_sequence_step",
      action: "duplicate_node",
      description: `Copy an existing sequence step, for example to reuse an email, and place the copy right after or before another step. Each call adds one copy. ${REVISION_NOTE} ${CONFIRM_NOTE}`,
      properties: [
        "companyId",
        "sequenceId",
        "graphRevision",
        "nodeId",
        "afterNodeId",
        "beforeNodeId",
        "confirmStructuralChange",
      ],
      required: ["sequenceId", "graphRevision", "nodeId"],
      propertyDescriptions: {
        nodeId: "The step to copy.",
        afterNodeId: AFTER_FIELD,
        beforeNodeId: BEFORE_FIELD,
        confirmStructuralChange: CONFIRM_FIELD,
      },
    },
    {
      name: "delete_sequence_step",
      action: "delete_node",
      description: `Remove one step from a sequence and join the steps before and after it. Contacts currently waiting at that step continue to the next step right away, or finish the sequence if there is none; the result shows how many moved on or finished. ${REVISION_NOTE} ${CONFIRM_NOTE}`,
      properties: [
        "companyId",
        "sequenceId",
        "graphRevision",
        "nodeId",
        "edges",
        "confirmStructuralChange",
      ],
      required: ["sequenceId", "graphRevision", "nodeId"],
      propertyDescriptions: {
        nodeId: "The step to remove.",
        edges:
          "Only when removing a branch step: the complete updated connections, starting from get_sequence.sequence.edges. Keep each branch connection's condition.branchId and leave out connections to the removed step.",
        confirmStructuralChange: CONFIRM_FIELD,
      },
    },
    {
      name: "replace_sequence_paths",
      action: "replace_edges",
      description: `Rewire which steps follow which in a sequence, including branch paths, by passing the complete updated list of connections. ${REVISION_NOTE} ${CONFIRM_NOTE}`,
      properties: [
        "companyId",
        "sequenceId",
        "graphRevision",
        "edges",
        "confirmStructuralChange",
      ],
      required: ["sequenceId", "graphRevision", "edges"],
      propertyDescriptions: {
        edges:
          "The complete updated connections between steps, starting from get_sequence.sequence.edges. Keep each branch connection's condition.branchId and leave out connections to removed steps.",
        confirmStructuralChange: CONFIRM_FIELD,
      },
    },
  ],
};

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
  /**
   * Matches the shape of the value itself rather than a label in prose, so it
   * also applies to short fields such as names and tags (see
   * SHAPE_SCANNED_FIELDS), where labels like "race-day" are ordinary words.
   */
  shape?: true;
}> = [
  {
    category: "government identifiers",
    pattern:
      /\b(?:ssn|social security(?: number)?|passport(?: number)?|government id)\s*[:#-]\s*\S+/i,
  },
  {
    // A labelled ID-shaped value without a separator, such as
    // "SSN 123-45-6789" or "passport no. X1234567". At least six digits keep
    // product names and topics ("Honda Passport 2025", "Social Security 2.5%
    // COLA") out.
    category: "government identifiers",
    pattern:
      /\b(?:ssn|social security(?:\s+(?:number|no\.?))?|passport(?:\s+(?:number|no\.?))?|government id)(?![a-z0-9])[\s:#-]*[a-z]{0,2}(?:\d[\s-]?){6,}/i,
    shape: true,
  },
  {
    // A bare US Social Security number (3-2-4 digits) under any field name.
    category: "government identifiers",
    pattern: /(?<![\w-])\d{3}-\d{2}-\d{4}(?![\w-])/,
    shape: true,
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
    shape: true,
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
  // Links to the subscription and upgrade page are not offered in ChatGPT.
  "subscriptionurl",
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
 * (`attributes[].key` from list_subscriber_attributes,
 * `customAttributeUpdates[].name`, `customFields[].name`,
 * `outputFields[].key`).
 */
export const NAMED_FIELD_RECORD_PARENTS: Readonly<Record<string, string>> = {
  attributes: "key",
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
  // Inbound webhook mapping check: repeats fieldMapping paths as values.
  "mappingCheck",
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

/**
 * Short contact fields that hold ordinary words ("race-day-2026",
 * "Race-Smith"), so only value-shape rules apply to them, wherever they sit.
 */
export const SHAPE_SCANNED_FIELDS: ReadonlySet<string> = new Set([
  "addTags",
  "firstName",
  "lastName",
  "removeTags",
  "tags",
]);

/**
 * Free-form containers whose keys are caller-chosen; an `id` inside them is
 * data, not an identifier, so it keeps the full scan.
 */
export const FREE_FORM_FIELDS: ReadonlySet<string> = new Set([
  "attributes",
  "campaignData",
  "customAttributes",
  "customVariables",
  "events",
  "fieldValues",
  "headers",
  "properties",
  "samplePayload",
  "variables",
]);

/**
 * Identifier keys hold opaque IDs that other tools take back as input, so
 * their values are not treated as free text under a data-bearing key, except
 * inside FREE_FORM_FIELDS, where an `id` is just caller data.
 */
export const IDENTIFIER_FIELDS: ReadonlySet<string> = new Set([
  "externalId",
  "id",
]);

/** Per-tool additions to {@link DATA_BEARING_FIELDS}. */
export const DATA_BEARING_FIELDS_BY_TOOL: Readonly<
  Record<string, ReadonlySet<string>>
> = {
  reply_to_conversation: new Set(["subject"]),
  start_sequence_test_run: new Set(["customVariables"]),
  // B2B account tools return member identity fields (names, emails) under
  // these containers, so they get the same scanning as `subscriber`.
  list_accounts: new Set(["accounts"]),
  get_account_by_external_id: new Set(["account", "members"]),
  upsert_account: new Set(["account", "members", "name", "domain"]),
  list_account_members: new Set(["account", "members"]),
  add_account_member: new Set(["account", "member"]),
  remove_account_member: new Set(["account"]),
  trigger_account_event: new Set(["account", "deliveries"]),
  list_account_events: new Set(["account", "events"]),
  list_account_suggestions: new Set(["suggestions"]),
  accept_account_suggestions: new Set(["results"]),
  preview_accounts_from_organization_id: new Set(["organizations"]),
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
  "forward_conversation_message",
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

/**
 * Connector guidance rewrites for the reviewed surface. ChatGPT exposes a fixed
 * tool list, so guidance about enabling tools on a connector would point the
 * model outside the app. Applied to descriptions, input schema text, and
 * result strings, since shared services also return these hints.
 */
export const OPENAI_CONNECTOR_TEXT_REWRITES: ReadonlyArray<
  readonly [pattern: RegExp, replacement: string]
> = [
  [
    / - if that tool is not in the tool list, enable it on the Sequenzy connector rather than writing through (update_template or update_sequence_node)\./g,
    "; do not write through $1.",
  ],
  [
    / If (?:this tool|update_ab_test_variant) is not in the (?:MCP )?tool list, enable it on the Sequenzy connector rather than writing through [^.]+\./g,
    "",
  ],
  [
    / If that tool is not in the MCP tool list, enable it on the Sequenzy connector rather than inferring fields from live HTML;/g,
    " Do not infer fields from live HTML;",
  ],
  // Plan and credit purchases stay out of this surface, including in status
  // text that tools return.
  [
    /, or sooner if you upgrade your plan or add credits\./g,
    ", or sooner if more sending capacity is added in the Sequenzy dashboard.",
  ],
  [
    /, or of upgrading your plan or adding credits\./g,
    ", or of more sending capacity being added in the Sequenzy dashboard.",
  ],
  [
    /needs a paid plan or SMS credits before sends can be queued\./g,
    "needs SMS sending capacity, managed in the Sequenzy dashboard, before sends can be queued.",
  ],
];

/**
 * Text rewrites for tool metadata only: descriptions and input schema text.
 * They are not applied to results, so customer copy that happens to match is
 * left alone.
 */
export const OPENAI_TEXT_REWRITES: ReadonlyArray<
  readonly [pattern: RegExp, replacement: string]
> = [
  ...OPENAI_CONNECTOR_TEXT_REWRITES,
  ...OPENAI_SIZE_TEXT_REWRITES,
  [/needs an API key \(create_api_key\),/g, "needs a Sequenzy API key,"],
  // A ChatGPT connection is itself a personal key with OAuth permissions;
  // key prefixes, presets and key management do not apply to it.
  [
    / Requires a personal account key \(seq_user_\.\.\.\); company-scoped keys cannot create another workspace\./g,
    " Requires a personal connection; company-scoped access cannot create another workspace.",
  ],
  [/ The agent_safe key preset includes both\./g, ""],
  [
    /\(for user-scoped API keys with access to multiple companies\)/g,
    "(for connections with access to multiple companies)",
  ],
  [/the API key's own user/g, "the connected user"],
  [/the API key owner's email address/g, "the connected user's email address"],
  [/the API key owner's own answer/g, "the connected user's own answer"],
  [
    /Requires an API key with the `integrations:manage` scope, which agent-safe keys deliberately do not carry/g,
    "Requires the `integrations:manage` permission, which this connection does not include by default",
  ],
  [
    /Requires a valid API key; no additional scopes\./g,
    "Works with any connected Sequenzy account; no additional permissions.",
  ],
  [
    /until a key is saved again/g,
    "until a key is saved again in the dashboard",
  ],
  [
    /until a key is uploaded again/g,
    "until a key is uploaded again in the dashboard",
  ],
  [/; run `preview_warehouse_query` first\./g, "."],
  [
    / Next, preview a query with `preview_warehouse_query` and create a sync\./g,
    " Next, create a sync.",
  ],
  [
    /does not require connect_integration or the Attio access token again/g,
    "does not require reconnecting or entering the Attio access token again",
  ],
  [
    /emailBranding says whether "Sent with Sequenzy" is visible, whether the owner subscription removes it, why, the current tier\/status, the required upgrade or renewal action, and the canonical subscriptionUrl\. Branding is injected at render\/send time rather than stored in footer blocks, so a paid entitlement removes it from future sends by existing live sequences without editing their emails\./g,
    'emailBranding says whether the "Sent with Sequenzy" footer is visible on this company\'s emails and why. Branding is injected at render/send time rather than stored in footer blocks.',
  ],
  [/, company settings, or subscription\./g, ", or company settings."],
  [
    / The response always includes the canonical owner-facing subscription URL when a company is resolved\. For compatibility, settingsTab billing or subscription also resolves to that Account page rather than a nonexistent Settings tab\./g,
    "",
  ],
];

/** Billing aliases of get_app_urls settingsTab that resolve to the subscription page. */
export const OPENAI_BLOCKED_SETTINGS_TABS: ReadonlySet<string> = new Set([
  "billing",
  "subscription",
]);

/** emailBranding fields kept on this surface; tier and upgrade action are dropped. */
export const OPENAI_EMAIL_BRANDING_FIELDS: ReadonlySet<string> = new Set([
  "visible",
  "removalEntitled",
  "reason",
]);
