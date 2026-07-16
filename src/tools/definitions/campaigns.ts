import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { emailBlocksDescription } from "../internal.js";

export const campaignToolDefinitions: Tool[] = [
  // ============================================================================
  // Campaigns
  // ============================================================================
  {
    name: "list_campaigns",
    description: "List all campaigns",
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
          description: "Filter by status (draft, scheduled, sent)",
        },
        label: {
          type: "string",
          description:
            "Optional label name filter. Only campaigns assigned this label are returned.",
        },
      },
    },
  },
  {
    name: "get_campaign",
    description: "Get campaign details and stats",
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
    name: "get_email_send",
    description:
      "Get an email delivery by emailSendId, including queued and test sends, delivery status, provider failure reason, stored HTML, and the ClickHouse event timeline. Queue jobs are internal execution details and are not exposed.",
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
          description:
            "Email HTML content. Mutually exclusive with `blocks`. Use this for imported provider campaigns; Sequenzy stores it as one raw HTML block to preserve the design.",
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
          description: "Target segment ID",
        },
        fromEmail: {
          type: "string",
          description:
            "From address for this campaign. Its domain must be configured and verified; a sender profile is created when needed.",
        },
        fromName: {
          type: "string",
          description:
            "Display name for a newly created sender profile. Requires fromEmail.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Existing sender profile ID. Mutually exclusive with fromEmail.",
        },
        replyTo: {
          type: "string",
          description:
            "Reply-To address for this campaign. A reply profile is created when needed.",
        },
        replyToName: {
          type: "string",
          description:
            "Display name for a newly created reply profile. Requires replyTo.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Existing reply profile ID. Mutually exclusive with replyTo.",
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
          description:
            "Email HTML content. Mutually exclusive with `blocks`. Use this for imported provider campaigns; Sequenzy stores it as one raw HTML block to preserve the design.",
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
            "Set reply-to using a reply profile ID for this company.",
        },
        replyToName: {
          type: "string",
          description:
            "Display name for a newly created reply profile. Requires replyTo.",
        },
        fromEmail: {
          type: "string",
          description:
            "Set this campaign's From address. Its domain must be configured and verified.",
        },
        fromName: {
          type: "string",
          description:
            "Display name for a newly created sender profile. Requires fromEmail.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Set an existing sender profile. Mutually exclusive with fromEmail.",
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
      "Schedule a draft or already scheduled campaign. Returns dashboard edit and preview URLs.",
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
