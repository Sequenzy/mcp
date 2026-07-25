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
  list_api_keys: {
    apiKeys: resourceListOutputProperty(
      "non-secret API key metadata, including ID, name, prefix, permissions, timestamps, and active-credential status"
    ),
  },
  revoke_api_key: {
    apiKey: resourceOutputProperty("revoked non-secret API key metadata"),
  },
  delete_api_key: {
    apiKey: resourceOutputProperty("deleted non-secret API key metadata"),
  },
  list_websites: {
    websites: resourceListOutputProperty("sender website"),
  },
  list_integrations: {
    integrations: resourceListOutputProperty(
      "connected integration, including provider, provider account ID, active and sync status, last sync time, last sync error, and allowlisted non-secret details. Credentials are never included"
    ),
  },
  list_sender_profiles: {
    senderProfiles: resourceListOutputProperty(
      "sender (From) profile, including the sending domain behind it, its verification status, and whether the address can currently send"
    ),
    replyProfiles: resourceListOutputProperty("reply-to profile"),
    defaultSenderProfileId: nullableStringOutputProperty(
      "Company default sender profile ID. Null when no default is set."
    ),
    defaultReplyProfileId: nullableStringOutputProperty(
      "Company default reply-to profile ID. Null when no default is set."
    ),
  },
  get_tracking_settings: {
    tracking: objectOutputProperty(
      "Open, click, and unsubscribe tracking flags plus the default attribution window in hours."
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
  add_website: {
    website: resourceOutputProperty(
      "Sending domain with the SPF, DKIM, MAIL FROM, and inbound DNS records required for setup."
    ),
  },
  add_sending_domain: {
    website: resourceOutputProperty(
      "Sending domain with the SPF, DKIM, MAIL FROM, and inbound DNS records required for setup."
    ),
  },
  check_website: {
    website: resourceOutputProperty("sender website"),
    ready: booleanOutputProperty("Whether the sender website is ready."),
    status: stringOutputProperty("Current processing or verification status."),
  },
  verify_sending_domain: {
    website: resourceOutputProperty(
      "Sending domain with current aggregate, SPF, DKIM, and MAIL FROM verification details."
    ),
    verified: booleanOutputProperty(
      "Whether the sending domain passed the fresh verification check."
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
      "recorded event with its name and whether the event definition was created"
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
    pagination: objectOutputProperty("Pagination metadata."),
    returned: numberOutputProperty("Number of subscribers returned."),
    truncated: booleanOutputProperty(
      "Whether the result was truncated by the requested limit."
    ),
  },
  list_products: {
    products: resourceListOutputProperty("product"),
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
  send_test_email: {
    emailSendId: stringOutputProperty("Durable test email delivery ID."),
    recipientEmail: stringOutputProperty("Test email recipient."),
  },
  send_test_sms: {
    smsSendId: stringOutputProperty("Created test SMS send ID."),
    toPhone: stringOutputProperty("Normalized E.164 destination phone."),
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
  get_form_embed: {
    form: resourceOutputProperty("saved form"),
    embed: objectOutputProperty(
      "Public action URL plus JavaScript, native form, and fetch snippets."
    ),
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
  },
  get_sequence: {
    sequence: sequenceOutputProperty,
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
      "Created path node IDs keyed by branch ID, plus else. Directly wired paths have empty arrays."
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
      description: `Poll and NPS summaries. Each subscriber counts once per campaign poll block using their latest answer to that block; NPS entries include score, average, and promoter/passive/detractor counts. To list the exact historical respondents behind a count, use the summary blockId and the get_campaign_stats campaignId with create_segment. ${pollRespondentFilterHint} A summary's attributeKey identifies the subscriber attribute that stores their current/latest response and may be overwritten by a later poll that reuses the key.`,
      items: objectOutputProperty("One poll or NPS results summary."),
    },
    recommendations: objectOutputProperty(
      "Product recommendation funnel: impressions, recipients, clicks, clickers, orders, legacy revenueCents, currency-safe revenueByCurrency totals, and topProducts (per-product impressions/clicks). Orders count when a subscriber buys a recommended product within 7 days of clicking it. Present only when the campaign rendered product recommendation blocks."
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
      "SMS add-on status: enabled, planEligible, creditsBalance, brandPrefix, numbers, readyToSend (paid plan or credits plus an active number)."
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
      "Whether a real contact was supplied. False means a sample contact was used and merge tags resolved to empty values."
    ),
    trackingApplied: booleanOutputProperty(
      "Whether auto-UTM link decoration was applied."
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
