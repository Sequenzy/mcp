import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { emailBlocksDescription, rawHtmlContentWarning } from "../internal.js";

export const campaignToolDefinitions: Tool[] = [
  // ============================================================================
  // Campaigns
  // ============================================================================
  {
    name: "list_campaigns",
    description:
      "List campaigns. Results are paginated: the default page size is 50 and limit is capped at 100. Always read the returned `pagination` object (`limit`, `offset`, `count`, `total`, `hasMore`) and keep paging with `offset` while `hasMore` is true - a single call does not necessarily return every campaign.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list campaigns for. If not provided, uses the currently selected company.",
        },
        status: {
          type: "string",
          description:
            "Filter by status (draft, scheduled, sent, sending, cancelled, paused, waiting_approval, or rejected). Rejected campaign results include rejectionComment feedback when provided.",
        },
        label: {
          type: "string",
          description:
            "Optional label name filter. Only campaigns assigned this label are returned.",
        },
        limit: {
          type: "number",
          description: "Page size from 1 to 100. Defaults to 50.",
        },
        offset: {
          type: "number",
          description: "Zero-based result offset. Defaults to 0.",
        },
      },
    },
  },
  {
    name: "get_campaign",
    description:
      "Get campaign details and stats, including rejectionComment reviewer feedback for rejected campaigns. `emailId` is the campaign's linked email body - the same record returned by the templates tools - and can be passed as templateId to create_campaign to reuse the design; it is null for SMS campaigns. `targetLists` holds the raw audience targeting (IDs only); call get_campaign_audience for resolved list/segment names and a recipient count. Note that `computedLists` is email personalization (product lists rendered inside the email), not audience targeting.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_campaign_audience",
    description:
      "Resolve exactly who a campaign will reach. Returns the targeting kind, resolved list and segment names (flagging references that no longer exist), filter conditions, individual include/exclude adjustments, a plain-language summary, and a live recipient count. Critically, it reports whether targeting is unset - an unset campaign falls back to every active subscriber when scheduled. Use this to verify a scheduled campaign's audience before it sends.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_send_schedule",
    description:
      "Everything going out between two dates: scheduled and sent campaigns (with STO/spread send windows), projected recurring campaign runs, known per-day sequence volume, transactional send history, and structural audience-overlap warnings (conflicts). Also returns every active sequence, even when it has no dated sends or enrolled subscribers. Use get_schedule_overlap to turn a warning into an exact shared-subscriber count.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        from: {
          type: "string",
          description: "Range start (ISO 8601).",
        },
        to: {
          type: "string",
          description:
            "Range end (ISO 8601). Must be after 'from'; at most 130 days later.",
        },
        timezone: {
          type: "string",
          description:
            "IANA timezone used to bucket daily volume (e.g. Europe/Kyiv). Defaults to UTC.",
        },
      },
      required: ["from", "to"],
    },
  },
  {
    name: "get_schedule_overlap",
    description:
      "Count subscribers who would receive both of two schedule items flagged by get_send_schedule. Each item is a campaign, sequence day, or transactional day. For daily-volume items, use the schedule item's windowStart/windowEnd; equal endpoints represent point-in-time volume, and windows span at most 130 days. Set transactionalEmailId to null for direct sends. The count is capped at 50,000.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        itemA: {
          type: "object",
          description: "First schedule item.",
          properties: {
            type: {
              type: "string",
              description: "'campaign', 'sequence', or 'transactional'.",
            },
            campaignId: {
              type: "string",
              description: "Campaign ID (campaign items).",
            },
            automationId: {
              type: "string",
              description: "Sequence ID (sequence items).",
            },
            transactionalEmailId: {
              type: ["string", "null"],
              description:
                "Transactional template ID, or null for direct-content sends (transactional items).",
            },
            from: {
              type: "string",
              description:
                "Sequence day window start, ISO 8601 (sequence items).",
            },
            to: {
              type: "string",
              description:
                "Sequence day window end, ISO 8601 (sequence items).",
            },
          },
          required: ["type"],
        },
        itemB: {
          type: "object",
          description: "Second schedule item; same shape as itemA.",
          properties: {
            type: {
              type: "string",
              description: "'campaign', 'sequence', or 'transactional'.",
            },
            campaignId: {
              type: "string",
              description: "Campaign ID (campaign items).",
            },
            automationId: {
              type: "string",
              description: "Sequence ID (sequence items).",
            },
            transactionalEmailId: {
              type: ["string", "null"],
              description:
                "Transactional template ID, or null for direct-content sends (transactional items).",
            },
            from: {
              type: "string",
              description:
                "Sequence day window start, ISO 8601 (sequence items).",
            },
            to: {
              type: "string",
              description:
                "Sequence day window end, ISO 8601 (sequence items).",
            },
          },
          required: ["type"],
        },
      },
      required: ["itemA", "itemB"],
    },
  },
  {
    name: "list_email_sends",
    description:
      "List and filter the recent sent-email delivery history shown in the dashboard. Search subject/title or recipient, filter by delivery status, email type, bounce type, or source ID, then pass a returned emailSendId to get_email_send for exact open/click timestamps and the complete event timeline. Each row carries recipientEmail, subscriberId, automationNodeId, abTestVariantId, and sent/delivered/opened/clicked timestamps, so rows join into a recipient-level delivery matrix without re-reading the raw event stream. Pass automationNodeId to list only the recipients of one sequence step. Delivery rows are retained for 14 days, so this is the wrong tool for send totals: read get_sequence_stats steps[] or list_email_metrics, which cover the full retained event window.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        search: {
          type: "string",
          description:
            "Case-insensitive search across subject and recipient email.",
        },
        subject: {
          type: "string",
          description: "Case-insensitive subject/title filter.",
        },
        recipient: {
          type: "string",
          description: "Case-insensitive recipient email filter.",
        },
        status: {
          type: "string",
          description:
            "Delivery status: pending, sent, delivered, opened, clicked, bounced, complained, failed, or suppressed. Opened includes clicked deliveries, matching the dashboard.",
        },
        emailType: {
          type: "string",
          description: "Email type: campaign, transactional, or sequence.",
        },
        bounceType: {
          type: "string",
          description: "Bounce type: Permanent or Transient.",
        },
        campaignId: {
          type: "string",
          description: "Filter deliveries from one campaign.",
        },
        transactionalEmailId: {
          type: "string",
          description: "Filter deliveries from one saved transactional email.",
        },
        automationId: {
          type: "string",
          description: "Filter deliveries from one sequence/automation.",
        },
        automationNodeId: {
          type: "string",
          description:
            "Filter deliveries from one email step of a sequence, using the nodeId from get_sequence_stats steps[] or get_sequence nodes.",
        },
        days: {
          type: "number",
          description: "History window in days, from 1 to 14. Defaults to 14.",
        },
        page: {
          type: "number",
          description: "Page number starting at 1. Defaults to 1.",
        },
        limit: {
          type: "number",
          description: "Results per page, from 1 to 100. Defaults to 20.",
        },
        sortField: {
          type: "string",
          description:
            "Sort field: recipientEmail, subject, status, eventAt, sentAt, or createdAt. Defaults to createdAt.",
        },
        sortOrder: {
          type: "string",
          description: "Sort order: asc or desc. Defaults to desc.",
        },
      },
    },
  },
  {
    name: "get_email_send",
    description:
      "Get an email delivery by emailSendId, including queued and test sends, delivery status, provider failure reason, stored HTML, effective Reply-To, copied-recipient identity and primary email send ID, and the ClickHouse event timeline. `type` is the legacy source category; use `emailType` on the send and `deliveryPolicy` on events for the actual marketing or transactional policy when known. Queue jobs are internal execution details and are not exposed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        emailSendId: {
          type: "string",
          description: "Durable email delivery ID to inspect.",
        },
      },
      required: ["emailSendId"],
    },
  },
  {
    name: "create_campaign",
    description:
      "Create a new campaign. Omit all content fields to create an empty draft. For net-new natural-language content use `prompt`; do not author HTML or blocks. `blocks` are finished caller-supplied Sequenzy content and `html` is preserved/imported markup. Defaults to draft; status 'sent' only archives an already-sent campaign.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the campaign in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Campaign name",
        },
        subject: {
          type: "string",
          description:
            "Email subject line. Optional when `prompt` is provided because the generated subject will be used.",
        },
        previewText: {
          type: ["string", "null"],
          description:
            "Email preview text. Optional when `prompt` is provided because the generated preview text will be used.",
        },
        trackingCode: {
          type: "string",
          description:
            "Optional campaign tracking code for UTM templates. Use only when explicitly requested.",
        },
        status: {
          type: "string",
          description:
            "Initial status: draft or sent. Defaults to draft. Use sent only for imported/already-sent campaigns; it does not send email or create delivery history.",
        },
        sentAt: {
          type: "string",
          description:
            "ISO date-time for an imported/already-sent campaign. Only valid when status is sent; defaults to now if omitted.",
        },
        html: {
          type: "string",
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider campaigns. ${rawHtmlContentWarning}`,
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        prompt: {
          type: "string",
          description:
            "Generate campaign blocks from a prompt. Generated blocks include the company's logo and footer, and the created campaign inherits the company brand font. Mutually exclusive with `html`, `blocks`, and `templateId`.",
        },
        style: {
          type: "string",
          description:
            "Prompt generation style: minimal, branded, promotional. Only used with `prompt`.",
        },
        tone: {
          type: "string",
          description:
            "Prompt generation tone: professional, casual, friendly. Only used with `prompt`.",
        },
        templateId: {
          type: "string",
          description: "Use a template instead of html",
        },
        segmentId: {
          type: "string",
          description:
            "Shorthand for targeting one saved segment. Equivalent to targetLists {type:'segment', segmentId}. Mutually exclusive with `targetLists`.",
        },
        targetLists: {
          type: "object",
          description:
            "Campaign audience, saved on the draft. Omit to leave targeting unset and set it later with `update_campaign` or `schedule_campaign`. Examples: {type:'all'}, {type:'lists', listIds:['list_123']}, {type:'segment', segmentId:'seg_123'}, {type:'filtered', filters:[...], filterJoinOperator:'and'}, or {type:'rules', include:[{type:'lists', listIds:['list_123']}], exclude:[{type:'segments', segmentIds:['seg_123']}]}. Use this to send straight to a list without creating a segment first. Mutually exclusive with `segmentId`.",
          additionalProperties: true,
        },
        fromEmail: {
          type: "string",
          description:
            "From address for this campaign. Its domain must be configured and verified; a sender profile is created when needed.",
        },
        fromName: {
          type: "string",
          description:
            "Display name for a newly created sender profile. Requires fromEmail; omit it when using senderProfileId, which already carries its own display name.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Existing sender profile ID (see list_sender_profiles). It already supplies both the From address and display name, so send it on its own and omit fromEmail and fromName.",
        },
        replyTo: {
          type: "string",
          description:
            "Reply-To address for this campaign. A reply profile is created when needed.",
        },
        replyToName: {
          type: "string",
          description:
            "Display name for a newly created reply profile. Requires replyTo; omit it when using replyProfileId, which already carries its own display name.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Existing reply profile ID (see list_sender_profiles). It already supplies both the Reply-To address and display name, so send it on its own and omit replyTo and replyToName.",
        },
        campaignData: {
          type: "object",
          description:
            "Optional campaign-scoped JSON data for repeat blocks and personalization.",
        },
        computedLists: {
          type: "array",
          description:
            "Optional computed list definitions derived from campaignData at send time.",
          items: {
            type: "object",
          },
        },
        labels: {
          type: "array",
          description:
            "Optional label names to assign. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_campaign",
    description: "Update a draft campaign",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
        name: {
          type: "string",
          description: "Campaign name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        trackingCode: {
          type: "string",
          description:
            "Optional campaign tracking code for UTM templates. Use only when explicitly requested. Send an empty string to clear it.",
        },
        html: {
          type: "string",
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider campaigns. ${rawHtmlContentWarning}`,
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        replyTo: {
          type: "string",
          description:
            "Set reply-to using an existing reply profile email address for this company.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Set reply-to using a reply profile ID for this company (see list_sender_profiles). It already supplies both the Reply-To address and display name, so send it on its own and omit replyTo and replyToName.",
        },
        replyToName: {
          type: "string",
          description:
            "Display name for a newly created reply profile. Requires replyTo; omit it when using replyProfileId, which already carries its own display name.",
        },
        fromEmail: {
          type: "string",
          description:
            "Set this campaign's From address. Its domain must be configured and verified.",
        },
        fromName: {
          type: "string",
          description:
            "Display name for a newly created sender profile. Requires fromEmail; omit it when using senderProfileId, which already carries its own display name.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Set an existing sender profile (see list_sender_profiles). It already supplies both the From address and display name, so send it on its own and omit fromEmail and fromName.",
        },
        ccEmails: {
          type: ["array", "null"],
          description:
            "Addresses CC'd on every recipient's campaign email (max 10). Send an empty array or null to clear them; omit to leave unchanged.",
          items: { type: "string" },
          maxItems: 10,
        },
        bccEmails: {
          type: ["array", "null"],
          description:
            "Addresses BCC'd on every recipient's campaign email (max 10). Send an empty array or null to clear them; omit to leave unchanged.",
          items: { type: "string" },
          maxItems: 10,
        },
        campaignData: {
          type: "object",
          description:
            "Set campaign-scoped JSON data for repeat blocks and personalization.",
        },
        computedLists: {
          type: "array",
          description:
            "Set computed list definitions derived from campaignData at send time.",
          items: {
            type: "object",
          },
        },
        targetLists: {
          type: ["object", "null"],
          description:
            "Replace the draft's saved audience, using the same shapes as `create_campaign`. Send null to clear it and choose the audience in `schedule_campaign` instead; omit to leave it unchanged. Mutually exclusive with `segmentId`.",
          additionalProperties: true,
        },
        segmentId: {
          type: "string",
          description:
            "Shorthand for retargeting the draft at one saved segment. Equivalent to targetLists {type:'segment', segmentId}. Mutually exclusive with `targetLists`.",
        },
        labels: {
          type: "array",
          description:
            "Replacement label names. Send an empty array to clear labels. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "schedule_campaign",
    description:
      "Schedule a draft or already scheduled campaign, as a one-off send or on a repeating weekly/monthly cadence via `recurringInterval`. Use `recurringInterval` for newsletters that go out on a fixed schedule instead of creating one campaign per issue. Returns dashboard edit and preview URLs.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID",
        },
        scheduledAt: {
          type: "string",
          description:
            "Future ISO 8601 timestamp for the send, for example 2026-06-01T14:00:00Z.",
        },
        targetLists: {
          type: "object",
          description:
            "Optional campaign targeting object. Omit to use saved targeting or all active subscribers. Examples: {type:'all'}, {type:'lists', listIds:['list_123']}, {type:'segment', segmentId:'seg_123'}, {type:'filtered', filters:[...], filterJoinOperator:'and'}, or {type:'rules', include:[{type:'lists', listIds:['list_123']}], exclude:[{type:'segments', segmentIds:['seg_123']}]}. Rules audiences require at least one include rule.",
          additionalProperties: true,
        },
        sendTimeOptimization: {
          type: "boolean",
          description: "Whether to use send-time optimization.",
        },
        spreadOverHours: {
          type: "number",
          description:
            "Spread delivery over an integer number of hours from 1 to 72. When set, spread delivery takes precedence over send-time optimization.",
        },
        recurringInterval: {
          type: "string",
          enum: ["weekly", "monthly"],
          description:
            "Repeat this campaign on a cadence starting at scheduledAt. The campaign becomes a recurring template: each run is duplicated and sent automatically, re-evaluating audience membership every time. Omit for a one-shot send; scheduling again without it stops the recurrence.",
        },
      },
      required: ["campaignId", "scheduledAt"],
      additionalProperties: false,
    },
  },
  {
    name: "send_test_email",
    description:
      "Queue a campaign test email to a single address. Returns a durable emailSendId; pass it to get_email_send for delivery status and failure details.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to test",
        },
        to: {
          type: "string",
          description: "Email address to send test to",
        },
      },
      required: ["campaignId", "to"],
    },
  },
  {
    name: "unschedule_campaign",
    description:
      "Return a scheduled campaign to an editable draft. Removes its pending send and recurrence without permanently cancelling it, so it can be edited and scheduled again.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Scheduled campaign ID to return to draft.",
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "cancel_campaign",
    description:
      "Cancel a campaign. Stops scheduled and sending campaigns (also works for paused and approval-pending ones). Remaining emails will not be sent and the campaign cannot be restarted - this cannot be undone.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to cancel.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "pause_campaign",
    description:
      "Pause a campaign that is currently sending. Only campaigns in sending status can be paused. Use resume_campaign to continue delivery later.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to pause.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "resume_campaign",
    description:
      "Resume a paused campaign. Only campaigns in paused status can be resumed. Optionally spread the remaining delivery over a number of hours.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to resume.",
        },
        spreadOverHours: {
          type: "number",
          description:
            "Spread the remaining delivery over an integer number of hours from 1 to 72.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "delete_campaign",
    description:
      "Permanently delete a campaign. This cannot be undone. Sending, scheduled, or paused campaigns must be cancelled with cancel_campaign first.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to delete.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "duplicate_campaign",
    description:
      "Duplicate a campaign as a new draft. mode 'campaign' (default) copies the campaign and its email, 'ab_test' also duplicates the campaign's A/B test with all variants, and 'variant' copies a single variant's content as the new campaign email (requires variantId).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID to duplicate.",
        },
        mode: {
          type: "string",
          enum: ["campaign", "ab_test", "variant"],
          description: "Duplication mode. Defaults to campaign.",
        },
        variantId: {
          type: "string",
          description:
            "A/B test variant ID whose content becomes the new campaign email. Required when mode is variant.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "resend_campaign_to_non_openers",
    description:
      "Create a draft that resends a sent campaign to everyone in the same audience who didn't open it. Copies the campaign email and reuses the original audience with a 'didn't open this campaign' rule added. Only available 6 hours after the campaign finishes sending. The draft must be scheduled or sent separately. Returns the new draft and an estimate of how many subscribers haven't opened the original.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        campaignId: {
          type: "string",
          description: "ID of the sent campaign to resend to non-openers.",
        },
      },
      required: ["campaignId"],
    },
  },
];
