import type { CallToolResult, Tool } from "@modelcontextprotocol/sdk/types.js";

import { isRecord } from "./common-primitives.js";
import { dashboardUrlToolNames } from "./delivery-and-urls.js";
import { pollRespondentFilterHint } from "./descriptions.js";
export type ToolOutputSchema = NonNullable<Tool["outputSchema"]>;
export type SequenzyToolCallResult = CallToolResult & {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
};
export type OutputSchemaProperty = {
  type?: "object" | "array" | "string" | "number" | "integer" | "boolean";
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
      "Whether the company still uses the platform default rules."
    ),
  },
  update_sync_rules: {
    syncRules: {
      type: "array",
      description: "Effective sync rules after the update.",
      items: objectOutputProperty("One sync rule."),
    },
    isDefault: booleanOutputProperty(
      "Whether the company now uses the platform default rules."
    ),
  },
  get_shopify_automation_settings: {
    browseAbandonment: objectOutputProperty(
      "Effective browse-abandonment settings (defaults applied)."
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
  list_websites: {
    websites: resourceListOutputProperty("sender website"),
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
  get_email_send: {
    emailSend: resourceOutputProperty("email send"),
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
  send_test_email: {
    emailSend: resourceOutputProperty("test email send"),
    recipient: stringOutputProperty("Test email recipient."),
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
    sequences: resourceListOutputProperty("sequence"),
  },
  get_sequence: {
    sequence: resourceOutputProperty("sequence"),
  },
  create_sequence: {
    sequence: resourceOutputProperty("sequence"),
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
    sequence: resourceOutputProperty("sequence"),
  },
  update_sequence_node: {
    sequence: resourceOutputProperty("sequence"),
  },
  update_sequence_nodes: {
    sequence: resourceOutputProperty("sequence"),
  },
  edit_sequence_graph: {
    sequence: resourceOutputProperty("sequence"),
  },
  insert_sequence_step: {
    sequence: resourceOutputProperty("sequence"),
    insertedNodeIds: {
      type: "array",
      description:
        "Node IDs created for the inserted step, including any delay node.",
      items: stringOutputProperty("Inserted automation node ID."),
    },
    insertedEmailIds: {
      type: "array",
      description: "Email template IDs created for the inserted step.",
      items: stringOutputProperty("Inserted email template ID."),
    },
    insertedEmailCount: numberOutputProperty("Number of email steps inserted."),
  },
  enable_sequence: {
    sequence: resourceOutputProperty("sequence"),
  },
  disable_sequence: {
    sequence: resourceOutputProperty("sequence"),
  },
  pause_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    enrollmentPaused: booleanOutputProperty(
      "Whether new sequence enrollments are paused."
    ),
  },
  resume_sequence_enrollments: {
    sequenceId: stringOutputProperty("Sequence ID."),
    enrollmentPaused: booleanOutputProperty(
      "Whether new sequence enrollments are paused."
    ),
  },
  enroll_subscribers_in_sequence: {
    sequence: resourceOutputProperty("sequence"),
    enrollments: resourceListOutputProperty("sequence enrollment"),
    enrolled: numberOutputProperty("Number of subscribers enrolled."),
    skipped: numberOutputProperty("Number of subscribers skipped."),
  },
  cancel_sequence_enrollments: {
    sequence: resourceOutputProperty("sequence"),
    cancelled: numberOutputProperty("Number of enrollments cancelled."),
    skipped: numberOutputProperty("Number of enrollments skipped."),
  },
  delete_sequence: {
    sequenceId: stringOutputProperty("Deleted sequence ID."),
  },
  list_transactional_emails: {
    transactional: resourceListOutputProperty("transactional email"),
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
    emailSend: resourceOutputProperty("transactional email send"),
    transactional: resourceOutputProperty("transactional email"),
  },
  get_stats: {
    stats: resourceOutputProperty("account or company statistics"),
  },
  get_campaign_stats: {
    campaign: resourceOutputProperty("campaign"),
    stats: resourceOutputProperty("campaign statistics"),
    polls: {
      type: "array",
      description: `Poll and NPS summaries. Each subscriber counts once per campaign poll block using their latest answer to that block; NPS entries include score, average, and promoter/passive/detractor counts. To list the exact historical respondents behind a count, use the summary blockId and the get_campaign_stats campaignId with create_segment. ${pollRespondentFilterHint} A summary's attributeKey identifies the subscriber attribute that stores their current/latest response and may be overwritten by a later poll that reuses the key.`,
      items: objectOutputProperty("One poll or NPS results summary."),
    },
  },
  get_sequence_stats: {
    sequence: resourceOutputProperty("sequence"),
    stats: resourceOutputProperty("sequence statistics"),
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
    sequence: resourceOutputProperty("generated sequence"),
    steps: resourceListOutputProperty("generated sequence step"),
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
