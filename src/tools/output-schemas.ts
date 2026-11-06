import type { CallToolResult } from "@modelcontextprotocol/server";

import type { Tool } from "../mcp-types.js";

import { isRecord } from "./common-primitives.js";
import { dashboardUrlToolNames } from "./delivery-and-urls.js";
import {
  campaignStoOutputHint,
  pollRespondentFilterHint,
} from "./descriptions.js";

export type ToolOutputSchema = NonNullable<Tool["outputSchema"]>;
export type SequenzyToolCallResult = Omit<
  CallToolResult,
  "content" | "structuredContent"
> & {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};
export type OutputSchemaJsonType =
  "object" | "array" | "string" | "number" | "integer" | "boolean" | "null";

export type OutputSchemaProperty = {
  // A type array is the JSON Schema way to spell "nullable". MCP clients
  // validate structuredContent against this schema (the TypeScript SDK compiles
  // it with ajv), so any field the API can return as null must say so here or
  // the whole tool call is rejected.
  type?: OutputSchemaJsonType | OutputSchemaJsonType[];
  description?: string;
  properties?: Record<string, OutputSchemaProperty>;
  items?: OutputSchemaProperty;
  required?: string[];
  additionalProperties?: boolean | OutputSchemaProperty;
  enum?: string[];
};
export type OutputSchemaProperties = Record<string, OutputSchemaProperty>;

export const successOutputProperty: OutputSchemaProperty = {
  type: "boolean",
  description: "Whether the Sequenzy operation succeeded.",
};

export const messageOutputProperty: OutputSchemaProperty = {
  type: "string",
  description: "Human-readable status, confirmation, or next-step message.",
};

export const noteOutputProperty: OutputSchemaProperty = {
  type: "string",
  description: "Additional context about the result.",
};

export function objectOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: "object",
    description,
    additionalProperties: true,
  };
}

export function arrayOutputProperty(description: string): OutputSchemaProperty {
  return {
    type: "array",
    description,
    items: objectOutputProperty("One item in the returned collection."),
  };
}

export function stringOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: "string",
    description,
  };
}

function conversationIdListOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: "array",
    description,
    items: { type: "string", description: "Conversation ID." },
  };
}

export function nullableObjectOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: ["object", "null"],
    description,
    additionalProperties: true,
  };
}

/**
 * For string fields that are genuinely absent rather than empty. MCP clients
 * validate `structuredContent` against this schema and reject a plain
 * `type: "string"` property that arrives as `null`.
 */
export function nullableStringOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: ["string", "null"],
    description,
  };
}

export function numberOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: "number",
    description,
  };
}

export function nullableNumberOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: ["number", "null"],
    description,
  };
}

export function booleanOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: "boolean",
    description,
  };
}

/**
 * For boolean fields where "not determined" is a distinct third state from
 * false, and must not be collapsed into it.
 */
export function nullableBooleanOutputProperty(
  description: string
): OutputSchemaProperty {
  return {
    type: ["boolean", "null"],
    description,
  };
}

/**
 * For array fields where null is a distinct state from an empty array - an
 * unset selection versus an explicitly empty one. Collapsing them in the schema
 * makes the SDK reject the very response that reports "unset".
 */
export function nullableArrayOutputProperty(
  description: string,
  items: OutputSchemaProperty
): OutputSchemaProperty {
  return {
    type: ["array", "null"],
    description,
    items,
  };
}

export function resourceOutputProperty(
  resourceName: string
): OutputSchemaProperty {
  return objectOutputProperty(
    `The ${resourceName} record returned by Sequenzy.`
  );
}

export function resourceListOutputProperty(
  resourceName: string
): OutputSchemaProperty {
  return arrayOutputProperty(
    `List of ${resourceName} records returned by Sequenzy.`
  );
}

const EMAIL_FUNNEL_STATS_HINT =
  "`opened` and `clicked` are unique counts deduplicated by email send (one recipient opening five times counts once), not total open events. Every count is attributed to the sends made inside the requested window, including engagement that arrives after the window ends, so `opened <= delivered <= sent` always holds. Rates use `rateDenominator` (`delivered`, or `sent` when no delivery events were recorded, reported as `rateDenominatorBasis`); `deliveryRate` and `bounceRate` divide by `sent`.";

const RECEIVING_DOMAIN_HINT =
  "Receiving domain {id, domain, status (verified|pending|failed), records [{type MX|TXT, name, value, priority?, status}] to publish, error, claimExpiresAt (when an unverified name stops being reserved), verifiedAt, lastCheckedAt, createdAt}.";

const SUBSCRIBER_IMPORT_HINT =
  "The subscriber import record: status, totalRows, emailCount, duplicateRows, addedCount, updatedCount, skippedCount, failedCount, processedCount, chunk progress, and the reason maps skippedReasons, failedReasons, and failedChunkReasons. Every excluded row is explained: skippedReasons sums to skippedCount and failedReasons sums to failedCount. Report a shortfall with the import ID instead of guessing which rows are missing.";

const SEQUENCE_RUN_STATE_HINT =
  "Run state: branch on effectiveStatus (draft, live, enrollment_paused, paused, or archived) rather than on status, which reads `active` even when new enrollments are paused. acceptsNewEnrollments and processesExistingEnrollments answer the two questions behind it, and effectiveStatusSummary is a plain-language sentence. The legacy triggerConfig.active flag is not read by the runtime; it is reported as a mirror of acceptsNewEnrollments.";

const SEQUENCE_STEP_NUMBER_HINT =
  "Email numbering: emails[].stepNumber and nodes[].config.stepNumber are legacy stored ordinals retained for compatibility. Prefer emails[].structuralStepNumber and nodes[].structuralStepNumber when explaining the visible sequence position. Structural numbers are graph-derived; emails in parallel branches intentionally share a depth.";

const LIVE_ACTIVITY_DISPATCH_OUTPUT: OutputSchemaProperties = {
  event: stringOutputProperty("start, update or end."),
  activityId: stringOutputProperty("The activity the push targets."),
  tokenCount: numberOutputProperty(
    "Devices the push was queued for; 0 means nothing was sent."
  ),
  jobIds: arrayOutputProperty("Queued delivery job IDs, one per batch."),
};

export const sequenceOutputProperty: OutputSchemaProperty =
  objectOutputProperty(
    `The sequence record returned by Sequenzy. ${SEQUENCE_RUN_STATE_HINT} ${SEQUENCE_STEP_NUMBER_HINT} Sequences use sendingWindow for allowed local hours/days; they do not have Send Time Optimization. frequencyCapEnabled is true when email steps respect the company frequency cap (get_frequency_cap): contacts already at the cap skip the step. activeSubscribersOnly is true when only active contacts enter; when false, unsubscribed and bounced contacts still enter and only their marketing emails are skipped. STO is per-campaign (list_campaigns / get_campaign sendTimeOptimization).`
  );

export const sequenceListOutputProperty: OutputSchemaProperty =
  arrayOutputProperty(
    `List of sequence records returned by Sequenzy. ${SEQUENCE_RUN_STATE_HINT} emailCount is the number of email-sending steps; an A/B test step counts once.`
  );

export const sequenceRunStateOutputProperties: OutputSchemaProperties = {
  effectiveStatus: {
    type: "string",
    enum: ["draft", "live", "enrollment_paused", "paused", "archived"],
    description:
      "Resolved run state. The one field to branch on: `status` still reads `active` while new enrollments are paused.",
  },
  acceptsNewEnrollments: booleanOutputProperty(
    "Whether new subscribers can enter the sequence right now."
  ),
  processesExistingEnrollments: booleanOutputProperty(
    "Whether subscribers already inside the sequence keep advancing and receiving steps."
  ),
  effectiveStatusSummary: stringOutputProperty(
    "One plain-language sentence describing the run state, safe to show a user verbatim."
  ),
};

const sequenceMutationOutputProperty: OutputSchemaProperty = {
  ...sequenceOutputProperty,
  properties: {
    migratedRecipientCount: numberOutputProperty(
      "Recipients moved immediately from deleted steps to their surviving successor."
    ),
    completedRecipientCount: numberOutputProperty(
      "Recipients completed because a deleted step had no surviving successor."
    ),
  },
};

export const dashboardUrlOutputProperties: OutputSchemaProperties = {
  appUrls: objectOutputProperty(
    "Dashboard URLs for relevant Sequenzy resources."
  ),
  url: stringOutputProperty("Primary dashboard URL for this result."),
  settingsUrl: stringOutputProperty("Company settings URL when available."),
  subscriptionUrl: stringOutputProperty(
    "Owner-facing subscription, upgrade, and billing-management URL when available."
  ),
};

export const genericOutputProperties: OutputSchemaProperties = {
  success: successOutputProperty,
  message: messageOutputProperty,
  note: noteOutputProperty,
  warnings: {
    type: "array",
    description:
      "Non-fatal cautions about content, permissions, or follow-up actions.",
    items: stringOutputProperty("One warning."),
  },
  items: {
    type: "array",
    description:
      "Fallback array wrapper used only when a tool returns a bare array.",
    items: objectOutputProperty("One returned item."),
  },
  value: objectOutputProperty(
    "Fallback object wrapper used only when a tool returns a non-object value."
  ),
};

const subscriberOperationOutputProperty: OutputSchemaProperty = {
  type: "object",
  properties: {
    id: stringOutputProperty("Operation ID"),
    companyId: stringOutputProperty("Owning company"),
    kind: stringOutputProperty("add_tags"),
    status: stringOutputProperty(
      "queued, running, completed, failed or cancelled"
    ),
    total: numberOutputProperty("Selected contacts"),
    processed: numberOutputProperty("Processed contacts"),
    succeeded: numberOutputProperty(
      "Successfully processed contacts, including unchanged tags"
    ),
    failed: numberOutputProperty("Failed contacts"),
    error: nullableStringOutputProperty("Operation failure reason"),
    failures: resourceListOutputProperty("contact failure sample"),
    createdAt: stringOutputProperty("Creation timestamp"),
    completedAt: nullableStringOutputProperty("Completion timestamp"),
    expiresAt: stringOutputProperty("Expiry timestamp"),
  },
};

export const outputPropertiesByToolName: Record<
  string,
  OutputSchemaProperties
> = {
  start_subscriber_operation: { operation: subscriberOperationOutputProperty },
  get_subscriber_operation: { operation: subscriberOperationOutputProperty },
  cancel_subscriber_operation: { operation: subscriberOperationOutputProperty },
  list_subscriber_operations: {
    operations: { type: "array", items: subscriberOperationOutputProperty },
  },
  get_account: {
    account: resourceOutputProperty("account"),
    companies: resourceListOutputProperty("company"),
    apiKeyPermissions: objectOutputProperty(
      "Current API key preset and scopes, whether common marketing work is discoverable, any missing marketing read scopes, `canSendLive` plus `missingLiveDeliveryScopes` (delivery this key cannot perform, e.g. `transactional:send` for `send_email`; check before composing anything meant to be sent) `liveDeliveryBlockedByRole` (a viewer role blocks sending no matter the scopes, so widening the key will not help), `roleRestrictedScopes` (scopes the workspace role cannot use through a personal key - a marketer lists `transactional:send` here while still able to send campaigns), and the API Keys management URL."
    ),
    currentCompanyId: stringOutputProperty(
      "Company ID selected by the authenticated API key, when available."
    ),
    selectedCompanyId: stringOutputProperty(
      "Company ID selected locally for subsequent MCP calls, when available."
    ),
  },
  select_company: {
    companyId: stringOutputProperty("Selected company ID."),
    companyName: stringOutputProperty("Selected company name."),
  },
  get_app_urls: {
    dashboard: stringOutputProperty("Company dashboard URL."),
    account: stringOutputProperty("Company account URL."),
    subscription: stringOutputProperty(
      "Owner-facing subscription, upgrade, and billing-management URL."
    ),
    settings: stringOutputProperty("Company settings URL."),
    campaign: stringOutputProperty("Campaign editor URL."),
    landingPage: stringOutputProperty("Landing page editor URL."),
    sequence: stringOutputProperty("Sequence editor URL."),
    email: stringOutputProperty("Email editor URL."),
    transactionalEmail: stringOutputProperty("Transactional email URL."),
    emailSend: stringOutputProperty("Sent email detail URL."),
    domain: stringOutputProperty("Sending domain settings URL."),
    urls: objectOutputProperty("All generated URLs keyed by resource type."),
  },
  create_company: {
    company: resourceOutputProperty("company"),
    welcomeAutomationId: {
      type: ["string", "null"],
      description:
        "Created welcome-sequence ID, or null when not requested or unavailable.",
    },
    welcomeEnrichmentJobId: {
      type: ["string", "null"],
      description:
        "Queued generation job ID, or null when not requested or enqueue failed.",
    },
    autoSelected: booleanOutputProperty(
      "Whether the new company was selected for subsequent MCP calls."
    ),
  },
  update_company: {
    company: resourceOutputProperty("company"),
  },
  get_company: {
    company: resourceOutputProperty("company"),
  },
  get_sync_rules: {
    syncRules: {
      type: "array",
      description: "Effective sync rules for the company.",
      items: objectOutputProperty("One sync rule."),
    },
    isDefault: booleanOutputProperty(
      "Whether the company uses the inherited SaaS/ecommerce platform preset."
    ),
  },
  update_sync_rules: {
    syncRules: {
      type: "array",
      description: "Effective sync rules after the update.",
      items: objectOutputProperty("One sync rule."),
    },
    isDefault: booleanOutputProperty(
      "Whether the company now uses the inherited SaaS/ecommerce platform preset."
    ),
  },
  get_email_ai_style: {
    style: {
      type: ["object", "null"],
      description: "Saved appearance snapshot, or null when none is active.",
      additionalProperties: true,
    },
    revisionId: {
      type: ["string", "null"],
      description:
        "Observed snapshot revision for conditional save/clear; may be nonnull for an unsupported style version.",
    },
    canManage: booleanOutputProperty(
      "Whether this caller can save or clear a style."
    ),
  },
  save_email_ai_style: {
    style: {
      type: ["object", "null"],
      description: "Saved appearance snapshot, or null when none is active.",
      additionalProperties: true,
    },
    revisionId: {
      type: ["string", "null"],
      description:
        "Observed snapshot revision for conditional save/clear; may be nonnull for an unsupported style version.",
    },
    canManage: booleanOutputProperty(
      "Whether this caller can save or clear a style."
    ),
  },
  clear_email_ai_style: {
    style: {
      type: ["object", "null"],
      description: "Saved appearance snapshot, or null when none is active.",
      additionalProperties: true,
    },
    revisionId: {
      type: ["string", "null"],
      description:
        "Observed snapshot revision for conditional save/clear; may be nonnull for an unsupported style version.",
    },
    canManage: booleanOutputProperty(
      "Whether this caller can save or clear a style."
    ),
  },
  get_email_design_system: {
    designSystem: objectOutputProperty(
      "The effective email design system parsed from the direction text: designCode (visual grammar tokens), compositionSpine, and source (derived | custom)."
    ),
    directionText: {
      type: ["string", "null"],
      description:
        "The raw emailDesignPrompt direction text the tokens were parsed from; null when the company has none yet.",
    },
    isDefault: booleanOutputProperty(
      "True while the identity is purely derived from brand context."
    ),
  },
  update_email_design_system: {
    message: messageOutputProperty,
    designSystem: objectOutputProperty(
      "The email design system now in effect after the update or reset."
    ),
    directionText: {
      type: ["string", "null"],
      description:
        "The rewritten direction text now stored on the company; null after a reset.",
    },
    isDefault: booleanOutputProperty(
      "True when the resulting identity is the pure brand-derived one - after an explicit reset, or when an adjustment resolved to the derived defaults."
    ),
  },
  get_design_md: {
    markdown: stringOutputProperty(
      "The design.md document: YAML frontmatter with exact values, then Voice, Design direction and Reference email sections."
    ),
    version: stringOutputProperty(
      "Content version; pass as expectedVersion to update_design_md."
    ),
    designSystem: objectOutputProperty(
      "The design system parsed from the design direction: designCode, compositionSpine and source (derived | custom)."
    ),
  },
  update_design_md: {
    message: messageOutputProperty,
    saved: booleanOutputProperty("True when this call wrote changes."),
    dryRun: booleanOutputProperty("True when nothing was saved by request."),
    changes: {
      type: "array",
      items: { type: "string" },
      description:
        "Changed fields in document terms, e.g. colors.primary, voice, designDirection, layout.spine.",
    },
    warnings: {
      type: "array",
      items: { type: "object", additionalProperties: true },
      description:
        "Non-blocking notes ({message, line?}): ignored keys, read-only sections, values a saved AI style overrides.",
    },
    markdown: stringOutputProperty(
      "The document as it reads after the save (or would read, for a dry run)."
    ),
    version: stringOutputProperty(
      "Current version after the call; unchanged for a dry run or an untouched document."
    ),
    designSystem: objectOutputProperty(
      "The design system in effect after the save."
    ),
  },
  get_shopify_automation_settings: {
    browseAbandonment: objectOutputProperty(
      "Effective browse-abandonment settings (defaults applied)."
    ),
    cartAbandonment: objectOutputProperty(
      "Effective cart-abandonment settings (defaults applied)."
    ),
    priceDrop: objectOutputProperty(
      "Effective price-drop settings (defaults applied)."
    ),
    shopDomain: stringOutputProperty("Connected Shopify store domain."),
  },
  update_shopify_automation_settings: {
    browseAbandonment: objectOutputProperty(
      "Effective browse-abandonment settings after the update."
    ),
    cartAbandonment: objectOutputProperty(
      "Effective cart-abandonment settings after the update."
    ),
    priceDrop: objectOutputProperty(
      "Effective price-drop settings after the update."
    ),
    shopDomain: stringOutputProperty("Connected Shopify store domain."),
  },
  create_api_key: {
    apiKey: objectOutputProperty(
      "Created API key metadata: the newly created secret in `key`, plus `scopes` listing the assigned permission scopes (null when the key has full access)."
    ),
    key: stringOutputProperty(
      "Newly created API key if the API response uses the short key field."
    ),
  },
  request_api_key_handoff: {
    handoff: objectOutputProperty(
      "The prepared handoff: `url` opens the dashboard create-key form prefilled with the requested `name`, `preset` or `scopes`, and `replaces` when rotating. `canSelfServe` is true when the active key already holds api_keys:manage and could create the key directly. `deliversKeyToCaller` is always false - the new key is shown in the owner's browser and never returned here."
    ),
    message: stringOutputProperty(
      "What to tell the operator about this handoff."
    ),
    nextSteps: {
      type: "array",
      description:
        "Ordered steps to finish the rotation, including verifying the replacement and revoking the predecessor.",
      items: stringOutputProperty("One step in the handoff."),
    },
  },
  list_api_keys: {
    apiKeys: resourceListOutputProperty(
      "non-secret API key metadata, including ID, name, prefix, permissions, timestamps, and active-credential status"
    ),
  },
  update_api_key: {
    apiKey: resourceOutputProperty(
      "updated non-secret API key metadata, including the `scopes` now in effect (null when the key has full access)"
    ),
  },
  revoke_api_key: {
    apiKey: resourceOutputProperty("revoked non-secret API key metadata"),
  },
  delete_api_key: {
    apiKey: resourceOutputProperty("deleted non-secret API key metadata"),
  },
  list_websites: {
    websites: resourceListOutputProperty(
      "sending domain, including DNS verification and readyToSend sending readiness"
    ),
  },
  list_integrations: {
    integrations: resourceListOutputProperty(
      "connected integration, including provider, provider account ID, active and sync status, last sync time, last sync error, allowlisted non-secret details, cohorts (Mixpanel and Amplitude: each synced cohort's id, name, and tag), eventSettings (Amplitude), and lastSyncSkipped (records the last sync could not import normally: suppressed profiles that cannot receive email, plus any that were not imported). Credentials are never included"
    ),
  },
  get_integration: {
    integration: objectOutputProperty(
      "The connected integration: provider, display name, category, provider account ID, active and sync status, last sync time and error, allowlisted non-secret details, cohorts (Mixpanel and Amplitude: each synced cohort's id, name, tag, and sync times), and eventSettings (Amplitude). Credentials are never included."
    ),
    capabilities: nullableObjectOutputProperty(
      "What this provider does: category, connect method, what it syncs, every event it emits with when it fires, attributes it writes, supported actions, availability, and caveats. Null for a provider with no catalog entry."
    ),
    events: arrayOutputProperty(
      "Each event the provider emits, every matching tag rule and its conditions, listening sequences, and account-wide observation fields. Use activity for integration-specific delivery."
    ),
    unusedEvents: {
      type: "array",
      description:
        "Events the provider emits that no sequence triggers on. These are the concrete automation gaps for this integration.",
      items: stringOutputProperty("Event name with no listening sequence."),
    },
    accountNeverReceivedEvents: {
      type: "array",
      description:
        "Provider event names this account has never received from any source. This is not integration-specific delivery evidence.",
      items: stringOutputProperty("Event name never seen account-wide."),
    },
    activity: objectOutputProperty(
      "Webhook and sync activity over the last 24 hours: totals by status, stalled count, last activity time, and recent failures."
    ),
    ingestion: objectOutputProperty(
      "What this integration does to the contact list: bulkSyncEnabled, supportsListTargeting, listTargeting (`company_default`, `none`, `specific`, or null when the provider ignores targeting), listIds (null means the workspace default lists), lists with their names, missingListIds for configured lists that have since been deleted and are therefore skipped, and a summary. When supportsListTargeting is false, the summary names defaultSubscriberListIds on get_company/update_company as the live-ingestion write path (null = every list, [] = none) and identifies provider-specific backfill exceptions such as PostHog history imports. Neither setting stops the provider's live webhook creating contacts."
    ),
    pixel: nullableObjectOutputProperty(
      "Shopify only: live storefront pixel state (installed, endpoint, endpointCurrent, configurationCurrent, healthy, error, dependentEvents). Null for providers without a pixel. When error is null and healthy is false, every dependentEvent is confirmed dark; an error means Shopify could not confirm the state."
    ),
    recommendations: arrayOutputProperty(
      "Prioritized problems and suggestions, each with a code, severity (error, warning, info), message, and a concrete action."
    ),
    availableActions: {
      type: "array",
      description:
        "Action ids callable on this integration right now, given its current state.",
      items: stringOutputProperty("Available action id."),
    },
  },
  list_integration_capabilities: {
    providers: resourceListOutputProperty(
      "integration provider, including category, connect method, what it syncs, every event it emits with the moment that triggers it, the subscriber attributes it writes, supported actions, availability, and caveats"
    ),
  },
  list_integration_suggestions: {
    websiteUrl: nullableStringOutputProperty(
      "The company website the suggestions were read from."
    ),
    scanComplete: booleanOutputProperty(
      "False while onboarding is still reading the website, including the tool scan that can finish a few seconds later; an empty list then means not scanned yet."
    ),
    suggestions: arrayOutputProperty(
      "Detected providers not yet connected, each with provider, name, category, evidence (homepage, sign_in_page or storefront) and shopDomain (Shopify only, else null)."
    ),
    paymentProviders: nullableObjectOutputProperty(
      "Present when the website lists pricing and no payment or commerce integration is connected: reason (pricing_found), pricingPlanCount, and providers (every payment provider, each with provider and name). Null otherwise."
    ),
  },
  preview_cart_items: {
    suggestions: {
      type: "array",
      items: objectOutputProperty(
        "Suggested field, relative path and example. Existing mappings are never replaced."
      ),
    },
    priceCandidates: {
      type: "array",
      items: objectOutputProperty(
        "Numeric price path, example and unknown units; confirm before mapping."
      ),
    },
    previewItems: {
      type: "array",
      items: objectOutputProperty(
        "An item object to pass at the block source in render variables."
      ),
    },
    scenario: stringOutputProperty("Selected scenario."),
    isSample: {
      type: "boolean",
      description:
        "True for synthetic preview scenarios; never use these as recipient data.",
    },
    presets: {
      type: "array",
      items: objectOutputProperty(
        "Preset id, label, description and explicit optional block settings."
      ),
    },
  },
  get_email_block_schema: {
    blockTypes: {
      type: "array",
      description:
        "Listing mode: one entry per block type, each with `type`, `creatable`, `required`, `optional`, and a `fields` array of { name, required, type, values?, itemFields?, fields? }. `values` holds an enum field's allowed values; `itemFields` holds the shape of one entry in an array field, which is where `list` (items carry `content`) and `steps` (items carry `title`) differ; a field's own `fields` holds the shape of an object field, such as a repeat block's `productSource`.",
      items: objectOutputProperty(
        "A block type reference: type, creatable, required, optional, fields, and - when the type is one an author should hand-create - a minimal valid `example` and authoring `notes`."
      ),
    },
    blockType: objectOutputProperty(
      "Single-type mode: the full reference for the requested type, including a minimal valid `example` and authoring `notes`."
    ),
    conditionFields: {
      type: "array",
      description:
        'The per-field table for block conditions - the `conditions` array every block takes, and the `conditions` of a `conditional-group`. Present when listing every type, when the requested type is `conditional-group`, and when conditionFields: true was passed; otherwise `conditionFieldsHint` says how to ask for it. Each entry is { field, label, operators, values?, valueFormat, serverEvaluated, previewSupport, example }. `operators` is the only set that field accepts: the `field` and `operator` enums inside a block\'s own reference pool every field\'s operators together, so they show `is` for `tag` even though a tag condition is rejected with it. `valueFormat` gives the shape of the value string, which differs per field ("attributeName:value" for attribute, a tag name for tag, an id for segment, "eventName:timeRange" for event). `serverEvaluated` marks the fields read from stored subscriber state rather than from the send\'s merge data, and `previewSupport` says what render_email needs before it can evaluate one: "any_contact", "inline_tags_or_stored_subscriber" (tag), or "stored_subscriber". A condition a render cannot evaluate is not an error - it renders as false and is listed in that render\'s unevaluatedConditions.',
      items: objectOutputProperty(
        "One condition field: its allowed operators, value format, and what a preview needs to evaluate it."
      ),
    },
    conditionFieldsHint: {
      type: "string",
      description:
        "Present on a single-type response that omitted `conditionFields`, saying that conditions are per-field and how to get the table. The table is several times the size of one block type's reference, so a targeted lookup does not carry it unless conditions are that type's purpose or you asked for it.",
    },
  },
  get_event_sample: {
    eventName: { type: "string", description: "Exact recorded event name." },
    sample: {
      type: ["object", "null"],
      description:
        "Latest received event across workspace subscribers, or null. Contains eventTime (UTC), subscriberId and properties (JSON object). No age cutoff. Copy properties to test customVariables.",
    },
  },
  get_event_schema: {
    eventName: {
      type: ["string", "null"],
      description:
        "Normalized name of the event described, or null when listing every documented event.",
    },
    events: {
      type: "array",
      description:
        "One entry per event. Listing mode returns summaries only; asking for a single eventName adds `providers`, each with an `examplePayload` and a `properties` array of { path, type, description?, mergeTag? }. `documented: false` means no reference sample is published - the event name is still valid to trigger and to build a sequence on.",
      items: objectOutputProperty(
        "An event: eventName, documented, label, category, description, documentedProviders, and (single-event mode) providers, mergeTagPrefix, and notes."
      ),
    },
    note: noteOutputProperty,
  },
  list_integration_activity: {
    activity: resourceListOutputProperty(
      "integration activity row, including provider, action, status, event type, matched contact, message, and error. Payloads are sanitized, so no credentials appear"
    ),
    windowHours: {
      type: "number",
      description: "Retention window in hours for integration activity.",
    },
    note: noteOutputProperty,
  },
  connect_integration: {
    integration: {
      type: "object",
      description:
        "The connected integration: id, provider, name, providerAccountId, sync state, and safe (non-credential) details.",
    },
    webhookUrl: stringOutputProperty(
      "Provider webhook URL. Lemon Squeezy may already have it installed when webhookProvisioning is managed; manual mode uses the supplied secret. SparkLoop's is already registered in SparkLoop. Empty for Attio, which registers its own webhook when inbound mappings are saved."
    ),
    webhookProvisioning: stringOutputProperty(
      "Lemon Squeezy only: managed when Sequenzy provisioned the webhook, or manual when the caller supplied its signing secret."
    ),
    testMode: booleanOutputProperty(
      "Lemon Squeezy only: true when the connected API key/store is in test mode."
    ),
    revenueSyncQueued: booleanOutputProperty(
      "Payment providers only: whether the initial revenue backfill was queued."
    ),
    backfillQueued: booleanOutputProperty(
      "Affonso only: whether the affiliate backfill was queued."
    ),
    publication: {
      type: "object",
      description:
        "SparkLoop only: the publication ({ id, name }) whose partner referrals this workspace receives.",
    },
    history: {
      type: "object",
      description:
        "PostHog and Segment only: outcome of the optional history import request ({ requested, queued, error }). The webhook connection succeeds even if queueing the import failed.",
    },
  },
  set_integration_sync_enabled: {
    integrationId: stringOutputProperty("The integration that was updated."),
    provider: stringOutputProperty("Provider of the updated integration."),
    syncEnabled: booleanOutputProperty(
      "Bulk import and backfill state after the update. This is not the provider's live webhook, which keeps creating contacts either way."
    ),
    listTargeting: nullableStringOutputProperty(
      "Where contacts created by this integration land: `company_default`, `none`, or `specific`. Null for providers that ignore per-integration list targeting."
    ),
    listIds: nullableArrayOutputProperty(
      "Configured target lists. Null means new contacts follow the workspace default lists.",
      stringOutputProperty("List ID.")
    ),
    changed: booleanOutputProperty(
      "False when the integration was already in the requested state."
    ),
    changedFields: {
      type: "array",
      description: "Which controls actually moved.",
      items: stringOutputProperty("Field name."),
    },
    message: messageOutputProperty,
  },
  set_integration_list_targeting: {
    integrationId: stringOutputProperty("The integration that was updated."),
    provider: stringOutputProperty("Provider of the updated integration."),
    syncEnabled: booleanOutputProperty(
      "Bulk import and backfill state. Unchanged by this tool."
    ),
    listTargeting: nullableStringOutputProperty(
      "Where contacts created by this integration land after the update: `company_default`, `none`, or `specific`. Null for providers that ignore per-integration list targeting."
    ),
    listIds: nullableArrayOutputProperty(
      "Configured target lists after the update. Null means new contacts follow the workspace default lists.",
      stringOutputProperty("List ID.")
    ),
    changed: booleanOutputProperty(
      "False when the integration was already in the requested state."
    ),
    changedFields: {
      type: "array",
      description: "Which controls actually moved.",
      items: stringOutputProperty("Field name."),
    },
    message: messageOutputProperty,
  },
  get_integration_pixel: {
    integrationId: stringOutputProperty("The Shopify integration inspected."),
    provider: stringOutputProperty("Always `shopify`."),
    shopDomain: stringOutputProperty("Store the pixel was read from."),
    pixel: objectOutputProperty(
      "Live pixel state: installed, id, endpoint it posts to, endpointCurrent (including the supported compatibility route), configurationCurrent (endpoint plus signed connection settings), healthy, and error when Shopify could not confirm."
    ),
    dependentEvents: {
      type: "array",
      description:
        "Event names that depend on this pixel. They are confirmed unable to arrive only when pixel.error is null and pixel.healthy is false.",
      items: stringOutputProperty("Pixel-dependent event name."),
    },
    message: messageOutputProperty,
  },
  activate_integration_pixel: {
    integrationId: stringOutputProperty("The Shopify integration updated."),
    provider: stringOutputProperty("Always `shopify`."),
    shopDomain: stringOutputProperty("Store the pixel was installed on."),
    pixel: objectOutputProperty("Pixel state after activation."),
    changed: booleanOutputProperty(
      "False when the pixel was already installed and reporting to this account."
    ),
    created: booleanOutputProperty("True when a new pixel was installed."),
    updated: booleanOutputProperty(
      "True when an existing pixel was repointed at this account."
    ),
    dependentEvents: {
      type: "array",
      description: "Event names this pixel enables.",
      items: stringOutputProperty("Pixel-dependent event name."),
    },
    message: messageOutputProperty,
  },
  disconnect_integration: {
    integrationId: stringOutputProperty("The disconnected integration ID."),
    provider: stringOutputProperty("lemon_squeezy"),
    cleanupWarning: {
      type: ["string", "null"],
      description:
        "Null after successful cleanup. A warning means locally disconnected; repeat disconnect to retry managed webhook removal.",
    },
    message: stringOutputProperty(
      "Disconnection result and recovery instructions."
    ),
  },
  sync_integration: {
    integrationId: stringOutputProperty("The integration being synced."),
    provider: stringOutputProperty("Provider of the synced integration."),
    jobId: nullableStringOutputProperty(
      "Background job id for the queued sync, when one was created."
    ),
    syncStatus: stringOutputProperty(
      "Sync status after queueing. Poll get_integration to watch it progress."
    ),
    syncTarget: nullableObjectOutputProperty(
      "For Supabase, the project ref, schema, and table the backfill reads. Absent for providers whose sync has no configurable source."
    ),
    message: messageOutputProperty,
  },
  get_attio_mapping: {
    integrationId: stringOutputProperty("The Attio integration inspected."),
    provider: stringOutputProperty("Always `attio`."),
    listMap: objectOutputProperty(
      "Saved Sequenzy list id → Attio list UUID or api slug. Empty when nothing is mapped."
    ),
    mappedListCount: numberOutputProperty(
      "Number of saved listMap entries whose Sequenzy source and Attio target lists both still exist. Stale saved entries remain in listMap but are not counted. Zero means list joins are not synced to Attio."
    ),
    syncCompanyFromDomain: booleanOutputProperty(
      "Whether a company is upserted from the person's non-free-mail email domain."
    ),
    tagMap: objectOutputProperty(
      "Saved Sequenzy tag → Attio list UUID or api slug (Sequenzy → Attio)."
    ),
    inboundListMap: objectOutputProperty(
      "Saved Attio list UUID → Sequenzy list id (Attio → Sequenzy)."
    ),
    inboundTagMap: objectOutputProperty(
      "Saved Attio list UUID → Sequenzy tag (Attio → Sequenzy)."
    ),
    syncRemovals: booleanOutputProperty(
      "Whether removals are mirrored in every mapped direction. False means add-only."
    ),
    mappedTagCount: numberOutputProperty(
      "Saved tag mappings whose Attio target list still exists."
    ),
    inboundMappingCount: numberOutputProperty(
      "Saved Attio → Sequenzy mappings whose Attio source and Sequenzy target both still exist."
    ),
    inbound: objectOutputProperty(
      "Inbound sync health: enabled, status (`off`, `active`, or `error`), error (what to fix when status is `error`), and webhookUrl."
    ),
    sequenzyLists: {
      type: "array",
      description: "This company's Sequenzy lists (id and name).",
      items: objectOutputProperty("A Sequenzy list: id and name."),
    },
    attioLists: {
      type: "array",
      description:
        "Attio people-lists the stored token can write, read live from Attio (id, apiSlug, name).",
      items: objectOutputProperty(
        "An Attio people-list: id, apiSlug, and name."
      ),
    },
    message: messageOutputProperty,
  },
  update_amplitude_settings: {
    integration: objectOutputProperty(
      "The updated Amplitude integration, including eventSettings and synced cohorts."
    ),
    eventSettings: objectOutputProperty(
      "The saved scope: { syncAllEvents, eventAllowlist, skipInternalEvents }."
    ),
  },
  update_attio_settings: {
    integrationId: stringOutputProperty("The Attio integration updated."),
    provider: stringOutputProperty("Always `attio`."),
    listMap: objectOutputProperty(
      "Saved Sequenzy list id → Attio list UUID or api slug after the update."
    ),
    mappedListCount: numberOutputProperty(
      "Number of saved mappings whose Sequenzy source and Attio target lists both still exist after the update. Stale preserved entries are not counted."
    ),
    syncCompanyFromDomain: booleanOutputProperty(
      "Whether company matching from work-email domains is on after the update."
    ),
    tagMap: objectOutputProperty(
      "Saved Sequenzy tag → Attio list UUID or api slug (Sequenzy → Attio)."
    ),
    inboundListMap: objectOutputProperty(
      "Saved Attio list UUID → Sequenzy list id (Attio → Sequenzy)."
    ),
    inboundTagMap: objectOutputProperty(
      "Saved Attio list UUID → Sequenzy tag (Attio → Sequenzy)."
    ),
    syncRemovals: booleanOutputProperty(
      "Whether removals are mirrored in every mapped direction. False means add-only."
    ),
    mappedTagCount: numberOutputProperty(
      "Saved tag mappings whose Attio target list still exists."
    ),
    inboundMappingCount: numberOutputProperty(
      "Saved Attio → Sequenzy mappings whose Attio source and Sequenzy target both still exist."
    ),
    inbound: objectOutputProperty(
      "Inbound sync health: enabled, status (`off`, `active`, or `error`), error (what to fix when status is `error`), and webhookUrl."
    ),
    sequenzyLists: {
      type: "array",
      description: "This company's Sequenzy lists (id and name).",
      items: objectOutputProperty("A Sequenzy list: id and name."),
    },
    attioLists: {
      type: "array",
      description:
        "Attio people-lists the stored token can write, read live from Attio (id, apiSlug, name).",
      items: objectOutputProperty(
        "An Attio people-list: id, apiSlug, and name."
      ),
    },
    changed: booleanOutputProperty(
      "False when the integration was already in the requested state."
    ),
    changedFields: {
      type: "array",
      description:
        "Which settings actually moved: listMap, tagMap, inboundListMap, inboundTagMap, syncRemovals, and/or syncCompanyFromDomain, plus inboundWebhook when the save set up, repaired or removed the Attio webhook.",
      items: stringOutputProperty("Field name."),
    },
    message: messageOutputProperty,
  },
  list_web_tracking_keys: {
    success: successOutputProperty,
    keys: {
      type: "array",
      description:
        "Publishable keys for the browser tracking SDK, newest first. A key with lastUsedAt null has not successfully authenticated an event yet; check deployment, instrumentation or traffic, and the origin allowlist.",
      items: objectOutputProperty(
        "One key: id, name, publicKey, allowedOrigins, allowedAppIds, isActive, unrestricted, lastUsedAt, installSnippet, endpoint, and warning when unrestricted."
      ),
    },
  },
  get_web_tracking_key: {
    success: successOutputProperty,
    key: objectOutputProperty(
      "The key, including the paste-ready installSnippet and the ingest endpoint."
    ),
  },
  create_web_tracking_key: {
    success: successOutputProperty,
    key: objectOutputProperty(
      "The created key. installSnippet is the exact HTML snippet to paste into every page; it embeds both the publishable key and the workspace id and queues calls made while the async SDK loads."
    ),
    message: messageOutputProperty,
  },
  update_web_tracking_key: {
    success: successOutputProperty,
    key: objectOutputProperty("The key after the update."),
  },
  delete_web_tracking_key: {
    success: successOutputProperty,
    message: messageOutputProperty,
  },
  list_sender_profiles: {
    senderProfiles: resourceListOutputProperty(
      "sender (From) profile, including the sending domain behind it, its DNS verification status, and whether the address is fully ready to send"
    ),
    replyProfiles: resourceListOutputProperty("reply-to profile"),
    defaultSenderProfileId: nullableStringOutputProperty(
      "Company default sender profile ID. Null when no default is set."
    ),
    defaultReplyProfileId: nullableStringOutputProperty(
      "Company default reply-to profile ID. Null when no default is set."
    ),
  },
  update_sender_profile: {
    senderProfile: resourceOutputProperty(
      "renamed sender (From) profile, present when type was sender"
    ),
    replyProfile: resourceOutputProperty(
      "renamed reply-to profile, present when type was reply"
    ),
    renamed: booleanOutputProperty(
      "False when the profile already carried that name, so nothing changed."
    ),
  },
  delete_sender_profile: {
    success: successOutputProperty,
    deletedSenderProfileId: stringOutputProperty(
      "ID of the sender profile that was permanently deleted."
    ),
    fallbackSenderProfileId: nullableStringOutputProperty(
      "Remaining sender profile selected for the account default and eligible draft campaigns when reassignment was needed."
    ),
    message: messageOutputProperty,
  },
  get_notification_preferences: {
    notificationPreferences: arrayOutputProperty(
      "One entry per notification event with its current mode: off, instant, daily, or weekly. Every event is always present; an event the user has never configured reports the platform default."
    ),
    supportedModes: objectOutputProperty(
      "Modes each event accepts, keyed by event. form_submitted and campaign_completed do not accept daily; weekly_report accepts only off or weekly; account_health only off or instant."
    ),
    defaults: objectOutputProperty(
      "Mode each event uses when the user has never configured it, resolved for their role: the workspace owner defaults to weekly_report 'weekly' and account_health 'instant', invited members to 'off'."
    ),
  },
  update_notification_preferences: {
    notificationPreferences: arrayOutputProperty(
      "Every notification event with its mode after the update, not only the events that were changed."
    ),
    supportedModes: objectOutputProperty(
      "Modes each event accepts, keyed by event. form_submitted and campaign_completed do not accept daily; weekly_report accepts only off or weekly; account_health only off or instant."
    ),
    defaults: objectOutputProperty(
      "Mode each event uses when the user has never configured it, resolved for their role: the workspace owner defaults to weekly_report 'weekly' and account_health 'instant', invited members to 'off'."
    ),
  },
  get_sending_status: {
    status: stringOutputProperty(
      "Company-level sending state: active, paused, or suspended. Anything other than active blocks every send, including test sends."
    ),
    pauseReason: nullableStringOutputProperty(
      "Exact enforcement message, including the measured rate, the threshold it crossed, and the send volume it was measured over. Null when sending is active."
    ),
    pauseReasonKind: nullableStringOutputProperty(
      "Machine-readable pause cause: high_hard_bounce_rate, high_soft_bounce_rate, high_block_rate, high_complaint_rate, phishing_guard, over_email_limit, manual, or other. Only high_hard_bounce_rate can be cleared with resume_sending; over_email_limit lifts automatically once the account has email allowance again."
    ),
    pausedAt: nullableStringOutputProperty(
      "ISO timestamp when sending was paused. Null when sending is active."
    ),
    selfResume: objectOutputProperty(
      "Whether the account can clear this pause itself: canSelfResume, supported, allowedByAdmin, ownerIsTrusted, the automated aiReviewStatus (not_required, pending, approved, flagged, failed) with its reason and timestamps, and unavailableReason naming the blocking gate (unsupported_reason, waiting_for_review, blocked_by_ai, review_failed, blocked_by_admin)."
    ),
    senderHealth: nullableObjectOutputProperty(
      "Enforcement counts and the thresholds that apply at this volume for hard bounces, soft bounces, blocks (block: receivers refusing the sender for spam or content, its domain, policy, or failed SPF, DKIM or DMARC), and complaints. bounceScopedSent is the denominator for bounce rates, blockScopedSent (test sends included) is the denominator for the block rate, complaintScopedSent is the denominator for complaint rates, and scopedSent remains as a backward-compatible alias for bounceScopedSent. Also includes enforcementMode. Null when the account has no metrics record yet or sender-health analytics are temporarily unavailable; pause state and remediation remain authoritative."
    ),
    metricsWindow: objectOutputProperty(
      "Proof that enforcement is not time-windowed: kind is always all_time_since_reset and expiresAt is always null. bounceResetAt and complaintResetAt are the watermarks the totals are counted from. Do not tell the user to wait for a window to expire - there is none."
    ),
    remediation: objectOutputProperty(
      "Ordered steps for the current state, plus supportEmail, docsUrl, and the dashboard URL. Relay these verbatim instead of improvising recovery advice."
    ),
  },
  resume_sending: {
    resumed: booleanOutputProperty(
      "True when this call restored sending. False when sending was already active."
    ),
    message: messageOutputProperty,
    status: stringOutputProperty(
      "Sending state after the request. active on success."
    ),
    selfResume: objectOutputProperty(
      "Self-resume state after the request, including the automated review status and how many gates remain."
    ),
    metricsWindow: objectOutputProperty(
      "Enforcement watermarks after the resume. bounceResetAt moves to now, so the paused rate is recalculated from later sends."
    ),
    remediation: objectOutputProperty(
      "Steps to keep sending healthy after the resume, plus supportEmail and docsUrl."
    ),
  },
  get_account_health: {
    accountHealth: objectOutputProperty(
      "eligibility {eligible, minimumActiveSubscribers, activityDays, hasMinimumSubscribers, sentRecently}, settings {enabled, autonomy}, nextRunAt, latestRun (status, summary, stats, insightCount, draftsCreated), runInProgress, and insights (open and snoozed, most severe first) with id, detector, severity, status, title, detail, recommendation, evidence, subject, fixAutomationId, actions (kind, label, targetId, path, confirm, api) and feedback (the key owner's own {rating, comment, updatedAt}, or null)."
    ),
  },
  update_account_health_settings: {
    settings: objectOutputProperty("The saved settings: enabled and autonomy."),
    nextRunAt: nullableStringOutputProperty(
      "When the next scheduled check runs, or null when checks are off."
    ),
  },
  run_account_health_check: {
    run: objectOutputProperty(
      "The queued or in-flight run: id, trigger, status, scheduledFor and createdAt."
    ),
    alreadyInProgress: booleanOutputProperty(
      "True when an existing queued or running check was returned instead of a new one."
    ),
  },
  create_account_health_fix: {
    sequenceId: stringOutputProperty(
      "The draft sequence that fixes the insight."
    ),
    created: booleanOutputProperty(
      "False when a draft for this insight already existed and was returned."
    ),
    enrichmentStatus: stringOutputProperty(
      "Only when created: processing while AI writes the emails, or not_queued when writing could not start."
    ),
  },
  update_account_health_insight: {
    insight: objectOutputProperty(
      "The updated insight with its new status and snoozedUntil."
    ),
  },
  submit_account_health_feedback: {
    insightId: stringOutputProperty("The rated insight."),
    feedback: objectOutputProperty(
      "The saved answer: rating (useful or not_useful), comment (or null) and updatedAt."
    ),
  },
  get_frequency_cap: {
    frequencyCap: nullableObjectOutputProperty(
      "The company cap {maxEmails, windowHours}: at most maxEmails marketing emails per contact in any windowHours. Null when no cap is set."
    ),
  },
  set_frequency_cap: {
    frequencyCap: objectOutputProperty(
      "The saved cap {maxEmails, windowHours}."
    ),
  },
  clear_frequency_cap: {
    frequencyCap: nullableObjectOutputProperty("Always null: no cap is set."),
  },
  get_tracking_settings: {
    tracking: objectOutputProperty(
      "Account-wide open/click flags, transactionalOpenTrackingEnabled and transactionalClickTrackingEnabled defaults for Transactional API sends, unsubscribe tracking, the opt-in strictBotFilteringEnabled bot-detection flag, emailContentStorageEnabled (false: no stored email content or subjects, and no IP address, user agent or country on opens and clicks), plus the default attribution window in hours."
    ),
    consent: objectOutputProperty(
      "Signup consent settings: doubleOptInEnabled, doubleOptInEmailId for the confirmation email sent to pending contacts (null when double opt-in has never been enabled), and doubleOptInRedirectUrl for where the hosted confirmation page sends subscribers after confirming (null keeps them on the branded confirmation page)."
    ),
    autoUtm: objectOutputProperty(
      "Automatic UTM tagging state and its configured parameters."
    ),
    trackingDomain: nullableObjectOutputProperty(
      "Company tracking domain, used by every sending domain, with verification and SSL status. Null when links use the shared Sequenzy tracking domain; links also use it while the tracking domain is unverified."
    ),
    replyTracking: objectOutputProperty(
      "Inbound reply tracking configuration."
    ),
  },
  update_tracking_settings: {
    message: messageOutputProperty,
    tracking: objectOutputProperty(
      "Account-wide open/click flags, transactionalOpenTrackingEnabled and transactionalClickTrackingEnabled defaults for Transactional API sends, unsubscribe tracking, the opt-in strictBotFilteringEnabled bot-detection flag, emailContentStorageEnabled (false: no stored email content or subjects, and no IP address, user agent or country on opens and clicks), plus the default attribution window in hours, after the update."
    ),
    consent: objectOutputProperty(
      "Signup consent settings after the update: doubleOptInEnabled, doubleOptInEmailId for the confirmation email (provisioned automatically the first time double opt-in is enabled), and doubleOptInRedirectUrl for the post-confirmation redirect (null keeps subscribers on the branded confirmation page)."
    ),
    autoUtm: objectOutputProperty(
      "Automatic UTM tagging state and its configured parameters, after the update."
    ),
    trackingDomain: nullableObjectOutputProperty(
      "Company tracking domain, used by every sending domain, with verification and SSL status. Null when links use the shared Sequenzy tracking domain; links also use it while the tracking domain is unverified."
    ),
    replyTracking: objectOutputProperty(
      "Inbound reply tracking configuration. Unchanged by this tool; set it with update_company."
    ),
  },
  add_website: {
    website: resourceOutputProperty(
      "Sending domain with its cohort-specific DNS records. Publish the DKIM record (for newer domains, the dnsRecords.platformDnsRecords CNAMEs instead: active and spare DKIM selectors plus a recommended return-path CNAME; only required entries block verification), the bounce records described by bounceRecords (cnameRecord when style is cname, otherwise spf.record and mailFrom.mxRecord, never both) and DMARC when present; trackingRecord is the optional company tracking domain CNAME. tracking {policy, required, hostname, status, ready, error, cnameRecord} reports the company tracking domain (policy is always legacy and required always false; deprecated)."
    ),
  },
  add_sending_domain: {
    website: resourceOutputProperty(
      "Sending domain with its cohort-specific DNS records. Publish the DKIM record (for newer domains, the dnsRecords.platformDnsRecords CNAMEs instead: active and spare DKIM selectors plus a recommended return-path CNAME; only required entries block verification), the bounce records described by bounceRecords (cnameRecord when style is cname, otherwise spf.record and mailFrom.mxRecord, never both) and DMARC when present; trackingRecord is the optional company tracking domain CNAME. tracking {policy, required, hostname, status, ready, error, cnameRecord} reports the company tracking domain (policy is always legacy and required always false; deprecated)."
    ),
  },
  configure_sending_domain: {
    message: messageOutputProperty,
    website: resourceOutputProperty(
      "Sending domain with tracking {policy, required, hostname, status, ready, error, cnameRecord} for the company tracking domain. Publish tracking.cnameRecord; links use it once status is verified."
    ),
  },
  get_tracking_domain: {
    trackingDomain: nullableObjectOutputProperty(
      "Company tracking domain {domain, status, active, everVerified, sslStatus, verifiedAt, lastCheckedAt, error, cnameRecord}, or null when links use the shared Sequenzy tracking domain. active is true once it verifies and links use it."
    ),
  },
  set_tracking_domain: {
    message: messageOutputProperty,
    trackingDomain: nullableObjectOutputProperty(
      "Company tracking domain {domain, status, active, everVerified, sslStatus, verifiedAt, lastCheckedAt, error, cnameRecord}. Publish cnameRecord; active is true once it verifies and links use it."
    ),
  },
  verify_tracking_domain: {
    message: messageOutputProperty,
    verified: booleanOutputProperty(
      "Whether the tracking domain's CNAME and HTTPS certificate are working."
    ),
    trackingDomain: nullableObjectOutputProperty(
      "Company tracking domain {domain, status, active, everVerified, sslStatus, verifiedAt, lastCheckedAt, error, cnameRecord} after the check."
    ),
  },
  remove_tracking_domain: {
    removed: booleanOutputProperty(
      "True when a tracking domain was removed; false when none was set."
    ),
    trackingDomain: nullableObjectOutputProperty(
      "Always null: links now use the shared Sequenzy tracking domain."
    ),
  },
  check_website: {
    website: resourceOutputProperty(
      "sending domain with separate DNS verification and readyToSend sending readiness; readiness.reason explains a domain that cannot send yet. inbound* fields in dnsRecords describe an older reply setup; receiving is managed with receiving domains."
    ),
    ready: booleanOutputProperty("Whether the sender website is ready."),
    status: stringOutputProperty("Current processing or verification status."),
  },
  verify_sending_domain: {
    website: resourceOutputProperty(
      "Sending domain with current DNS verification, readyToSend sending readiness, SPF, DKIM, and MAIL FROM details. When readyToSend is false, read readiness.reason. inbound* fields in dnsRecords describe an older reply setup; receiving is managed with receiving domains."
    ),
    verified: booleanOutputProperty(
      "Whether the sending domain passed the fresh DNS verification check. Correct DNS alone does not mean the domain can send yet."
    ),
    readyToSend: booleanOutputProperty(
      "Whether DNS and the selected home transport are both ready for sending."
    ),
    message: stringOutputProperty("Verification result summary."),
  },
  upgrade_sending_domain_dns: {
    website: resourceOutputProperty(
      "Sending domain; dnsUpgrade.records lists the CNAMEs to publish, each {purpose, type, name, value, required, status, diagnostic?}; dnsUpgrade.replacedRecords lists the current records to remove after the switch, each {type, name, removed}"
    ),
  },
  get_integration_guide: {
    guide: resourceOutputProperty("integration guide"),
    code: stringOutputProperty("Generated integration code or example."),
    steps: {
      type: "array",
      description: "Setup steps for the requested integration.",
      items: objectOutputProperty("One setup step."),
    },
  },
  add_subscriber: {
    subscriber: resourceOutputProperty("subscriber"),
  },
  create_subscriber_import: {
    import: objectOutputProperty(SUBSCRIBER_IMPORT_HINT),
    deduplicated: booleanOutputProperty(
      "Present and true when idempotencyKey matched an already-queued import. Nothing new was queued; `import` is the original import."
    ),
  },
  get_subscriber_import: {
    import: objectOutputProperty(SUBSCRIBER_IMPORT_HINT),
  },
  update_subscriber: {
    subscriber: resourceOutputProperty("subscriber"),
  },
  remove_subscriber: {
    subscriber: resourceOutputProperty("subscriber"),
    hardDeleted: booleanOutputProperty(
      "Whether the subscriber was permanently deleted."
    ),
  },
  get_subscriber: {
    subscriber: resourceOutputProperty("subscriber"),
  },
  list_subscriber_notes: {
    notes: resourceListOutputProperty("subscriber note"),
  },
  list_subscriber_attributes: {
    attributes: arrayOutputProperty(
      "Custom attributes in use, each with key, valueType (string, number, or boolean; string when mixedTypes is true), isArray, mixedTypes (contacts hold different types), sampleValue (null when no example is available), and sampledContacts (0 for names only older contacts carry)."
    ),
    sampledContacts: numberOutputProperty(
      "Recent contacts with custom attributes that were sampled for types and examples."
    ),
  },
  add_subscriber_note: {
    note: resourceOutputProperty("subscriber note"),
  },
  delete_subscriber_note: {
    id: stringOutputProperty("Deleted subscriber note ID."),
    deleted: booleanOutputProperty("Whether the subscriber note was deleted."),
  },
  trigger_subscriber_event: {
    account: resourceOutputProperty(
      "account membership (externalId, role, created), when an account reference was provided"
    ),
    accountIgnored: objectOutputProperty(
      "Present when `account` was ignored because the workspace has not turned Accounts on. Contains reason (accounts_not_enabled) and message."
    ),
    subscriber: resourceOutputProperty("subscriber"),
    event: resourceOutputProperty(
      "Live event with its name and whether the event definition was created. Historical responses use `events` instead."
    ),
    duplicate: booleanOutputProperty(
      "Present and true for a repeated live eventId. Nothing was written and no side effects ran; `event` is the existing event. Historical responses report skipped rows in `duplicates` instead."
    ),
    historical: booleanOutputProperty(
      "Present and true when occurredAt selected the historical import path."
    ),
    events: resourceListOutputProperty(
      "Historical events, each with id, name, and occurredAt."
    ),
    inserted: numberOutputProperty(
      "Historical event rows inserted by this request."
    ),
    duplicates: numberOutputProperty(
      "Historical event rows skipped because their idempotency receipt already existed."
    ),
    sideEffectFailures: {
      type: "array",
      description:
        "Sync-rule or automation side effects that failed. The event itself is still recorded.",
      items: stringOutputProperty("One failed side effect."),
    },
  },
  trigger_subscriber_events: {
    subscriber: resourceOutputProperty("subscriber"),
    events: resourceListOutputProperty("recorded event"),
  },
  import_subscriber_events: {
    total: numberOutputProperty("Events submitted in this request."),
    recorded: numberOutputProperty("Events recorded by this request."),
    duplicates: numberOutputProperty(
      "Events skipped because their eventId was already recorded."
    ),
    failed: numberOutputProperty("Events that failed to record."),
    sideEffectFailed: numberOutputProperty(
      "Receipt rows whose downstream side effects or historical automation shielding failed. This is orthogonal to receipt accounting and may accompany either a newly recorded or duplicate row during recovery."
    ),
    subscribers: numberOutputProperty(
      "Distinct subscriber identities in the request."
    ),
    failures: {
      type: "array",
      description:
        "Failed events by input index. Recorded events are kept, so treat an error as partial success and retry with the same eventIds.",
      items: {
        type: "object",
        description: "One failed event.",
        properties: {
          index: numberOutputProperty("Index into the submitted events array."),
          error: stringOutputProperty("Why this event failed."),
        },
      },
    },
    sideEffectFailures: {
      type: "array",
      description:
        "Post-write failures by input index. The receipt exists (new or duplicate); use the stages and optional error for recovery, then retry with the same eventId.",
      items: {
        type: "object",
        description:
          "One event receipt (new or duplicate) with failed downstream work.",
        properties: {
          index: numberOutputProperty("Index into the submitted events array."),
          stages: {
            type: "array",
            description: "Downstream stages that failed.",
            items: { type: "string", description: "Failed stage name." },
          },
          error: stringOutputProperty("Optional recovery guidance."),
        },
      },
    },
    error: stringOutputProperty(
      "The first row-level failure message when any event failed."
    ),
  },
  bulk_add_subscriber_tags: {
    tags: {
      type: "array",
      description: "Normalized tag names applied to every matched subscriber.",
      items: stringOutputProperty("One tag name."),
    },
    requested: numberOutputProperty("Identifiers supplied in the request."),
    matched: numberOutputProperty("Existing subscribers resolved."),
    updated: numberOutputProperty("Subscribers whose tags actually changed."),
    unchanged: numberOutputProperty(
      "Subscribers that already carried every tag."
    ),
    failed: numberOutputProperty("Subscribers whose update failed."),
    notFound: objectOutputProperty(
      "Identifiers that did not resolve, grouped as emails, externalIds, and subscriberIds. These subscribers were NOT created."
    ),
    failures: resourceListOutputProperty("per-subscriber failure (up to 50)"),
    triggeredAutomations: booleanOutputProperty(
      "Whether tag_added sequences were allowed to enroll these contacts."
    ),
  },
  bulk_remove_subscriber_tags: {
    tags: {
      type: "array",
      description:
        "Normalized tag names removed from every matched subscriber.",
      items: stringOutputProperty("One tag name."),
    },
    requested: numberOutputProperty("Identifiers supplied in the request."),
    matched: numberOutputProperty("Existing subscribers resolved."),
    updated: numberOutputProperty("Subscribers whose tags actually changed."),
    unchanged: numberOutputProperty(
      "Subscribers that did not carry any of the tags."
    ),
    failed: numberOutputProperty("Subscribers whose update failed."),
    notFound: objectOutputProperty(
      "Identifiers that did not resolve, grouped as emails, externalIds, and subscriberIds."
    ),
    failures: resourceListOutputProperty("per-subscriber failure (up to 50)"),
  },
  search_subscribers: {
    subscribers: resourceListOutputProperty("subscriber"),
    pagination: objectOutputProperty(
      "Pagination metadata: page, limit, offset, total (null when the server skipped the count, which it does for attribute filters), totalPages, fetchedPages, hasMore, nextOffset, and nextCursor. When hasMore is true, repeat the call with cursor set to nextCursor, or with offset set to nextOffset when nextCursor is null."
    ),
    returned: numberOutputProperty("Number of subscribers returned."),
    truncated: booleanOutputProperty(
      "Whether matches remain beyond the returned window. Same as pagination.hasMore."
    ),
  },
  list_products: {
    products: resourceListOutputProperty("product"),
    pagination: objectOutputProperty(
      "Pagination metadata: limit, offset, count (this page), total (whole catalog) and hasMore. Page with offset when hasMore is true."
    ),
  },
  upsert_products: {
    products: resourceListOutputProperty("product"),
    created: numberOutputProperty("Number of products created."),
    updated: numberOutputProperty("Number of products updated."),
  },
  delete_product: {
    productId: stringOutputProperty("Deleted product ID."),
  },
  attach_product_file: {
    product: resourceOutputProperty("product"),
    delivery: resourceOutputProperty("digital delivery file"),
  },
  remove_product_file: {
    product: resourceOutputProperty("product"),
  },
  open_image_upload: {
    mode: stringOutputProperty("Widget mode: upload."),
    companyId: stringOutputProperty("Pinned target company ID."),
  },
  monitor_subscriber_import: {
    mode: stringOutputProperty("Widget mode: import."),
    companyId: stringOutputProperty("Pinned target company ID."),
    importId: stringOutputProperty("Pinned import ID."),
    import: objectOutputProperty("Current subscriber import progress."),
  },
  preview_sequence: {
    mode: stringOutputProperty("Widget mode: sequence."),
    companyId: stringOutputProperty("Pinned target company ID."),
    sequenceId: stringOutputProperty("Pinned sequence ID."),
    sequence: objectOutputProperty(
      "Saved sequence topology and email steps, as returned by get_sequence."
    ),
  },
  upload_image_asset: {
    asset: resourceOutputProperty("hosted image asset"),
    imageBlock: objectOutputProperty(
      "Ready-to-insert Sequenzy image block using the hosted asset URL."
    ),
  },
  sync_products: {
    job: resourceOutputProperty("product sync job"),
    jobId: stringOutputProperty("Queued product sync job ID."),
  },
  list_accounts: {
    accounts: arrayOutputProperty(
      "Accounts (B2B organizations). Each entry includes id, externalId, name, domain, attributes, memberCount, lastEventAt, createdAt and updatedAt."
    ),
    total: numberOutputProperty("Total accounts matching the query."),
    page: numberOutputProperty("Current page."),
    limit: numberOutputProperty("Page size."),
    hasMore: booleanOutputProperty("Whether another page exists."),
  },
  get_account_by_external_id: {
    account: resourceOutputProperty("account"),
    members: arrayOutputProperty(
      "Members with subscriberId, email, externalId, role, firstName, lastName and status."
    ),
  },
  upsert_account: {
    account: resourceOutputProperty("account"),
    created: booleanOutputProperty("True when the account was created."),
    members: arrayOutputProperty("Members added in this call, when provided."),
  },
  delete_account: {
    deleted: booleanOutputProperty("True when the account was deleted."),
    membersCleared: numberOutputProperty(
      "Number of memberships removed (contacts are kept)."
    ),
  },
  list_account_members: {
    account: resourceOutputProperty("account reference (id, externalId)"),
    members: arrayOutputProperty("Members with their role, owners first."),
  },
  add_account_member: {
    account: resourceOutputProperty("account"),
    member: resourceOutputProperty(
      "membership (subscriberId, email, externalId, role, created, subscriberCreated)"
    ),
  },
  remove_account_member: {
    account: resourceOutputProperty("account"),
    removed: booleanOutputProperty("True when a membership was removed."),
  },
  trigger_account_event: {
    account: resourceOutputProperty("account"),
    event: resourceOutputProperty("recorded event (id, name, time)"),
    recipients: stringOutputProperty("Recipient rule that was applied."),
    recipientCount: numberOutputProperty("Contacts that received the event."),
    deliveries: arrayOutputProperty(
      "Per-recipient outcome with subscriberId, email, role, success and automationsTriggered."
    ),
  },
  list_account_suggestions: {
    suggestions: arrayOutputProperty(
      "Suggested accounts, largest first, each with domain, name, contactCount and up to 10 sampleEmails."
    ),
  },
  accept_account_suggestions: {
    results: arrayOutputProperty(
      "Per-domain outcome with domain, status (created, updated, skipped), reason (no_contacts, multiple_accounts, already_in_account or null), account, contactCount, membersAdded and truncated."
    ),
    accountsCreated: numberOutputProperty("Accounts created in this call."),
    membershipsCreated: numberOutputProperty(
      "Memberships created in this call."
    ),
  },
  detect_account_organization_ids: {
    candidates: arrayOutputProperty(
      "Organization ID keys, most useful first, each with source (event or attribute), propertyKey, nameKey, eventCount, accountCount and eventNames."
    ),
  },
  preview_accounts_from_organization_id: {
    organizations: arrayOutputProperty(
      "Biggest organizations first, each with externalId, name, domain, contactCount and up to 3 sampleEmails."
    ),
  },
  create_accounts_from_organization_id: {
    jobId: stringOutputProperty("Background job ID to check."),
    alreadyRunning: booleanOutputProperty(
      "True when a run for this key was already queued or running."
    ),
    job: resourceOutputProperty(
      "job status (jobId, state, settings, result, error); when alreadyRunning, settings are the running job's"
    ),
  },
  get_account_organization_id_job: {
    job: resourceOutputProperty(
      "job status: jobId, state (queued, running, completed, failed), settings (source, propertyKey, nameKey the run uses), result counts and error"
    ),
  },
  list_account_events: {
    account: resourceOutputProperty("account reference (id, externalId)"),
    events: arrayOutputProperty(
      "Account timeline events with id, name, eventTime, properties and recipientCount."
    ),
  },
  list_tags: {
    tags: resourceListOutputProperty("tag"),
  },
  create_tag: {
    tag: resourceOutputProperty("tag"),
  },
  update_tag: {
    tag: resourceOutputProperty("tag"),
  },
  delete_tag: {
    tagId: stringOutputProperty("Deleted tag ID."),
  },
  list_lists: {
    lists: arrayOutputProperty(
      "Subscriber lists. Each entry includes id, name, description, isPrivate, allowMemberUnsubscribe, createdAt, subscriberCount (current members of any status), and activeSubscriberCount (current members with status=active). Memberships with unsubscribedAt set are excluded."
    ),
  },
  create_list: {
    list: resourceOutputProperty("list"),
  },
  update_list: {
    list: resourceOutputProperty("list"),
  },
  delete_list: {
    listId: stringOutputProperty("Deleted list ID."),
  },
  add_subscribers_to_list: {
    list: resourceOutputProperty("list"),
    added: numberOutputProperty("Number of subscribers added to the list."),
    skipped: numberOutputProperty("Number of subscribers skipped."),
  },
  remove_subscribers_from_list: {
    list: resourceOutputProperty("list"),
    removed: numberOutputProperty(
      "Number of subscribers removed from the list."
    ),
    skipped: numberOutputProperty("Number of subscribers skipped."),
  },
  list_segments: {
    segments: resourceListOutputProperty("segment"),
  },
  create_segment: {
    segment: resourceOutputProperty("segment"),
  },
  update_segment: {
    segment: resourceOutputProperty("segment"),
  },
  delete_segment: {
    segmentId: stringOutputProperty("Deleted segment ID."),
  },
  get_segment_count: {
    count: numberOutputProperty("Number of subscribers matching the segment."),
    segmentId: stringOutputProperty("Segment ID that was counted."),
  },
  list_audience_syncs: {
    audienceSyncs: resourceListOutputProperty("audience sync"),
  },
  list_ad_accounts: {
    adAccounts: resourceListOutputProperty("ad account"),
  },
  create_audience_sync: {
    audienceSync: resourceOutputProperty("audience sync"),
  },
  update_audience_sync: {
    audienceSync: resourceOutputProperty("audience sync"),
  },
  delete_audience_sync: {
    audienceSyncId: stringOutputProperty("Deleted audience sync ID."),
  },
  sync_audience_now: {
    audienceSync: resourceOutputProperty("audience sync"),
    job: resourceOutputProperty("audience sync job"),
    jobId: stringOutputProperty("Queued audience sync job ID."),
  },
  list_templates: {
    templates: resourceListOutputProperty("email template"),
    pagination: objectOutputProperty(
      "Pagination metadata: limit, offset, count (this page), total (every email body) and hasMore. Page with offset when hasMore is true."
    ),
  },
  get_template: {
    template: resourceOutputProperty("email template"),
  },
  create_template: {
    template: resourceOutputProperty("email template"),
  },
  update_template: {
    template: resourceOutputProperty("email template"),
  },
  list_email_references: {
    kind: stringOutputProperty("campaign, sequence or transactional."),
    scope: stringOutputProperty("similar or all."),
    page: numberOutputProperty("This page of results."),
    pageCount: numberOutputProperty("How many pages there are."),
    profile: stringOutputProperty(
      "ready, or missing when the company has no description or company context to find brands like it (scope similar is then empty). Always ready for scope all."
    ),
    brands: arrayOutputProperty(
      "Scope similar: the gallery brands most like the company, closest first: name, domain, slug and url."
    ),
    emails: arrayOutputProperty(
      "Gallery emails: id, subject, preheader, type, subtype, sentAt, brand (name, domain, slug), url and analysis (null until analyzed): mainButton, buttonLabels, buttonCount, linkCount, wordCount, readingTimeSeconds, imageCount, hasGif, darkMode, fonts, columns, format, voice, language, structure (the email's beats in order), takeaways (why it works) and sender (redacted name and address, or null)."
    ),
    sequences: arrayOutputProperty(
      "Whole gallery sequences (kind sequence, first page only): id, name, emailCount, brand and url."
    ),
  },
  list_gallery_brand_requests: {
    requests: arrayOutputProperty(
      "Brand requests, newest first: id, domain, note, status (requested, collecting, available or declined), declineReason, requestedAt and brand (name, slug and url, once its emails are in the gallery)."
    ),
    limit: numberOutputProperty("How many requests a company can keep."),
  },
  request_gallery_brand: {
    created: booleanOutputProperty(
      "False when the company had already requested this domain."
    ),
    request: objectOutputProperty(
      "The request: id, domain, note, status, declineReason, requestedAt and brand."
    ),
    message: stringOutputProperty("What happens next."),
  },
  remove_gallery_brand_request: {
    deleted: booleanOutputProperty("True once removed."),
    id: stringOutputProperty("The removed request ID."),
  },
  list_watched_brands: {
    watchlist: arrayOutputProperty(
      "Watched brands, newest watch first: id, domain, note, status (available, requested, collecting or declined), declineReason, watchedAt, emailCount, latestEmailAt (when its newest gallery email was sent) and brand (name, slug and url, once its emails are in the gallery)."
    ),
    limit: numberOutputProperty(
      "How many watches and brand requests a company can keep together."
    ),
  },
  watch_brand: {
    created: booleanOutputProperty(
      "False when the company already watched this domain."
    ),
    watch: objectOutputProperty(
      "The watch: id, domain, note, status, declineReason, watchedAt, emailCount, latestEmailAt and brand."
    ),
    message: stringOutputProperty("What happens next."),
  },
  unwatch_brand: {
    deleted: booleanOutputProperty("True once removed."),
    id: stringOutputProperty("The removed watch ID."),
  },
  list_watched_brand_emails: {
    emails: arrayOutputProperty(
      "Emails from watched brands, newest sent first: id, subject, preheader, type, subtype, sentAt, collectedAt (when the gallery received it), brand (name, domain, slug), url (also accepted by create_template_from_example) and analysis (null until analyzed): the same breakdown as list_email_references."
    ),
    nextCursor: nullableStringOutputProperty(
      "Pass as cursor for older emails; null on the last page."
    ),
  },
  create_template_from_example: {
    template: resourceOutputProperty("email template"),
    example: objectOutputProperty(
      "The gallery example it was modeled on: brand, subject and url."
    ),
    message: stringOutputProperty("What was created and what to check."),
  },
  set_template_localization: {
    templateId: stringOutputProperty("Localized template ID."),
    localization: resourceOutputProperty("template localization"),
  },
  sync_template_localizations: {
    templateId: stringOutputProperty("Template ID queued for localization."),
    queuedLocales: {
      type: "array",
      description: "Locale codes queued for AI translation.",
      items: stringOutputProperty("One queued locale code."),
    },
    queuedVariantCount: numberOutputProperty(
      "Number of localized variants queued for translation."
    ),
    skippedLocales: {
      type: "array",
      description:
        "Locale codes kept because someone edited them (only with skipEdited).",
      items: stringOutputProperty("One skipped locale code."),
    },
  },
  get_template_localization_coverage: {
    primaryLocale: stringOutputProperty("Locale the emails are written in."),
    totalEmails: numberOutputProperty(
      "Sequence and transactional emails that should be translated."
    ),
    sequenceEmails: numberOutputProperty(
      "Sequence email steps and sequence A/B variants counted."
    ),
    transactionalEmails: numberOutputProperty(
      "Enabled transactional emails counted (0 for marketer keys)."
    ),
    locales: {
      type: "array",
      description:
        "One entry per enabled non-primary locale with total, upToDate, edited, outdated, translating, failed and missing counts.",
      items: objectOutputProperty("Translation counts for one locale."),
    },
  },
  translate_missing_template_localizations: {
    locales: {
      type: "array",
      description: "Locale codes that were checked for missing translations.",
      items: stringOutputProperty("One locale code."),
    },
    queuedEmails: numberOutputProperty(
      "Emails with at least one translation queued."
    ),
    queuedTranslations: numberOutputProperty(
      "Email and locale pairs queued for AI translation."
    ),
  },
  delete_template: {
    templateId: stringOutputProperty("Deleted template ID."),
  },
  list_email_components: {
    components: resourceListOutputProperty("email component"),
  },
  get_email_component: {
    component: resourceOutputProperty("email component"),
  },
  get_default_email_component: {
    component: resourceOutputProperty("default email component for the slot"),
  },
  preview_default_email_component: {
    application: resourceOutputProperty(
      "footer application preview: token, counts, affected and skipped email versions"
    ),
    renderedPreview: resourceOutputProperty(
      "optional visual preview: footerHtml, before/after HTML samples, and personalization limitations"
    ),
  },
  set_default_email_component: {
    component: resourceOutputProperty("saved default email component"),
    application: resourceOutputProperty(
      "applied preview counts and affected/skipped email versions, when application was supplied"
    ),
  },
  create_email_component: {
    component: resourceOutputProperty("email component"),
  },
  update_email_component: {
    component: resourceOutputProperty("email component"),
  },
  duplicate_email_component: {
    component: resourceOutputProperty("email component copy"),
  },
  delete_email_component: {
    id: stringOutputProperty("Deleted email component ID."),
  },
  list_ab_tests: {
    abTests: resourceListOutputProperty("A/B test"),
  },
  get_ab_test: {
    abTest: resourceOutputProperty("A/B test"),
  },
  get_ab_test_stats: {
    abTest: resourceOutputProperty("A/B test"),
    abTestId: stringOutputProperty("A/B test ID."),
    stats: resourceOutputProperty("A/B test statistics"),
    variants: arrayOutputProperty(
      "Per-variant stats: id, label, subject, isWinner and stats."
    ),
    significance: {
      type: "object",
      description:
        "Statistical significance of the winner metric. Before a winner is selected it uses the requested time range; once a winner is selected it compares only emails sent before the winner was chosen and ignores period/start/end. status is insufficient_data (a variant has under 30 recipients or too few opens/clicks), not_significant (the difference could still be chance), or significant (confidence reached confidenceLevel). Report not_significant leaders as ahead, not as winners. Automatic winner selection does not wait for significance.",
      properties: {
        metric: {
          type: "string",
          enum: [
            "open_rate",
            "click_rate",
            "goal_conversion_rate",
            "goal_value",
            "event_rate",
          ],
          description:
            "Metric compared, from the test's winner criteria. Goal and event criteria compare whether recipients converted (goal_value too, since value has no yes/no outcome).",
        },
        status: {
          type: "string",
          enum: ["insufficient_data", "not_significant", "significant"],
          description: "Whether the leader's advantage is significant.",
        },
        confidenceLevel: numberOutputProperty(
          "Confidence required for significant, from 0 to 1."
        ),
        leaderVariantId: nullableStringOutputProperty(
          "Variant with the highest rate; null when the top variants tie."
        ),
        leaderVariantLabel: nullableStringOutputProperty(
          "Label of the leading variant."
        ),
        confidence: nullableNumberOutputProperty(
          "One minus the corrected p-value (0-1); at or above confidenceLevel the difference is unlikely to be chance. Very strong results can round to exactly 1 (report as >99.9%). Null while data is insufficient."
        ),
        pValue: nullableNumberOutputProperty(
          "Corrected two-sided p-value; null while data is insufficient."
        ),
        relativeLift: nullableNumberOutputProperty(
          "Leader's relative improvement over the closest variant (0.3 = 30% higher); null without a leader or when the closest variant has no opens/clicks."
        ),
      },
    },
  },
  restart_ab_test: {
    abTest: resourceOutputProperty("A/B test"),
  },
  select_ab_test_winner: {
    abTest: resourceOutputProperty("A/B test with the selected winner"),
  },
  resume_ab_test: {
    abTest: resourceOutputProperty("A/B test that is testing again"),
  },
  update_ab_test_variant: {
    abTest: resourceOutputProperty("A/B test"),
    variant: resourceOutputProperty("A/B test variant"),
  },
  update_ab_test: {
    abTest: resourceOutputProperty("A/B test"),
  },
  create_ab_test: {
    abTest: resourceOutputProperty("A/B test"),
  },
  add_ab_test_variant: {
    abTest: resourceOutputProperty("A/B test"),
    variant: resourceOutputProperty("A/B test variant"),
  },
  delete_ab_test_variant: {
    abTest: resourceOutputProperty("A/B test"),
    variantId: stringOutputProperty("Deleted A/B test variant ID."),
  },
  delete_ab_test: {
    abTestId: stringOutputProperty("Deleted A/B test ID."),
  },
  list_campaigns: {
    campaigns: arrayOutputProperty(
      `List of campaign records returned by Sequenzy. hasAudience indicates an explicit audience configuration, not an eligible recipient count. ${campaignStoOutputHint}`
    ),
    pagination: objectOutputProperty(
      "Campaign page window: `limit`, `offset`, `count` returned in this page, `total` matching the filters, and `hasMore`. Keep calling with an advanced `offset` while `hasMore` is true to enumerate every campaign."
    ),
  },
  get_campaign: {
    campaign: objectOutputProperty(
      `The campaign record returned by Sequenzy. ${campaignStoOutputHint}`
    ),
  },
  get_campaign_audience: {
    campaignId: stringOutputProperty("Campaign the audience was resolved for."),
    campaignName: stringOutputProperty("Campaign name."),
    status: stringOutputProperty("Campaign status."),
    audience: objectOutputProperty(
      "Resolved targeting: `type`, a plain-language `summary`, `isUnset` (true when scheduling would fall back to every active subscriber), resolved `lists` and `segments` with names and a `missing` flag, `filters`, `include`/`exclude` rules, and individual subscriber adjustments."
    ),
    recipientCount: numberOutputProperty(
      "Number of subscribers matching the effective targeting right now."
    ),
    targetLists: nullableObjectOutputProperty(
      "Raw stored targeting exactly as persisted on the campaign. Null when targeting has never been set."
    ),
  },
  get_email_send: {
    emailSend: resourceOutputProperty(
      "email send, including copied-recipient identity and primary email send ID when applicable, and for an email that didn't arrive its outcome (bounced, blocked, delayed or failed) with a one-sentence reason"
    ),
    events: resourceListOutputProperty("email delivery event"),
  },
  list_email_sends: {
    emailSends: resourceListOutputProperty(
      "email send, with outcome (bounced, blocked, delayed or failed) and reason for an email that didn't arrive"
    ),
    pagination: resourceOutputProperty("email send pagination"),
    retentionDays: numberOutputProperty(
      "Number of days sent-email rows remain queryable in this collection."
    ),
  },
  list_recipient_suppressions: {
    suppressions: resourceListOutputProperty(
      "suppressed recipient, with suppressionType, reason, scope and whether it can be removed"
    ),
    total: numberOutputProperty(
      "Total suppressed recipients matching the filter."
    ),
    page: numberOutputProperty("1-based page number returned."),
    limit: numberOutputProperty("Entries per page."),
    hasMore: booleanOutputProperty("Whether another page is available."),
    sortBy: stringOutputProperty(
      "Sort field actually applied: suppressedAt, email or status. An unrecognized `sort` falls back to suppressedAt, so read this rather than assuming the requested order took effect."
    ),
    sortOrder: stringOutputProperty("Sort direction applied: asc or desc."),
  },
  get_recipient_suppression: {
    suppression: resourceOutputProperty("recipient suppression status"),
  },
  remove_recipient_suppression: {
    removed: booleanOutputProperty(
      "Whether a workspace soft-bounce escalation was removed."
    ),
    removedLocalBounce: booleanOutputProperty(
      "Whether the workspace-local soft-bounce escalation was removed."
    ),
    removedSesRegions: {
      type: "array",
      description:
        "Always empty. Sequenzy suppresses solely from its own bounce table and neither reads nor writes the email provider's suppression list. Retained for response compatibility.",
      items: stringOutputProperty("Unused; this array is always empty."),
    },
    remainingSuppression: resourceOutputProperty(
      "recipient suppression status after cleanup"
    ),
  },
  create_campaign: {
    campaign: resourceOutputProperty("campaign"),
  },
  create_campaign_for_audience: {
    campaign: resourceOutputProperty("draft campaign with frozen targetLists"),
    audience: resourceOutputProperty(
      "selection source, selectedCount, eligibleCount and selectedAt"
    ),
  },
  update_campaign: {
    campaign: resourceOutputProperty("campaign"),
  },
  schedule_campaign: {
    campaign: resourceOutputProperty("campaign"),
    scheduledAt: stringOutputProperty("Scheduled send timestamp."),
  },
  unschedule_campaign: {
    campaign: resourceOutputProperty("draft campaign"),
  },
  share_campaign: {
    shareUrl: stringOutputProperty(
      "Public anonymized view-in-browser URL for the campaign."
    ),
    shareToken: stringOutputProperty("Capability token embedded in the URL."),
    created: booleanOutputProperty(
      "False when an already-active link was returned instead of minted."
    ),
  },
  unshare_campaign: {
    revoked: booleanOutputProperty(
      "False when the campaign had no active public link."
    ),
  },
  share_template: {
    shareUrl: stringOutputProperty(
      "Public anonymized view-in-browser URL for the email."
    ),
    shareToken: stringOutputProperty("Capability token embedded in the URL."),
    created: booleanOutputProperty(
      "False when an already-active link was returned instead of minted."
    ),
  },
  unshare_template: {
    revoked: booleanOutputProperty(
      "False when the email had no active public link."
    ),
  },
  send_test_email: {
    emailSendId: stringOutputProperty("Durable test email delivery ID."),
    recipientEmail: stringOutputProperty("Test email recipient."),
  },
  send_test_sms: {
    smsSendId: stringOutputProperty("Created test SMS send ID."),
    toPhone: stringOutputProperty("Normalized E.164 destination phone."),
  },
  update_sms_number_label: {
    number: resourceOutputProperty(
      "updated SMS number (label, brandPrefix override, linkShorteningEnabled)"
    ),
  },
  release_sms_number: {
    number: resourceOutputProperty("released SMS number (id + status)"),
  },
  cancel_campaign: {
    campaign: resourceOutputProperty("campaign"),
  },
  pause_campaign: {
    campaign: resourceOutputProperty("campaign"),
  },
  resume_campaign: {
    campaign: resourceOutputProperty("campaign"),
  },
  delete_campaign: {
    campaignId: stringOutputProperty("Deleted campaign ID."),
  },
  duplicate_campaign: {
    campaign: resourceOutputProperty("duplicated campaign"),
  },
  resend_campaign_to_non_openers: {
    campaign: resourceOutputProperty("non-opener resend draft campaign"),
    estimatedNonOpenerCount: numberOutputProperty(
      "Estimated number of subscribers who haven't opened the original campaign."
    ),
  },
  list_capture_submissions: {
    source: resourceOutputProperty(
      "form, popup or landing page; id, name and type"
    ),
    submissions: resourceListOutputProperty(
      "saved submission with id, companyId, sourceType, sourceId, nullable formId/popupId/landingPageId, subscriberId, createdAt, normalized payload and fieldLabels; optional payload.recovery marks reconstructed records with evidenceType, evidenceId, recoveredAt, sourceAttribution=inferred and timestampMeaning=event_time"
    ),
    nextCursor: nullableStringOutputProperty(
      "Cursor for the next page, or null when complete."
    ),
    csv: stringOutputProperty(
      "CSV for this page, present only when format is csv."
    ),
  },
  list_forms: {
    forms: resourceListOutputProperty("saved form"),
  },
  create_form: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets, with recommendedSnippet and reducedProtectionWarning."
    ),
  },
  update_form: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets, with recommendedSnippet and reducedProtectionWarning (published forms only)."
    ),
  },
  get_form_embed: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets, with recommendedSnippet (javascript, the only one with spam protection), placeholder (positions the javascript form when its script loads elsewhere) and reducedProtectionWarning to show when nativeForm or fetch is used."
    ),
  },
  list_popups: {
    popups: resourceListOutputProperty("saved popup"),
  },
  get_popup: {
    popup: resourceOutputProperty("saved popup"),
    embed: objectOutputProperty(
      "Script URL plus HTML, React, WordPress, and Shopify snippets (published popups only)."
    ),
  },
  create_popup: {
    popup: resourceOutputProperty("saved popup"),
    embed: objectOutputProperty(
      "Script URL plus HTML, React, WordPress, and Shopify snippets (published popups only)."
    ),
  },
  update_popup: {
    popup: resourceOutputProperty("saved popup"),
    embed: objectOutputProperty(
      "Script URL plus HTML, React, WordPress, and Shopify snippets (published popups only)."
    ),
  },
  get_popup_embed: {
    popup: resourceOutputProperty("saved popup"),
    embed: objectOutputProperty(
      "Script URL plus HTML, React, WordPress, and Shopify snippets."
    ),
  },
  duplicate_popup: {
    popup: resourceOutputProperty("popup copy, created as a draft"),
  },
  delete_popup: {
    popupId: stringOutputProperty("Deleted popup ID."),
  },
  list_landing_pages: {
    landingPages: resourceListOutputProperty("landing page"),
  },
  get_landing_page: {
    landingPage: resourceOutputProperty("landing page"),
  },
  get_landing_page_stats: {
    stats: objectOutputProperty(
      "Landing page analytics for the requested window: visits, uniqueVisits, clicks, subscribes, conversionRate (subscribes / uniqueVisits), botVisits, dataAvailableFrom, a daily histogram, referrers, and UTM sources. Default counts exclude known crawlers. Preview URLs and the editor are never counted."
    ),
  },
  render_landing_page: {
    previewUrl: stringOutputProperty(
      "Signed, unlisted visitor-facing preview of the current page content. Works for drafts. Not indexed. Share this URL to review layout and copy without publishing."
    ),
    publicUrl: nullableStringOutputProperty(
      "Public visitor URL, or null until the page is published."
    ),
    landingPageId: stringOutputProperty("Landing page ID."),
    name: stringOutputProperty("Landing page name."),
    status: stringOutputProperty(
      "draft or published. Drafts are only visible at previewUrl."
    ),
    published: booleanOutputProperty(
      "Whether the page is live on publicUrl. False for drafts."
    ),
    title: stringOutputProperty(
      "Visitor-facing title from SEO metadata or the first heading."
    ),
  },
  create_landing_page: {
    landingPage: resourceOutputProperty("landing page"),
  },
  update_landing_page: {
    landingPage: resourceOutputProperty("landing page"),
  },
  duplicate_landing_page: {
    landingPage: resourceOutputProperty("landing page"),
  },
  delete_landing_page: {
    landingPageId: stringOutputProperty("Deleted landing page ID."),
  },
  publish_landing_page: {
    landingPage: resourceOutputProperty("landing page"),
  },
  unpublish_landing_page: {
    landingPage: resourceOutputProperty("landing page"),
  },
  connect_landing_page_domain: {
    landingPage: resourceOutputProperty("landing page"),
    domain: stringOutputProperty("Connected landing page domain."),
  },
  update_landing_page_domain_settings: {
    landingPage: resourceOutputProperty("landing page"),
    domain: stringOutputProperty("Landing page domain."),
  },
  remove_landing_page_domain: {
    domain: resourceOutputProperty("landing page domain state"),
  },
  list_sequences: {
    sequences: sequenceListOutputProperty,
    pagination: objectOutputProperty(
      "Sequence page window: `limit` (null when limit and offset were both omitted and every sequence was returned), `offset`, `count` returned in this page, `total` matching the filters, and `hasMore`."
    ),
  },
  get_sequence: {
    sequence: sequenceOutputProperty,
  },
  list_sequence_enrollments: {
    sequenceId: stringOutputProperty(
      "Sequence ID these enrollments belong to."
    ),
    sequenceName: stringOutputProperty("Sequence name."),
    statuses: {
      type: "array",
      description:
        "Enrollment statuses included in this response. Defaults to active, waiting, and paused.",
      items: { type: "string", description: "Enrollment status." },
    },
    stopCondition: objectOutputProperty(
      "The sequence's single configured stop condition: `type` (`none` when unset), `value`, and nullable `matchConfig` containing event-property filters, a field comparison, or entry_audience resolution. For entry_audience, value is null and audience identifies the enrolling tag or list resolved per contact. Stop conditions are re-evaluated when an enrollment next runs a step, not when their event arrives."
    ),
    stopConditionMatchEvaluatedCount: numberOutputProperty(
      "How many enrollments in this page were actually evaluated for a current stop-condition match. 0 when stopConditionMatch was not requested, the sequence has no stop condition, or no returned enrollment was still active or waiting."
    ),
    enrollments: {
      type: "array",
      description:
        "Contact-level enrollments matching the filters, one row per enrollment token.",
      items: {
        type: "object",
        description: "One subscriber's enrollment in this sequence.",
        properties: {
          enrollmentId: stringOutputProperty(
            "Enrollment token ID. Stable identifier for this one run through the sequence."
          ),
          sequenceId: stringOutputProperty("Sequence ID."),
          subscriberId: stringOutputProperty("Subscriber ID."),
          // Every one of these is nullable on the wire, and ajv rejects the
          // whole tool call on a `null` in a plain-string field. Any enrollment
          // whose contact has no stored name reaches this listing.
          email: nullableStringOutputProperty(
            "Subscriber email address. Falls back to the address captured at enrollment when the subscriber record no longer exists, and is null when neither is known."
          ),
          firstName: nullableStringOutputProperty(
            "Subscriber first name, or null when unset."
          ),
          lastName: nullableStringOutputProperty(
            "Subscriber last name, or null when unset."
          ),
          subscriberStatus: nullableStringOutputProperty(
            "Subscriber status (active, unsubscribed, bounced), or null when the subscriber record no longer exists."
          ),
          status: stringOutputProperty(
            "Enrollment status: active, waiting, paused, completed, failed, or cancelled."
          ),
          currentNodeId: stringOutputProperty(
            "Sequence node this enrollment is currently sitting on."
          ),
          currentNodeType: stringOutputProperty(
            "Current sequence node type. Omitted when the node no longer exists in the graph."
          ),
          currentNodeLabel: stringOutputProperty(
            "Current sequence node label or email subject when available."
          ),
          currentNodeMissing: booleanOutputProperty(
            "Whether the current node no longer exists in the sequence graph."
          ),
          enrollmentKey: stringOutputProperty(
            "Key that distinguishes concurrent enrollments of the same subscriber in this sequence."
          ),
          enrollmentStartedAt: stringOutputProperty(
            "ISO 8601 timestamp when this enrollment entered the sequence."
          ),
          waitUntil: nullableStringOutputProperty(
            "ISO 8601 timestamp this enrollment is scheduled to resume, or null when nothing is scheduled."
          ),
          lastUpdatedAt: stringOutputProperty(
            "ISO 8601 timestamp of the last change to this enrollment. For a waiting enrollment this is when it arrived at its current node; the platform does not separately track node entry time."
          ),
          failedReason: nullableStringOutputProperty(
            "Why this enrollment stopped, for status `failed`. Null for every other status and for failures recorded before this field existed. A reason repeated across enrollments on the same currentNodeId points at that step's configuration or content rather than at the contacts."
          ),
          movedFromNodeId: nullableStringOutputProperty(
            "Step this enrollment was released from by move_sequence_enrollments, or null when it reached its current step on its own."
          ),
          movedAt: nullableStringOutputProperty(
            "ISO 8601 timestamp of that release, or null when the enrollment was never moved."
          ),
          moveReason: nullableStringOutputProperty(
            "Note recorded with that release, or null when none was given."
          ),
          pausedAt: nullableStringOutputProperty(
            "When pause_sequence_subscribers paused this enrollment, or null when it is not paused."
          ),
          pauseReason: nullableStringOutputProperty(
            "Reason passed to pause_sequence_subscribers, or null."
          ),
          stopConditionMatches: nullableBooleanOutputProperty(
            "Whether the sequence's stop condition matches for this contact right now. Null when it was not determined: stopConditionMatch was not requested, the sequence has no stop condition, this enrollment is no longer active or waiting, or it fell outside the evaluated window. Null never means `does not match`. This is a non-atomic snapshot: the worker re-checks before a future step, but the condition can change and a step already past its stop check may still finish."
          ),
          stopConditionMatchReason: nullableStringOutputProperty(
            "Human-readable reason the stop condition matches, such as the stop event or tag that satisfied it. Null when stopConditionMatches is not true."
          ),
          enteredVia: {
            type: "object",
            description:
              "What put this contact into the sequence. Use this to distinguish which list or tag matched a multi-value trigger.",
            properties: {
              kind: stringOutputProperty(
                "Entry source kind: list, tag, segment, event, inactivity, frequency, manual, test_run, or unknown."
              ),
              value: nullableStringOutputProperty(
                "Raw list ID, tag name, segment ID, event name, or monitored event name. Null for manual, test_run, and unknown."
              ),
              name: nullableStringOutputProperty(
                "Resolved display name for list and segment sources, or null when not applicable or deleted."
              ),
              description: stringOutputProperty(
                "Ready-to-display description of the entry source."
              ),
            },
            required: ["kind", "value", "name", "description"],
            additionalProperties: true,
          },
          entryContext: {
            type: "object",
            description:
              "Event or manual-enrollment context captured at entry. Property keys only; values are never returned.",
            properties: {
              triggerType: nullableStringOutputProperty(
                "Stored entryTriggerType, such as event_received or manual_enrollment. Null when never stamped."
              ),
              eventId: nullableStringOutputProperty(
                "Durable ID of the enrolling event, or null."
              ),
              eventName: nullableStringOutputProperty(
                "Enrolling event name, or null."
              ),
              hasEventProperties: booleanOutputProperty(
                "Whether any event property keys were stored on this enrollment."
              ),
              eventPropertyKeys: {
                type: "array",
                description:
                  "Keys present on the enrolling event payload. Values are omitted.",
                items: { type: "string", description: "Event property key." },
              },
              hasFieldSnapshots: booleanOutputProperty(
                "Whether subscriber field snapshots were stored at enrollment."
              ),
              fieldSnapshotKeys: {
                type: "array",
                description:
                  "Subscriber field paths snapshotted at enrollment. Values are omitted.",
                items: { type: "string", description: "Field path." },
              },
            },
            additionalProperties: true,
          },
          branchDecisions: {
            type: "array",
            description:
              "Bounded redacted if/else and random-split verdicts, oldest first within the retained window. Compared values are summaries (missing, empty, nonempty, equals_expected), never the raw field or event-property value. Empty on enrollments recorded before this field existed; use get_sequence_enrollment to reconstruct those from ClickHouse.",
            items: objectOutputProperty(
              "One branch or condition decision, including selectedPath and per-branch evaluations."
            ),
          },
          branchDecisionCount: numberOutputProperty(
            "Total branch and condition decisions taken, including decisions omitted from the bounded array."
          ),
          branchDecisionsTruncated: booleanOutputProperty(
            "Whether older decisions were omitted from branchDecisions."
          ),
        },
        // `failedReason` is deliberately absent, like every other field this
        // package added after the fact: clients validate structuredContent
        // against this schema, so requiring a key the deployed API may not
        // return yet would fail the whole tool call during the window between
        // publishing this package and shipping the API change. It is declared
        // nullable instead.
        required: [
          "enrollmentId",
          "sequenceId",
          "subscriberId",
          "status",
          "currentNodeId",
          "currentNodeMissing",
          "enrollmentStartedAt",
        ],
      },
    },
    pagination: objectOutputProperty("Pagination metadata."),
  },
  get_sequence_enrollment: {
    sequenceId: stringOutputProperty("Sequence ID."),
    sequenceName: stringOutputProperty("Sequence name."),
    stopCondition: objectOutputProperty(
      "The sequence's single configured stop condition."
    ),
    enrollment: objectOutputProperty(
      "The enrollment token: enteredVia, entryContext (event keys, never values), and branchDecisions (redacted)."
    ),
    nodeHistory: arrayOutputProperty(
      "ClickHouse graph-walk events for this token, oldest first. Each item may include a redacted branchDecision reconstructed from stored metadata when the token itself has none."
    ),
    nodeHistoryTruncated: booleanOutputProperty(
      "Whether additional node events exist beyond the returned bounded history."
    ),
    nodeHistoryLimit: numberOutputProperty(
      "Maximum number of node events returned."
    ),
    historySource: stringOutputProperty(
      "Where the branch history came from: node_events, token_context, both, or none."
    ),
  },
  start_sequence_test_run: {
    run: objectOutputProperty(
      "Created run with id, status, recipientEmails, subscriberId, speedMultiplier, timestamps, steps, errorMessage and jobId."
    ),
  },
  get_sequence_test_run: {
    run: objectOutputProperty(
      "Run with id, status, recipientEmails, subscriberId, speedMultiplier, timestamps, steps and errorMessage."
    ),
  },
  simulate_sequence: {
    sequenceId: stringOutputProperty("Sequence ID."),
    sequenceName: stringOutputProperty("Sequence name."),
    status: stringOutputProperty("Stored sequence status."),
    sendsMail: booleanOutputProperty(
      "Always false. Simulation never sends mail or enrolls anyone."
    ),
    enrollment: objectOutputProperty(
      "Who currently matches and the confirmation that enable_sequence does not enroll existing contacts. List, tag, and segment matches can still be enrolled by hand."
    ),
    readiness: objectOutputProperty(
      "Activation checks: ready, errors that should be fixed before enable_sequence, and non-blocking warnings."
    ),
    path: nullableObjectOutputProperty(
      "Walked graph for the optional stored subscriber, including branch verdicts, emailStepsOnPath (traversed email nodes), and emailsOnPath (emails deliverable for the subscriber's current email/status). Null when no subscriberId or email was passed."
    ),
  },
  send_sequence_test_email: {
    sequenceId: stringOutputProperty("Sequence ID."),
    nodeId: stringOutputProperty("Tested sequence email-step node ID."),
    results: arrayOutputProperty(
      "Per-recipient test-send results containing recipientEmail, durable emailSendId, and legacy jobId."
    ),
  },
  preview_template_from_example: {
    preview: objectOutputProperty(
      "The unsaved rewrite: brandName and website (whose brand it is written in; website null for this company's own), subject, previewText and html."
    ),
    example: objectOutputProperty(
      "The gallery example it is modeled on: brand, subject and url."
    ),
    message: stringOutputProperty(
      "That nothing was saved, and how to save it."
    ),
  },
  preview_sequence_from_example: {
    preview: objectOutputProperty(
      "The unsaved rewrite: brandName, website (null for this company's own brand), emails (stepNumber, day, originalSubject, subject, previewText, html for each of the first emails), remainingEmailCount and failedEmailCount."
    ),
    example: objectOutputProperty(
      "The gallery sequence it is modeled on: brand, name, emailCount and url."
    ),
    message: stringOutputProperty(
      "That nothing was saved, and how to clone it."
    ),
  },
  create_sequence_from_example: {
    sequence: sequenceOutputProperty,
    example: objectOutputProperty(
      "The gallery sequence it was cloned from: brand, name, url, omittedEmailCount (the example's emails left out: not chosen in stepNumbers, or beyond the 12-step limit) and stepNumbers (positions of the cloned emails in the example)."
    ),
    message: stringOutputProperty("What was created and what happens next."),
  },
  create_sequence: {
    sequence: sequenceOutputProperty,
    eventTrackingCode: stringOutputProperty(
      "Ready-to-adapt code for sending a custom trigger event, including any matching-field property."
    ),
    eventTracking: objectOutputProperty(
      "Custom-event endpoint, payload contract, example payload, documentation URL, and get_integration_guide arguments."
    ),
    requiredEvents: {
      type: "array",
      description: "Event names the application or an integration must send.",
      items: stringOutputProperty("One required event name."),
    },
  },
  update_sequence: {
    sequence: sequenceMutationOutputProperty,
  },
  update_sequence_node: {
    sequence: resourceOutputProperty("sequence"),
  },
  update_sequence_nodes: {
    sequence: resourceOutputProperty("sequence"),
  },
  edit_sequence_graph: {
    sequence: sequenceMutationOutputProperty,
  },
  get_sequence_definition: {
    format: stringOutputProperty(
      "readable or raw: which form definition is in."
    ),
    definition: objectOutputProperty(
      "The sequence definition: key, id, name, description, managedBy, status, settings, steps and connections."
    ),
  },
  push_sequence_definition: {
    dryRun: booleanOutputProperty(
      "Whether the changes were only returned, not saved."
    ),
    created: booleanOutputProperty("Whether the push created a new sequence."),
    hasChanges: booleanOutputProperty(
      "Whether the document differs from what is stored."
    ),
    sequence: objectOutputProperty(
      "The sequence: id, key, name, status and managedBy."
    ),
    changes: objectOutputProperty(
      "Changed sequence fields, added/changed/removed steps (with waiting contact counts) and added/removed connections."
    ),
    warnings: arrayOutputProperty(
      "Fields that were ignored or need attention."
    ),
  },
  edit_sequence_emails: {
    dryRun: booleanOutputProperty(
      "Whether the changes were only returned, not saved."
    ),
    emails: resourceListOutputProperty("edited sequence email"),
    skipped: resourceListOutputProperty("skipped sequence step"),
  },
  list_sequence_email_variations: {
    mode: stringOutputProperty("Widget mode: variations."),
    target: stringOutputProperty("What they are variations of: sequence."),
    sequenceId: stringOutputProperty("Pinned sequence ID."),
    emailId: stringOutputProperty("Pinned email ID."),
    email: objectOutputProperty(
      "The email they are variations of: emailId, nodeId and label."
    ),
    companyId: stringOutputProperty("Pinned company ID, when one was passed."),
    variations: resourceListOutputProperty("sequence email variation"),
  },
  generate_sequence_email_variations: {
    mode: stringOutputProperty("Widget mode: variations."),
    target: stringOutputProperty("What they are variations of: sequence."),
    sequenceId: stringOutputProperty("Pinned sequence ID."),
    emailId: stringOutputProperty("Pinned email ID."),
    email: objectOutputProperty(
      "The email they are variations of: emailId, nodeId and label."
    ),
    companyId: stringOutputProperty("Pinned company ID, when one was passed."),
    newVariationIds: {
      type: "array",
      description: "IDs of the variations this call started.",
      items: stringOutputProperty("Variation ID."),
    },
    variations: resourceListOutputProperty("sequence email variation"),
  },
  use_sequence_email_variation: {
    dryRun: booleanOutputProperty(
      "Whether the result was only returned, not saved."
    ),
    emails: resourceListOutputProperty("changed sequence email"),
  },
  discard_sequence_email_variation: {
    discarded: booleanOutputProperty("Whether the variation was discarded."),
  },
  insert_sequence_step: {
    sequence: resourceOutputProperty("sequence"),
    insertedNodeIds: {
      type: "array",
      description:
        "Node IDs created for a linear inserted step, including any delay or wait-for-event node.",
      items: stringOutputProperty("Inserted automation node ID."),
    },
    insertedEmailIds: {
      type: "array",
      description: "Email template IDs created for the inserted step.",
      items: stringOutputProperty("Inserted email template ID."),
    },
    insertedEmailCount: numberOutputProperty("Number of email steps inserted."),
    addedBranchNodeId: stringOutputProperty(
      "New logic_branch node ID when the inserted step is a branch."
    ),
    addedBranchPathNodeIds: objectOutputProperty(
      "Created path node IDs keyed by branch ID, plus else, in path order. Directly wired paths have empty arrays. Use a path's last node ID as afterNodeId to insert a nested branch on that path."
    ),
  },
  // enable/disable answer with the sequence's new state inline rather than a
  // nested record, the same shape as the enrollment pause/resume tools.
  enable_sequence: {
    sequenceId: stringOutputProperty("Sequence ID."),
    status: stringOutputProperty("Stored lifecycle status after the change."),
    enrollmentPaused: booleanOutputProperty(
      "Whether new sequence enrollments are paused."
    ),
    ...sequenceRunStateOutputProperties,
  },
  disable_sequence: {
    sequenceId: stringOutputProperty("Sequence ID."),
    status: stringOutputProperty("Stored lifecycle status after the change."),
    enrollmentPaused: booleanOutputProperty(
      "Whether new sequence enrollments are paused."
    ),
    ...sequenceRunStateOutputProperties,
  },
  duplicate_sequence: {
    sequence: sequenceOutputProperty,
    nodes: resourceListOutputProperty("sequence node"),
    edges: resourceListOutputProperty("sequence edge"),
  },
  archive_sequence: {
    sequence: sequenceOutputProperty,
  },
  unarchive_sequence: {
    sequence: sequenceOutputProperty,
  },
  list_campaign_goals: {
    goals: resourceListOutputProperty("campaign goal"),
  },
  list_campaign_variations: {
    mode: stringOutputProperty("Widget mode: variations."),
    target: stringOutputProperty("What they are variations of: campaign."),
    campaignId: stringOutputProperty("Pinned campaign ID."),
    companyId: stringOutputProperty("Pinned company ID, when one was passed."),
    variations: resourceListOutputProperty("campaign variation"),
  },
  get_campaign_variation: {
    variation: resourceOutputProperty("campaign variation"),
  },
  generate_campaign_variations: {
    mode: stringOutputProperty("Widget mode: variations."),
    target: stringOutputProperty("What they are variations of: campaign."),
    campaignId: stringOutputProperty("Pinned campaign ID."),
    companyId: stringOutputProperty("Pinned company ID, when one was passed."),
    newVariationIds: {
      type: "array",
      description: "IDs of the variations this call started.",
      items: stringOutputProperty("Variation ID."),
    },
    variations: resourceListOutputProperty("campaign variation"),
  },
  create_campaign_variation: {
    variation: resourceOutputProperty("campaign variation"),
  },
  update_campaign_variation: {
    variation: resourceOutputProperty("campaign variation"),
  },
  discard_campaign_variation: {
    discarded: booleanOutputProperty("Whether the variation was discarded."),
  },
  restore_campaign_variation: {
    variation: resourceOutputProperty("campaign variation"),
  },
  use_campaign_variation: {
    variation: resourceOutputProperty("campaign variation"),
    savedPrevious: nullableObjectOutputProperty(
      "The email's previous content, saved as a variation. Null when it already was one."
    ),
  },
  generate_campaign_variation_section_options: {
    options: resourceListOutputProperty("section option"),
  },
  edit_campaign_variation: {
    variation: resourceOutputProperty("campaign variation"),
    summary: stringOutputProperty("What the edit changed."),
  },
  create_campaign_goal: {
    goal: resourceOutputProperty("campaign goal"),
  },
  update_campaign_goal: {
    goal: resourceOutputProperty("campaign goal"),
  },
  delete_campaign_goal: {
    goalId: stringOutputProperty("Deleted campaign goal ID."),
  },
  list_sequence_goals: {
    goals: resourceListOutputProperty("sequence goal"),
  },
  list_sequence_templates: {
    templates: resourceListOutputProperty("sequence template"),
  },
  create_sequence_from_template: {
    sequence: resourceOutputProperty("sequence"),
  },
  create_sequence_goal: {
    goal: resourceOutputProperty("sequence goal"),
  },
  update_sequence_goal: {
    goal: resourceOutputProperty("sequence goal"),
  },
  delete_sequence_goal: {
    goalId: stringOutputProperty("Deleted sequence goal ID."),
  },
  get_sequence_inbound_webhook: {
    webhook: resourceOutputProperty("sequence inbound webhook"),
  },
  configure_sequence_inbound_webhook: {
    webhook: resourceOutputProperty("sequence inbound webhook"),
  },
  rotate_sequence_inbound_webhook_secret: {
    webhook: resourceOutputProperty("sequence inbound webhook"),
  },
  pause_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    enrollmentPaused: booleanOutputProperty(
      "Whether new sequence enrollments are paused."
    ),
    ...sequenceRunStateOutputProperties,
  },
  resume_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    enrollmentPaused: booleanOutputProperty(
      "Whether new sequence enrollments are paused."
    ),
    ...sequenceRunStateOutputProperties,
  },
  enroll_subscribers_in_sequence: {
    sequence: resourceOutputProperty("sequence"),
    enrollments: resourceListOutputProperty("sequence enrollment"),
    enrolled: numberOutputProperty("Number of subscribers enrolled."),
    skipped: numberOutputProperty("Number of subscribers skipped."),
  },
  enroll_sequence_audience: {
    dryRun: booleanOutputProperty(
      "True when this call only estimated the audience instead of starting a run."
    ),
    matchingCount: numberOutputProperty(
      "Estimate only: contacts matching the audience."
    ),
    alreadyEnrolledCount: numberOutputProperty(
      "Estimate only: matching contacts skipped because they are already in the sequence."
    ),
    enrollableCount: numberOutputProperty(
      "Estimate only: contacts that would be enrolled."
    ),
    audienceEnrollment: nullableObjectOutputProperty(
      "Started run: id, status, estimatedCount, processedCount, enrolledCount, skippedCount, targetNodeId, data (run-level values read as {{enrollment.*}}, or null) and timestamps. Null for estimates. includedSubscriberCount gives the number of hand-picked contacts; audience.includedSubscriberIds lists at most the first 20, with includedSubscriberIdsTruncated true when cut."
    ),
  },
  list_sequence_audience_enrollments: {
    audienceEnrollments: resourceListOutputProperty(
      "audience enrollment run with status and counters (hand-picked ID lists are cut to the first 20; see includedSubscriberCount)"
    ),
  },
  get_sequence_audience_enrollment: {
    audienceEnrollment: objectOutputProperty(
      "Audience enrollment run: id, status (queued, running, completed, cancelled, failed), estimatedCount, processedCount, enrolledCount, skippedCount, data (run-level values read as {{enrollment.*}}, or null), error and timestamps. includedSubscriberCount gives the number of hand-picked contacts; audience.includedSubscriberIds lists at most the first 20, with includedSubscriberIdsTruncated true when cut."
    ),
  },
  cancel_sequence_audience_enrollment: {
    audienceEnrollment: objectOutputProperty(
      "The run after cancellation: status cancelled, or running with cancelRequestedAt while it stops."
    ),
  },
  get_sequence_recurring_enrollment: {
    enrollmentMode: stringOutputProperty(
      "Who enters at each run: unlimited (everyone who matches) or one_time (only people who never entered). The sequence's enrollment mode."
    ),
    recurringEnrollment: nullableObjectOutputProperty(
      'The schedule: enabled, audience, schedule (frequency, weekdays, monthDays with "last" for the last day, time, timezone), enabledAt, nextRunAt, lastRunAt, lastRunId, lastSkippedAt, lastSkipReason (not_accepting or missed) and endsAt (no runs after it; nextRunAt is null once nothing is left). Null when the sequence has no schedule.'
    ),
    description: nullableStringOutputProperty(
      'Readable summary such as "Monthly on the 1st and the last day at 10:00 (Europe/London)", or null.'
    ),
    upcomingRuns: {
      type: "array",
      items: { type: "string" },
      description:
        "Next run times as ISO 8601 instants; empty while switched off.",
    },
  },
  set_sequence_recurring_enrollment: {
    enrollmentMode: stringOutputProperty(
      "Who enters at each run: unlimited (everyone who matches) or one_time (only people who never entered). The sequence's enrollment mode."
    ),
    recurringEnrollment: nullableObjectOutputProperty(
      "The stored schedule (same shape as get_sequence_recurring_enrollment), or null after remove."
    ),
    description: nullableStringOutputProperty(
      "Readable summary of the schedule, or null."
    ),
    upcomingRuns: {
      type: "array",
      items: { type: "string" },
      description:
        "Next run times as ISO 8601 instants; empty while switched off or removed.",
    },
    message: stringOutputProperty("What was saved and when the first run is."),
  },
  cancel_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    dryRun: booleanOutputProperty(
      "Whether this call only reported matches instead of cancelling them."
    ),
    target: objectOutputProperty(
      "Resolved cancellation target: mode all, subscriber, subscribers (with notFoundSubscriberIds), or field."
    ),
    matchedCount: numberOutputProperty(
      "Active, waiting, or paused enrollments matching the target when the request started."
    ),
    cancelledCount: numberOutputProperty("Enrollments cancelled by this call."),
    remainingCount: numberOutputProperty(
      "Enrollments still matching after this call. Repeat the same request while this is above zero."
    ),
    enrollments: resourceListOutputProperty(
      "sequence enrollment sample (up to 50)"
    ),
    hasMore: booleanOutputProperty(
      "Whether more enrollments matched than the returned sample."
    ),
  },
  move_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    dryRun: booleanOutputProperty(
      "Whether this call only reported the batch instead of moving it."
    ),
    fromNodeId: stringOutputProperty("Step the enrollments were taken from."),
    targetNodeId: stringOutputProperty(
      "Step the enrollments were moved onto, resolved from the source step's next step when not supplied."
    ),
    sort: stringOutputProperty("Order the batch was selected in."),
    requestedLimit: numberOutputProperty("limit as requested."),
    effectiveLimit: numberOutputProperty(
      "How many this call was allowed to move after the daily guardrail was applied."
    ),
    matchedCount: numberOutputProperty(
      "Movable enrollments parked on fromNodeId when the request started."
    ),
    movedCount: numberOutputProperty("Enrollments moved by this call."),
    remainingCount: numberOutputProperty(
      "Movable enrollments still on fromNodeId. Repeat the same request while this is above zero."
    ),
    skippedCount: numberOutputProperty(
      "Enrollments excluded because they are active, a worker is mid-step on them, or they are parked awaiting double opt-in. Only safely parked waiting tokens can be moved."
    ),
    dailyLimit: nullableNumberOutputProperty(
      "Applied daily guardrail, or null when none was requested."
    ),
    movedInWindow: numberOutputProperty(
      "Moves onto targetNodeId already recorded in the rolling 24-hour window."
    ),
    dailyRemaining: nullableNumberOutputProperty(
      "How many more can be moved onto targetNodeId today, or null when no dailyLimit was requested."
    ),
    enqueuedCount: numberOutputProperty(
      "Moved enrollments handed to the worker queue. Zero while the sequence is not running."
    ),
    enqueueErrors: {
      type: "array",
      description:
        "Moved enrollments whose queue handoff failed. They stay active on the target step and are recovered by the stuck-enrollment sweeper.",
      items: objectOutputProperty("One tokenId with its enqueue error."),
    },
    tagResult: nullableObjectOutputProperty(
      "Tagging outcome for the moved contacts: tags, updated, unchanged, failed, failures. Null when no tags were requested."
    ),
    enrollments: resourceListOutputProperty(
      "moved (or, on a dry run, would-move) sequence enrollment sample (up to 50)"
    ),
    hasMore: booleanOutputProperty(
      "Whether more enrollments matched than the returned sample."
    ),
  },
  pause_sequence_subscribers: {
    sequenceId: stringOutputProperty("Sequence ID."),
    enrollments: {
      type: "array",
      description:
        "Every live enrollment of the targeted contacts in this sequence with its outcome: enrollmentId, subscriberId, subscriberEmail, currentNodeId, status after the call, waitUntil (when a waiting enrollment next runs), pausedAt (null unless paused), and outcome.",
      items: objectOutputProperty("One enrollment and its outcome."),
    },
    notEnrolled: {
      type: "array",
      description:
        "Contacts that exist but have no active, waiting, or paused enrollment in this sequence.",
      items: objectOutputProperty("One subscriberId with its email."),
    },
    notFound: objectOutputProperty(
      "subscriberIds and emails that match no contact in this company."
    ),
    pausedCount: numberOutputProperty("Enrollments paused by this call."),
    alreadyPausedCount: numberOutputProperty(
      "Enrollments that were already paused and were left as they were."
    ),
    inProgressCount: numberOutputProperty(
      "Enrollments not paused because a worker was running their current step at that moment (outcome in_progress). Call again shortly to pause them."
    ),
  },
  resume_sequence_subscribers: {
    sequenceId: stringOutputProperty("Sequence ID."),
    enrollments: {
      type: "array",
      description:
        "Every live enrollment of the targeted contacts in this sequence with its outcome: enrollmentId, subscriberId, subscriberEmail, currentNodeId, status after the call, waitUntil (when a waiting enrollment next runs), pausedAt (null unless paused), and outcome.",
      items: objectOutputProperty("One enrollment and its outcome."),
    },
    notEnrolled: {
      type: "array",
      description:
        "Contacts that exist but have no active, waiting, or paused enrollment in this sequence.",
      items: objectOutputProperty("One subscriberId with its email."),
    },
    notFound: objectOutputProperty(
      "subscriberIds and emails that match no contact in this company."
    ),
    resumedCount: numberOutputProperty("Enrollments resumed by this call."),
    notPausedCount: numberOutputProperty(
      "Enrollments of the targeted contacts that were not paused (outcome not_paused) and were left alone."
    ),
    sequenceRunning: booleanOutputProperty(
      "False when the sequence itself is disabled or not live; resumed contacts then continue once it is enabled."
    ),
    enqueuedCount: numberOutputProperty(
      "Resumed enrollments handed to the worker queue. Zero while the sequence is not running."
    ),
    enqueueErrors: {
      type: "array",
      description:
        "Resumed enrollments whose queue handoff failed. They stay resumed and are recovered by the stuck-enrollment sweeper.",
      items: objectOutputProperty("One enrollmentId with its enqueue error."),
    },
  },
  realign_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    dryRun: booleanOutputProperty(
      "Whether this call only previewed the new wait times instead of writing them."
    ),
    sendingWindow: nullableObjectOutputProperty(
      "The sequence sending window realignment anchored on (timezone, startTime, endTime, days), or null when only per-step weekday gates applied."
    ),
    scannedCount: numberOutputProperty(
      "Waiting enrollments inspected by this call."
    ),
    realignedCount: numberOutputProperty(
      "Waiting enrollments moved earlier (or that would move, on a dry run)."
    ),
    unchangedCount: numberOutputProperty(
      "Waiting enrollments left exactly as they were."
    ),
    unchangedReasons: objectOutputProperty(
      "Counts per reason an enrollment did not move: already_at_window_start, already_due, day_not_allowed, no_shared_opening, no_window, not_email_bound, send_retry, raced."
    ),
    requeueFailedCount: numberOutputProperty(
      "Enrollments whose new wait time was stored but whose wake-up could not be re-queued. The stuck-enrollment sweeper recovers these within a few minutes."
    ),
    changes: resourceListOutputProperty(
      "realigned enrollment sample (up to 50) with waitUntil, newWaitUntil, and movedEarlierMinutes"
    ),
    hasMore: booleanOutputProperty(
      "Whether a per-call cap stopped the scan early. Continue with nextCursor while this is true."
    ),
    nextCursor: stringOutputProperty(
      "Opaque continuation cursor to pass as cursor on the next call when hasMore is true."
    ),
    status: stringOutputProperty(
      "For an applied request, queued while the background job is pending."
    ),
    jobId: stringOutputProperty(
      "Background job ID to pass to get_sequence_enrollment_realignment."
    ),
  },
  get_sequence_enrollment_realignment: {
    sequenceId: stringOutputProperty("Sequence ID."),
    dryRun: booleanOutputProperty("Always false for an applied job."),
    status: stringOutputProperty("queued, running, completed, or failed."),
    jobId: stringOutputProperty("Background realignment job ID."),
    result: nullableObjectOutputProperty(
      "Completed realignment result, including counts, changes, hasMore, and nextCursor; null until completion."
    ),
    error: nullableStringOutputProperty(
      "Safe recovery guidance when the job failed, otherwise null."
    ),
  },
  delete_sequence: {
    sequenceId: stringOutputProperty("Deleted sequence ID."),
  },
  list_transactional_emails: {
    transactional: resourceListOutputProperty(
      "transactional email with subject, all-time delivery metrics, and dashboard URL"
    ),
  },
  get_transactional_email: {
    transactional: resourceOutputProperty("transactional email"),
  },
  create_transactional_email: {
    transactional: resourceOutputProperty("transactional email"),
  },
  update_transactional_email: {
    transactional: resourceOutputProperty("transactional email"),
  },
  delete_transactional_email: {
    deleted: objectOutputProperty(
      "Deleted transactional email: id, slug, name, emailId of the email content, and emailDeleted (true for code-managed emails, whose content snapshot was deleted; false when the content was kept as a reusable template)."
    ),
  },
  send_email: {
    emailSendId: stringOutputProperty("Durable email delivery ID."),
    emailType: {
      type: "string",
      enum: ["marketing", "transactional"],
      description: "Delivery policy accepted for the queued email.",
    },
    to: {
      // A single recipient echoes back as the bare string that was sent, so the
      // shape follows the request rather than always widening to an array.
      type: ["string", "array"],
      items: stringOutputProperty("One accepted To address."),
      description:
        "Accepted primary recipients, lowercased. A string for a single-recipient send, an array when several addresses share the email.",
    },
    cc: {
      type: "array",
      items: stringOutputProperty("One accepted Cc address."),
      description:
        "Accepted carbon-copy recipients, lowercased, with addresses already in `to` removed. Present only when the send has cc recipients.",
    },
    bcc: {
      type: "array",
      items: stringOutputProperty("One accepted Bcc address."),
      description:
        "Accepted blind-carbon-copy recipients, lowercased, with addresses already in `to` or `cc` removed. Present only when the send has bcc recipients.",
    },
    transactional: resourceOutputProperty("transactional email"),
    ignoredHeaders: {
      type: "array",
      items: {
        type: "object",
        required: ["name", "reason"],
        properties: {
          name: stringOutputProperty(
            "Header name as sent, or `*` when `headers` was not an object."
          ),
          reason: {
            type: "string",
            // Mirrors IGNORED_CALLER_HEADER_REASONS (parity-tested in
            // scripts/docs/send-contract.test.ts).
            enum: [
              "invalid_headers",
              "invalid_name",
              "invalid_value",
              "duplicate",
              "reserved",
              "managed_in_marketing_mode",
              "requires_list_unsubscribe",
              "too_many_headers",
            ],
            description: "Why the header was not applied.",
          },
        },
      },
      description:
        "Entries in `headers` the send was accepted without. Present only when at least one header was not applied.",
    },
  },
  get_stats: {
    stats: objectOutputProperty(
      `Account-wide delivery funnel for the requested window. ${EMAIL_FUNNEL_STATS_HINT}`
    ),
    emailType: stringOutputProperty(
      "Applied structural email type filter when one was requested."
    ),
    mailboxProvider: stringOutputProperty(
      "Applied recipient mailbox provider filter when one was requested."
    ),
    recipientDomain: stringOutputProperty(
      "Applied recipient domain filter when one was requested."
    ),
    source: stringOutputProperty(
      "Applied email source filter (<type>:<id>) when one was requested. Filtered responses report replies as 0."
    ),
    outcome: stringOutputProperty(
      "Applied send outcome filter (permanent_bounce, temporary_bounce, blocked or complaint) when one was requested. Filtered responses report replies as 0."
    ),
    subscriberCount: numberOutputProperty(
      "Live count of every stored contact in the company. Independent of period. Use this for 'how many subscribers do I have'."
    ),
    activeSubscriberCount: numberOutputProperty(
      "Live count of contacts with status=active. Independent of period. May include phone-only contacts without an email address."
    ),
    commerceForecast: resourceOutputProperty(
      "Optional background-computed commerce AOV, 12-month customer value, and 90-day revenue forecast. Omitted when no snapshot is available; insufficient_data is returned only after eligibility was evaluated successfully."
    ),
  },
  get_stats_breakdown: {
    by: stringOutputProperty("Dimension the rows are grouped by."),
    period: stringOutputProperty("Applied period (custom for start/end)."),
    start: stringOutputProperty("Start of the window the rows cover."),
    end: stringOutputProperty("End of the window the rows cover."),
    emailType: stringOutputProperty(
      "Applied structural email type filter when one was requested."
    ),
    mailboxProvider: stringOutputProperty(
      "Applied recipient mailbox provider filter when one was requested."
    ),
    recipientDomain: stringOutputProperty(
      "Applied recipient domain filter when one was requested."
    ),
    source: stringOutputProperty(
      "Applied email source filter (<type>:<id>) when one was requested."
    ),
    outcome: stringOutputProperty(
      "Applied send outcome filter (permanent_bounce, temporary_bounce, blocked or complaint) when one was requested."
    ),
    rows: {
      type: "array",
      description:
        "One row per dimension value, most sends first. Rates are percentages: deliveryRate and bounceRate divide by sent, the others by delivered. conversions and revenue (in currency units) count orders credited to the row's sends. filter is the value that narrows another call to this row, or null when the row cannot be drilled into.",
      items: objectOutputProperty(
        "One row with key, label, detail, filter, sent, delivered, opened, clicked, bounced, complained, unsubscribed, rates, conversions and revenue."
      ),
    },
  },
  get_email_client_stats: {
    campaignId: stringOutputProperty(
      "Campaign the breakdown covers. Present only for a campaign breakdown."
    ),
    period: stringOutputProperty(
      "Applied company-wide period (custom for start/end). Absent for a campaign breakdown."
    ),
    emailType: stringOutputProperty(
      "Applied structural email type filter when one was requested."
    ),
    mailboxProvider: stringOutputProperty(
      "Applied recipient mailbox provider filter when one was requested."
    ),
    start: stringOutputProperty("Custom range start when start/end was used."),
    end: stringOutputProperty("Custom range end when start/end was used."),
    totalOpens: numberOutputProperty(
      "Unique opens (one per email send) the breakdown covers. 0 means nothing was opened, so clients and devices are empty."
    ),
    privacyProxyOpens: numberOutputProperty(
      "Opens through Gmail, Yahoo or Apple Mail Privacy Protection proxies, which hide the device."
    ),
    clients: {
      type: "array",
      description:
        "Mail clients, most opens first. key is apple_mail, gmail, outlook, yahoo_mail, thunderbird, android_mail_app, web_browser, or other; share is the unrounded percentage of totalOpens.",
      items: objectOutputProperty("One client with key, label, opens, share."),
    },
    devices: {
      type: "array",
      description:
        "Device types, most opens first. key is desktop, mobile, tablet, or unknown; share is the percentage of totalOpens.",
      items: objectOutputProperty("One device with key, label, opens, share."),
    },
  },
  get_link_click_stats: {
    period: stringOutputProperty("Applied period (custom for start/end)."),
    emailType: stringOutputProperty(
      "Applied structural email type filter when one was requested."
    ),
    mailboxProvider: stringOutputProperty(
      "Applied recipient mailbox provider filter when one was requested."
    ),
    start: stringOutputProperty("Custom range start when start/end was used."),
    end: stringOutputProperty("Custom range end when start/end was used."),
    totalClicks: numberOutputProperty(
      "Click events across every destination before limit, repeats included. 0 means nothing was clicked, so links is empty."
    ),
    totalUniqueClicks: numberOutputProperty(
      "Sum of every destination's uniqueClicks before limit."
    ),
    totalLinks: numberOutputProperty("Distinct destinations before limit."),
    links: {
      type: "array",
      description:
        "Destinations, most unique clicks first. url has no query string, fragment or trailing slash; clicks counts every click including repeats, uniqueClicks counts subscribers who clicked it once each (recipients without a subscriber record count once per email), and share is the percentage of totalUniqueClicks rounded to two decimals.",
      items: objectOutputProperty(
        "One destination with url, clicks, uniqueClicks, share."
      ),
    },
  },
  get_campaign_stats: {
    campaign: resourceOutputProperty("campaign"),
    stats: objectOutputProperty(
      `Delivery funnel for this campaign. ${EMAIL_FUNNEL_STATS_HINT}`
    ),
    clickedLinks: {
      type: "array",
      description:
        "Per-link click breakdown, most clicked first (top 20). Each entry has url, clicks, and percentage (that link's share of every recorded link click). Present only when the campaign has tracked link clicks.",
      items: objectOutputProperty("One clicked link with url/clicks/share."),
    },
    polls: {
      type: "array",
      description: `Poll and NPS summaries. Each subscriber counts once per campaign poll block using their latest answer to that block; NPS entries include score, average, and promoter/passive/detractor counts. Multi-select polls set allowMultiple: true, count each subscriber once per selected option (answer percentages can sum past 100), and report totalResponses as the respondent count. To read the exact historical respondents with their answers and response times, call list_poll_responses with this campaignId (and the summary blockId to scope it). To build a reusable audience from one answer, use the summary blockId and this campaignId with create_segment. ${pollRespondentFilterHint} A summary's attributeKey identifies the subscriber attribute that stores their current/latest response (a value list for multi-select polls) and may be overwritten by a later poll that reuses the key.`,
      items: objectOutputProperty("One poll or NPS results summary."),
    },
    recommendations: objectOutputProperty(
      "Product recommendation funnel: impressions, recipients, clicks, clickers, orders, legacy revenueCents, currency-safe revenueByCurrency totals, and topProducts (per-product impressions/clicks). Orders count when a subscriber buys a recommended product within 7 days of clicking it. Present only when the campaign rendered product recommendation blocks."
    ),
    goals: {
      type: "array",
      description:
        "Conversion goals attached to this campaign, in creation order. Each entry has goalId, name, conversions attributed to this campaign, and trackedValue in minor units. Present only when the campaign has attached goals. Zero-conversion goals are included so the report can show the full funnel.",
      items: objectOutputProperty(
        "One campaign goal with goalId/name/conversions/trackedValue."
      ),
    },
  },
  list_poll_responses: {
    campaignId: stringOutputProperty("Campaign the responses belong to."),
    blockId: stringOutputProperty(
      "Poll block the results were scoped to. Present only when blockId was requested."
    ),
    responses: {
      type: "array",
      description:
        "Individual responses, newest answer first. Each entry has subscriberId, email, externalId, firstName, lastName, blockId, variant (options or nps), question, attributeKey (the subscriber attribute the answer was stored under), allowMultiple, answers (selected option labels), values (their stored values), and respondedAt. Only each subscriber's latest answer per block appears. email is null when the subscriber has since been deleted.",
      items: objectOutputProperty("One respondent's latest answer."),
    },
    pagination: objectOutputProperty(
      "Pagination metadata: page, limit, total (response rows across every page; one row per subscriber per poll block), and totalPages. Keep paging while page < totalPages."
    ),
  },
  get_transactional_stats: {
    transactional: resourceOutputProperty("transactional email"),
    stats: objectOutputProperty(
      `Delivery funnel for this transactional email. ${EMAIL_FUNNEL_STATS_HINT}`
    ),
    complaints: resourceOutputProperty(
      "complaint count and rate for the selected transactional email"
    ),
    clickedLinks: resourceListOutputProperty(
      "clicked link with click count and percentage share"
    ),
    bounceBreakdown: resourceOutputProperty(
      "permanent, transient, blocked, and undetermined bounce counts plus subtype details; blocked is the part of transient the receiver refused on content, policy, or reputation grounds, and soft bounces are transient minus blocked"
    ),
    engagementBreakdown: resourceOutputProperty(
      "human and machine open and click counts"
    ),
  },
  get_sequence_stats: {
    sequence: sequenceOutputProperty,
    stats: objectOutputProperty(
      `Delivery funnel across every email step in this sequence. ${EMAIL_FUNNEL_STATS_HINT}`
    ),
    steps: {
      type: "array",
      description: `Per-step delivery funnel: one entry per email step of the sequence, in graph order, each with its own sent/delivered/opened/clicked counts. Read this to answer "how many of step N went out" - do not recount list_sequence_events. Counts come from the retained event stream, so they are not limited to the 14-day list_email_sends history. ${EMAIL_FUNNEL_STATS_HINT}`,
      items: {
        type: "object",
        description: "Metrics for one email step of the sequence.",
        properties: {
          step: numberOutputProperty(
            "1-based position of this email step in graph order. Step 4 is the fourth email a contact receives on the traversed path; on a branching graph, positions are assigned by traversal, so cross-check nodeId when a sequence forks."
          ),
          nodeId: stringOutputProperty(
            "Automation node ID of this email step. Pass it to list_sequence_events or list_email_sends as automationNodeId to reach the individual recipients behind these counts, and it is the emailId that list_email_metrics reports for sequence emails."
          ),
          subject: nullableStringOutputProperty(
            "Subject line of the step's email, falling back to the node label, or null when neither is set."
          ),
          stats: objectOutputProperty(
            `Delivery funnel for this step alone: sent, delivered, bounced, opened, clicked, replies, unsubscribed, and their rates. ${EMAIL_FUNNEL_STATS_HINT}`
          ),
          failedCount: numberOutputProperty(
            "Contacts currently stuck on this step with a failed enrollment."
          ),
          failedSubscribers: arrayOutputProperty(
            "Up to 20 of the failed contacts on this step, as { subscriberId, email, failedAt, failedReason }."
          ),
          polls: arrayOutputProperty(
            "Poll and NPS summaries for this step, in the same shape as get_campaign_stats polls: each subscriber counts once per poll block with their latest answer. Lifetime results, not limited by period or start/end. Omitted when the step has no responses. Call list_poll_responses with this step's nodeId as campaignId to read the individual respondents."
          ),
        },
        required: ["step", "nodeId", "stats"],
        additionalProperties: true,
      },
    },
    enrollmentCounts: {
      type: "object",
      description:
        "Live enrollment-token counts for this sequence. Includes only active and waiting enrollments and is always a current snapshot, independent of historical period/start/end filters.",
      properties: {
        active: numberOutputProperty("Active enrollment count."),
        waiting: numberOutputProperty("Waiting enrollment count."),
        total: numberOutputProperty(
          "Total active plus waiting enrollment count."
        ),
        byCurrentNode: {
          type: "array",
          description:
            "Live active and waiting enrollment counts grouped by the token's current sequence node.",
          items: {
            type: "object",
            description: "Enrollment counts for one current sequence node.",
            properties: {
              currentNodeId: stringOutputProperty("Current sequence node ID."),
              currentNodeType: stringOutputProperty(
                "Current sequence node type. Omitted when the node no longer exists in the graph."
              ),
              currentNodeLabel: stringOutputProperty(
                "Current sequence node label or email subject when available."
              ),
              currentNodeMissing: booleanOutputProperty(
                "Whether the current node no longer exists in the sequence graph."
              ),
              active: numberOutputProperty(
                "Active enrollment count at this node."
              ),
              waiting: numberOutputProperty(
                "Waiting enrollment count at this node."
              ),
              total: numberOutputProperty(
                "Total active plus waiting enrollment count at this node."
              ),
            },
            required: [
              "currentNodeId",
              "currentNodeMissing",
              "active",
              "waiting",
              "total",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["active", "waiting", "total", "byCurrentNode"],
      additionalProperties: false,
    },
    enrollmentSkipped: {
      type: "object",
      description:
        "Trigger matches where an unsubscribed or bounced contact could not be enrolled, including the total count and counts grouped by reason. Uses the requested period or start/end range; without an explicit range, this field defaults to the last 30 days.",
      properties: {
        count: numberOutputProperty("Total skipped sequence enrollments."),
        byReason: {
          type: "object",
          description:
            "Skipped enrollment counts keyed by reason, such as unsubscribed or bounced.",
          additionalProperties: numberOutputProperty(
            "Skipped enrollment count for this reason."
          ),
        },
      },
      required: ["count", "byReason"],
      additionalProperties: false,
    },
    pausedEnrollments: objectOutputProperty(
      "Live count of enrollments held by pause_sequence_subscribers: total, and byCurrentNode (currentNodeId, currentNodeMissing, count). Kept separate from enrollmentCounts, whose active, waiting, and total exclude paused enrollments. Absent from API versions before per-subscriber pause."
    ),
    recommendations: objectOutputProperty(
      "Product recommendation funnel aggregated across the sequence's email nodes: impressions, recipients, clicks, clickers, orders, legacy revenueCents, currency-safe revenueByCurrency totals, and topProducts. Present only when the sequence rendered product recommendation blocks."
    ),
  },
  list_campaign_events: {
    events: resourceListOutputProperty("campaign email event"),
    pagination: objectOutputProperty("Pagination metadata."),
  },
  list_sequence_events: {
    events: resourceListOutputProperty("sequence email event"),
    pagination: objectOutputProperty("Pagination metadata."),
  },
  list_email_metrics: {
    emails: {
      type: "array",
      description:
        "One entry per email in scope: each campaign and each sequence email step, sorted by the requested sort/order.",
      items: {
        type: "object",
        description: "Metrics for one campaign or one sequence email step.",
        properties: {
          emailType: {
            type: "string",
            enum: ["campaign", "sequence"],
            description: "Whether this row is a campaign or a sequence email.",
          },
          emailId: stringOutputProperty(
            "Stable identifier: the campaign ID for campaigns, the automation node ID for sequence emails."
          ),
          name: stringOutputProperty(
            "Campaign name, or the sequence step's subject line falling back to its node label."
          ),
          campaignId: nullableStringOutputProperty(
            "Campaign ID, or null for sequence emails."
          ),
          sequenceId: nullableStringOutputProperty(
            "Sequence ID, or null for campaigns."
          ),
          sequenceName: nullableStringOutputProperty(
            "Name of the sequence this step belongs to, or null for campaigns."
          ),
          automationNodeId: nullableStringOutputProperty(
            "Automation node ID of this step, or null for campaigns. Pass it as automationNodeId to list_sequence_events or list_email_sends to reach the recipients behind these counts."
          ),
          step: {
            type: ["number", "null"],
            description:
              "1-based position of this email in its sequence, counted in graph order, or null for campaigns. Matches the step number in get_sequence_stats steps[].",
          },
          stats: objectOutputProperty(
            `Delivery funnel for this email alone. ${EMAIL_FUNNEL_STATS_HINT}`
          ),
          conversions: numberOutputProperty(
            "Attributed conversions credited to this email."
          ),
          revenueCents: numberOutputProperty(
            "Attributed revenue in minor currency units credited to this email."
          ),
        },
        required: ["emailType", "emailId", "name", "stats"],
        additionalProperties: true,
      },
    },
    totals: objectOutputProperty(
      `Summed funnel across every email matching the filters, not just the returned page, plus \`emails\` (the number of matching emails), \`conversions\`, and \`revenueCents\`. Read totals.sent for "how many of this step went out in total". ${EMAIL_FUNNEL_STATS_HINT}`
    ),
    pagination: objectOutputProperty("Pagination metadata."),
    sort: stringOutputProperty("Sort field the response was ordered by."),
    order: stringOutputProperty("Sort order the response was ordered by."),
    step: numberOutputProperty(
      "Echo of the step filter, present only when one was requested."
    ),
    sequenceIds: {
      type: "array",
      description:
        "Echo of the sequence IDs the breakdown was scoped to, present only when scoped.",
      items: stringOutputProperty("Sequence ID."),
    },
  },
  get_subscriber_activity: {
    activity: resourceListOutputProperty("subscriber activity event"),
    subscribers: resourceListOutputProperty("subscriber"),
    pagination: objectOutputProperty("Pagination metadata."),
  },
  list_team_members: {
    members: resourceListOutputProperty("team member"),
    invitations: resourceListOutputProperty("team invitation"),
  },
  invite_team_member: {
    invitation: resourceOutputProperty("team invitation"),
  },
  cancel_team_invitation: {
    invitationId: stringOutputProperty("Cancelled invitation ID."),
  },
  list_conversations: {
    conversations: resourceListOutputProperty("inbox conversation"),
    pagination: objectOutputProperty("Pagination metadata."),
  },
  get_conversation: {
    conversation: resourceOutputProperty("inbox conversation"),
    messages: resourceListOutputProperty("conversation message"),
  },
  reply_to_conversation: {
    conversation: resourceOutputProperty("inbox conversation"),
    message: resourceOutputProperty("conversation message"),
  },
  update_conversation_status: {
    conversation: resourceOutputProperty("inbox conversation"),
  },
  bulk_update_conversation_status: {
    status: stringOutputProperty("Status applied to the conversations."),
    requested: numberOutputProperty("Distinct conversation IDs requested."),
    updated: numberOutputProperty("Conversations whose status changed."),
    unchanged: numberOutputProperty(
      "Conversations that already had the status."
    ),
    notFound: numberOutputProperty(
      "IDs that do not exist in the selected company."
    ),
    updatedIds: conversationIdListOutputProperty("IDs whose status changed."),
    unchangedIds: conversationIdListOutputProperty(
      "IDs that already had the status."
    ),
    notFoundIds: conversationIdListOutputProperty(
      "IDs that do not exist in the selected company."
    ),
  },
  bulk_update_conversation_spam: {
    spam: {
      type: "boolean",
      description: "True when the conversations were moved to Spam.",
    },
    requested: numberOutputProperty("Distinct conversation IDs requested."),
    updated: numberOutputProperty("Conversations that moved."),
    unchanged: numberOutputProperty("Conversations that were already there."),
    notFound: numberOutputProperty(
      "IDs that do not exist in the selected company."
    ),
    updatedIds: conversationIdListOutputProperty("IDs that moved."),
    unchangedIds: conversationIdListOutputProperty(
      "IDs that were already there."
    ),
    notFoundIds: conversationIdListOutputProperty(
      "IDs that do not exist in the selected company."
    ),
  },
  list_conversation_recipients: {
    addresses: {
      type: "array",
      description: "Inbox addresses conversations started at.",
      items: stringOutputProperty("Inbox address."),
    },
  },
  list_receiving_domains: {
    receivingDomains: {
      type: "array",
      description: "The company's receiving domains.",
      items: objectOutputProperty(RECEIVING_DOMAIN_HINT),
    },
  },
  add_receiving_domain: {
    created: booleanOutputProperty(
      "True when the domain was added; false when the company already had it."
    ),
    receivingDomain: objectOutputProperty(RECEIVING_DOMAIN_HINT),
  },
  get_receiving_domain: {
    receivingDomain: objectOutputProperty(RECEIVING_DOMAIN_HINT),
  },
  verify_receiving_domain: {
    receivingDomain: objectOutputProperty(RECEIVING_DOMAIN_HINT),
  },
  remove_receiving_domain: {
    receivingDomain: objectOutputProperty(
      "The receiving domain that was removed. Mail to it no longer arrives."
    ),
  },
  mark_conversation_read: {
    conversation: resourceOutputProperty("inbox conversation"),
  },
  mark_conversation_unread: {
    conversation: resourceOutputProperty("inbox conversation"),
  },
  forward_conversation_message: {
    forward: resourceOutputProperty("conversation forward"),
  },
  update_inbox_address: {
    inbox: objectOutputProperty(
      "Inbox address after the change, including customAddress and its status."
    ),
  },
  get_inbox_address: {
    inbox: objectOutputProperty(
      "Inbox address, custom-domain addresses, receiving state, attachment availability and retention."
    ),
  },
  list_data_exports: {
    dataExports: resourceListOutputProperty("data export"),
  },
  get_data_export: {
    dataExport: resourceOutputProperty("data export"),
  },
  create_data_export: {
    dataExport: resourceOutputProperty("data export"),
  },
  update_data_export: {
    dataExport: resourceOutputProperty("data export"),
  },
  delete_data_export: {
    dataExportId: stringOutputProperty("Deleted data export ID."),
  },
  test_data_export: {
    testedAt: stringOutputProperty(
      "When the test file was written (ISO timestamp)."
    ),
  },
  run_data_export: {
    queued: {
      type: "boolean",
      description: "True when the export run was queued.",
    },
    dataExport: resourceOutputProperty("data export"),
  },
  list_data_export_runs: {
    runs: resourceListOutputProperty("data export run"),
  },
  list_warehouse_connections: {
    connections: resourceListOutputProperty("warehouse connection"),
  },
  get_warehouse_connection: {
    connection: resourceOutputProperty("warehouse connection"),
  },
  create_warehouse_connection: {
    connection: resourceOutputProperty("warehouse connection"),
  },
  update_warehouse_connection: {
    connection: resourceOutputProperty("warehouse connection"),
  },
  delete_warehouse_connection: {
    connectionId: stringOutputProperty("Deleted warehouse connection ID."),
  },
  test_warehouse_connection: {
    connection: resourceOutputProperty("warehouse connection"),
  },
  preview_warehouse_query: {
    columns: resourceListOutputProperty("query column"),
    rows: resourceListOutputProperty("preview row"),
  },
  list_warehouse_syncs: {
    syncs: resourceListOutputProperty("warehouse sync"),
  },
  get_warehouse_sync: {
    sync: resourceOutputProperty("warehouse sync"),
  },
  create_warehouse_sync: {
    sync: resourceOutputProperty("warehouse sync"),
  },
  update_warehouse_sync: {
    sync: resourceOutputProperty("warehouse sync"),
  },
  delete_warehouse_sync: {
    syncId: stringOutputProperty("Deleted warehouse sync ID."),
  },
  run_warehouse_sync: {
    queued: {
      type: "boolean",
      description: "True when the run was queued.",
    },
    sync: resourceOutputProperty("warehouse sync"),
  },
  list_warehouse_sync_runs: {
    runs: resourceListOutputProperty("warehouse sync run"),
  },
  list_webhooks: {
    webhooks: resourceListOutputProperty("outbound webhook"),
  },
  list_geofences: {
    geofences: resourceListOutputProperty("geofence"),
    nextCursor: nullableStringOutputProperty(
      "Cursor for the next page, or null on the last page."
    ),
  },
  get_geofence: {
    geofence: resourceOutputProperty("geofence"),
  },
  create_geofence: {
    geofence: resourceOutputProperty("geofence"),
  },
  update_geofence: {
    geofence: resourceOutputProperty("geofence"),
  },
  delete_geofence: {
    id: stringOutputProperty("Deleted geofence ID."),
  },
  import_geofences: {
    created: numberOutputProperty("Geofences created."),
    updated: numberOutputProperty("Geofences updated."),
    errors: arrayOutputProperty(
      "Rows that were skipped, each with its index, externalId and error."
    ),
  },
  create_webhook: {
    webhook: resourceOutputProperty("outbound webhook"),
  },
  update_webhook: {
    webhook: resourceOutputProperty("outbound webhook"),
  },
  delete_webhook: {
    webhookId: stringOutputProperty("Deleted outbound webhook ID."),
  },
  test_webhook: {
    webhook: resourceOutputProperty("outbound webhook"),
    delivery: resourceOutputProperty("test webhook delivery"),
  },
  list_webhook_deliveries: {
    deliveries: resourceListOutputProperty("webhook delivery"),
  },
  replay_webhook_delivery: {
    delivery: resourceOutputProperty("webhook delivery"),
    job: resourceOutputProperty("webhook replay job"),
  },
  generate_email: {
    email: resourceOutputProperty("generated email"),
    html: stringOutputProperty("Generated HTML email body."),
    blocks: {
      type: "array",
      description:
        "Generated Sequenzy email blocks, wrapped with company branding (logo + footer) unless applyBranding was false.",
      items: objectOutputProperty("One generated email block."),
    },
    subject: stringOutputProperty("Generated subject line."),
    previewText: stringOutputProperty("Generated inbox preview text."),
  },
  generate_sequence: {
    sequence: resourceOutputProperty("persisted AI-generated sequence draft"),
    deprecated: booleanOutputProperty("Always true for this deprecated alias."),
    deprecationMessage: stringOutputProperty(
      "Migration guidance directing callers to create_sequence."
    ),
  },
  generate_subject_lines: {
    subjectLines: {
      type: "array",
      description: "Generated subject line variants.",
      items: stringOutputProperty("One generated subject line."),
    },
    variants: resourceListOutputProperty("generated subject line variant"),
  },
  generate_sms: {
    prompt: stringOutputProperty("The prompt the messages were generated for."),
    messages: {
      type: "array",
      description:
        "Generated SMS message variants with encoding and segment counts.",
      items: objectOutputProperty("One generated SMS message."),
    },
  },
  get_sms_settings: {
    sms: objectOutputProperty(
      "SMS add-on status: enabled, planEligible, creditsBalance, brandPrefix (account-wide default), numbers (each with id, e164, label tag, brandPrefix override, linkShorteningEnabled, status), readyToSend (paid plan or credits plus an active number)."
    ),
  },
  get_push_settings: {
    push: objectOutputProperty(
      "Push readiness: web (enabled, vapidPublicKey), ios (configured, keyId, teamId, bundleId, environment, lastError), android (configured, projectId, clientEmail, lastError), defaultIconUrl, brandIconUrl (company logo used when defaultIconUrl is null), devices (active counts per platform, identifiedActive, totalActive, permissions: iOS/Android devices by reported notification permission (granted, provisional, ephemeral, denied, notDetermined, unknown) and optInRate 0-1 or null))."
    ),
  },
  update_web_push_settings: {
    push: objectOutputProperty("Updated push settings summary."),
    siteKey: {
      type: ["object", "null"],
      description:
        "When enabling: the web tracking site key web push uses (publicKey, allowedOrigins, installSnippet), created for the company website if none existed; null when there is none.",
      additionalProperties: true,
    },
    siteKeyCreated: {
      type: "boolean",
      description: "True when enabling created the site key.",
    },
  },
  set_apns_credentials: {
    push: objectOutputProperty("Updated push settings summary (no secrets)."),
  },
  remove_apns_credentials: {
    push: objectOutputProperty("Updated push settings summary."),
  },
  set_fcm_credentials: {
    push: objectOutputProperty("Updated push settings summary (no secrets)."),
  },
  remove_fcm_credentials: {
    push: objectOutputProperty("Updated push settings summary."),
  },
  get_push_import_preflight: {
    warnings: arrayOutputProperty(
      "Push settings checks: { code, severity (warning|info), message }."
    ),
  },
  list_push_imports: {
    imports: resourceListOutputProperty("push import"),
  },
  get_push_import: {
    import: resourceOutputProperty("push import"),
    message: stringOutputProperty("Status summary."),
  },
  create_push_import: {
    import: resourceOutputProperty("push import (draft, with warnings)"),
    message: stringOutputProperty("What to do next."),
  },
  add_push_import_rows: {
    rowsAdded: numberOutputProperty("Rows staged from this part."),
    totalRows: numberOutputProperty("Rows staged in the import so far."),
    message: stringOutputProperty("Summary."),
  },
  start_push_import: {
    import: resourceOutputProperty("push import"),
    message: stringOutputProperty("Status summary."),
  },
  cancel_push_import: {
    import: resourceOutputProperty("push import"),
    message: stringOutputProperty("Status summary."),
  },
  list_push_devices: {
    devices: resourceListOutputProperty("push device"),
    nextCursor: nullableStringOutputProperty(
      "Cursor for the next page, or null on the last page."
    ),
  },
  list_in_app_messages: {
    subscriberId: stringOutputProperty("Resolved subscriber ID."),
    status: stringOutputProperty("open or all."),
    messages: resourceListOutputProperty("in-app message"),
  },
  record_in_app_event: {
    recorded: booleanOutputProperty(
      "True when this report set the timestamp; false for a repeat."
    ),
    message: resourceOutputProperty("in-app message"),
  },
  delete_in_app_message: {
    messageId: stringOutputProperty("Deleted in-app message ID."),
  },
  list_in_app_templates: {
    templates: resourceListOutputProperty("in-app template"),
  },
  write_in_app_copy: {
    copy: objectOutputProperty(
      "eyebrow, title, body and buttons ({label, action}) to put in an in-app step."
    ),
  },
  validate_in_app_html: {
    valid: booleanOutputProperty("True when the document can be saved."),
    bytes: numberOutputProperty("Size in UTF-8 bytes after Braze conversion."),
    maxBytes: numberOutputProperty("Size limit in bytes (100 KB)."),
    conversions: arrayOutputProperty(
      "Braze Liquid tags converted: {from, to, count}."
    ),
    scriptHosts: arrayOutputProperty(
      "Hosts the document loads scripts from; a website CSP must allow them."
    ),
    closesItself: booleanOutputProperty(
      "True when the document calls sequenzy.close() or brazeBridge.closeMessage()."
    ),
    warnings: arrayOutputProperty("Warnings: {code, message}."),
    errors: arrayOutputProperty("Problems that block saving."),
  },
  get_in_app_step_stats: {
    stepId: stringOutputProperty("In-app step (node) ID."),
    sequenceId: stringOutputProperty("Sequence ID."),
    stats: objectOutputProperty(
      "Counts: created, displayed, clicked, dismissed, pushPermissionGranted and pushPermissionDenied (push primers)."
    ),
  },
  register_push_device: {
    created: booleanOutputProperty("True when the token was new."),
    device: resourceOutputProperty("push device"),
  },
  remove_push_device: {
    deviceId: stringOutputProperty("Unsubscribed device ID."),
  },
  send_test_push: {
    pushSendId: stringOutputProperty("Test push send ID."),
    deviceCount: numberOutputProperty("Devices the test was queued for."),
    remainingToday: numberOutputProperty(
      "Test pushes left in the rolling 24-hour window."
    ),
  },
  list_live_activities: {
    summary: objectOutputProperty(
      "pushToStartDevices, activeActivities and activityTypes [{activityType, pushToStartDevices, activeActivities}]."
    ),
    tokens: resourceListOutputProperty("Live Activity token"),
    nextCursor: nullableStringOutputProperty(
      "Cursor for the next page, or null on the last page."
    ),
  },
  start_live_activity: LIVE_ACTIVITY_DISPATCH_OUTPUT,
  update_live_activity: LIVE_ACTIVITY_DISPATCH_OUTPUT,
  end_live_activity: LIVE_ACTIVITY_DISPATCH_OUTPUT,
  list_push_campaigns: {
    campaigns: resourceListOutputProperty("push campaign"),
    total: numberOutputProperty("Total matching push campaigns."),
  },
  get_push_campaign: {
    campaign: resourceOutputProperty("push campaign"),
    stats: nullableObjectOutputProperty(
      "Delivery stats once the campaign has started sending, else null."
    ),
  },
  create_push_campaign: {
    campaign: resourceOutputProperty("push campaign"),
  },
  update_push_campaign: {
    campaign: resourceOutputProperty("push campaign"),
  },
  estimate_push_campaign_recipients: {
    audienceCount: numberOutputProperty("Contacts in the audience."),
    eligibleCount: numberOutputProperty(
      "Contacts with an active push device on the selected platforms."
    ),
  },
  send_push_campaign: {
    campaign: resourceOutputProperty("push campaign"),
  },
  unschedule_push_campaign: {
    campaign: resourceOutputProperty("push campaign"),
  },
  cancel_push_campaign: {
    campaign: resourceOutputProperty("push campaign"),
  },
  duplicate_push_campaign: {
    campaign: resourceOutputProperty("new push campaign draft"),
  },
  get_push_campaign_stats: {
    campaignId: stringOutputProperty("Push campaign ID."),
    status: stringOutputProperty("Campaign status."),
    stats: objectOutputProperty(
      "total, pending, sent, failed, skipped, delivered (device-reported displays), clicked, devicesTargeted, devicesAccepted, skipReasons, failureReasons."
    ),
  },
  get_sms_usage: {
    usage: arrayOutputProperty(
      "Per-number SMS usage entries: fromNumber (E.164), totalSends, delivered, failed, creditsCharged, lastSentAt, testSends. Totals exclude test sends; test sends are counted separately."
    ),
  },
  submit_feedback: {},
  check_email: {
    score: numberOutputProperty(
      "Overall score from 0 to 100 across subject, preview text and content, including live link findings. Sender settings are not part of this check."
    ),
    grade: stringOutputProperty("Letter grade: A, B, C, D or F."),
    placement: stringOutputProperty(
      "Predicted inbox tab: Primary, Promotions or Spam."
    ),
    categories: objectOutputProperty(
      "Per-category scores as { subject, preview, content }, each { score, maxScore }."
    ),
    issues: arrayOutputProperty(
      'Findings sorted by severity, as [{ category, severity, message, rule?, blockId?, url? }]. severity is "error" (fix before sending), "warning" (review) or "info" (tip). rule is a stable id such as links.broken, links.missing-scheme, images.missing-alt or content.placeholder-text; its prefix groups it (links, images, content, subject, preview, accessibility, compatibility). blockId names the block to edit when the issue has one location.'
    ),
    links: arrayOutputProperty(
      'Every link and image in the email, as [{ url, kind, label, blockId, blockType, status, httpStatus, finalUrl, message, findings }]. kind is "link" or "image". status is the live result - "ok", "broken" (404/410, unknown domain, certificate problem, redirect loop), "invalid" (can never work: a rule found it unusable, such as localhost or a missing https://, or it resolves to a private address), "server_error" (5xx), "unreachable" (timeout or refused connection), "restricted" (the site refused an automated check, e.g. 401/403/429; it may work in a browser) - or "personalized" for merge-tag URLs filled per recipient, or "not_checked" for mailto/tel links, links not reached before the 25-second limit, and when links is false. findings lists the no-network rule results for that URL.'
    ),
    linkSummary: objectOutputProperty(
      "Counts over links: total, checked, ok, broken, warnings (server_error + unreachable), restricted, notChecked."
    ),
    linksChecked: booleanOutputProperty(
      "Whether live link verification ran. False when links was false."
    ),
    subject: stringOutputProperty(
      "Subject line with merge tags resolved for the checked contact."
    ),
    previewText: nullableStringOutputProperty(
      "Preview text with merge tags resolved, or null when unset."
    ),
    locale: stringOutputProperty("Localization locale the check used."),
    unresolvedMergeTags: arrayOutputProperty(
      "Merge tags that did not resolve, as [{ tag, reason }]; same meaning as in render_email."
    ),
    unevaluatedConditions: arrayOutputProperty(
      "Block conditions this check could not decide; same meaning as in render_email."
    ),
    entity: objectOutputProperty(
      "Which entity was checked: type, id, and variantId."
    ),
  },
  render_email: {
    html: stringOutputProperty(
      "Email-safe HTML document, rendered exactly as it would be sent."
    ),
    subject: stringOutputProperty("Subject line with merge tags resolved."),
    previewText: nullableStringOutputProperty(
      "Inbox preview text with merge tags resolved, or null when unset."
    ),
    locale: stringOutputProperty("Localization locale the render resolved to."),
    personalized: booleanOutputProperty(
      "Whether a real contact was supplied. False means a sample contact was used, so contact-specific merge tags resolve to empty values."
    ),
    trackingApplied: booleanOutputProperty(
      "Whether auto-UTM link decoration was applied."
    ),
    unresolvedMergeTags: arrayOutputProperty(
      'Merge tags that did not resolve, as [{ tag, reason }]. reason "unknown" means nothing provides that name, so it stays empty for every recipient - usually a typo or a tag copied from another platform. reason "no_value" means the name is recognized, or could not be checked, but is blank for this contact. An unknown name is reported even when a default filter such as {{ subscriber.frstName | default: "there" }} supplied text in its place: the fallback then reaches every recipient, including the ones whose real value is stored, and the rendered HTML looks correct precisely because the default worked. A recognized name that is merely blank for this contact is not reported when it has a default, since that is what a default is for. A name is only called unknown when the render had a source to check it against. Without the contact\'s attributes nothing is checkable, since a bare {{plan}} reads the same attribute map as {{subscriber.plan}}, so pass a stored subscriberId or an inline subscriber carrying customAttributes. Beyond that, {{event.*}} needs sample event properties in variables, since a real send fills those from the enrolling event; {{recommendedProducts.*}} needs a stored subscriberId the catalog has something to recommend for; and {{discount.*}} is only checkable on a sequence step whose incoming paths all run the same discount step, never on a standalone template. Rendering a transactional email is checkable only when variables is passed, because its tags come from the variables of each send call and carry no prefix marking them. Otherwise those tags land in no_value rather than in unknown. An optional attribute this contact never had set is kept out of unknown by checking the names other contacts in the account carry, which needs the subscribers:read scope; a key without it may report such a name as unknown. An empty array means every tag in the email resolved.'
    ),
    unevaluatedConditions: arrayOutputProperty(
      'Block conditions this render could not decide, as [{ field, operator, value, description, reason, hint }]. Each was rendered as false, the same fail-closed rule a live send uses, so an else branch in the HTML is not evidence that the condition is false for a real recipient - checking the HTML alone cannot tell the two apart. reason "requires_stored_subscriber" means the field reads stored subscriber state: pass subscriberId, or for a `tag` condition pass tags on the inline subscriber, and it resolves. reason "invalid_filter" means the stored condition is malformed, which fails closed on a real send too, and hint carries the validation error. reason "evaluation_failed" means the lookup itself failed and the render is worth retrying. An empty array means every condition in the email was actually evaluated.'
    ),
    entity: objectOutputProperty(
      "Which entity was rendered: type, id, and variantId."
    ),
  },
};

export function getToolOutputSchema(toolName: string): ToolOutputSchema {
  const toolOutputProperties = outputPropertiesByToolName[toolName];
  if (toolOutputProperties === undefined) {
    throw new Error(
      `MCP tool "${toolName}" must define outputSchema properties.`
    );
  }

  return {
    type: "object",
    description: `Structured content returned by the \`${toolName}\` MCP tool.`,
    properties: {
      ...genericOutputProperties,
      ...toolOutputProperties,
      ...(dashboardUrlToolNames.has(toolName)
        ? dashboardUrlOutputProperties
        : {}),
    },
    additionalProperties: true,
  };
}

export function withToolOutputSchema(tool: Tool): Tool {
  return {
    ...tool,
    outputSchema: getToolOutputSchema(tool.name),
  };
}

export function toStructuredContent(result: unknown): Record<string, unknown> {
  if (isRecord(result)) {
    return result;
  }

  if (Array.isArray(result)) {
    return { items: result };
  }

  return { value: result };
}

// Tool definitions
