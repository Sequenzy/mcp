import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  campaignStoNotCompanyOrSequenceHint,
  discountMergeTagsHint,
  rawHtmlContentDescription,
  replyToNameDescription,
  senderFromNameDescription,
  sequenceEmailBlocksDescription,
  sequenceSendingWindowSchema,
  sequenceWaitUntilSchema,
  sequenceWaitUntilWeekdaySchema,
  sequenceDelaySchema,
  subscriberUpdateConfigSchema,
  sequenceEmailStepIdentityProperties,
} from "../internal.js";

export const sequenceBasicToolDefinitions: Tool[] = [
  // ============================================================================
  // Sequences
  // ============================================================================
  {
    name: "list_sequences",
    description:
      "List all email sequences (automations). Read effectiveStatus (draft, live, enrollment_paused, paused, archived) to know whether a sequence is running: status alone reads `active` even when new enrollments are paused, and the legacy triggerConfig.active flag is not used by the runtime.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list sequences for. If not provided, uses the currently selected company.",
        },
        status: {
          type: "string",
          enum: ["draft", "active", "paused", "archived"],
          description: "Optional dashboard status filter.",
        },
        search: {
          type: "string",
          description:
            "Case-insensitive search across sequence name and description.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description:
            "Return sequences assigned any of these dashboard label names.",
        },
        limit: {
          type: "number",
          description:
            "Page size from 1 to 100. When limit and offset are both omitted, every sequence is returned.",
        },
        offset: {
          type: "number",
          description: "Zero-based result offset.",
        },
      },
    },
  },
  {
    name: "get_sequence",
    description: `Get sequence details, editable step content, and graph topology. Read effectiveStatus (draft, live, enrollment_paused, paused, archived) to know whether a sequence is running: status alone reads \`active\` even when new enrollments are paused, and the legacy triggerConfig.active flag is not used by the runtime. Each sequence.nodes item includes id, nodeType, current config, updatedAt, and updateHints with its editable/managed fields and ready-to-return expectedUpdatedAt token for update_sequence_node/update_sequence_nodes. The response also includes sequence.edges and graphRevision for safe edit_sequence_graph calls, plus sequence.emails with each email step's nodeId, nodeType, linked emailId, subject, previewText, emailPreset (the per-email Style > Format for native blocks, including emails with supported custom HTML blocks; null when the entire email is standalone raw HTML), and blocks. sequence.emails includes action_ab_test steps, whose copy lives on the A/B test variants rather than on the node: their subject/previewText/blocks are control variant A only. With ab_tests:read, each carries abTest with the test id, status, and one entry per variant; without that scope, test-record fields are redacted and variants is empty while the configured id and editing guidance remain available. To change the copy of an A/B step, read every variant with get_ab_test and edit each one with update_ab_test_variant - update_sequence_node cannot touch variant content, and rebuilding the step as a plain email node to reach it destroys the test. ${
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
        sequenceId: {
          type: "string",
          description: "Sequence ID",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "list_sequence_enrollments",
    description:
      "List the individual contacts currently enrolled in a sequence, with the node each one is sitting on. Use this when get_sequence_stats gives you enrollmentCounts and you need the actual subscribers behind a number, such as everyone waiting at one step. Filter by currentNodeId (take the ID from get_sequence_stats enrollmentCounts.byCurrentNode or get_sequence nodes), status, subscriberId, or email, and page with limit/offset to export the full list. The response always echoes the sequence's single configured stopCondition, including matchConfig filters or comparisons. A stop condition does not cancel a waiting enrollment when its event arrives: it is re-evaluated when the enrollment next runs a step, so an enrollment parked on a delay keeps reporting `waiting` until that delay expires. Pass stopConditionMatch true to see whether each in-flight enrollment's stop condition matches right now. This is a non-atomic snapshot: a step already past its stop check may still finish. Each enrollment also reports enteredVia - the list, tag, segment, event, inactivity check, or frequency check that enrolled it - which is how you tell apart contacts entering a sequence whose trigger covers several lists or tags.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID whose enrollments should be listed.",
        },
        currentNodeId: {
          type: "array",
          items: { type: "string" },
          description:
            "Only return enrollments currently sitting on these sequence node IDs.",
        },
        status: {
          type: "array",
          items: {
            type: "string",
            enum: ["active", "waiting", "completed", "failed", "cancelled"],
          },
          description:
            "Enrollment statuses to include. Defaults to active and waiting, which is every contact still moving through the sequence.",
        },
        subscriberId: {
          type: "array",
          items: { type: "string" },
          description:
            "Only return enrollments for these subscriber IDs. Useful for checking where specific contacts stand.",
        },
        email: {
          type: "string",
          description:
            "Only return enrollments for this exact email address (case-insensitive).",
        },
        sort: {
          type: "string",
          enum: [
            "enrolled_at_desc",
            "enrolled_at_asc",
            "wait_until_asc",
            "wait_until_desc",
          ],
          description:
            "Result order. Defaults to enrolled_at_desc (most recently enrolled first). Use wait_until_asc to see who resumes next.",
        },
        stopConditionMatch: {
          type: "boolean",
          description:
            "Annotate each returned active or waiting enrollment with whether the sequence's stop condition matches for that contact right now, using the same evaluation the worker runs before each step. Use this to confirm a stop event, tag, or field change registered without waiting out the current delay: a matching enrollment can still report `waiting`, so status alone cannot tell you. This is a non-atomic snapshot, not a promise of a future exit: the condition can change, a paused sequence may not run on schedule, and a step already past its stop check may still finish. Each annotated enrollment costs an evaluation, so this caps the page at 100 regardless of limit; stopConditionMatchEvaluatedCount reports how many were actually evaluated. Defaults to false.",
        },
        limit: {
          type: "number",
          description:
            "Enrollments per page, 1-500. Defaults to 50. Use the maximum when exporting. Capped at 100 when stopConditionMatch is true.",
        },
        offset: {
          type: "number",
          description:
            "Number of enrollments to skip. Page until pagination.hasMore is false.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "simulate_sequence",
    description:
      "Dry-run a sequence without sending mail or enrolling anyone. Requires sequences:read and subscribers:read because aggregate results include contact samples. Nobody is auto-enrolled when you activate. Without a subscriber this reports last-24h trigger volume (how many people hit this recently), who currently matches (existing list/tag/segment matches are not auto-enrolled), and activation readiness errors. Frequency and inactivity current-match counts are unavailable because the hourly worker evaluates them. Pass subscriberId or email to also walk that stored contact's branch path - use this to check whether a paid user would get an upgrade email. Call this before enable_sequence.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID to simulate.",
        },
        subscriberId: {
          type: "string",
          description:
            "Optional stored subscriber to walk through the graph. Do not pass with email.",
        },
        email: {
          type: "string",
          description:
            "Optional stored subscriber email to walk through the graph. Do not pass with subscriberId.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 25,
          description:
            "Maximum contacts to include in each sample. Defaults to 10.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "send_sequence_test_email",
    description:
      "Queue a real test send for one saved action_email step in a sequence. Call get_sequence first and pass the target sequence.emails entry's nodeId only when nodeType is action_email; action_ab_test steps are not supported by this tool and their variants must be inspected with get_ab_test. Accepts 1-10 reviewer email addresses and returns one durable emailSendId per recipient for get_email_send delivery inspection. The sequence is not enabled and no subscribers are enrolled.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID containing the saved email step.",
        },
        nodeId: {
          type: "string",
          description:
            "action_email step nodeId from get_sequence. The node must belong to sequenceId. Do not pass an action_ab_test node; inspect its variants with get_ab_test instead.",
        },
        recipients: {
          type: "array",
          minItems: 1,
          maxItems: 10,
          items: { type: "string", format: "email" },
          description:
            "One to ten internal reviewer email addresses. Duplicate addresses are sent only once.",
        },
      },
      required: ["sequenceId", "nodeId", "recipients"],
      additionalProperties: false,
    },
  },
  {
    name: "create_sequence",
    description:
      "Create and persist a disabled draft email sequence, follow-up series, drip campaign, nurture flow, or automation workflow. For natural-language content, provide goal and emailCount. Use explicit steps for finished caller-supplied content, exact workflows, or migrations. Configure trigger plus its relevant field, such as listId/listIds, tagName/tagNames, segmentId, or eventName. Supports email and SMS steps, delays and date waits, actions that dynamically create a provider discount/code (later emails print it with {{discount.code}}), subscriber updates, event filters, enrollment rules, sending windows, and stop conditions. The saved draft appears in list_sequences. Never call enable_sequence unless the user explicitly asks to activate it.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the sequence in. If not provided, uses the currently selected company.",
        },
        fromEmail: {
          type: "string",
          description:
            "From address for all emails in this sequence. Its domain must be configured and verified.",
        },
        fromName: {
          type: "string",
          description: senderFromNameDescription,
        },
        senderProfileId: {
          type: "string",
          description:
            "Existing sender profile ID (see list_sender_profiles). It already supplies both the From address and display name, so send it on its own and omit fromEmail and fromName. To keep this profile under a different display name, set fromName on the email steps instead, where it is a per-step override.",
        },
        replyTo: {
          type: "string",
          description:
            "Reply-To address for all emails in this sequence. A reply profile is created when needed.",
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
        name: {
          type: "string",
          description:
            "Sequence name (e.g., 'User Onboarding', 'Welcome Series')",
        },
        description: {
          type: "string",
          description: "Optional sequence description shown in the dashboard.",
        },
        userCancellable: {
          type: "boolean",
          description:
            "Whether subscribers may cancel their own active enrollment.",
        },
        bccEmails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses blind-copied on every email in the sequence (max 10).",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description:
            "Dashboard label names to assign. Missing labels are created.",
        },
        trigger: {
          type: "string",
          enum: [
            "contact_added",
            "tag_added",
            "segment_entered",
            "event_received",
            "inbound_webhook",
            "inactivity",
            "frequency",
          ],
          description:
            "Trigger type: contact_added, tag_added, segment_entered, event_received, inbound_webhook, inactivity, or frequency. Defaults to contact_added for a blank dashboard-compatible draft.",
        },
        // contact_added trigger options
        listId: {
          type: "string",
          description:
            "List ID to trigger on (for contact_added trigger). Omit to use listScope instead. Use listIds to trigger on several lists.",
        },
        listIds: {
          type: "array",
          minItems: 1,
          maxItems: 25,
          items: { type: "string" },
          description:
            "Several list IDs for a contact_added trigger. A contact joining ANY of them enrolls. Use this instead of listId when the user says 'when added to list A or list B'. Cannot be combined with listScope.",
        },
        listScope: {
          type: "string",
          enum: ["any_contact", "any_list"],
          description:
            "For contact_added with no list at all. 'any_contact' (default) enrolls every contact added, including the list-less contacts that integrations like PostHog, Stripe, or Supabase create when no list targeting is configured. 'any_list' waits until the contact actually joins a list. Cannot be combined with listId or listIds.",
        },
        // tag_added trigger options
        tagName: {
          type: "string",
          description:
            "Tag name to trigger on (required for tag_added trigger). Use tagNames to trigger on several tags.",
        },
        tagNames: {
          type: "array",
          minItems: 1,
          maxItems: 25,
          items: { type: "string" },
          description:
            "Several tag names for a tag_added trigger. Receiving ANY of them enrolls the contact. Use this instead of tagName when the user says 'when tagged vip or trial'.",
        },
        // segment_entered trigger options
        segmentId: {
          type: "string",
          description:
            "Segment ID to trigger on (required for segment_entered trigger). Use list_segments first to choose a saved segment.",
        },
        stopOnSegmentExit: {
          type: "boolean",
          description:
            "For segment_entered triggers, cancel active enrollments when the contact leaves the segment.",
        },
        // event_received, inactivity, frequency trigger options
        eventName: {
          type: "string",
          description:
            "Event name to trigger on (required for event_received, inbound_webhook, inactivity, and frequency triggers)",
        },
        integrationSlug: {
          type: "string",
          description:
            "Catalog integration slug for inbound_webhook, for example cal-com.",
        },
        integrationEventKey: {
          type: "string",
          description: "Catalog integration event key for inbound_webhook.",
        },
        customIntegration: {
          type: "object",
          description:
            "Custom inbound webhook integration descriptor with name, setupInstructions, samplePayload, and fieldMapping.",
          properties: {
            name: { type: "string" },
            setupInstructions: { type: "string" },
            samplePayload: { type: "object", additionalProperties: true },
            fieldMapping: { type: "object", additionalProperties: true },
            docsUrl: { type: "string" },
            suggestedProperties: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  path: { type: "string" },
                  description: { type: "string" },
                },
                required: ["name", "path", "description"],
              },
            },
          },
          required: [
            "name",
            "setupInstructions",
            "samplePayload",
            "fieldMapping",
          ],
        },
        propertyFilters: {
          type: "array",
          description:
            "Optional filters for event_received or inbound_webhook triggers. The sequence starts only when all filters match. Max 10.",
          items: {
            type: "object",
            properties: {
              path: {
                type: "string",
                description:
                  "Dot-path into the event properties, e.g. 'lineItems[].providerProductId' or 'plan'.",
              },
              operator: {
                type: "string",
                enum: [
                  "exists",
                  "not_exists",
                  "equals",
                  "not_equals",
                  "one_of",
                  "contains",
                  "greater_than",
                  "less_than",
                ],
                description:
                  "Comparison operator. one_of matches when the property equals any entry of the value array.",
              },
              value: {
                type: ["string", "number", "boolean", "array"],
                // items/maxItems only apply to the array branch (one_of).
                items: { type: ["string", "number"] },
                maxItems: 50,
                description:
                  "Value to compare against. Required for every operator except exists/not_exists. For one_of, pass an array of strings or numbers (max 50 values); all other operators take a single value.",
              },
            },
            required: ["path", "operator"],
          },
        },
        // inactivity trigger options
        inactiveDays: {
          type: "number",
          description:
            "Number of days of inactivity (required for inactivity trigger, must be >= 1)",
        },
        inactivityBaseline: {
          type: "string",
          enum: ["sequence_created_at", "subscriber_created_at"],
          description:
            "When to start counting inactivity for subscribers who never had the event. Defaults to sequence_created_at.",
        },
        // frequency trigger options
        minCount: {
          type: "number",
          description:
            "Minimum event count (required for frequency trigger, must be >= 1)",
        },
        timeWindowDays: {
          type: "number",
          description:
            "Time window in days for frequency trigger (required for frequency trigger, must be >= 1)",
        },
        // General options
        emailCount: {
          type: "number",
          description: "Number of emails in the sequence (default: 5, max: 10)",
        },
        durationDays: {
          type: "number",
          description:
            "Total duration in days used to space AI-generated sequence emails. Only applies when using goal-based AI generation.",
        },
        emailStyle: {
          type: "string",
          enum: ["visual", "plain"],
          description:
            "Style for AI-generated emails: 'visual' (designed, with heroes/imagery/rich sections) or 'plain' (personal, text-first notes with a single button). Only applies to goal-based AI generation. Defaults to the company's saved preference when omitted.",
        },
        goal: {
          type: "string",
          description:
            "What this sequence should accomplish for AI generation. Be specific to the app's actual features and user journey. Avoid generic goals that don't match the app's business model.",
        },
        enrollmentMode: {
          type: "string",
          enum: ["unlimited", "one_time", "matching_field"],
          description:
            "Sequence re-entry mode. Defaults to 'unlimited', which re-enrolls a subscriber every time the trigger fires again - for a tag_added drip that means re-applying the tag sends the whole series a second time, so set 'one_time' unless repeat runs are wanted. Exception: ecommerce.back_in_stock and ecommerce.replenishment_due triggers default to 'matching_field' so each product is notified separately; leave those alone unless the user asks otherwise. Use 'matching_field' only for event_received triggers when duplicate active runs should be blocked per event field value. Changeable later with update_sequence.",
        },
        enrollmentFieldPath: {
          type: "string",
          description:
            "Scalar dot-path event property used by enrollmentMode='matching_field', such as 'order.id' or 'product.providerVariantId'. Array traversal with [] is not supported; use propertyFilters for array matching. Leave omitted for Shopify back-in-stock/replenishment product-variant defaults.",
        },
        sendingWindow: sequenceSendingWindowSchema,
        stopCondition: {
          type: "object",
          description:
            "Optional explicit auto-stop condition, re-evaluated before every step including the first one. Use { type: 'has_tag', value: 'customer' } to end the sequence when a subscriber gets a tag, { type: 'entered_segment', value: 'segment_123' } when they enter a segment, { type: 'added_to_list', value: 'list_123' } when they join a list, { type: 'field_changed', value: 'plan' } when a subscriber field changes, { type: 'event_received', value: 'onboarding.completed' } when an event is tracked, or { type: 'none', value: null } for no auto-stop. The negative forms are audience guards rather than lifecycle stops: { type: 'does_not_have_tag', value: 'allowlist' } and { type: 'removed_from_list', value: 'list_123' } cancel the run before any step sends unless the subscriber carries that tag or list membership. That is how you restrict a live event or segment trigger to a chosen set of contacts without editing the graph, for example for a first pass on a production trigger or a phased rollout. Guarded-out contacts still enroll and are then cancelled at the trigger node, so they appear as cancellations there rather than in the active or waiting enrollment counts. Clearing the guard does not retry them: nothing re-enrolls them, so they only receive the sequence if the trigger fires for them again, which one-shot triggers never do, and on the one_time enrollment mode a repeated trigger is ignored too because enrollment is blocked by the existence of any earlier run rather than by its outcome. Guard a duplicate sequence and leave the real one ungated, or enroll the missed contacts afterwards with enroll_subscribers_in_sequence, which skips the one_time check.",
          properties: {
            type: {
              type: "string",
              enum: [
                "none",
                "has_tag",
                "does_not_have_tag",
                "added_to_list",
                "removed_from_list",
                "entered_segment",
                "field_changed",
                "event_received",
              ],
              description:
                "Stop condition type. has_tag, added_to_list, entered_segment, field_changed, and event_received stop the run once the thing happens. event_received only counts events received after enrollment - the enrolling event and earlier history never satisfy the stop. does_not_have_tag and removed_from_list stop the run whenever the subscriber lacks that tag or list membership, so they act as a required-tag or required-list allowlist for everyone the trigger enrolls.",
            },
            value: {
              type: ["string", "null"],
              description:
                "Tag name, list ID, segment ID, field path, or event name for the stop condition. For entry_audience matching, omit this value because the enrolling tag or list is resolved per contact. Use null or omit for type 'none'.",
            },
            matchConfig: {
              type: ["object", "null"],
              description:
                "Optional stop-condition matching. event_property_filter and event_property refine event_received; field_value refines field_changed. entry_audience with audience tag/list makes a does_not_have_tag/removed_from_list guard resolve the tag or list that enrolled each contact; tag requires a tag_added trigger, and list requires a contact_added trigger scoped to at least one specific list. Omit value for this mode.",
              properties: {
                mode: {
                  type: "string",
                  enum: [
                    "event_property_filter",
                    "event_property",
                    "field_value",
                    "entry_audience",
                  ],
                },
                propertyFilters: {
                  type: "array",
                  description:
                    "event_property_filter mode: filters the stop event must all match; same shape as trigger propertyFilters.",
                  items: {
                    type: "object",
                    properties: {
                      path: { type: "string" },
                      operator: {
                        type: "string",
                        enum: [
                          "exists",
                          "not_exists",
                          "equals",
                          "not_equals",
                          "one_of",
                          "contains",
                          "greater_than",
                          "less_than",
                        ],
                      },
                      value: {
                        description:
                          "Comparison value (string, number, or boolean; array for one_of). Omit for exists/not_exists.",
                      },
                    },
                    required: ["path", "operator"],
                  },
                },
                rules: {
                  type: "array",
                  description:
                    "event_property mode: entry-vs-stop-event field equality rules.",
                  items: {
                    type: "object",
                    properties: {
                      entryFieldPath: { type: "string" },
                      eventFieldPath: { type: "string" },
                    },
                    required: ["entryFieldPath", "eventFieldPath"],
                  },
                },
                operator: {
                  type: "string",
                  enum: [
                    "equals",
                    "not_equals",
                    "greater_than",
                    "less_than",
                    "contains",
                    "not_contains",
                  ],
                  description: "field_value mode comparison operator.",
                },
                value: {
                  type: "string",
                  description: "field_value mode comparison value.",
                },
                audience: {
                  type: "string",
                  enum: ["tag", "list"],
                  description:
                    "entry_audience mode source to resolve per enrollment.",
                },
              },
              additionalProperties: true,
            },
          },
          required: ["type"],
        },
        steps: {
          type: "array",
          description:
            "Explicit sequence steps. Omit type for email steps, use type: 'sms' for SMS, type: 'create_discount' for a dynamic discount, or type: 'update_subscriber' with nodeType: 'action_update_attributes' and config to copy trigger-event values such as {{event.plan}} into subscriber data.",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: [
                  "email",
                  "sms",
                  "create_discount",
                  "discount",
                  "update_subscriber",
                ],
                description:
                  "Step type. Omit or use 'email' for email content. Use 'sms' to send a text message, 'create_discount' to generate a code, or 'update_subscriber' to copy trigger data into the subscriber.",
              },
              nodeType: {
                type: "string",
                enum: [
                  "action_email",
                  "action_sms",
                  "action_create_discount",
                  "action_update_attributes",
                ],
                description:
                  "Internal step type. Use action_update_attributes with config for Update Subscriber steps.",
              },
              config: subscriberUpdateConfigSchema,
              subject: {
                type: "string",
                description: "Email subject. Required for email steps.",
              },
              previewText: {
                type: "string",
                description: "Email preview text.",
              },
              blocks: {
                type: "array",
                description: sequenceEmailBlocksDescription,
                items: { type: "object" },
              },
              html: {
                type: "string",
                description: `HTML content for email steps. Use this for imported provider HTML. ${rawHtmlContentDescription}`,
              },
              isTransactional: {
                type: "boolean",
                description:
                  "Send this email as transactional and omit the marketing unsubscribe footer.",
              },
              ccEmails: {
                type: "array",
                items: { type: "string" },
                description: "Addresses CC'd on this email step.",
              },
              bccEmails: {
                type: "array",
                items: { type: "string" },
                description:
                  "Addresses BCC'd on this email step in addition to sequence BCC.",
              },
              attachments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    filename: {
                      type: "string",
                      description:
                        "Filename shown in the recipient's email client. Event merge tags are supported, for example file-{{event.order_id}}.pdf.",
                    },
                    path: {
                      type: "string",
                      description:
                        "Public HTTPS URL or event-backed URL template such as {{event.file_url}}; resolved per enrollment and fetched at send time.",
                    },
                  },
                  required: ["filename", "path"],
                },
                description:
                  "URL-backed file attachments for this email step (max 10, 7MB total per email). Paths may use {{event.*}} values from the event that enrolled the subscriber; the resolved public URL is validated and fetched at send time.",
              },
              ...sequenceEmailStepIdentityProperties,
              text: {
                type: "string",
                description:
                  "SMS steps only: plain-text message body. Merge tags like {{FIRST_NAME}} work. Do not include opt-out text or a brand prefix - the platform adds those automatically.",
              },
              imageUrls: {
                type: "array",
                items: { type: "string" },
                description:
                  "SMS steps only: up to 2 publicly reachable image URLs sent as MMS media.",
              },
              ineligibleAction: {
                type: "string",
                enum: ["skip", "exit"],
                description:
                  "SMS steps only: what happens when the contact can't receive SMS (no phone, not opted in, unsupported country). Default 'skip' continues the sequence.",
              },
              delay: sequenceDelaySchema,
              delayMs: {
                type: "number",
                description:
                  "Delay before this step in milliseconds. Prefer delay for readability; use delayMs when importing provider waits.",
              },
              waitUntil: sequenceWaitUntilSchema,
              waitUntilWeekday: sequenceWaitUntilWeekdaySchema,
              name: {
                type: "string",
                description: "Email template name for email steps.",
              },
              discount: {
                type: "object",
                description: `Discount configuration for create_discount steps. Prefer this nested shape for new integrations; legacy top-level discount fields are still accepted.${discountMergeTagsHint}`,
                properties: {
                  label: {
                    type: "string",
                    description: "Builder label for the discount step.",
                  },
                  provider: {
                    type: "string",
                    enum: ["stripe", "shopify"],
                    description:
                      "Discount provider. Use 'stripe' to dynamically create a Stripe coupon plus promotion code, or 'shopify' to dynamically create a Shopify Admin discount code. Defaults to 'stripe' when omitted.",
                  },
                  discountType: {
                    type: "string",
                    enum: ["percent", "amount"],
                    description: "Discount type.",
                  },
                  percentOff: {
                    type: "number",
                    description:
                      "Percent discount from 1 to 100. Required when discountType is percent.",
                  },
                  amountOff: {
                    type: "number",
                    description:
                      "Fixed amount discount in the smallest currency unit, for example 500 for $5. Required when discountType is amount.",
                  },
                  currency: {
                    type: "string",
                    description:
                      "ISO currency for amount discounts. Defaults to usd.",
                  },
                  duration: {
                    type: "string",
                    enum: ["once", "forever", "repeating"],
                    description: "Discount duration. Defaults to once.",
                  },
                  durationInMonths: {
                    type: "number",
                    description: "Required for repeating discounts.",
                  },
                  appliesToAllPlans: {
                    type: "boolean",
                    description:
                      "Whether the discount applies to all plans. Defaults to true.",
                  },
                  planIds: {
                    type: "array",
                    description:
                      "Provider product IDs when appliesToAllPlans is false. Stripe uses IDs like prod_abc123; Shopify accepts numeric product IDs or gid://shopify/Product/... IDs.",
                    items: { type: "string" },
                  },
                  codePrefix: {
                    type: "string",
                    description:
                      "Optional prefix for generated dynamic codes. The final code also includes a subscriber/token suffix.",
                  },
                  maxRedemptions: {
                    type: "number",
                    description:
                      "Maximum redemptions for each generated code. Use 1 for subscriber-specific codes.",
                  },
                  lockToSubscriber: {
                    type: "boolean",
                    description:
                      "Stripe-only. Restrict each generated promotion code to the matched subscriber's Stripe customer.",
                  },
                  expiresAt: {
                    type: "string",
                    description:
                      "Optional future expiration date or ISO timestamp.",
                  },
                  expiresInHours: {
                    type: "number",
                    description:
                      "Optional relative expiration in hours, resolved when each subscriber's code is created (e.g., 48 for a 48-hour window per subscriber). Takes precedence over expiresAt.",
                  },
                  name: {
                    type: "string",
                    description:
                      "Optional display name for each dynamically generated provider discount.",
                  },
                },
              },
              label: {
                type: "string",
                description:
                  "Legacy top-level discount label. Prefer discount.label.",
              },
              provider: {
                type: "string",
                enum: ["stripe", "shopify"],
                description:
                  "Legacy top-level discount provider. Prefer discount.provider. Supports 'stripe' and 'shopify'.",
              },
              discountType: {
                type: "string",
                enum: ["percent", "amount"],
                description:
                  "Legacy top-level discount type. Prefer discount.discountType.",
              },
              percentOff: {
                type: "number",
                description:
                  "Percent discount from 1 to 100. Required when discountType is percent.",
              },
              amountOff: {
                type: "number",
                description:
                  "Fixed amount discount in the smallest currency unit, for example 500 for $5. Required when discountType is amount.",
              },
              currency: {
                type: "string",
                description:
                  "ISO currency for amount discounts. Defaults to usd.",
              },
              duration: {
                type: "string",
                enum: ["once", "forever", "repeating"],
                description: "Discount duration. Defaults to once.",
              },
              durationInMonths: {
                type: "number",
                description: "Required for repeating discounts.",
              },
              appliesToAllPlans: {
                type: "boolean",
                description:
                  "Whether the discount applies to all plans. Defaults to true.",
              },
              planIds: {
                type: "array",
                description:
                  "Provider product IDs when appliesToAllPlans is false. Stripe uses IDs like prod_abc123; Shopify accepts numeric product IDs or gid://shopify/Product/... IDs.",
                items: { type: "string" },
              },
              codePrefix: {
                type: "string",
                description:
                  "Optional prefix for generated dynamic codes. The final code also includes a subscriber/token suffix.",
              },
              maxRedemptions: {
                type: "number",
                description:
                  "Maximum redemptions for each generated code. Use 1 for subscriber-specific codes.",
              },
              lockToSubscriber: {
                type: "boolean",
                description:
                  "Legacy top-level Stripe-only flag. Prefer discount.lockToSubscriber.",
              },
              expiresAt: {
                type: "string",
                description:
                  "Optional future expiration date or ISO timestamp.",
              },
              expiresInHours: {
                type: "number",
                description:
                  "Optional relative expiration in hours, resolved when each subscriber's code is created (e.g., 48 for a 48-hour window per subscriber). Takes precedence over expiresAt.",
              },
            },
          },
        },
      },
      required: ["name"],
    },
  },
];
