import type { Tool } from "../../mcp-types.js";
import {
  campaignEmailPresetSchema,
  campaignMaxRecipientsFieldDescription,
  campaignSendTimeOptimizationFieldDescription,
  campaignSendTimeWindowHoursFieldDescription,
  campaignStoListFieldsHint,
  campaignStoNotCompanyOrSequenceHint,
  emailBlocksDescription,
  rawHtmlContentDescription,
  replyToNameDescription,
  senderFromNameDescription,
} from "../internal.js";

import { createCampaignForAudienceTool } from "./campaign-audience-selection.js";

const campaignAttachmentItemSchema = {
  type: "object",
  properties: {
    filename: {
      type: "string",
      description:
        "Name recipients see, such as report.pdf. Its extension sets the file type when contentType is omitted.",
    },
    content: {
      type: "string",
      description:
        "Base64 file content. Sequenzy stores the file and returns a path. Provide content or path, not both.",
    },
    path: {
      type: "string",
      description:
        "Public HTTP(S) URL fetched when the campaign starts sending. Provide content or path, not both.",
    },
    contentType: {
      type: "string",
      description:
        "MIME type for Base64 content, such as application/pdf. PDF, Office, ZIP, image, audio, video and text files are accepted; HTML and SVG are not.",
    },
  },
  required: ["filename"],
} as const;

const campaignAttachmentsDescription =
  "Files attached to every recipient's email, including CC/BCC copies and test sends: up to 10 files and 5MB in total. Each item has a filename plus Base64 `content` or a public `path` URL. Inline images (contentId) are not supported on campaigns. If a file cannot be fetched or is too large when sending starts, nothing is sent and the campaign returns to draft.";

/**
 * Shared JSON schema for `targetLists` arguments so agents can discover the
 * accepted audience shapes from the schema itself instead of guessing. The
 * value is a discriminated union on `type`; extra per-shape fields are listed
 * as optional properties with their owning `type` named in the description.
 */
function buildTargetListsInputSchema(
  description: string,
  options?: { nullable?: boolean }
): Record<string, unknown> {
  return {
    type: options?.nullable ? ["object", "null"] : "object",
    description,
    properties: {
      type: {
        type: "string",
        enum: ["all", "lists", "segment", "filtered", "rules"],
        description:
          "Audience shape. all = every active subscriber; lists = subscribers on any of listIds; segment = one saved segment; filtered = ad-hoc subscriber filters; rules = combined include/exclude rules.",
      },
      listIds: {
        type: "array",
        items: { type: "string" },
        description: "List IDs to target. Required when type is 'lists'.",
      },
      segmentId: {
        type: ["string", "null"],
        description: "Saved segment ID. Required when type is 'segment'.",
      },
      filters: {
        type: "array",
        items: { type: "object" },
        description:
          "Subscriber filter objects {id, field, operator, value}. Required when type is 'filtered'.",
      },
      filterJoinOperator: {
        type: "string",
        enum: ["and", "or"],
        description:
          "How 'filtered' filters combine. Optional, defaults to 'and'.",
      },
      include: {
        type: "array",
        items: { type: "object" },
        description:
          "Include rules. Required when type is 'rules'; an include rule or explicit includedSubscriberIds are needed to schedule. Each rule is {type:'all'} | {type:'lists', listIds:[...]} | {type:'segments', segmentIds:[...]} | {type:'filtered', filters:[...]}.",
      },
      exclude: {
        type: "array",
        items: { type: "object" },
        description:
          "Exclude rules for type 'rules'. Optional. Same shapes as include except {type:'all'}.",
      },
      includedSubscriberIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Explicit selected contacts, including frozen groups from create_campaign_for_audience. An empty include array is allowed when these IDs are present.",
      },
      excludedSubscriberIds: {
        type: "array",
        items: { type: "string" },
        description:
          "Individual contacts to exclude from the audience. Explicit includedSubscriberIds override exclusions; remove a contact from that array to exclude it from a frozen group.",
      },
    },
    required: ["type"],
    additionalProperties: true,
  };
}

export const campaignToolDefinitions: Tool[] = [
  createCampaignForAudienceTool,
  // ============================================================================
  // Campaigns
  // ============================================================================
  {
    name: "list_campaigns",
    description: `List campaigns. Each item carries \`emailPreset\`, the linked email's Style > Format (branded or minimal; null for SMS campaigns and standalone raw HTML emails), so chrome can be compared across campaigns without one get_campaign call each. ${
      campaignStoListFieldsHint
    } Results are paginated: the default page size is 50 and limit is capped at 100. Always read the returned \`pagination\` object (\`limit\`, \`offset\`, \`count\`, \`total\`, \`hasMore\`) and keep paging with \`offset\` while \`hasMore\` is true - a single call does not necessarily return every campaign.`,
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
          description:
            "How many campaigns to return in this page (at most 100). Defaults to 50.",
        },
        offset: {
          type: "number",
          description:
            "How many campaigns to skip, counting from 0. For the next page, add pagination.count to the current offset. Defaults to 0.",
        },
      },
    },
  },
  {
    name: "get_campaign",
    description: `Get campaign details and stats, including rejectionComment reviewer feedback for rejected campaigns. \`emailId\` is the campaign's linked email body - the same record returned by the templates tools - and can be passed as templateId to create_campaign to reuse the design; it is null for SMS campaigns. \`emailPreset\` reports that email's Style > Format the same way get_sequence does per step (branded or minimal; null for SMS campaigns and standalone raw HTML emails), so campaign chrome can be compared against sequence steps and transactional templates without rendering them - minimal suppresses the company logo at render time. \`targetLists\` holds the raw audience targeting (IDs only); call get_campaign_audience for resolved list/segment names and a recipient count. Note that \`computedLists\` is email personalization (product lists rendered inside the email), not audience targeting. For native sends, \`sentAt\` is stamped when the last recipient is handed off, so on a paced send it is the end of the delivery window; \`spreadOverHours\`, \`sendTimeOptimization\`, and \`sendTimeWindowHours\` report recorded pacing, and \`maxRecipients\` reports the recipient cap (null = whole audience). Change draft pacing or the cap with update_campaign, or apply them when calling schedule_campaign. ${
      campaignStoNotCompanyOrSequenceHint
    } Imported campaigns may not include pacing metadata from their source provider, so absent pacing fields do not prove that delivery happened all at once.`,
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
          description:
            "Campaign to read, from list_campaigns or create_campaign.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "get_campaign_audience",
    description:
      "Resolve exactly who a campaign will reach. Returns the targeting kind, resolved list and segment names (flagging references that no longer exist), filter conditions, individual include/exclude adjustments, a plain-language summary, and a live recipient count. Critically, it reports whether targeting is unset - an unset campaign falls back to every active subscriber when scheduled. Use this to verify a scheduled campaign's audience before it sends. This is a read-only resolved view, not the write shape: to change targeting, pass `targetLists` (e.g. {type:'lists', listIds:['list_123']}) or the `segmentId`/`listIds` shorthands to update_campaign or schedule_campaign.",
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
          description:
            "Campaign whose audience to resolve, from list_campaigns or create_campaign.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "share_campaign",
    description:
      "Create (or fetch) the campaign's public view-in-browser link. The hosted page renders an anonymized copy - sample contact, inert unsubscribe link, no open/click tracking - so the URL is safe to forward to anyone, unlike a recipient's personal browser copy. Idempotent: if a link is already active, the same URL is returned with created=false rather than rotating it, so previously shared copies keep working. get_campaign reports the current link as shareUrl (null when none). Revoke with unshare_campaign. Email campaigns only - SMS campaigns have no browser view.",
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
          description: "Campaign ID to share.",
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "unshare_campaign",
    description:
      "Revoke the campaign's public view-in-browser link. The shared URL returns 404 immediately, and sharing again later mints a different URL - previously distributed copies stay dead. Returns revoked=false if no link was active.",
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
          description: "Campaign ID to stop sharing.",
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_email_sends",
    description:
      "List and filter the recent sent-email delivery history shown in the dashboard. Search subject/title or recipient, filter by delivery status, email type, bounce type, source ID, recipient mailbox provider, or list membership, then pass a returned emailSendId to get_email_send for exact open/click timestamps and the complete event timeline. Each row carries recipientEmail, subscriberId, automationNodeId, abTestVariantId, and sent/delivered/opened/clicked timestamps, so rows join into a recipient-level delivery matrix without re-reading the raw event stream. Pass automationNodeId to list only the recipients of one sequence step. Delivery rows are retained for 14 days, so this is the wrong tool for send totals: read get_sequence_stats steps[] or list_email_metrics, which cover the full retained event window. Successful live-test and other test sends are omitted so they do not bury real deliveries; only failed, bounced, or suppressed test sends appear. Replies to those test sends show in list_conversations only when inbound reply capture is enabled; otherwise the send uses the original Reply-To and Sequenzy never sees the reply.",
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
          description:
            "Bounce type: Permanent, Transient, Soft, or Blocked. Transient is every temporary bounce; Blocked is the part the receiver refused on content, policy, or reputation grounds, and Soft is the rest.",
        },
        campaignId: {
          type: "string",
          description:
            "Only deliveries from this campaign; IDs come from list_campaigns or get_campaign.",
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
        mailboxProvider: {
          type: "string",
          description:
            "Recipient mailbox provider, with the same values and domain classification as the analytics mailboxProvider filter (e.g. gmail, microsoft, yahoo, icloud, orange). Use it to list the deliveries behind a provider's analytics numbers. `other` matches every domain outside the named providers.",
        },
        listId: {
          type: "string",
          description:
            "Only deliveries to active subscribers currently on this list (list ID from list_lists), the same audience the analytics list filter uses.",
        },
        days: {
          type: "number",
          description:
            "How many days back from now to include (rows are kept 14 days). Defaults to 14.",
        },
        page: {
          type: "number",
          description:
            "Which page of results to return, counting from 1. Defaults to 1.",
        },
        limit: {
          type: "number",
          description:
            "How many deliveries to return per page (at most 100). Defaults to 20.",
        },
        sortField: {
          type: "string",
          description:
            "Column to order rows by: recipientEmail, subject, status, eventAt, sentAt, or createdAt (when the send was queued). Defaults to createdAt.",
        },
        sortOrder: {
          type: "string",
          description:
            "asc for oldest or A-Z first, desc for newest or Z-A first. Defaults to desc.",
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
      "Create a new campaign. Omit all content fields to create an empty draft. `prompt` generates net-new content from natural language. `blocks` are finished caller-supplied Sequenzy content and `html` is preserved/imported markup. Pass `emailPreset` with native blocks to set Style > Format (minimal or branded); `style` is a prompt-generation hint only. Defaults to draft; status 'sent' only archives an already-sent campaign.",
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider campaigns. ${rawHtmlContentDescription}`,
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
            "Prompt generation style. Only used with `prompt`; this is not Style > Format. Pass 'designed' or 'plain' to force the designed or plain-text email style; other values (minimal, branded, promotional) are freeform prompt guidance and the company's email style preference decides. Use `emailPreset` to set branded or minimal chrome on native blocks.",
        },
        tone: {
          type: "string",
          description:
            "Prompt generation tone: professional, casual, friendly. Only used with `prompt`.",
        },
        emailPreset: campaignEmailPresetSchema,
        templateId: {
          type: "string",
          description: "Use a template instead of html",
        },
        segmentId: {
          type: "string",
          description:
            "Shorthand for targeting one saved segment. Equivalent to targetLists {type:'segment', segmentId}. Mutually exclusive with `targetLists` and `listIds`.",
        },
        listIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Shorthand for targeting one or more lists. Equivalent to targetLists {type:'lists', listIds}. Mutually exclusive with `targetLists` and `segmentId`.",
        },
        targetLists: buildTargetListsInputSchema(
          "Campaign audience, saved on the draft. Omit to leave targeting unset and set it later with `update_campaign` or `schedule_campaign`. Examples: {type:'all'}, {type:'lists', listIds:['list_123']}, {type:'segment', segmentId:'seg_123'}, {type:'filtered', filters:[...], filterJoinOperator:'and'}, or {type:'rules', include:[{type:'lists', listIds:['list_123']}], exclude:[{type:'segments', segmentIds:['seg_123']}]}. Use this to send straight to a list without creating a segment first. Mutually exclusive with `segmentId` and `listIds`."
        ),
        fromEmail: {
          type: "string",
          description:
            "From address for this campaign. Its domain must be configured and verified; a sender profile is created when needed.",
        },
        fromName: {
          type: "string",
          description: senderFromNameDescription,
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
          description: replyToNameDescription,
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
        attachments: {
          type: "array",
          description: campaignAttachmentsDescription,
          items: campaignAttachmentItemSchema,
          maxItems: 10,
        },
      },
      required: ["name"],
    },
  },
  {
    name: "update_campaign",
    description: `Update a draft email campaign's content, audience, sending identity, labels, Style > Format, delivery pacing, or recipient limit. Only drafts can be edited: unschedule a scheduled campaign first (unschedule_campaign). Supplied fields overwrite the saved draft immediately; nothing is sent until schedule_campaign. Returns the updated campaign. Pass emailPreset to change Style > Format on native blocks without rewriting copy. sendTimeOptimization, sendTimeWindowHours and maxRecipients persist on the draft and are used when the campaign is later scheduled unless schedule_campaign overrides them. ${
      campaignStoNotCompanyOrSequenceHint
    }`,
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
          description:
            "Draft campaign to edit, from list_campaigns or create_campaign.",
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
          description: `Email HTML content. Mutually exclusive with \`blocks\`. Use this for imported provider campaigns. ${rawHtmlContentDescription}`,
        },
        blocks: {
          type: "array",
          description: emailBlocksDescription,
          items: {
            type: "object",
          },
        },
        emailPreset: campaignEmailPresetSchema,
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
          description: replyToNameDescription,
        },
        fromEmail: {
          type: "string",
          description:
            "Set this campaign's From address. Its domain must be configured and verified.",
        },
        fromName: {
          type: "string",
          description: senderFromNameDescription,
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
        targetLists: buildTargetListsInputSchema(
          "Replace the draft's saved audience, using the same shapes as `create_campaign`, e.g. {type:'lists', listIds:['list_123']}. Send null to clear it and choose the audience in `schedule_campaign` instead; omit to leave it unchanged. Mutually exclusive with `segmentId` and `listIds`.",
          { nullable: true }
        ),
        segmentId: {
          type: "string",
          description:
            "Shorthand for retargeting the draft at one saved segment. Equivalent to targetLists {type:'segment', segmentId}. Mutually exclusive with `targetLists` and `listIds`.",
        },
        listIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Shorthand for retargeting the draft at one or more lists. Equivalent to targetLists {type:'lists', listIds}. Mutually exclusive with `targetLists` and `segmentId`.",
        },
        labels: {
          type: "array",
          description:
            "Labels that group campaigns in the dashboard and filter list_campaigns. Replaces the current set; send an empty array to clear labels. Missing labels are created automatically.",
          items: {
            type: "string",
          },
        },
        sendTimeOptimization: {
          type: "boolean",
          description: campaignSendTimeOptimizationFieldDescription,
        },
        sendTimeWindowHours: {
          type: "number",
          description: campaignSendTimeWindowHoursFieldDescription,
        },
        maxRecipients: {
          type: ["number", "null"],
          description: campaignMaxRecipientsFieldDescription,
        },
        attachments: {
          type: ["array", "null"],
          description: `${campaignAttachmentsDescription} Replaces the saved list; send an empty array or null to remove every attachment, or omit to leave them unchanged.`,
          items: campaignAttachmentItemSchema,
          maxItems: 10,
        },
      },
      required: ["campaignId"],
      additionalProperties: false,
    },
  },
  {
    name: "schedule_campaign",
    description:
      "Schedule a draft or already scheduled campaign as a one-off send or on a repeating weekly/monthly cadence via `recurringInterval`. The campaign must have a non-empty subject, at least one content block, and at least one audience include rule or an explicit selected contact. Use `recurringInterval` for newsletters that go out on a fixed schedule instead of creating one campaign per issue. Send Time Optimization (sendTimeOptimization) delivers each recipient at their predicted best hour within sendTimeWindowHours of scheduledAt (default 12h, max 24); it is campaign-only and is not available on sequences. spreadOverHours takes precedence and turns STO off; sendInRecipientTimezone also turns it off. Returns dashboard edit and preview URLs; validation errors explain what must be fixed before retrying. Only draft or scheduled campaigns can be scheduled, so a repeat call replaces the schedule and cannot send the campaign twice. Check `status` in the result: `waiting_approval` means the campaign is held for safety review (new senders get an automated screen that can take up to about two minutes; flagged content waits for a person). That is a normal outcome, not an error: report it and poll get_campaign for `scheduled` or `rejected` (with rejectionComment) instead of scheduling again, which does not clear the hold.",
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
          description:
            "Draft or scheduled campaign to schedule, from list_campaigns or create_campaign.",
        },
        scheduledAt: {
          type: "string",
          description:
            "Future ISO 8601 timestamp for the send, for example 2026-06-01T14:00:00Z.",
        },
        targetLists: buildTargetListsInputSchema(
          "Optional campaign targeting object. Omit to use saved targeting - or, when none is saved, ALL active subscribers. Examples: {type:'all'}, {type:'lists', listIds:['list_123']}, {type:'segment', segmentId:'seg_123'}, {type:'filtered', filters:[...], filterJoinOperator:'and'}, or {type:'rules', include:[{type:'lists', listIds:['list_123']}], exclude:[{type:'segments', segmentIds:['seg_123']}]}. Rules audiences require at least one include rule or a nonempty includedSubscriberIds array. Mutually exclusive with `listIds`."
        ),
        listIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Shorthand for sending to one or more lists. Equivalent to targetLists {type:'lists', listIds}. Mutually exclusive with `targetLists`.",
        },
        sendTimeOptimization: {
          type: "boolean",
          description: campaignSendTimeOptimizationFieldDescription,
        },
        sendTimeWindowHours: {
          type: "number",
          description: campaignSendTimeWindowHoursFieldDescription,
        },
        spreadOverHours: {
          type: "number",
          description:
            "Whole number of hours to pace delivery over, from scheduledAt, instead of sending as fast as possible. When set, spread delivery takes precedence over send-time optimization. With an A/B test the spread sets one sending rate for the whole audience: the test sample and the winner are each spread over their share of the window, with the test duration in between. If the account has a minimum spread, a lower or missing value is raised to it and send-time optimization is turned off.",
        },
        maxRecipients: {
          type: ["number", "null"],
          description: `${campaignMaxRecipientsFieldDescription} Omit to keep the draft's saved cap. For A/B tests, allow at least one recipient per variant plus one for the winner; smaller limits are rejected before scheduling.`,
        },
        sendInRecipientTimezone: {
          type: "boolean",
          description:
            "Deliver at scheduledAt's wall-clock time in each recipient's own timezone ('send when it's 8pm for the customer'). Requires `scheduledTimezone`; contacts without a stored timezone receive the campaign at scheduledAt itself. Not combinable with `recurringInterval` or `spreadOverHours`.",
        },
        scheduledTimezone: {
          type: "string",
          description:
            "IANA timezone the scheduledAt wall-clock time refers to, for example America/New_York. Required with `sendInRecipientTimezone`.",
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
      "Queue a campaign test email to a single address. Only that address receives it; the campaign is not scheduled or sent. Returns a durable emailSendId; pass it to get_email_send for delivery status and failure details. Each successful call queues another test email.",
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
          description:
            "Campaign whose current saved content to send, from list_campaigns or create_campaign.",
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
      "Return a scheduled campaign to an editable draft. Removes its pending send and recurrence without permanently cancelling it, so it can be edited and scheduled again. Returns the campaign, now in draft status.",
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
          description:
            "Campaign to cancel, from list_campaigns or get_campaign (status scheduled, sending, paused or waiting_approval).",
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
          description:
            "Campaign that is sending right now (status sending), from list_campaigns or get_campaign.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "resume_campaign",
    description:
      "Resume a paused campaign: delivery starts again right away for recipients who have not been sent it yet; recipients already reached are not sent it again. Only campaigns in paused status can be resumed. Optionally spread the remaining delivery over a number of hours. Returns the campaign.",
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
            "Whole number of hours to pace the remaining delivery over, from now. With an A/B test this sets the sending rate for the remaining recipients of the current phase. If the account has a minimum spread, a lower, missing or null value is raised to it.",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "delete_campaign",
    description:
      "Permanently delete a campaign. This cannot be undone. Sending, scheduled, or paused campaigns must be cancelled with cancel_campaign first, and live in-app campaigns stopped first; deleting an in-app campaign also deletes the messages it delivered.",
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
      "Duplicate a campaign as a new draft. mode 'campaign' (default) copies the campaign and its email, 'ab_test' also duplicates the campaign's A/B test with all variants, and 'variant' copies a single variant's content as the new campaign email (requires variantId). The original is unchanged. Returns the new draft campaign with its ID; schedule it separately.",
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
          description: "Campaign to copy, from list_campaigns or get_campaign.",
        },
        mode: {
          type: "string",
          enum: ["campaign", "ab_test", "variant"],
          description:
            "What to copy: campaign copies the campaign and its email, ab_test also copies its A/B test and variants, variant turns one variant into the new email. Defaults to campaign.",
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
      "Create a draft that resends a sent campaign to everyone in the same audience who didn't open it. Copies the campaign email and reuses the original audience with a 'didn't open this campaign' rule added. Only available 6 hours after the campaign finishes sending, and never for imported already-sent campaigns (Sequenzy has no opens for a send it did not deliver). The draft must be scheduled or sent separately. Returns the new draft and an estimate of how many subscribers haven't opened the original. Every audience format preserves hard opener exclusions, including earlier campaigns when resending a resend; manual additions cannot override them. Audience membership is live, so new members can qualify. Recreate older drafts missing excludedCampaignOpenerIds from the original campaign and review before scheduling.",
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
