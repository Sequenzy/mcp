import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

import { isRecord } from "./common-primitives.js";
import { dashboardUrlToolNames } from "./delivery-and-urls.js";
import { pollRespondentFilterHint } from "./descriptions.js";
export type ToolOutputSchema = NonNullable<Tool["outputSchema"]>;
export type SequenzyToolCallResult = CallToolResult & {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};
export type OutputSchemaJsonType =
  | "object"
  | "array"
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "null";

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

const SEQUENCE_RUN_STATE_HINT =
  "Run state: branch on effectiveStatus (draft, live, enrollment_paused, paused, or archived) rather than on status, which reads `active` even when new enrollments are paused. acceptsNewEnrollments and processesExistingEnrollments answer the two questions behind it, and effectiveStatusSummary is a plain-language sentence. The legacy triggerConfig.active flag is not read by the runtime; it is reported as a mirror of acceptsNewEnrollments.";

export const sequenceOutputProperty: OutputSchemaProperty =
  objectOutputProperty(
    `The sequence record returned by Sequenzy. ${SEQUENCE_RUN_STATE_HINT}`
  );

export const sequenceListOutputProperty: OutputSchemaProperty =
  arrayOutputProperty(
    `List of sequence records returned by Sequenzy. ${SEQUENCE_RUN_STATE_HINT}`
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

export const outputPropertiesByToolName: Record<
  string,
  OutputSchemaProperties
> = {
  get_account: {
    account: resourceOutputProperty("account"),
    companies: resourceListOutputProperty("company"),
    apiKeyPermissions: objectOutputProperty(
      "Current API key preset and scopes, whether common marketing work is discoverable, any missing marketing read scopes, and the API Keys management URL."
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
      "connected integration, including provider, provider account ID, active and sync status, last sync time, last sync error, allowlisted non-secret details, and lastSyncSkipped (records the last sync could not import normally: suppressed profiles that cannot receive email, plus any that were not imported). Credentials are never included"
    ),
  },
  get_integration: {
    integration: objectOutputProperty(
      "The connected integration: provider, display name, category, provider account ID, active and sync status, last sync time and error, and allowlisted non-secret details. Credentials are never included."
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
  get_email_block_schema: {
    blockTypes: {
      type: "array",
      description:
        "Listing mode: one entry per block type, each with `type`, `creatable`, `required`, `optional`, and a `fields` array of { name, required, type, values?, itemFields? }. `values` holds an enum field's allowed values; `itemFields` holds the shape of one entry in an array field, which is where `list` (items carry `content`) and `steps` (items carry `title`) differ.",
      items: objectOutputProperty(
        "A block type reference: type, creatable, required, optional, fields, and - when the type is one an author should hand-create - a minimal valid `example` and authoring `notes`."
      ),
    },
    blockType: objectOutputProperty(
      "Single-type mode: the full reference for the requested type, including a minimal valid `example` and authoring `notes`."
    ),
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
      "URL to configure in the provider's webhook settings with the same secret. Always relay this to the user - delivery does not start until it is configured."
    ),
    revenueSyncQueued: booleanOutputProperty(
      "Payment providers only: whether the initial revenue backfill was queued."
    ),
    backfillQueued: booleanOutputProperty(
      "Affonso only: whether the affiliate backfill was queued."
    ),
    history: {
      type: "object",
      description:
        "PostHog only: outcome of the optional history import request ({ requested, queued, error }). The webhook connection succeeds even if queueing the import failed.",
    },
  },
  set_integration_sync_enabled: {
    integrationId: stringOutputProperty("The integration that was updated."),
    provider: stringOutputProperty("Provider of the updated integration."),
    syncEnabled: booleanOutputProperty("Sync state after the update."),
    changed: booleanOutputProperty(
      "False when the integration was already in the requested state."
    ),
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
  list_web_tracking_keys: {
    success: successOutputProperty,
    keys: {
      type: "array",
      description:
        "Publishable keys for the browser tracking SDK, newest first. A key with lastUsedAt null was created but never deployed, which is the usual reason on-site tracking is silently dark.",
      items: objectOutputProperty(
        "One key: id, name, publicKey, allowedOrigins, isActive, unrestricted, lastUsedAt, installSnippet, endpoint, and warning when unrestricted."
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
  get_notification_preferences: {
    notificationPreferences: arrayOutputProperty(
      "One entry per notification event with its current mode: off, instant, or daily. Every event is always present; an event the user has never configured reports the platform default."
    ),
    supportedModes: objectOutputProperty(
      "Modes each event accepts, keyed by event. campaign_completed does not accept daily."
    ),
    defaults: objectOutputProperty(
      "Mode each event uses when the user has never configured it."
    ),
  },
  update_notification_preferences: {
    notificationPreferences: arrayOutputProperty(
      "Every notification event with its mode after the update, not only the events that were changed."
    ),
    supportedModes: objectOutputProperty(
      "Modes each event accepts, keyed by event. campaign_completed does not accept daily."
    ),
    defaults: objectOutputProperty(
      "Mode each event uses when the user has never configured it."
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
      "Machine-readable pause cause: high_hard_bounce_rate, high_soft_bounce_rate, high_complaint_rate, phishing_guard, manual, or other. Only high_hard_bounce_rate can be cleared with resume_sending."
    ),
    pausedAt: nullableStringOutputProperty(
      "ISO timestamp when sending was paused. Null when sending is active."
    ),
    selfResume: objectOutputProperty(
      "Whether the account can clear this pause itself: canSelfResume, supported, allowedByAdmin, ownerIsTrusted, the automated aiReviewStatus (not_required, pending, approved, flagged, failed) with its reason and timestamps, and unavailableReason naming the blocking gate (unsupported_reason, waiting_for_review, blocked_by_ai, review_failed, blocked_by_admin)."
    ),
    senderHealth: nullableObjectOutputProperty(
      "Enforcement counts and the thresholds that apply at this volume for hard bounces, soft bounces, and complaints. bounceScopedSent is the denominator for bounce rates, complaintScopedSent is the denominator for complaint rates, and scopedSent remains as a backward-compatible alias for bounceScopedSent. Also includes enforcementMode. Null when the account has no metrics record yet or sender-health analytics are temporarily unavailable; pause state and remediation remain authoritative."
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
  get_tracking_settings: {
    tracking: objectOutputProperty(
      "Open, click, and unsubscribe tracking flags, the opt-in strictBotFilteringEnabled bot-detection flag, plus the default attribution window in hours."
    ),
    consent: objectOutputProperty(
      "Signup consent settings: doubleOptInEnabled, and doubleOptInEmailId for the confirmation email sent to pending contacts (null when double opt-in has never been enabled)."
    ),
    autoUtm: objectOutputProperty(
      "Automatic UTM tagging state and its configured parameters."
    ),
    trackingDomain: nullableObjectOutputProperty(
      "Dedicated click-tracking domain with verification and SSL status. Null when click links use the shared Sequenzy tracking domain."
    ),
    replyTracking: objectOutputProperty(
      "Inbound reply tracking configuration."
    ),
  },
  update_tracking_settings: {
    message: messageOutputProperty,
    tracking: objectOutputProperty(
      "Open, click, and unsubscribe tracking flags, the opt-in strictBotFilteringEnabled bot-detection flag, plus the default attribution window in hours, after the update."
    ),
    consent: objectOutputProperty(
      "Signup consent settings after the update: doubleOptInEnabled, and doubleOptInEmailId for the confirmation email, which is provisioned automatically the first time double opt-in is enabled."
    ),
    autoUtm: objectOutputProperty(
      "Automatic UTM tagging state and its configured parameters, after the update."
    ),
    trackingDomain: nullableObjectOutputProperty(
      "Dedicated click-tracking domain with verification and SSL status. Null when click links use the shared Sequenzy tracking domain."
    ),
    replyTracking: objectOutputProperty(
      "Inbound reply tracking configuration. Unchanged by this tool; set it with update_company."
    ),
  },
  add_website: {
    website: resourceOutputProperty(
      "Sending domain with its cohort-specific DNS records. Publish every returned record, including DMARC when present."
    ),
  },
  add_sending_domain: {
    website: resourceOutputProperty(
      "Sending domain with its cohort-specific DNS records. Publish every returned record, including DMARC when present."
    ),
  },
  check_website: {
    website: resourceOutputProperty(
      "sending domain with separate DNS verification and readyToSend sending readiness; readiness.reason explains a domain that cannot send yet"
    ),
    ready: booleanOutputProperty("Whether the sender website is ready."),
    status: stringOutputProperty("Current processing or verification status."),
  },
  verify_sending_domain: {
    website: resourceOutputProperty(
      "Sending domain with current DNS verification, readyToSend sending readiness, SPF, DKIM, and MAIL FROM details. When readyToSend is false, readiness.reason carries why: activation runs after the DNS records are correct, so it can still be pending while dkim.status reads verified."
    ),
    verified: booleanOutputProperty(
      "Whether the sending domain passed the fresh DNS verification check. Correct DNS alone does not mean the domain can send yet."
    ),
    readyToSend: booleanOutputProperty(
      "Whether DNS and the selected home transport are both ready for sending."
    ),
    message: stringOutputProperty("Verification result summary."),
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
    import: resourceOutputProperty("subscriber import"),
  },
  get_subscriber_import: {
    import: resourceOutputProperty("subscriber import"),
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
  add_subscriber_note: {
    note: resourceOutputProperty("subscriber note"),
  },
  delete_subscriber_note: {
    id: stringOutputProperty("Deleted subscriber note ID."),
    deleted: booleanOutputProperty("Whether the subscriber note was deleted."),
  },
  trigger_subscriber_event: {
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
    lists: resourceListOutputProperty("list"),
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
  set_default_email_component: {
    component: resourceOutputProperty("saved default email component"),
  },
  create_email_component: {
    component: resourceOutputProperty("email component"),
  },
  update_email_component: {
    component: resourceOutputProperty("email component"),
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
    stats: resourceOutputProperty("A/B test statistics"),
  },
  restart_ab_test: {
    abTest: resourceOutputProperty("A/B test"),
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
    campaigns: resourceListOutputProperty("campaign"),
    pagination: objectOutputProperty(
      "Campaign page window: `limit`, `offset`, `count` returned in this page, `total` matching the filters, and `hasMore`. Keep calling with an advanced `offset` while `hasMore` is true to enumerate every campaign."
    ),
  },
  get_campaign: {
    campaign: resourceOutputProperty("campaign"),
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
      "email send, including copied-recipient identity and primary email send ID when applicable"
    ),
    events: resourceListOutputProperty("email delivery event"),
  },
  list_email_sends: {
    emailSends: resourceListOutputProperty("email send"),
    pagination: resourceOutputProperty("email send pagination"),
    retentionDays: numberOutputProperty(
      "Number of days sent-email rows remain queryable in this collection."
    ),
  },
  get_recipient_suppression: {
    suppression: resourceOutputProperty("recipient suppression status"),
  },
  remove_recipient_suppression: {
    removed: booleanOutputProperty(
      "Whether stale bounce suppression was removed."
    ),
    removedLocalBounce: booleanOutputProperty(
      "Whether the platform-local bounce block was removed."
    ),
    removedSesRegions: {
      type: "array",
      description: "AWS SES regions where a bounce suppression was removed.",
      items: stringOutputProperty("One AWS SES region."),
    },
    remainingSuppression: resourceOutputProperty(
      "recipient suppression status after cleanup"
    ),
  },
  create_campaign: {
    campaign: resourceOutputProperty("campaign"),
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
      "updated SMS number (label + brandPrefix override)"
    ),
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
  list_forms: {
    forms: resourceListOutputProperty("saved form"),
  },
  create_form: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets."
    ),
  },
  update_form: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets (published forms only)."
    ),
  },
  get_form_embed: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets."
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
        "Enrollment statuses included in this response. Defaults to active and waiting.",
      items: { type: "string", description: "Enrollment status." },
    },
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
            "Enrollment status: active, waiting, completed, failed, or cancelled."
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
  send_sequence_test_email: {
    sequenceId: stringOutputProperty("Sequence ID."),
    nodeId: stringOutputProperty("Tested sequence email-step node ID."),
    results: arrayOutputProperty(
      "Per-recipient test-send results containing recipientEmail, durable emailSendId, and legacy jobId."
    ),
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
  list_sequence_goals: {
    goals: resourceListOutputProperty("sequence goal"),
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
  cancel_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    dryRun: booleanOutputProperty(
      "Whether this call only reported matches instead of cancelling them."
    ),
    target: objectOutputProperty(
      "Resolved cancellation target: mode all, subscriber, subscribers (with notFoundSubscriberIds), or field."
    ),
    matchedCount: numberOutputProperty(
      "Active/waiting enrollments matching the target when the request started."
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
      "Deleted transactional email: id, slug, name, and emailId of the email content that was kept as a reusable template."
    ),
  },
  send_email: {
    emailSendId: stringOutputProperty("Durable email delivery ID."),
    emailType: {
      type: "string",
      enum: ["marketing", "transactional"],
      description: "Delivery policy accepted for the queued email.",
    },
    transactional: resourceOutputProperty("transactional email"),
  },
  get_stats: {
    stats: objectOutputProperty(
      `Account-wide delivery funnel for the requested window. ${EMAIL_FUNNEL_STATS_HINT}`
    ),
    emailType: stringOutputProperty(
      "Applied structural email type filter when one was requested."
    ),
    commerceForecast: resourceOutputProperty(
      "Optional background-computed commerce AOV, 12-month customer value, and 90-day revenue forecast. Omitted when no snapshot is available; insufficient_data is returned only after eligibility was evaluated successfully."
    ),
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
      "permanent, transient, and undetermined bounce counts plus subtype details"
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
  mark_conversation_read: {
    conversation: resourceOutputProperty("inbox conversation"),
  },
  list_webhooks: {
    webhooks: resourceListOutputProperty("outbound webhook"),
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
      "SMS add-on status: enabled, planEligible, creditsBalance, brandPrefix (account-wide default), numbers (each with id, e164, label tag, brandPrefix override, status), readyToSend (paid plan or credits plus an active number)."
    ),
  },
  submit_feedback: {},
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
      'Merge tags that rendered as an empty string, as [{ tag, reason }]. reason "unknown" means nothing provides that name, so it stays empty for every recipient - usually a typo or a tag copied from another platform. reason "no_value" means the name is recognized, or could not be checked, but is blank for this contact. A name is only called unknown when the render had a source to check it against. Without the contact\'s attributes nothing is checkable, since a bare {{plan}} reads the same attribute map as {{subscriber.plan}}, so pass a stored subscriberId or an inline subscriber carrying customAttributes. Beyond that, {{event.*}} needs sample event properties in variables, since a real send fills those from the enrolling event; {{recommendedProducts.*}} needs a stored subscriberId the catalog has something to recommend for; and {{discount.*}} is only checkable on a sequence step whose incoming paths all run the same discount step, never on a standalone template. Rendering a transactional email is checkable only when variables is passed, because its tags come from the variables of each send call and carry no prefix marking them. Otherwise those tags land in no_value rather than in unknown. An optional attribute this contact never had set is kept out of unknown by checking the names other contacts in the account carry, which needs the subscribers:read scope; a key without it may report such a name as unknown. An empty array means every tag in the email resolved.'
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
