import type { Tool } from "../mcp-types.js";

import { collapseRepeatedSchemas } from "./schema-collapse.js";

/**
 * Meta's Muse connector directory rejects large `tools/list` responses (the
 * standard surface is ~1.6 MB). The Muse surface is the everyday email
 * marketing workflow: account, subscribers, lists/tags/segments, campaigns,
 * sequences, templates, transactional sends, stats and the inbox. Builders
 * whose schemas alone are tens of kilobytes (create_sequence, update_sequence,
 * insert_sequence_step) are left out; generate_sequence and the example and
 * edit_sequence_emails tools cover the same work. Keep the list under the
 * byte budget pinned in muse-profile.test.ts.
 */
export const MUSE_TOOL_NAMES = [
  // Account and company
  "get_account",
  "select_company",
  "get_company",
  "get_app_urls",
  // Subscribers
  "add_subscriber",
  "get_subscriber",
  "update_subscriber",
  "remove_subscriber",
  "search_subscribers",
  "get_subscriber_activity",
  "list_subscriber_attributes",
  "bulk_add_subscriber_tags",
  "bulk_remove_subscriber_tags",
  "trigger_subscriber_event",
  "trigger_subscriber_events",
  "create_subscriber_import",
  "get_subscriber_import",
  // Lists, tags and segments
  "list_lists",
  "create_list",
  "add_subscribers_to_list",
  "remove_subscribers_from_list",
  "list_tags",
  "create_tag",
  "list_segments",
  "get_segment_count",
  // Campaigns
  "list_campaigns",
  "get_campaign",
  "get_campaign_audience",
  "create_campaign",
  "update_campaign",
  "duplicate_campaign",
  "send_test_email",
  "schedule_campaign",
  "unschedule_campaign",
  "pause_campaign",
  "resume_campaign",
  "cancel_campaign",
  "get_campaign_stats",
  "get_email_block_schema",
  "upload_image_asset",
  // AI writing
  "generate_email",
  "generate_subject_lines",
  // Sequences
  "list_sequences",
  "get_sequence",
  "generate_sequence",
  "create_sequence_from_example",
  "edit_sequence_emails",
  "simulate_sequence",
  "enable_sequence",
  "disable_sequence",
  "enroll_subscribers_in_sequence",
  "get_sequence_stats",
  // Templates and transactional email
  "list_templates",
  "get_template",
  "create_template_from_example",
  "update_template",
  "list_transactional_emails",
  "get_transactional_email",
  "send_email",
  // Sending setup and stats
  "list_sender_profiles",
  "update_sender_profile",
  "get_sending_status",
  "get_stats",
  "get_stats_breakdown",
  "list_email_sends",
  "get_email_send",
  // Inbox
  "list_conversations",
  "get_conversation",
  "reply_to_conversation",
  "get_inbox_address",
] as const;

const MUSE_TOOL_NAME_SET: ReadonlySet<string> = new Set(MUSE_TOOL_NAMES);

/**
 * Same definitions and handlers as the standard surface, filtered to the Muse
 * list. Output schemas are dropped to save space: tool results still carry
 * structuredContent, which MCP allows without a declared schema.
 */
export function getMuseTools(tools: readonly Tool[]): Tool[] {
  return tools
    .filter((tool) => MUSE_TOOL_NAME_SET.has(tool.name))
    .map(({ outputSchema: _outputSchema, ...tool }) => ({
      ...tool,
      inputSchema: collapseRepeatedSchemas(
        tool.inputSchema
      ) as Tool["inputSchema"],
    }));
}
