import type { Tool, ToolAnnotations } from "../mcp-types.js";

export type RequiredToolHints = Pick<
  Required<ToolAnnotations>,
  "readOnlyHint" | "destructiveHint" | "idempotentHint" | "openWorldHint"
>;

export const READ_ONLY_TOOL_NAMES = new Set([
  "get_sequence_definition",
  "get_account_health",
  "list_email_references",
  "list_gallery_brand_requests",
  "list_watched_brands",
  "list_watched_brand_emails",
  "preview_sequence",
  "open_image_upload",
  "monitor_subscriber_import",
  "get_account",
  "get_app_urls",
  "get_company",
  "get_sync_rules",
  "get_shopify_automation_settings",
  "list_api_keys",
  // Builds a dashboard link and nothing else: no key is created, changed, or
  // returned until the owner confirms in their own browser session.
  "request_api_key_handoff",
  "list_websites",
  "list_integrations",
  "get_integration",
  "get_integration_pixel",
  "get_attio_mapping",
  "list_web_tracking_keys",
  "get_web_tracking_key",
  "list_integration_capabilities",
  "list_integration_suggestions",
  "list_integration_activity",
  "get_event_schema",
  "get_event_sample",
  "get_email_block_schema",
  "preview_cart_items",
  "list_sender_profiles",
  "get_notification_preferences",
  "get_tracking_domain",
  "get_tracking_settings",
  "get_frequency_cap",
  "get_email_design_system",
  "get_design_md",
  "get_email_ai_style",
  "get_sending_status",
  "check_website",
  "get_integration_guide",
  "get_subscriber",
  "get_subscriber_import",
  "get_subscriber_operation",
  "list_subscriber_operations",
  "list_subscriber_notes",
  "list_subscriber_attributes",
  "search_subscribers",
  "list_accounts",
  "get_account_by_external_id",
  "list_account_members",
  "list_account_events",
  "list_account_suggestions",
  "detect_account_organization_ids",
  "preview_accounts_from_organization_id",
  "get_account_organization_id_job",
  "list_products",
  "list_tags",
  "list_lists",
  "list_segments",
  "get_segment_count",
  "list_audience_syncs",
  "list_ad_accounts",
  "list_templates",
  "get_template",
  "get_template_localization_coverage",
  "list_email_components",
  "get_email_component",
  "get_default_email_component",
  "preview_default_email_component",
  "list_ab_tests",
  "get_ab_test",
  "get_ab_test_stats",
  "list_campaigns",
  "get_campaign",
  "get_campaign_audience",
  "list_campaign_goals",
  "list_campaign_variations",
  "get_campaign_variation",
  "list_sequence_email_variations",
  // Return HTML or findings and never mutate or send, despite POST backing.
  "render_email",
  "check_email",
  "list_email_sends",
  "get_email_send",
  "list_forms",
  "list_capture_submissions",
  "get_form_embed",
  "list_popups",
  "get_popup",
  "get_popup_embed",
  "get_recipient_suppression",
  "list_recipient_suppressions",
  "list_landing_pages",
  "get_landing_page",
  "get_landing_page_stats",
  "render_landing_page",
  "list_sequences",
  "get_sequence",
  "simulate_sequence",
  "get_sequence_test_run",
  "list_sequence_enrollments",
  "get_sequence_enrollment",
  "get_sequence_enrollment_realignment",
  "list_sequence_audience_enrollments",
  "get_sequence_audience_enrollment",
  "get_sequence_recurring_enrollment",
  "list_sequence_goals",
  "list_sequence_templates",
  "get_sequence_inbound_webhook",
  "list_transactional_emails",
  "get_transactional_email",
  "get_stats",
  "get_stats_breakdown",
  "get_transactional_stats",
  "get_campaign_stats",
  "get_email_client_stats",
  "get_link_click_stats",
  "list_poll_responses",
  "list_campaign_replies",
  "get_sequence_stats",
  "list_campaign_events",
  "list_sequence_events",
  "list_email_metrics",
  "get_subscriber_activity",
  "list_team_members",
  "get_inbox_address",
  "list_conversations",
  "list_conversation_recipients",
  "list_receiving_domains",
  "get_receiving_domain",
  "get_conversation",
  "list_webhooks",
  "list_geofences",
  "get_geofence",
  "list_webhook_deliveries",
  "list_data_exports",
  "get_data_export",
  "list_data_export_runs",
  "list_warehouse_connections",
  "get_warehouse_connection",
  "list_warehouse_syncs",
  "get_warehouse_sync",
  "list_warehouse_sync_runs",
  "get_sms_settings",
  "get_sms_usage",
  "get_push_settings",
  "list_push_devices",
  "get_push_import_preflight",
  "list_push_imports",
  "get_push_import",
  "list_live_activities",
  "list_in_app_messages",
  "get_in_app_step_stats",
  "list_in_app_templates",
  "write_in_app_copy",
  "validate_in_app_html",
  "list_in_app_placements",
  "get_in_app_placement",
  "get_in_app_placement_content",
  "list_push_campaigns",
  "get_push_campaign",
  // Returns AI translations only; nothing is saved.
  "translate_push_content",
  "get_push_campaign_stats",
  "estimate_push_campaign_recipients",
  "list_in_app_campaigns",
  "get_in_app_campaign",
  "get_in_app_campaign_stats",
  "estimate_in_app_campaign_recipients",
]);

export const MUTATING_TOOL_NAMES = new Set([
  "push_sequence_definition",
  // Settings switch checks and drafting; insight actions change triage state; a
  // check spends AI budget and may create inactive draft sequences.
  "update_account_health_settings",
  "run_account_health_check",
  "update_account_health_insight",
  "create_account_health_fix",
  // Records the caller's rating of a finding; nothing in the workspace changes.
  "submit_account_health_feedback",
  // Variations never change what a campaign sends until one is used.
  "generate_campaign_variations",
  "create_campaign_variation",
  "update_campaign_variation",
  "discard_campaign_variation",
  "restore_campaign_variation",
  "use_campaign_variation",
  // Saves nothing, but runs the email writer, which can record a company's
  // first design direction like generate_email.
  "generate_campaign_variation_section_options",
  // Saves the AI's edit over the variation's content.
  "edit_campaign_variation",
  // The generators return drafts, but the first generation for a company
  // saves its email design prompt, so they are not strictly read-only.
  "generate_email",
  "generate_subject_lines",
  "generate_sms",
  "request_gallery_brand",
  "remove_gallery_brand_request",
  // Watching again replaces the stored note; unwatching withdraws the
  // brand request with the same id.
  "watch_brand",
  "unwatch_brand",
  "create_template_from_example",
  "create_sequence_from_example",
  // Save nothing, but share the generators' first-use design prompt save.
  "preview_template_from_example",
  "preview_sequence_from_example",
  "select_company",
  "create_company",
  "update_company",
  "update_notification_preferences",
  "update_sender_profile",
  "delete_sender_profile",
  "update_tracking_settings",
  "set_frequency_cap",
  "clear_frequency_cap",
  "update_email_design_system",
  "update_design_md",
  "save_email_ai_style",
  "clear_email_ai_style",
  "update_sms_number_label",
  "release_sms_number",
  "update_web_push_settings",
  "set_apns_credentials",
  "remove_apns_credentials",
  "set_fcm_credentials",
  "remove_fcm_credentials",
  "register_push_device",
  "remove_push_device",
  "create_push_import",
  "add_push_import_rows",
  "start_push_import",
  "cancel_push_import",
  "record_in_app_event",
  "delete_in_app_message",
  "create_in_app_placement",
  "update_in_app_placement",
  "delete_in_app_placement",
  "send_test_push",
  "start_live_activity",
  "update_live_activity",
  "end_live_activity",
  "create_push_campaign",
  "update_push_campaign",
  "send_push_campaign",
  "unschedule_push_campaign",
  "cancel_push_campaign",
  "duplicate_push_campaign",
  "translate_push_campaign",
  "create_in_app_campaign",
  "update_in_app_campaign",
  "send_in_app_campaign",
  "unschedule_in_app_campaign",
  "stop_in_app_campaign",
  "duplicate_in_app_campaign",
  "resume_sending",
  "update_sync_rules",
  "update_shopify_automation_settings",
  "connect_integration",
  "set_integration_sync_enabled",
  "set_integration_list_targeting",
  "sync_integration",
  "disconnect_integration",
  // Writes a web pixel to the merchant's Shopify store.
  "activate_integration_pixel",
  "update_amplitude_settings",
  "update_attio_settings",
  "create_web_tracking_key",
  "update_web_tracking_key",
  "delete_web_tracking_key",
  "create_api_key",
  "update_api_key",
  "revoke_api_key",
  "delete_api_key",
  "add_sending_domain",
  "add_website",
  "verify_sending_domain",
  "upgrade_sending_domain_dns",
  "configure_sending_domain",
  "set_tracking_domain",
  "verify_tracking_domain",
  "remove_tracking_domain",
  "add_subscriber",
  "create_subscriber_import",
  "start_subscriber_operation",
  "cancel_subscriber_operation",
  "update_subscriber",
  "add_subscriber_note",
  "remove_subscriber",
  "upsert_account",
  "delete_account",
  "add_account_member",
  "remove_account_member",
  "trigger_account_event",
  "accept_account_suggestions",
  "create_accounts_from_organization_id",
  "delete_subscriber_note",
  "trigger_subscriber_event",
  "trigger_subscriber_events",
  "import_subscriber_events",
  "bulk_add_subscriber_tags",
  "bulk_remove_subscriber_tags",
  "upsert_products",
  "delete_product",
  "attach_product_file",
  "remove_product_file",
  "upload_image_asset",
  "sync_products",
  "create_tag",
  "update_tag",
  "delete_tag",
  "create_list",
  "update_list",
  "delete_list",
  "add_subscribers_to_list",
  "remove_subscribers_from_list",
  "create_segment",
  "update_segment",
  "delete_segment",
  "create_audience_sync",
  "update_audience_sync",
  "delete_audience_sync",
  "sync_audience_now",
  "create_template",
  "update_template",
  "set_template_localization",
  "sync_template_localizations",
  "translate_missing_template_localizations",
  "delete_template",
  "create_email_component",
  "update_email_component",
  "duplicate_email_component",
  "set_default_email_component",
  "delete_email_component",
  "restart_ab_test",
  "resume_ab_test",
  "select_ab_test_winner",
  "update_ab_test_variant",
  "update_ab_test",
  "create_ab_test",
  "add_ab_test_variant",
  "delete_ab_test_variant",
  "delete_ab_test",
  "create_campaign",
  "create_campaign_for_audience",
  "update_campaign",
  "schedule_campaign",
  "send_test_email",
  "send_test_sms",
  "share_campaign",
  "unshare_campaign",
  "share_template",
  "unshare_template",
  "unschedule_campaign",
  "cancel_campaign",
  "pause_campaign",
  "resume_campaign",
  "delete_campaign",
  "duplicate_campaign",
  "resend_campaign_to_non_openers",
  "create_form",
  "update_form",
  "create_popup",
  "update_popup",
  "duplicate_popup",
  "delete_popup",
  "create_landing_page",
  "update_landing_page",
  "duplicate_landing_page",
  "delete_landing_page",
  "publish_landing_page",
  "unpublish_landing_page",
  "connect_landing_page_domain",
  "update_landing_page_domain_settings",
  "remove_landing_page_domain",
  "create_sequence",
  "generate_sequence",
  "send_sequence_test_email",
  "start_sequence_test_run",
  "update_sequence",
  "update_sequence_node",
  "update_sequence_nodes",
  // Saves the AI's edits over the emails unless dryRun is set.
  "edit_sequence_emails",
  // Variations never change the email until one is used, which saves it
  // (and, with scope all, every other email's style) over what they had.
  "generate_sequence_email_variations",
  "use_sequence_email_variation",
  "discard_sequence_email_variation",
  "edit_sequence_graph",
  "insert_sequence_step",
  "enable_sequence",
  "disable_sequence",
  "duplicate_sequence",
  "archive_sequence",
  "unarchive_sequence",
  "create_campaign_goal",
  "update_campaign_goal",
  "delete_campaign_goal",
  "create_sequence_goal",
  "update_sequence_goal",
  "delete_sequence_goal",
  "create_sequence_from_template",
  "configure_sequence_inbound_webhook",
  "rotate_sequence_inbound_webhook_secret",
  "pause_sequence_enrollments",
  "resume_sequence_enrollments",
  "enroll_subscribers_in_sequence",
  "enroll_sequence_audience",
  "cancel_sequence_audience_enrollment",
  "set_sequence_recurring_enrollment",
  "cancel_sequence_enrollments",
  "move_sequence_enrollments",
  "pause_sequence_subscribers",
  "resume_sequence_subscribers",
  "realign_sequence_enrollments",
  "delete_sequence",
  "create_transactional_email",
  "update_transactional_email",
  "delete_transactional_email",
  "send_email",
  "invite_team_member",
  "cancel_team_invitation",
  "reply_to_conversation",
  "update_conversation_status",
  "bulk_update_conversation_status",
  "bulk_update_conversation_spam",
  "add_receiving_domain",
  "verify_receiving_domain",
  "remove_receiving_domain",
  "mark_conversation_read",
  "mark_conversation_unread",
  "forward_conversation_message",
  "update_inbox_address",
  "create_webhook",
  "update_webhook",
  "delete_webhook",
  "create_geofence",
  "update_geofence",
  "delete_geofence",
  "import_geofences",
  "test_webhook",
  "replay_webhook_delivery",
  "create_data_export",
  "update_data_export",
  "delete_data_export",
  "test_data_export",
  "run_data_export",
  "create_warehouse_connection",
  "update_warehouse_connection",
  "delete_warehouse_connection",
  "test_warehouse_connection",
  "preview_warehouse_query",
  "create_warehouse_sync",
  "update_warehouse_sync",
  "delete_warehouse_sync",
  "run_warehouse_sync",
  "submit_feedback",
  "remove_recipient_suppression",
]);

export const OPEN_WORLD_TOOL_NAMES = new Set([
  // Reads devices from OneSignal, Braze or Customer.io with the stored key.
  "start_push_import",
  "push_sequence_definition",
  // The prompt goes through the email writer, which can fetch URLs in it.
  "generate_campaign_variations",
  "generate_campaign_variation_section_options",
  "edit_campaign_variation",
  "edit_sequence_emails",
  "generate_sequence_email_variations",
  // URLs in the prompt are fetched to ground the draft.
  "generate_email",
  // A goal is drafted by the same email writer, so URLs in it are fetched.
  "create_sequence",
  "generate_sequence",
  // The check's agent can read the company's website through a page fetcher.
  "run_account_health_check",
  // Posts the rating and comment to the Sequenzy team's chat.
  "submit_account_health_feedback",
  // Requests every link and image URL in the email to verify it.
  "check_email",
  // Sends the company description and search text to an embeddings API.
  "list_email_references",
  // Overwrite email content that can be live in a running sequence, test or
  // transactional send, or shown on a public share link, which renders the
  // current content (like update_template).
  "update_campaign",
  "use_campaign_variation",
  "update_sequence_node",
  "update_sequence_nodes",
  "use_sequence_email_variation",
  "update_ab_test_variant",
  "update_transactional_email",
  // With an application scope, rewrites footers in live sequences, scheduled
  // campaigns and transactional emails.
  "set_default_email_component",
  // A test on a live sequence step starts splitting its contacts at once.
  "create_ab_test",
  "add_ab_test_variant",
  // Change content, sender identity or links on live sends (active
  // sequences, scheduled campaigns, transactional emails), or remove content
  // from a public share link or preference center that others can open.
  "update_push_campaign",
  "update_in_app_campaign",
  "update_sender_profile",
  "update_company",
  "set_template_localization",
  "sync_template_localizations",
  "translate_missing_template_localizations",
  // Push copy goes to an AI model for translation.
  "translate_push_campaign",
  "translate_push_content",
  "delete_campaign",
  "delete_transactional_email",
  "delete_sequence",
  "delete_list",
  // Change who matches a segment: segment-entered or -exited sequences that
  // are already running can then enroll and email the affected contacts.
  "update_segment",
  "delete_segment",
  "remove_subscribers_from_list",
  "bulk_remove_subscriber_tags",
  "delete_tag",
  "remove_account_member",
  "delete_account",
  "record_in_app_event",
  "remove_push_device",
  // Post subscriber events to the company's configured webhook URLs, like
  // update_subscriber and the list tools.
  "remove_subscriber",
  // Decide which later contacts, events or sends reach running sequences:
  // sync-rule tags start tag_added sequences, enabled Shopify sections fire
  // the events that start sequences, list targeting starts list-scoped
  // contact_added sequences, and a looser cap delivers emails it would skip.
  // Enabling sync resumes background imports that call the provider and add
  // contacts, like sync_integration.
  "set_integration_sync_enabled",
  "update_sync_rules",
  "update_shopify_automation_settings",
  "set_integration_list_targeting",
  "set_frequency_cap",
  "clear_frequency_cap",
  // Removing a variant on an active sequence changes what contacts reaching
  // that step receive, like add_ab_test_variant.
  "delete_ab_test_variant",
  // The logo, theme and colors apply at send time to live emails without
  // their own theme, like update_company.
  "update_design_md",
  // Later sends move to a fallback From identity, like update_sender_profile.
  "delete_sender_profile",
  // Enabled checks run on a schedule and can read the company website, like
  // run_account_health_check.
  "update_account_health_settings",
  // The default icon shows on live web push notifications.
  "update_web_push_settings",
  // The brand prefix and link shortening change every later SMS from the number.
  "update_sms_number_label",
  // A verified sending domain without receiving gets an Amazon SES inbound
  // identity requested, like add_receiving_domain.
  "update_inbox_address",
  // Applies to every later send; turning on double opt-in emails new contacts.
  "update_tracking_settings",
  // Empty allowedOrigins and allowedAppIds let any site or app send events
  // with the key.
  "update_web_tracking_key",
  // Looks up the caller-supplied domain with a brand data provider.
  "create_company",
  // An optional website is looked up the same way.
  "preview_template_from_example",
  "preview_sequence_from_example",
  // Lists the connected Meta ad accounts through the ad platform API.
  "list_ad_accounts",
  // All create a URL anyone with the link can open.
  "share_campaign",
  "share_template",
  "upload_image_asset",
  "attach_product_file",
  // Accepts posts from external systems at an unauthenticated secret URL.
  "configure_sequence_inbound_webhook",
  // Upload segment emails to Meta through the ad platform API.
  "create_audience_sync",
  "update_audience_sync",
  "sync_audience_now",
  // Reads the connected Stripe catalog.
  "sync_products",
  // Stock changes can send back-in-stock emails.
  "upsert_products",
  // Hands the number back to the SMS carrier.
  "release_sms_number",
  // Can email real contacts: they enroll contacts in sequences, fire tag or
  // event automations, or send double opt-in confirmations, by default or
  // through optional parameters.
  "add_subscriber",
  "add_subscribers_to_list",
  "bulk_add_subscriber_tags",
  "update_subscriber",
  "create_subscriber_import",
  "start_subscriber_operation",
  "trigger_subscriber_event",
  "trigger_subscriber_events",
  "import_subscriber_events",
  "upsert_account",
  "add_account_member",
  "trigger_account_event",
  "enroll_subscribers_in_sequence",
  // Requeues paused campaigns and due sequence steps.
  "resume_sending",
  // Public lists (the default) appear to subscribers in the email preference
  // center, where they can join or leave them.
  "create_list",
  "update_list",
  // Forms and popups go live for public site visitors; landing page edits
  // change a published page in place.
  "create_form",
  "update_form",
  "create_popup",
  "update_popup",
  "update_landing_page",
  // A publishable key that accepts events from any site unless origins are set.
  "create_web_tracking_key",
  // With a prompt, these draft the email like generate_email, which can fetch
  // URLs named in the prompt.
  "create_campaign",
  "create_template",
  "create_transactional_email",
  "insert_sequence_step",
  // Restarting a test or realigning waits changes what contacts on a live
  // step receive next, like resume_ab_test and move_sequence_enrollments.
  "restart_ab_test",
  "realign_sequence_enrollments",
  // Deleting a step releases parked contacts onto the next live step.
  "update_sequence",
  "edit_sequence_graph",
  "enroll_sequence_audience",
  "set_sequence_recurring_enrollment",
  "send_test_email",
  "send_test_sms",
  "send_test_push",
  "start_live_activity",
  "update_live_activity",
  "end_live_activity",
  "send_push_campaign",
  "send_in_app_campaign",
  "send_sequence_test_email",
  "start_sequence_test_run",
  "schedule_campaign",
  "resume_campaign",
  "publish_landing_page",
  "connect_landing_page_domain",
  "update_landing_page_domain_settings",
  "remove_landing_page_domain",
  "add_sending_domain",
  "add_website",
  "verify_sending_domain",
  // Publishes the domain's new records in Sequenzy's DNS zone.
  "upgrade_sending_domain_dns",
  // Register, check or release an HTTPS hostname with the tracking provider.
  "configure_sending_domain",
  "set_tracking_domain",
  "verify_tracking_domain",
  "remove_tracking_domain",
  // Register, check or release the domain with Amazon SES receiving.
  "add_receiving_domain",
  "verify_receiving_domain",
  "remove_receiving_domain",
  // Validates credentials against the provider's API and queues backfills.
  "connect_integration",
  // Reaches the provider's API (payment provider, Supabase) through a
  // background sync job.
  "sync_integration",
  "disconnect_integration",
  // Both talk to the Shopify Admin API in the request: the read cannot be
  // served from our own state, and the write changes the merchant's store.
  "get_integration_pixel",
  "activate_integration_pixel",
  // Reports the connected provider account's sync, webhook and activity state.
  "get_integration",
  // Changes what contacts on a running test receive next.
  "update_ab_test",
  // Both talk to Attio in the request: the people-list catalog is live, not stored.
  "get_attio_mapping",
  "update_amplitude_settings",
  "update_attio_settings",
  "enable_sequence",
  "resume_sequence_enrollments",
  // Releases contacts onto a live step, so the sequence starts sending to them
  // as soon as the worker picks them up.
  "move_sequence_enrollments",
  // Continues paused contacts, so a step whose wait already ran out sends
  // as soon as the worker picks them up.
  "resume_sequence_subscribers",
  "send_email",
  "select_ab_test_winner",
  // Clears the winner, so a live step starts splitting contacts again.
  "resume_ab_test",
  "invite_team_member",
  "reply_to_conversation",
  "forward_conversation_message",
  "create_webhook",
  "update_webhook",
  "test_webhook",
  "replay_webhook_delivery",
  // All write to the customer's own bucket (a probe file or export files).
  "create_data_export",
  "update_data_export",
  "test_data_export",
  "run_data_export",
  // All query the customer's own warehouse.
  "create_warehouse_connection",
  "update_warehouse_connection",
  "test_warehouse_connection",
  "preview_warehouse_query",
  "create_warehouse_sync",
  "update_warehouse_sync",
  "run_warehouse_sync",
  "remove_recipient_suppression",
  // Disclose the strongest supported mode, including indirect delivery and
  // replacement of existing user data, rather than only the default mode.
  "add_subscriber",
  "create_subscriber_import",
  "bulk_add_subscriber_tags",
  "trigger_subscriber_event",
  "trigger_subscriber_events",
  "import_subscriber_events",
  "enroll_subscribers_in_sequence",
  "create_audience_sync",
  "update_audience_sync",
  "sync_audience_now",
  "create_form",
  "update_form",
  "create_popup",
  "update_popup",
  "delete_popup",
  "update_landing_page",
  "unpublish_landing_page",
  "release_sms_number",
  "share_campaign",
  "unshare_campaign",
  "share_template",
  "unshare_template",
  "upload_image_asset",
  "attach_product_file",
  "submit_feedback",
  "resume_sending",
  "update_template",
  "delete_template",
  "sync_products",
]);

/**
 * Writes that only add new records or drafts. Every other mutating tool is
 * destructive: it overwrites, cancels, deletes, revokes, changes live
 * sending, or can send email/SMS or data that cannot be recalled, including
 * through optional parameters.
 */
export const ADDITIVE_TOOL_NAMES = new Set([
  // Create or extend a draft push import; nothing is imported until start.
  "create_push_import",
  "add_push_import_rows",
  // Creates one inactive draft sequence; never sends or activates.
  "create_account_health_fix",
  // New variations and options leave the campaign email untouched; restoring
  // brings back a discarded variation without overwriting anything.
  "generate_campaign_variations",
  "create_campaign_variation",
  "restore_campaign_variation",
  // Only hides the variation; restore_campaign_variation brings it back.
  "discard_campaign_variation",
  "generate_sequence_email_variations",
  "generate_campaign_variation_section_options",
  // The generators save the company's design prompt only while it is blank,
  // with a compare-and-swap that never replaces an existing one.
  "generate_email",
  "generate_subject_lines",
  "generate_sms",
  // Both create drafts; the gallery URL is parsed for slugs, not fetched.
  "create_template_from_example",
  "create_sequence_from_example",
  // Previews write nothing beyond the generators' design prompt.
  "preview_template_from_example",
  "preview_sequence_from_example",
  "create_web_tracking_key",
  "create_api_key",
  // Claims a tracking hostname only when the company has none; otherwise a
  // deprecated no-op.
  "configure_sending_domain",
  "add_subscriber_note",
  "upload_image_asset",
  "create_tag",
  "create_list",
  "create_segment",
  "create_template",
  "create_email_component",
  "duplicate_email_component",
  "create_campaign",
  "create_campaign_for_audience",
  // Creates a draft campaign; nothing is sent until it is scheduled.
  "resend_campaign_to_non_openers",
  "duplicate_campaign",
  "share_campaign",
  "share_template",
  "duplicate_popup",
  "create_landing_page",
  "duplicate_landing_page",
  "create_sequence",
  "generate_sequence",
  "duplicate_sequence",
  "create_campaign_goal",
  "create_sequence_goal",
  // Inserts a draft sequence; nothing is sent until it is enabled.
  "create_sequence_from_template",
  "create_transactional_email",
  // Both insert a draft push campaign; nothing is sent until it is sent.
  "create_push_campaign",
  "duplicate_push_campaign",
  // Both insert a draft in-app campaign; nothing is shown until it launches.
  "create_in_app_campaign",
  "duplicate_in_app_campaign",
  "create_webhook",
  "create_geofence",
  // A new placement serves nothing until a step targets it.
  "create_in_app_placement",
  "create_data_export",
  "create_warehouse_connection",
  "preview_warehouse_query",
]);

export const DESTRUCTIVE_TOOL_NAMES = new Set([
  // Writes devices and contacts in bulk; canceling deletes staged rows.
  "start_push_import",
  "cancel_push_import",
  "push_sequence_definition",
  "disconnect_integration",
  // Links and images in emails already sent through the removed domain stop working.
  "remove_tracking_domain",
  // All mail to the domain stops, including replies to emails already sent.
  "remove_receiving_domain",
  "revoke_api_key",
  "delete_api_key",
  "delete_sender_profile",
  "remove_subscriber",
  "delete_account",
  "remove_account_member",
  "delete_subscriber_note",
  "delete_product",
  "delete_web_tracking_key",
  "remove_product_file",
  "delete_tag",
  "delete_list",
  "remove_subscribers_from_list",
  "bulk_remove_subscriber_tags",
  "delete_segment",
  "delete_audience_sync",
  "delete_template",
  // Deleting the pinned default footer makes new emails fall back to the
  // generated footer, so it changes what future sends look like.
  "delete_email_component",
  "restart_ab_test",
  "delete_ab_test_variant",
  "delete_ab_test",
  "cancel_campaign",
  "cancel_push_campaign",
  "stop_in_app_campaign",
  // Removing credentials stops every push to that platform until re-added.
  "remove_apns_credentials",
  "remove_fcm_credentials",
  "remove_push_device",
  "delete_in_app_message",
  // Collapses the slot in the customer's app; steps that target it skip.
  "delete_in_app_placement",
  "delete_campaign",
  "delete_landing_page",
  "remove_landing_page_domain",
  "unpublish_landing_page",
  "delete_popup",
  // Disabling sync stops an integration feeding the account, in the same way
  // disabling a sequence stops it running. Reversible, but worth a confirm.
  "set_integration_sync_enabled",
  // Retargeting changes which lists an integration's future contacts join, so
  // it silently changes who gets mailed. Reversible, but contacts created
  // under the old targeting are not retroactively moved - worth a confirm.
  "set_integration_list_targeting",
  "disable_sequence",
  "archive_sequence",
  "delete_campaign_goal",
  "delete_sequence_goal",
  "rotate_sequence_inbound_webhook_secret",
  "edit_sequence_graph",
  "cancel_sequence_enrollments",
  // Not reversible in the way that matters: a released contact can receive the
  // target step's email before anyone notices the batch was wrong.
  "move_sequence_enrollments",
  "realign_sequence_enrollments",
  "delete_sequence",
  "cancel_team_invitation",
  "delete_webhook",
  "update_geofence",
  "delete_geofence",
  // Upserts by externalId, overwriting stored fields.
  "import_geofences",
  // Stops the customer's warehouse feed; recreating starts from that moment.
  "delete_data_export",
  "delete_warehouse_connection",
  // Scheduled imports stop; recreating needs the query and mapping again.
  "delete_warehouse_sync",
  "delete_transactional_email",
  "remove_recipient_suppression",
  // Re-sharing mints a different URL, so every copy of the old link that was
  // already passed around is permanently dead.
  "unshare_campaign",
  "unshare_template",
  // Hands the number back to the carrier - it cannot be recovered, and any
  // campaign/sequence step still pinned to it starts skipping instead of
  // sending.
  "release_sms_number",
  // Disclose the strongest supported mode, including indirect delivery and
  // replacement of existing user data, rather than only the default mode.
  "send_email",
  "send_test_email",
  "send_sequence_test_email",
  "send_test_sms",
  "reply_to_conversation",
  "invite_team_member",
  "test_webhook",
  "submit_feedback",
  "enroll_subscribers_in_sequence",
  "add_subscriber",
  "create_subscriber_import",
  "bulk_add_subscriber_tags",
  "trigger_subscriber_event",
  "trigger_subscriber_events",
  "import_subscriber_events",
  "schedule_campaign",
  "resume_campaign",
  "enable_sequence",
  "resume_sequence_enrollments",
  "resume_sequence_subscribers",
  "select_ab_test_winner",
  "update_company",
  "update_shopify_automation_settings",
  "update_sync_rules",
  "update_email_design_system",
  "update_api_key",
  "update_sender_profile",
  "update_tracking_settings",
  "update_notification_preferences",
  "save_email_ai_style",
  "clear_email_ai_style",
  "activate_integration_pixel",
  "update_amplitude_settings",
  "update_attio_settings",
  "update_subscriber",
  "upsert_products",
  "attach_product_file",
  "update_tag",
  "update_list",
  "update_segment",
  "update_audience_sync",
  "update_template",
  "set_template_localization",
  "sync_template_localizations",
  "translate_missing_template_localizations",
  "translate_push_campaign",
  "set_default_email_component",
  "update_email_component",
  "update_ab_test_variant",
  "update_ab_test",
  "create_ab_test",
  "update_campaign",
  "update_campaign_goal",
  "update_form",
  "update_popup",
  "update_landing_page",
  "update_landing_page_domain_settings",
  "update_sequence",
  "update_sequence_node",
  "update_sequence_nodes",
  "update_sequence_goal",
  "configure_sequence_inbound_webhook",
  "update_transactional_email",
  "update_web_tracking_key",
  "update_webhook",
  "update_sms_number_label",
  "resume_sending",
  "replay_webhook_delivery",
  "publish_landing_page",
  "connect_landing_page_domain",
  "sync_products",
  // Replace the selection that every later call without a companyId uses,
  // including calls from other chats on the same connection.
  "select_company",
  "create_company",
  // A verified domain can become the default sender and repoint campaigns and
  // sequences that used a built-in sender; a failed check unverifies it.
  "verify_sending_domain",
  // Cannot be cancelled once started; the domain later switches how its live
  // mail is signed by itself.
  "upgrade_sending_domain_dns",
  // A failed check marks a verified domain failed and stops its tracking or
  // receiving; the first receiving domain changes the reply address on every
  // email.
  "verify_tracking_domain",
  "add_receiving_domain",
  "verify_receiving_domain",
  // Writes the same probe file in the customer's bucket on every test.
  "test_data_export",
  // Overwrites the connection's stored status and last error.
  "test_warehouse_connection",
  // Resolves, reopens and rewrites existing findings.
  "run_account_health_check",
  // Replaces the caller's earlier rating.
  "submit_account_health_feedback",
  // Moves contacts into existing accounts and rewrites their account fields.
  "accept_account_suggestions",
  // Go live on creation; overwrite and reactivate modes change existing
  // contacts, and applied tags can start sequences.
  "create_form",
  "create_popup",
]);

/**
 * Writes whose repeat with the same input changes nothing further: setters
 * that report `changed: false` for the current state, share links that return
 * the existing URL, and bulk status updates that skip unchanged rows.
 */
export const IDEMPOTENT_WRITE_TOOL_NAMES = new Set([
  "push_sequence_definition",
  "set_integration_sync_enabled",
  "set_integration_list_targeting",
  "activate_integration_pixel",
  "update_amplitude_settings",
  "update_attio_settings",
  "bulk_update_conversation_status",
  "bulk_update_conversation_spam",
  "share_campaign",
  "share_template",
  // PUT replaces the schedule; an unchanged save keeps the pending next run.
  "set_sequence_recurring_enrollment",
  // PATCH sets the given fields; repeating it changes nothing more.
  "update_in_app_placement",
]);

export function getRequiredToolHints(toolName: string): RequiredToolHints {
  const isReadOnly = READ_ONLY_TOOL_NAMES.has(toolName);
  const isMutating = MUTATING_TOOL_NAMES.has(toolName);

  if (isReadOnly === isMutating) {
    throw new Error(
      `MCP tool "${toolName}" must be classified as exactly one of read-only or mutating.`
    );
  }

  return {
    readOnlyHint: isReadOnly,
    destructiveHint: !isReadOnly && !ADDITIVE_TOOL_NAMES.has(toolName),
    // Reads are repeatable. Other writes are not promised to be: a repeat
    // call can create another record, re-run a job, or send again.
    idempotentHint: isReadOnly || IDEMPOTENT_WRITE_TOOL_NAMES.has(toolName),
    openWorldHint: OPEN_WORLD_TOOL_NAMES.has(toolName),
  };
}

const TOOL_TITLE_ACRONYMS: Record<string, string> = {
  ab: "A/B",
  ai: "AI",
  api: "API",
  dns: "DNS",
  html: "HTML",
  id: "ID",
  mcp: "MCP",
  nps: "NPS",
  sms: "SMS",
  url: "URL",
  urls: "URLs",
  utm: "UTM",
};

export function getToolTitle(toolName: string): string {
  return toolName
    .split("_")
    .filter(Boolean)
    .map(
      (part) =>
        TOOL_TITLE_ACRONYMS[part] ??
        part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join(" ");
}

export function withRequiredToolHints(tool: Tool): Tool {
  return {
    ...tool,
    annotations: {
      ...tool.annotations,
      title: tool.annotations?.title ?? getToolTitle(tool.name),
      ...getRequiredToolHints(tool.name),
    },
  };
}
