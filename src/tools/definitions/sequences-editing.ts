import type { Tool } from "../../mcp-types.js";
import {
  inAppStepProperties,
  rawHtmlContentDescription,
  replacementEmailBlocksDescription,
  replyToNameDescription,
  senderFromNameDescription,
  sequenceEmailBlocksDescription,
  sequenceStepBlocksFormatHint,
  sequenceAudienceSchema,
  sequenceKeyDatesSchema,
  sequenceSendingWindowSchema,
  sequenceWaitUntilKeyDateSchema,
  sequenceWaitUntilSchema,
  sequenceWaitUntilWeekdaySchema,
  sequenceDelaySchema,
  sequenceNodeChangesSchema,
  sequenceNodeUpdateItemSchema,
  subscriberUpdateConfigSchema,
  sequenceBranchConditionSchema,
  sequenceBranchesDescription,
  sequenceBranchRandomPercentagesSchema,
  sequenceBranchSplitModeSchema,
  sequenceEmailStepIdentityProperties,
  sequenceEmailThemeSchema,
  sequencePathStepSchema,
} from "../internal.js";

import { pushLocalizationsProperty } from "./push.js";

export const sequenceEditingToolDefinitions: Tool[] = [
  {
    name: "update_sequence",
    description:
      "Update an existing sequence: both its settings and its steps. Sequence-level settings live directly on this tool - name, description, labels, trigger (with its trigger-specific field), enrollmentMode plus enrollmentFieldPath, enrollmentPaused, userCancellable, activeSubscribersOnly, stopCondition, sendingWindow, frequencyCapEnabled, bccEmails, and the sender/reply identity. This is the only way to change enrollmentMode after create_sequence, so use it to move a tag- or event-triggered sequence off the default 'unlimited' re-entry to 'one_time' or 'matching_field'. To target a specific existing step, use IDs returned by get_sequence. The emails/steps arrays edit email steps, smsSteps edits SMS steps, and subscriberUpdateSteps replaces the config of action_update_attributes steps. The emails/steps arrays reach action_email steps only: an action_ab_test step keeps its copy on the A/B test variants, so read variant blocks from get_sequence.sequence.emails[].abTest.variants and change each variant with update_ab_test_variant. If update_ab_test_variant is not in the tool list, enable it on the Sequenzy connector rather than writing through update_template. To insert new linear steps, use insertSteps with an afterNodeId from get_sequence; omit afterNodeId only to append to an unambiguous linear tail. Deleting a step immediately moves parked recipients to its unique surviving successor, or completes them when no successor remains; inspect migratedRecipientCount and completedRecipientCount in the returned sequence. For active sequences, structural changes such as insertSteps or branch require confirmStructuralChange:true after the user confirms the live-flow impact.",
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
        name: {
          type: "string",
          description: "Sequence name",
        },
        description: {
          type: "string",
          description: "Sequence description shown in the dashboard.",
        },
        userCancellable: {
          type: "boolean",
          description:
            "Whether subscribers may cancel their own active enrollment.",
        },
        activeSubscribersOnly: {
          type: "boolean",
          description:
            "Only enroll contacts whose status is active. Defaults to false, where unsubscribed and bounced contacts still enter on tag, event, list or contact triggers so non-marketing steps (tags, webhooks, transactional emails) run for them, and their marketing emails are skipped at send time. Set true to keep them out entirely. Pending double opt-in contacts still wait for confirmation.",
        },
        labels: {
          type: "array",
          items: { type: "string" },
          description:
            "Replace dashboard labels by name. Missing labels are created; [] clears labels.",
        },
        trigger: {
          type: "string",
          enum: [
            "contact_added",
            "tag_added",
            "segment_entered",
            "segment_exited",
            "event_received",
            "inbound_webhook",
            "inactivity",
            "frequency",
            "manual",
          ],
          description:
            "Atomically replace the existing dashboard trigger. Include the fields required by the new trigger type. Active sequences also require confirmLiveChange:true.",
        },
        listId: {
          type: "string",
          description: "List ID for a contact_added trigger replacement.",
        },
        listIds: {
          type: "array",
          minItems: 1,
          maxItems: 25,
          items: { type: "string" },
          description:
            "Several list IDs for a contact_added trigger replacement. Joining ANY of them enrolls the contact. Cannot be combined with listScope.",
        },
        listScope: {
          type: "string",
          enum: ["any_contact", "any_list"],
          description:
            "For a contact_added trigger replacement with no list. 'any_contact' (default) enrolls every contact added, even one that joins no list; 'any_list' waits for a list membership. Cannot be combined with listId or listIds.",
        },
        tagName: {
          type: "string",
          description: "Tag name required for a tag_added trigger replacement.",
        },
        tagNames: {
          type: "array",
          minItems: 1,
          maxItems: 25,
          items: { type: "string" },
          description:
            "Several tag names for a tag_added trigger replacement. Receiving ANY of them enrolls the contact.",
        },
        segmentId: {
          type: "string",
          description:
            "Saved segment ID required for a segment_entered or segment_exited trigger replacement.",
        },
        stopOnSegmentExit: {
          type: "boolean",
          description:
            "For segment_entered, stop active enrollments when the subscriber leaves the segment.",
        },
        eventName: {
          type: "string",
          description:
            "Event name required for event_received, inbound_webhook, inactivity, and frequency trigger replacements.",
        },
        propertyFilters: {
          type: "array",
          description:
            "Optional event-property filters for event_received or inbound_webhook.",
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
                description: "Scalar comparison value, or an array for one_of.",
              },
            },
            required: ["path", "operator"],
            additionalProperties: false,
          },
        },
        integrationSlug: {
          type: "string",
          description: "Catalog integration slug for inbound_webhook.",
        },
        integrationEventKey: {
          type: "string",
          description: "Catalog integration event key for inbound_webhook.",
        },
        customIntegration: {
          type: "object",
          description:
            "Typed custom inbound webhook descriptor used instead of a catalog integration.",
          properties: {
            name: { type: "string" },
            setupInstructions: { type: "string" },
            samplePayload: {
              type: "object",
              additionalProperties: true,
            },
            fieldMapping: {
              type: "object",
              properties: {
                email: { type: "string" },
                firstName: { type: "string" },
                lastName: { type: "string" },
                properties: {
                  type: "object",
                  additionalProperties: { type: "string" },
                },
              },
              required: ["email"],
              additionalProperties: false,
            },
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
                additionalProperties: false,
              },
            },
          },
          required: [
            "name",
            "setupInstructions",
            "samplePayload",
            "fieldMapping",
          ],
          additionalProperties: false,
        },
        inactiveDays: {
          type: "number",
          description:
            "Days without event activity required for an inactivity trigger.",
        },
        inactivityBaseline: {
          type: "string",
          enum: ["sequence_created_at", "subscriber_created_at"],
          description:
            "Baseline for subscribers who have never produced the inactivity event.",
        },
        minCount: {
          type: "number",
          description: "Minimum event count for a frequency trigger.",
        },
        timeWindowDays: {
          type: "number",
          description: "Frequency trigger lookback window in days.",
        },
        fromEmail: {
          type: "string",
          description:
            "Set the From address for all emails in this sequence. Its domain must be configured and verified.",
        },
        fromName: {
          type: "string",
          description: senderFromNameDescription,
        },
        senderProfileId: {
          type: "string",
          description:
            "Set an existing sender profile (see list_sender_profiles). It already supplies both the From address and display name, so send it on its own and omit fromEmail and fromName. To keep this profile under a different display name, set fromName on the email steps instead, where it is a per-step override.",
        },
        replyTo: {
          type: "string",
          description:
            "Set the Reply-To address for all emails in this sequence.",
        },
        replyToName: {
          type: "string",
          description: replyToNameDescription,
        },
        replyProfileId: {
          type: "string",
          description:
            "Set an existing reply profile (see list_sender_profiles). It already supplies both the Reply-To address and display name, so send it on its own and omit replyTo and replyToName.",
        },
        enrollmentPaused: {
          type: "boolean",
          description:
            "Set true to stop new enrollments for an active sequence while current recipients continue. Set false to resume new enrollments. The sequence must already be active.",
        },
        confirmStructuralChange: {
          type: "boolean",
          description:
            "Set true only after the user explicitly confirms a structural edit to an active sequence. Required for insertSteps or branch when the sequence is active; not needed for content-only email edits.",
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Set true only after the user explicitly confirms replacing the trigger of an active sequence. Required with trigger when the sequence is active.",
        },
        enrollmentMode: {
          type: "string",
          enum: ["unlimited", "one_time", "matching_field"],
          description:
            "Updated sequence re-entry mode. Use this to move an existing sequence off the default 'unlimited', which re-enrolls a subscriber each time the trigger fires once their earlier run has ended (frequency triggers enroll each contact once). 'one_time' enters a subscriber once ever, even if that run ended early. 'matching_field' allows one run at a time per event field value and is only valid for event-based sequence triggers. Changes apply to future enrollments only.",
        },
        enrollmentFieldPath: {
          type: "string",
          description:
            "Scalar dot-path event property used by enrollmentMode='matching_field', such as 'order.id' or 'product.providerVariantId'. Use 'organization.externalId' in a workspace with Organizations to run the sequence once per organization for organization events. Array traversal with [] is not supported; use propertyFilters for array matching. Omit to leave unchanged. Use clearEnrollmentFieldPath to clear it.",
        },
        clearEnrollmentFieldPath: {
          type: "boolean",
          description:
            "Set true to clear enrollmentFieldPath without sending a nullable schema value.",
        },
        sendingWindow: sequenceSendingWindowSchema,
        clearSendingWindow: {
          type: "boolean",
          description:
            "Set true to remove the sequence sending window. Do not provide this together with sendingWindow.",
        },
        frequencyCapEnabled: {
          type: "boolean",
          description:
            "Whether this sequence respects the company frequency cap (see get_frequency_cap / set_frequency_cap). When true, an email step is skipped for a contact already at the cap and the contact continues to the next step; transactional steps are never skipped. Omit to leave unchanged.",
        },
        keyDates: sequenceKeyDatesSchema,
        clearKeyDates: {
          type: "boolean",
          description:
            "Set true to remove every key date. Rejected while a delay step still waits for one of them. Do not provide this together with keyDates.",
        },
        audienceAutoEnroll: {
          type: "object",
          description:
            "Manual countdowns only: keep enrolling people who join the audience later (new list members, new segment matches) until the last key date passes, landing them on the current step. { audience, enabled? } where audience has the enroll_sequence_audience shape; enabled defaults to true. Switching on enrolls the current audience right away and re-checks every few minutes. It ends itself after the last key date.",
          properties: {
            enabled: { type: "boolean" },
            audience: sequenceAudienceSchema,
            startsAt: {
              type: "string",
              description:
                "ISO 8601 date-time before which no sync runs, e.g. the scheduledFor of the initial enrollment, so late joiners are not enrolled ahead of everyone else.",
            },
          },
          required: ["audience"],
          additionalProperties: false,
        },
        clearAudienceAutoEnroll: {
          type: "boolean",
          description:
            "Set true to stop auto-enrolling later joiners. Do not provide this together with audienceAutoEnroll.",
        },
        bccEmails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses that receive a blind copy of every email this sequence sends, such as a customer support inbox (max 10). Omit to leave unchanged. Use clearBccEmails to remove them.",
        },
        clearBccEmails: {
          type: "boolean",
          description:
            "Set true to remove the sequence BCC addresses. Do not provide this together with bccEmails.",
        },
        stopCondition: {
          type: "object",
          description:
            "Update the sequence auto-stop condition, which is re-evaluated before every step including the first one. Example: { type: 'has_tag', value: 'customer' } ends the sequence when the subscriber has that tag. Use { type: 'entered_segment', value: 'segment_123' } to stop when they enter a segment, { type: 'field_changed', value: 'plan' } to stop when a subscriber field changes, { type: 'added_to_list', value: 'list_123' } to stop when they join a list, or { type: 'none', value: null } to clear it. The negative forms are audience guards rather than lifecycle stops: { type: 'does_not_have_tag', value: 'allowlist' } and { type: 'removed_from_list', value: 'list_123' } cancel the run before any step sends unless the subscriber carries that tag or list membership. That is how you restrict a live event or segment trigger to a chosen set of contacts without editing the graph, for example for a first pass on a production trigger or a phased rollout. Guarded-out contacts still enroll and are then cancelled at the trigger node, so they appear as cancellations there rather than in the active or waiting enrollment counts. Clearing the guard does not retry them: nothing re-enrolls them, so they only receive the sequence if the trigger fires for them again, which one-shot triggers never do, and on the one_time enrollment mode a repeated trigger is ignored too because enrollment is blocked by the existence of any earlier run rather than by its outcome. Guard a duplicate sequence and leave the real one ungated, or enroll the missed contacts afterwards with enroll_subscribers_in_sequence, which skips the one_time check.",
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
                "Stop condition type. has_tag, added_to_list and entered_segment read the subscriber's current state before every step: the run stops at the next step whenever they have the tag, are in the list or match the segment, including when that was already true at entry. field_changed stops once the field differs from its value at entry. event_received only counts events received after enrollment - the enrolling event and earlier history never satisfy the stop. does_not_have_tag and removed_from_list stop the run whenever the subscriber lacks that tag or list membership, so they act as a required-tag or required-list allowlist for everyone the trigger enrolls.",
            },
            value: {
              type: ["string", "null"],
              description:
                "Tag name, list ID, segment ID, field path, or event name for the stop condition. For entry_audience matching, omit this value because the enrolling tag or list is resolved per contact.",
            },
            matchConfig: {
              type: ["object", "null"],
              description:
                "Optional stop-condition matching, four shapes keyed by mode. event_property_filter and event_property refine event_received; field_value refines field_changed. entry_audience with audience tag/list makes a does_not_have_tag/removed_from_list guard resolve the tag or list that enrolled each contact; tag requires a tag_added trigger, and list requires a contact_added trigger scoped to at least one specific list. Omit value for this mode. Pass null to clear.",
              properties: {
                mode: {
                  type: "string",
                  enum: [
                    "event_property_filter",
                    "event_property",
                    "field_value",
                    "entry_audience",
                  ],
                  description:
                    "Which matching shape the config uses. Defaults to event_property_filter when omitted and propertyFilters is present.",
                },
                propertyFilters: {
                  type: "array",
                  description:
                    "event_property_filter mode: filters a stop event must all match, e.g. [{ path: 'quota_used', operator: 'greater_than', value: 1 }].",
                  items: {
                    type: "object",
                    properties: {
                      path: {
                        type: "string",
                        description:
                          "Dot-path into the stop event's properties, e.g. 'quota_used' or 'order.total'.",
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
                      },
                      value: {
                        description:
                          "Comparison value (string, number, or boolean; array of values for one_of). Omit for exists/not_exists.",
                      },
                    },
                    required: ["path", "operator"],
                  },
                },
                rules: {
                  type: "array",
                  description:
                    "event_property mode: entry-vs-stop-event field equality rules, e.g. [{ entryFieldPath: 'orderId', eventFieldPath: 'orderId' }].",
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
        branch: {
          type: "object",
          description:
            "Insert an if/else branch into an existing sequence. Use get_sequence first to choose afterNodeId and existing target nodes. Each conditional path can provide new steps, targetNodeId, or both; the else path uses elseSteps and/or elseTargetNodeId. A target may be the completion node. Empty paths require allowEmptyPaths:true. Conditions support tag presence/absence, lists, saved segments, events, clicked links, and field comparisons. Use activityScope for event_received and link_clicked checks.",
          properties: {
            afterNodeId: {
              type: "string",
              description:
                "Existing node ID to insert the branch after. Use a nodeId from get_sequence.sequence.nodes or get_sequence.sequence.emails.",
            },
            label: {
              type: "string",
              description: "Optional branch node label.",
            },
            splitMode: sequenceBranchSplitModeSchema,
            randomPercentages: sequenceBranchRandomPercentagesSchema,
            branches: {
              type: "array",
              description: sequenceBranchesDescription,
              items: sequenceBranchConditionSchema,
            },
            elseSteps: {
              type: "array",
              description:
                "Optional new steps inside the else fallback path. Not valid on a random split.",
              items: sequencePathStepSchema,
            },
            elseTargetNodeId: {
              type: "string",
              description:
                "Optional existing node to route the else path to. Use a node ID from get_sequence, including the completion node. If elseSteps are also provided, they run before this target.",
            },
            allowEmptyPaths: {
              type: "boolean",
              description:
                "Set true only when intentionally creating UI placeholders. A path with targetNodeId is already explicit and does not need this flag.",
            },
          },
          required: ["afterNodeId", "branches"],
        },
        insertSteps: {
          type: "object",
          description:
            "Insert one or more new linear steps into an existing sequence. Use get_sequence first, then pass afterNodeId to insert after a specific node. If afterNodeId is omitted, the steps are appended only when the sequence has exactly one linear tail. Inserted email steps require subject plus blocks or html.",
          properties: {
            afterNodeId: {
              type: "string",
              description:
                "Existing node ID to insert after. Use a nodeId from get_sequence.sequence.nodes or get_sequence.sequence.emails. Omit only to append to an unambiguous linear tail.",
            },
            steps: {
              type: "array",
              description:
                "New steps to insert. Supports emails, delays, create_discount actions, webhooks, and other supported sequence path node types.",
              items: sequencePathStepSchema,
            },
          },
          required: ["steps"],
        },
        emails: {
          type: "array",
          description:
            "Updated existing sequence emails. If you omit emailId/nodeId, items are matched by existing step order. This field does not create new steps; use insertSteps for insertion and include delay on inserted email steps when a timer is needed.",
          items: {
            type: "object",
            properties: {
              emailId: {
                type: "string",
                description:
                  "Optional target linked email template ID for a step. Use the emailId returned in get_sequence.sequence.emails.",
              },
              nodeId: {
                type: "string",
                description:
                  "Optional target action_email node ID for a step. Use the nodeId returned in get_sequence.sequence.emails.",
              },
              name: {
                type: "string",
                description: "Updated step/template name",
              },
              subject: {
                type: "string",
                description: "Updated email subject",
              },
              previewText: {
                type: "string",
                description: "Updated preview text",
              },
              html: {
                type: "string",
                description: `Updated HTML content for imported provider markup. ${rawHtmlContentDescription}`,
              },
              htmlContent: {
                type: "string",
                description: `Alias for html for imported provider markup. ${rawHtmlContentDescription}`,
              },
              emailPreset: {
                type: "string",
                enum: ["branded", "minimal"],
                description:
                  "Per-email Style > Format for native Sequenzy blocks, including emails that contain supported custom HTML blocks. Minimal removes the company logo and uses the simple footer; branded restores the branded chrome. Does not change the company default. Not a lossless toggle: minimal deletes standalone logo blocks, so switching back to branded generates a new logo block with a new id and the company name as alt text - send the authored logo block in `blocks` alongside the branded update to keep it. Not supported when the entire email is standalone raw HTML and must not be combined with html/htmlContent.",
              },
              emailTheme: sequenceEmailThemeSchema,
              blocks: {
                type: "array",
                description: `${replacementEmailBlocksDescription}${sequenceStepBlocksFormatHint}`,
                items: { type: "object" },
              },
              isTransactional: { type: "boolean" },
              ccEmails: {
                type: "array",
                items: { type: "string" },
              },
              bccEmails: {
                type: "array",
                items: { type: "string" },
              },
              attachments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    filename: { type: "string" },
                    path: { type: "string" },
                  },
                  required: ["filename", "path"],
                },
                description:
                  "URL-backed file attachments for this email step (max 10, 15MB total per email). path may be a public HTTPS URL or an {{event.*}} URL template resolved from the enrollment event at send time. Pass [] to remove all attachments.",
              },
              ...sequenceEmailStepIdentityProperties,
            },
          },
        },
        steps: {
          type: "array",
          description:
            "Alias for emails. Supports the same fields and matching rules, and only edits existing email steps. Use insertSteps to create new steps.",
          items: {
            type: "object",
            properties: {
              emailId: {
                type: "string",
                description:
                  "Optional target linked email template ID for a step. Use the emailId returned in get_sequence.sequence.emails.",
              },
              nodeId: {
                type: "string",
                description:
                  "Optional target action_email node ID for a step. Use the nodeId returned in get_sequence.sequence.emails.",
              },
              name: {
                type: "string",
                description: "Updated step/template name",
              },
              subject: {
                type: "string",
                description: "Updated email subject",
              },
              previewText: {
                type: "string",
                description: "Updated preview text",
              },
              html: {
                type: "string",
                description: `Updated HTML content for imported provider markup. ${rawHtmlContentDescription}`,
              },
              htmlContent: {
                type: "string",
                description: `Alias for html. ${rawHtmlContentDescription}`,
              },
              emailPreset: {
                type: "string",
                enum: ["branded", "minimal"],
                description:
                  "Per-email Style > Format for native Sequenzy blocks, including emails that contain supported custom HTML blocks. Minimal removes the company logo and uses the simple footer; branded restores the branded chrome. Does not change the company default. Not a lossless toggle: minimal deletes standalone logo blocks, so switching back to branded generates a new logo block with a new id and the company name as alt text - send the authored logo block in `blocks` alongside the branded update to keep it. Not supported when the entire email is standalone raw HTML and must not be combined with html/htmlContent.",
              },
              emailTheme: sequenceEmailThemeSchema,
              blocks: {
                type: "array",
                description: `${replacementEmailBlocksDescription}${sequenceStepBlocksFormatHint}`,
                items: { type: "object" },
              },
              isTransactional: { type: "boolean" },
              ccEmails: {
                type: "array",
                items: { type: "string" },
              },
              bccEmails: {
                type: "array",
                items: { type: "string" },
              },
              attachments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    filename: { type: "string" },
                    path: { type: "string" },
                  },
                  required: ["filename", "path"],
                },
                description:
                  "URL-backed file attachments for this email step (max 10, 15MB total per email). path may be a public HTTPS URL or an {{event.*}} URL template resolved from the enrollment event at send time. Pass [] to remove all attachments.",
              },
              ...sequenceEmailStepIdentityProperties,
            },
          },
        },
        smsSteps: {
          type: "array",
          description:
            "Content updates for existing SMS steps, targeted by nodeId (an action_sms node from get_sequence.sequence.nodes). Content-only edits - use insertSteps to create new SMS steps.",
          items: {
            type: "object",
            properties: {
              nodeId: {
                type: "string",
                description: "Target action_sms node ID. Required.",
              },
              text: {
                type: "string",
                description:
                  "Replacement plain-text message body. Merge tags like {{FIRST_NAME}} work. Provide text or blocks, not both.",
              },
              blocks: {
                type: "array",
                items: { type: "object" },
                description:
                  "Replacement SMS content blocks (text + image subset).",
              },
              imageUrls: {
                type: "array",
                items: { type: "string" },
                description:
                  "Up to 2 publicly reachable MMS image URLs. Only valid together with text.",
              },
              label: {
                type: "string",
                description: "Updated display label for the step.",
              },
              ineligibleAction: {
                type: "string",
                enum: ["skip", "exit"],
                description:
                  "Updated behavior when the contact can't receive SMS.",
              },
            },
            required: ["nodeId"],
          },
        },
        subscriberUpdateSteps: {
          type: "array",
          description:
            "Full config replacements for existing Update Subscriber steps, targeted by action_update_attributes nodeId.",
          items: {
            type: "object",
            properties: {
              nodeId: {
                type: "string",
                description: "Target action_update_attributes node ID.",
              },
              config: subscriberUpdateConfigSchema,
            },
            required: ["nodeId", "config"],
          },
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "update_sequence_node",
    description:
      "Patch one existing sequence node in place. Call get_sequence first, select sequence.nodes[].id, inspect nodeType/config, and pass that node's updatedAt as expectedUpdatedAt. This supports every stored sequence node type, including delays, email/SMS content, actions, conditions, branches without topology changes, webhooks, and trigger settings. Delay example: changes:{ delay:{ days:7 } }. For a direct text-forward email, use changes:{ emailPreset:'minimal' } on its action_email node; this changes only that linked email's Style > Format. To restyle one email, patch changes:{ emailTheme:{ colors:{ background:'#ffffff' } } } on its action_email node - that overrides only this step's linked email and leaves the company-wide theme alone. The update is type-aware and preserves fields you omit. It cannot change nodeType, managed linked-resource IDs, or graph topology; use edit_sequence_graph for structural work. It also cannot edit the copy of an action_ab_test step: that content lives on the A/B test variants (get_sequence.sequence.emails[].abTest.variants includes the blocks), so change each one with update_ab_test_variant. If update_ab_test_variant is not in the tool list, enable it on the Sequenzy connector rather than writing through update_template. On an active sequence, set confirmLiveChange:true only after the user confirms the live behavior change. Existing recipients already waiting keep their scheduled timestamp; the new delay applies when recipients reach the node in the future.",
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
          description: "Sequence ID.",
        },
        nodeId: sequenceNodeUpdateItemSchema.properties.nodeId,
        changes: sequenceNodeChangesSchema,
        expectedUpdatedAt:
          sequenceNodeUpdateItemSchema.properties.expectedUpdatedAt,
        confirmLiveChange: {
          type: "boolean",
          description:
            "Set true only after the user explicitly confirms changing a node in an active sequence.",
        },
      },
      required: ["sequenceId", "nodeId", "changes", "expectedUpdatedAt"],
      additionalProperties: false,
    },
  },
  {
    name: "update_sequence_nodes",
    description:
      "Atomically patch multiple existing sequence nodes. Call get_sequence first and include each node's id plus its updatedAt as expectedUpdatedAt. Every patch follows update_sequence_node's type-aware rules. Either every node update commits or none do, making this the preferred tool for changes such as replacing all 5-minute delays with 7-day delays, or restyling several action_email nodes at once with changes:{ emailPreset:'minimal' } or changes:{ emailTheme:{ colors:{ background:'#ffffff' } } }, without changing the company theme. A node may appear only once. It cannot change node types or graph topology. On an active sequence, set confirmLiveChange:true only after the user confirms the live behavior change. Existing recipients already waiting keep their scheduled timestamps.",
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
          description: "Sequence ID.",
        },
        updates: {
          type: "array",
          description:
            "Non-empty node patches. Each nodeId may appear only once.",
          items: sequenceNodeUpdateItemSchema,
        },
        confirmLiveChange: {
          type: "boolean",
          description:
            "Set true only after the user explicitly confirms changing nodes in an active sequence.",
        },
      },
      required: ["sequenceId", "updates"],
      additionalProperties: false,
    },
  },
  {
    name: "edit_sequence_emails",
    description:
      'Change a sequence\'s emails with AI in one request, like the Emails view in the sequence editor: the prompt says what to change, in any language ("make the background cream", "remove the header", "new structure for email 2"). Without emailIds the prompt decides which emails: every email, unless it names some. A look change (background, colors, fonts) is made identical across the emails it touches, down to each kind of block\'s style. "Make them all look like email 1" copies that email\'s style exactly without AI, keeping each email\'s words. For design variations of an email use generate_sequence_email_variations: such a prompt returns 400 here. An email written in HTML is edited as HTML and keeps its theme. A/B test steps, steps without an email and steps that send the same email as an earlier step are skipped and listed in skipped. Each email succeeds or fails on its own: emails[].status is changed, unchanged (summary says why) or failed; changed emails are saved (saved:true) unless dryRun is true. Saved changes apply to the next sends of an active sequence. Runs synchronously and can take up to a minute; one request edits up to 12 emails, so pass emailIds in batches for longer sequences. A 503 means the AI could not tell which emails the prompt means and nothing changed: retry or pass emailIds. An email saved elsewhere meanwhile comes back with saved:false and an error instead of being overwritten. If the call times out, read get_sequence before retrying: changes may already be saved. To set exact values instead of asking the AI, use update_sequence_nodes.',
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
          description: "Sequence ID.",
        },
        prompt: {
          type: "string",
          description:
            "What should change, any language, up to 2000 characters.",
        },
        emailIds: {
          type: "array",
          items: { type: "string" },
          minItems: 1,
          maxItems: 12,
          description:
            "Only change these emails (emailId from get_sequence.sequence.emails). Omit to let the prompt decide.",
        },
        sectionIds: {
          type: "array",
          items: { type: "string" },
          maxItems: 50,
          description:
            "Only change these top-level block ids. Needs exactly one emailId.",
        },
        dryRun: {
          type: "boolean",
          description:
            "Return the new content without saving it. Defaults to false.",
        },
      },
      required: ["sequenceId", "prompt"],
      additionalProperties: false,
    },
  },
  {
    name: "edit_sequence_graph",
    description:
      "Restructure an existing sequence graph using node IDs, edges, and graphRevision from get_sequence. move_node repositions one non-split step; duplicate_node creates an independent copy; delete_node safely splices a node and immediately moves parked recipients to its unique surviving successor (or completes them when none remains); replace_edges replaces the complete topology. The returned sequence reports migratedRecipientCount and completedRecipientCount. Always call get_sequence immediately before this tool and pass its graphRevision. Active sequences require confirmStructuralChange:true after the user confirms live-flow impact.",
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
          description: "Sequence ID.",
        },
        action: {
          type: "string",
          enum: ["move_node", "delete_node", "duplicate_node", "replace_edges"],
          description: "Graph operation.",
        },
        graphRevision: {
          type: "string",
          description:
            "Exact graphRevision returned by the latest get_sequence call. The edit is rejected if the graph changed since then.",
        },
        nodeId: {
          type: "string",
          description:
            "Existing node to move, duplicate, or delete. Unused by replace_edges.",
        },
        afterNodeId: {
          type: "string",
          description:
            "For move_node or duplicate_node, insert immediately after this node. The target must have at most one outgoing path. Provide exactly one of afterNodeId or beforeNodeId.",
        },
        beforeNodeId: {
          type: "string",
          description:
            "For move_node or duplicate_node, insert immediately before this node. All incoming paths converge through the moved/copied node, which is useful for placing a step below a branch. Provide exactly one of beforeNodeId or afterNodeId.",
        },
        edges: {
          type: "array",
          description:
            "Complete replacement topology from get_sequence.sequence.edges. The returned edge array is already normalized for this input and can be reused directly. Required for replace_edges and when deleting a split node. Preserve each branch edge's condition.branchId. Do not include edges that reference a deleted node.",
          items: {
            type: "object",
            properties: {
              sourceNodeId: { type: "string" },
              targetNodeId: { type: "string" },
              condition: {
                type: "object",
                description:
                  "Optional edge routing condition. Preserve condition.branchId on edges leaving logic_branch nodes.",
              },
            },
            required: ["sourceNodeId", "targetNodeId"],
            additionalProperties: false,
          },
        },
        confirmStructuralChange: {
          type: "boolean",
          description:
            "Set true only after the user explicitly confirms a structural edit to an active sequence.",
        },
      },
      required: ["sequenceId", "action", "graphRevision"],
      additionalProperties: false,
    },
  },
  {
    name: "insert_sequence_step",
    description:
      "Insert one dashboard-compatible typed step into an existing sequence: email, SMS, delay/date wait, discount (later emails print the generated code with {{discount.code}}), subscriber update, tag/list action, outbound webhook, AI step (later steps use the generated text with {{ai.KEY.field}}), condition gate, wait-for-event, or wired If/Else branch. Use get_sequence first and pass afterNodeId. Branch paths can target existing nodes, including completion. To nest a branch inside a branch path, end that path with the step the nested branch should follow, then call insert_sequence_step again with type 'logic_branch' and afterNodeId set to that path node - addedBranchPathNodeIds in the response lists each path's node IDs in order, and the nested paths reconnect to the shared steps that already followed it. A logic_branch with splitMode 'random' plus randomPercentages is a weighted split rather than an If/Else, so it runs a concurrent A/B test inside the flow - use it to compare two offers in the same abandoned-cart sequence instead of running duplicate sequences one after another. To A/B test the content of one existing email step and have a winner picked automatically, use create_ab_test with automationNodeId instead. For active sequences, confirm the structural change first.",
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
          description: "Sequence ID.",
        },
        type: {
          type: "string",
          enum: [
            "email",
            "sms",
            "push",
            "in_app",
            "delay",
            "create_discount",
            "update_subscriber",
            "add_tag",
            "remove_tag",
            "add_to_list",
            "remove_from_list",
            "webhook",
            "ai",
            "condition",
            "logic_wait_for_event",
            "logic_branch",
          ],
          description: "Dashboard step type. Defaults to email.",
        },
        afterNodeId: {
          type: "string",
          description:
            "Existing node ID to insert after. Use a nodeId from get_sequence.sequence.nodes or get_sequence.sequence.emails. Omit only to append to an unambiguous linear tail.",
        },
        confirmStructuralChange: {
          type: "boolean",
          description:
            "Set true only after the user explicitly confirms a structural edit to an active sequence.",
        },
        name: {
          type: "string",
          description: "Optional email template and step name.",
        },
        subject: {
          type: "string",
          description:
            "Email subject for the new step. Required for email steps; not used for SMS steps.",
        },
        previewText: {
          type: "string",
          description: "Optional email preview text for the new step.",
        },
        blocks: {
          type: "array",
          description: sequenceEmailBlocksDescription,
          items: { type: "object" },
        },
        html: {
          type: "string",
          description: `HTML content for an imported provider step. Provide either html or blocks, not both. ${rawHtmlContentDescription} In-app format html: the message document (100 KB max; see validate_in_app_html).`,
        },
        isTransactional: {
          type: "boolean",
          description: "Email only: omit the marketing unsubscribe footer.",
        },
        ccEmails: {
          type: "array",
          items: { type: "string" },
          description: "Email only: addresses CC'd on this step.",
        },
        bccEmails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email only: addresses BCC'd in addition to sequence-level BCC.",
        },
        attachments: {
          type: "array",
          items: {
            type: "object",
            properties: {
              filename: { type: "string" },
              path: { type: "string" },
            },
            required: ["filename", "path"],
          },
          description:
            "Email only: URL-backed file attachments (max 10, 15MB total per email). path may be a public HTTPS URL or an {{event.*}} URL template resolved from the enrollment event at send time.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Email steps only: sender profile for the new step. Omit to inherit the effective identity of the nearest sequence email. After a branch merge, only fields shared by every incoming path are inherited; conflicting fields use sequence or company defaults.",
        },
        fromEmail: {
          type: "string",
          description:
            "Email steps only: From address for the new step. Its domain must be verified. Mutually exclusive with senderProfileId.",
        },
        fromName: {
          type: "string",
          description:
            "Email steps only: display name override for the new step. With fromEmail, also names a newly created sender profile.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Email steps only: reply profile for the new step. Omit to inherit the effective Reply-To of the nearest sequence email. After a branch merge, only fields shared by every incoming path are inherited; conflicting fields use sequence or company defaults. Mutually exclusive with replyTo.",
        },
        replyTo: {
          type: "string",
          description:
            "Email steps only: Reply-To address for the new step. Mutually exclusive with replyProfileId.",
        },
        replyToName: {
          type: "string",
          description:
            "Email steps only: Reply-To display name override for the new step. Requires replyTo; omit it when using replyProfileId, which already carries its own display name.",
        },
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
        title: {
          type: "string",
          description:
            "Push steps: notification title (max 120 characters). In-app steps: title (max 200). Merge tags work.",
        },
        imageUrl: {
          type: ["string", "null"],
          description: "Push and in-app steps: optional https image.",
        },
        iconUrl: {
          type: ["string", "null"],
          description: "Push steps only: optional https icon for web push.",
        },
        platforms: {
          type: "array",
          items: { type: "string", enum: ["web", "ios", "android"] },
          description:
            "Push steps only: limit delivery to these platforms; omit for all.",
        },
        localizations: {
          ...pushLocalizationsProperty,
          description:
            "Push steps only: versions in the workspace's other languages (each contact gets their language attribute's version, else their device language's). translate_push_content writes them with AI.",
        },
        ...inAppStepProperties,
        label: {
          type: "string",
          description:
            "Display label for SMS, push, in-app, wait-for-event, or branch steps.",
        },
        ineligibleAction: {
          type: "string",
          enum: ["skip", "exit"],
          description:
            "SMS and push steps: what happens when the contact can't receive the message (SMS: no phone, not opted in, unsupported country; push: no active device). Default 'skip' continues the sequence.",
        },
        config: {
          ...subscriberUpdateConfigSchema,
          description:
            "update_subscriber only: typed subscriber profile/custom-attribute changes.",
        },
        tagId: {
          type: "string",
          description: "Tag ID for tag actions or tag conditions.",
        },
        tagName: {
          type: "string",
          description:
            "Tag name for tag actions or tag conditions; missing definitions are created.",
        },
        listId: {
          type: "string",
          description: "List ID for list actions or in_list conditions.",
        },
        listName: {
          type: "string",
          description: "Optional cached list display name for list actions.",
        },
        url: {
          type: "string",
          description:
            "webhook: destination HTTPS URL called when a subscriber reaches this step. push: link opened on tap (https URL or app deep link). Both support merge tags like {{email}} and {{event.order_id}}.",
        },
        method: {
          type: "string",
          enum: ["POST", "GET", "PUT", "PATCH", "DELETE"],
          description: "webhook only: HTTP method. Defaults to POST.",
        },
        headers: {
          type: "object",
          description:
            "webhook only: optional string-valued request headers. Values support merge tags. Secret values are redacted on sequence reads.",
          additionalProperties: { type: "string" },
        },
        body: {
          type: "string",
          description:
            'push: the notification message (up to 500 characters; merge tags allowed). webhook: optional JSON body template for POST/PUT/PATCH. Must be valid JSON as written, with merge tags inside quoted string values ({"email": "{{email}}"}); a tag in a bare value position is rejected. Tags are resolved at execution time; when omitted, the default payload with subscriber and sequence context is sent.',
        },
        resultKey: {
          type: "string",
          description:
            "webhook / ai: where the result is saved. Later steps reference it via {{webhooks.KEY.data.field}} (webhook) or {{ai.KEY.field}} (ai) merge tags. Required for ai steps. Must start with a letter; letters, numbers, underscores; max 64 chars.",
        },
        onError: {
          type: "string",
          enum: ["continue", "exit", "fail"],
          description:
            "webhook / ai: behavior when the step fails. continue proceeds to the next step, exit ends the sequence for the subscriber, fail marks the enrollment failed. Defaults to fail for webhooks and continue for ai steps.",
        },
        prompt: {
          type: "string",
          description:
            "ai only: prompt template sent to the model, resolved per contact at execution time. Ask for the short per-contact fragments the output fields name (a sentence or two each), never a whole email - the email around them is authored separately. Supports merge tags like {{first_name}}, {{event.plan}}, and {{webhooks.KEY.data.field}}. Max 8000 chars.",
        },
        outputFields: {
          type: "array",
          description:
            "ai only: named values the model must return (1-10). Each key becomes a {{ai.KEY.<key>}} merge tag for later steps; fallback is used when generation fails. Combined field maxLength values must fit the step's conservative 2000-token multilingual response budget plus JSON overhead.",
          items: {
            type: "object",
            properties: {
              key: {
                type: "string",
                description:
                  "Field key, e.g. subject_line. Letters, numbers, underscores; must start with a letter; unique within the step.",
              },
              description: {
                type: "string",
                description:
                  "What the model should produce for this field. Max 300 chars.",
              },
              maxLength: {
                type: "integer",
                minimum: 1,
                maximum: 4000,
                description:
                  "Hard cap on stored characters (1-4000). Defaults to 500.",
              },
              fallback: {
                type: "string",
                description:
                  "Text used verbatim when generation fails or the model omits the field.",
              },
            },
            required: ["key"],
            additionalProperties: false,
          },
        },
        includeTags: {
          type: "boolean",
          description:
            "ai only: include the contact's tags in the prompt context.",
        },
        includeEventProperties: {
          type: "boolean",
          description:
            "ai only: include the enrollment's trigger event name and properties in the prompt context.",
        },
        includeRecentEvents: {
          type: "boolean",
          description:
            "ai only: include the contact's most recent custom events (newest first) in the prompt context.",
        },
        recentEventLimit: {
          type: "number",
          description:
            "ai only: how many recent events to include when includeRecentEvents is true (1-50, default 10).",
        },
        includeAttributes: {
          type: "array",
          items: { type: "string" },
          description:
            "ai only: custom attribute keys to include in the prompt context (max 30). Only the listed keys are sent.",
        },
        segmentId: {
          type: "string",
          description: "Segment ID for in_segment conditions.",
        },
        segmentName: {
          type: "string",
          description: "Optional cached segment display name.",
        },
        conditionType: {
          type: "string",
          enum: [
            "has_tag",
            "does_not_have_tag",
            "in_list",
            "in_segment",
            "event_received",
            "link_clicked",
            "field_equals",
            "field_contains",
            "field_greater_than",
            "field_less_than",
            "has_phone",
            "sms_subscribed",
            "has_push_device",
          ],
          description: "condition only: condition evaluated before continuing.",
        },
        linkUrl: { type: "string" },
        activityScope: {
          type: "string",
          enum: ["ever", "this_sequence", "previous_email"],
        },
        fieldName: {
          type: "string",
          description:
            "Contact attribute for field_* conditions, e.g. plan. In a workspace with Organizations, organization.<field> (organization.plan, organization.role) reads the contact's primary organization.",
        },
        fieldValue: { type: "string" },
        delay: sequenceDelaySchema,
        delayMs: {
          type: "number",
          description:
            "Optional wait in milliseconds before the new step. Prefer delay for readability.",
        },
        waitUntil: sequenceWaitUntilSchema,
        waitUntilWeekday: sequenceWaitUntilWeekdaySchema,
        waitUntilKeyDate: sequenceWaitUntilKeyDateSchema,
        eventName: {
          type: "string",
          description:
            "logic_wait_for_event only: event to wait for, for example email.replied.",
        },
        timeoutDays: {
          type: "number",
          description:
            "logic_wait_for_event only: maximum wait in whole days from 1 to 365. Defaults to 7.",
        },
        timeoutAction: {
          type: "string",
          enum: ["continue", "exit"],
          description:
            "logic_wait_for_event only: continue to the next node or exit the sequence when the timeout is reached. Defaults to continue.",
        },
        discount: {
          type: "object",
          description: "create_discount only: provider discount configuration.",
          additionalProperties: true,
        },
        provider: { type: "string", enum: ["stripe", "shopify"] },
        discountType: { type: "string", enum: ["percent", "amount"] },
        percentOff: { type: "number" },
        amountOff: { type: "number" },
        currency: { type: "string" },
        duration: {
          type: "string",
          enum: ["once", "forever", "repeating"],
        },
        durationInMonths: { type: "number" },
        appliesToAllPlans: { type: "boolean" },
        planIds: { type: "array", items: { type: "string" } },
        codePrefix: { type: "string" },
        maxRedemptions: { type: "number" },
        lockToSubscriber: { type: "boolean" },
        expiresAt: { type: "string" },
        expiresInHours: { type: "number" },
        splitMode: sequenceBranchSplitModeSchema,
        randomPercentages: sequenceBranchRandomPercentagesSchema,
        branches: {
          type: "array",
          description: `logic_branch only: ${sequenceBranchesDescription}`,
          items: sequenceBranchConditionSchema,
        },
        elseSteps: {
          type: "array",
          description:
            "logic_branch only: optional new steps for the else path. Not valid on a random split.",
          items: sequencePathStepSchema,
        },
        elseTargetNodeId: {
          type: "string",
          description:
            "logic_branch only: existing node for the else path, such as the original follow-up node or completion node.",
        },
        allowEmptyPaths: {
          type: "boolean",
          description:
            "logic_branch only: set true only to create empty dashboard placeholders. Explicit target nodes do not require it.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "enable_sequence",
    description:
      "Enable/activate a sequence so it starts processing its triggers. Sequences are created disabled so their content can be reviewed before activation; this tool is intended for user-requested activation. simulate_sequence shows who currently matches and whether the sequence is ready. Activation does not enroll existing matches unless audienceAutoEnroll is saved. Relay any response `warnings` to the user, such as a contact_added trigger with no list, which enrolls every new contact.",
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
    },
  },
  {
    name: "disable_sequence",
    description:
      "Disable/freeze a sequence. This blocks new enrollments and holds current recipients until the sequence is enabled again. To only stop new enrollments while current recipients continue, use pause_sequence_enrollments.",
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
    },
  },
  {
    name: "duplicate_sequence",
    description:
      "Create an independent draft copy of a sequence, including its graph, email templates, and sequence A/B tests. The original is not changed.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID to copy." },
        name: {
          type: "string",
          description:
            "Optional name for the copy. Defaults to the original name plus (Copy).",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "archive_sequence",
    description:
      "Archive a sequence and stop new enrollments. Archived sequences remain available in the dashboard's archive.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID to archive." },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "unarchive_sequence",
    description:
      "Restore an archived sequence as a disabled draft so it can be reviewed before activation.",
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
          description: "Archived sequence ID to restore.",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "pause_sequence_enrollments",
    description:
      "Stop new enrollments for an active sequence while current recipients continue through the sequence. This matches the dashboard 'Stop new enrollments' control and does not freeze current recipients.",
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
    },
  },
  {
    name: "resume_sequence_enrollments",
    description:
      "Resume new enrollments for an active sequence whose enrollment gate was paused. Use enable_sequence instead for a fully disabled/frozen sequence.",
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
    },
  },
  {
    name: "enroll_subscribers_in_sequence",
    description:
      "Manually enroll subscribers in a sequence by email address or subscriber ID. Maximum 500 total targets per call across emails and subscriberIds. Only active subscribers are enrolled: unknown emails are returned in `notFound`, while inactive, unavailable, and already actively enrolled subscribers are counted in `skipped`. By default enrollment starts at the first step after the trigger; pass targetNodeId to start at a specific step.",
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
          description: "Sequence ID to enroll subscribers in.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Email addresses of subscribers to enroll. Combined with subscriberIds, maximum 500 total targets per call.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Subscriber IDs to enroll. Combined with emails, maximum 500 total targets per call.",
        },
        targetNodeId: {
          type: "string",
          description:
            "Optional node ID to start enrollment at. Use a non-trigger nodeId from get_sequence. Defaults to the first step after the trigger.",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "enroll_sequence_audience",
    description:
      "Enroll a whole audience (everyone, lists, a segment, a filter, or combined rules) into a sequence as a background run. Unlike enroll_subscribers_in_sequence there is no 500-contact cap: the worker walks the audience in batches, skips contacts already in the sequence (and, for one_time sequences, anyone who completed or was cancelled before), never enrolls unsubscribed or bounced contacts, and reports progress. This is how a manual-trigger countdown sequence (Black Friday) gets its audience: enable the sequence, then call this. Late enrollees skip the steps whose key date already passed. Pass data for run-level values that are the same for everyone in the run (a sale end time, a discount percentage); the sequence's emails read them as {{enrollment.FIELD}}. Defaults to dryRun, which only returns the estimate (matchingCount, alreadyEnrolledCount, enrollableCount); pass dryRun false to start the run and poll get_sequence_audience_enrollment. One run per sequence at a time.",
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
          description: "Sequence ID to enroll the audience in.",
        },
        audience: sequenceAudienceSchema,
        targetNodeId: {
          type: "string",
          description:
            "Optional node ID to start contacts at. Defaults to the first step after the trigger.",
        },
        dryRun: {
          type: "boolean",
          description:
            "Defaults to true: estimate only. Pass false to start enrolling.",
        },
        scheduledFor: {
          type: "string",
          description:
            "ISO 8601 date-time to start the run later instead of now (with dryRun false). The run stays queued until then and can be cancelled before it starts.",
        },
        data: {
          type: "object",
          description:
            'Optional run-level data (with dryRun false): a JSON object of values shared by everyone in this run, up to 8 KB, for example {"sale_ends_at": "2026-11-29T23:59:00Z", "discount_percent": 20}. Each enrolled contact keeps a copy; emails and conditions in the sequence read it as {{enrollment.sale_ends_at}}. Returned as data on the run. Auto-enroll syncs do not carry run data.',
          additionalProperties: true,
        },
      },
      required: ["sequenceId", "audience"],
    },
  },
  {
    name: "list_sequence_audience_enrollments",
    description:
      "List recent audience enrollment runs for a sequence (newest first) with status queued/running/completed/cancelled/failed and counters estimatedCount, processedCount, enrolledCount, skippedCount. Use get_sequence_audience_enrollment to poll one run.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID." },
        limit: {
          type: "number",
          description: "Runs to return (1-100). Defaults to 20.",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "get_sequence_audience_enrollment",
    description:
      "Status and counters of one audience enrollment run started with enroll_sequence_audience. Poll while status is queued or running.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID." },
        runId: {
          type: "string",
          description: "Audience enrollment run ID (audienceEnrollment.id).",
        },
      },
      required: ["sequenceId", "runId"],
    },
  },
  {
    name: "cancel_sequence_audience_enrollment",
    description:
      "Stop an audience enrollment run. A queued run is cancelled immediately; a running run stops after the batch it is currently enrolling. Contacts already enrolled stay in the sequence (use cancel_sequence_enrollments to remove them).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID." },
        runId: {
          type: "string",
          description: "Audience enrollment run ID to cancel.",
        },
      },
      required: ["sequenceId", "runId"],
    },
  },
  {
    name: "get_sequence_recurring_enrollment",
    description:
      "Read a sequence's recurring schedule: the audience it re-enrolls, how often (daily, weekly on chosen weekdays, or monthly on chosen days including the last day), the time and IANA timezone, a readable description, the next run times (upcomingRuns), and the last run or skipped occurrence. recurringEnrollment is null when the sequence has no schedule.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID." },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "set_sequence_recurring_enrollment",
    description:
      "Make a manual-trigger sequence recurring: re-enroll an audience every day, on chosen weekdays, or on chosen days of the month (1-31 and/or the last day) at a time in an IANA timezone, for end-of-month updates, balance reminders or daily sends that are not tied to an event. Each run is an audience enrollment run (source recurring, visible in list_sequence_audience_enrollments): contacts who finished an earlier run enter again, contacts still in the sequence are skipped, one_time sequences never re-enroll anyone, and unsubscribed or bounced contacts never join. Nothing is enrolled until the first scheduled time; occurrences while the sequence is paused, disabled or closed are skipped, and a run that cannot start within 6 hours is skipped. Days past the end of a shorter month run on its last day. Requires trigger manual and audienceAutoEnroll off. Saving replaces any existing schedule; pass remove true to delete it. Returns the stored schedule, a description and upcomingRuns so you can confirm it reads as intended.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        sequenceId: { type: "string", description: "Sequence ID." },
        audience: {
          ...sequenceAudienceSchema,
          description:
            "Who to enroll at each run, re-evaluated every time (same shape as enroll_sequence_audience). Required unless remove is true.",
        },
        frequency: {
          type: "string",
          enum: ["daily", "weekly", "monthly"],
          description:
            "How often to run. Required unless remove is true. weekly needs weekdays; monthly needs monthDays.",
        },
        weekdays: {
          type: "array",
          items: { type: "number" },
          description:
            "For weekly: days to run, 0 (Sunday) to 6 (Saturday). [1,2,3,4,5] is every weekday.",
        },
        monthDays: {
          type: "array",
          items: { type: "number" },
          description:
            "For monthly: days of the month to run, 1 to 31, e.g. [1, 2]. Combine with lastDayOfMonth for the end of the month.",
        },
        lastDayOfMonth: {
          type: "boolean",
          description:
            "For monthly: also run on the last day of every month (28th to 31st). Can be the only day.",
        },
        time: {
          type: "string",
          description:
            '24-hour run time "HH:MM", e.g. "10:00". Required unless remove is true.',
        },
        timezone: {
          type: "string",
          description:
            'IANA timezone the time is read in, e.g. "Europe/London" or "UTC"; runs follow daylight saving. Required unless remove is true.',
        },
        enabled: {
          type: "boolean",
          description:
            "Defaults to true. Pass false to keep the schedule but stop its runs.",
        },
        endsAt: {
          type: "string",
          description:
            "Optional ISO 8601 date-time after which no run starts, e.g. the end of the last day in the schedule's timezone. Omit for no end date (saving replaces the schedule, so omitting removes an earlier end date).",
        },
        enrollmentMode: {
          type: "string",
          enum: ["unlimited", "one_time"],
          description:
            "Who enters at each run: unlimited (everyone who matches; people still inside are skipped) or one_time (only people who never entered). Sets the sequence's enrollment mode, which also applies to enrollments started by hand. Omit to keep the current mode.",
        },
        remove: {
          type: "boolean",
          description:
            "Pass true to delete the schedule; other fields are then ignored. Runs already started and contacts already enrolled are not affected.",
        },
      },
      required: ["sequenceId"],
    },
  },
  {
    name: "cancel_sequence_enrollments",
    description:
      "Cancel active, waiting, or paused enrollments in one sequence. Provide sequenceId and exactly one target: cancelAll to drain every active, waiting, or paused enrollment (use this to fully stop a live sequence instead of only freezing enrollment), subscriberIds for a specific batch, subscriberId for one subscriber, or fieldValues to match stored entry event properties. Every bulk target defaults to dryRun, so pass dryRun false to actually cancel. Bulk cancellation is capped per call: while the response reports remainingCount above zero, call again with the same arguments until it reaches zero.",
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
          description: "Sequence ID whose enrollments should be cancelled.",
        },
        cancelAll: {
          type: "boolean",
          description:
            "Cancel every active, waiting, or paused enrollment in the sequence, regardless of how contacts entered it. Use this when segment-triggered enrollments expose no shared entry field value. Defaults to dryRun; pass dryRun false to apply.",
        },
        subscriberId: {
          type: "string",
          description:
            "Subscriber ID to cancel in this sequence. Provide exactly one target.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Up to 500 subscriber IDs to cancel in this sequence. IDs that do not resolve come back in target.notFoundSubscriberIds. Provide exactly one target.",
        },
        fieldPath: {
          type: "string",
          description:
            "Dot-path inside the token's stored entry event properties, such as order.id or event.id. Optional when the sequence has enrollmentFieldPath configured.",
        },
        fieldValues: {
          type: "array",
          items: { type: "string" },
          description:
            "Entry field values to match. Cancels all active, waiting, or paused enrollments in the sequence whose entry field value is in this list. Provide exactly one target.",
        },
        dryRun: {
          type: "boolean",
          description:
            "When true, returns matching enrollments without cancelling them. cancelAll, subscriberIds, and fieldValues default to dryRun unless explicitly false; a single subscriberId cancels immediately.",
        },
        reason: {
          type: "string",
          description:
            "Optional cancellation reason stored on matched enrollment tokens.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "move_sequence_enrollments",
    description:
      "Release a bounded batch of contacts off one sequence step and onto another, keeping their existing enrollment. Use this to let the next N contacts waiting on a delay continue early instead of cancelling and re-enrolling them, which discards the enrollment's entry event properties and stop-condition snapshots. Provide sequenceId and fromNodeId; targetNodeId defaults to the source step's only next step. Defaults to dryRun, so pass dryRun false to actually move. Moved contacts become active on the target step immediately, so this sends email as soon as the worker picks them up. limit defaults to 100 and is capped at 500 per call: while remainingCount is above zero, call again to release more. Unlike enroll_subscribers_in_sequence this still works while the sequence has new enrollment paused, because the contacts are already enrolled.",
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
          description: "Sequence ID whose enrollments should be moved.",
        },
        fromNodeId: {
          type: "string",
          description:
            "Node ID the contacts are currently sitting on, such as the delay step they are waiting at. Get it from list_sequence_enrollments (currentNodeId) or get_sequence.",
        },
        targetNodeId: {
          type: "string",
          description:
            "Node ID to move them onto. Defaults to the source step's next step, and is required when that step branches or is terminal. Cannot be the trigger node.",
        },
        limit: {
          type: "number",
          description:
            "Maximum enrollments to move in this call. Defaults to 100, maximum 500.",
        },
        sort: {
          type: "string",
          enum: [
            "wait_until_asc",
            "wait_until_desc",
            "enrolled_at_asc",
            "enrolled_at_desc",
          ],
          description:
            "Which enrollments to take first. Defaults to wait_until_asc, meaning the contacts that have been waiting longest for their next step.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional narrowing filter: only move these subscribers, up to 500. Omit to take whichever enrollments the sort selects.",
        },
        dailyLimit: {
          type: "number",
          description:
            "Guardrail. Refuses to move more than this many enrollments onto targetNodeId in a rolling 24 hours, counting the moves recorded by earlier calls. The response reports movedInWindow and dailyRemaining so a paced release can resume tomorrow.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Tag names applied to the moved contacts so the released wave stays identifiable. The tags must already exist (create_tag). Requires the subscribers:tag scope. Applying them never enrolls contacts in tag_added sequences.",
        },
        reason: {
          type: "string",
          description:
            "Note stored on every moved enrollment and returned by list_sequence_enrollments as moveReason.",
        },
        dryRun: {
          type: "boolean",
          description:
            "When true (the default), reports which enrollments would move without moving them. Pass false to apply.",
        },
      },
      required: ["sequenceId", "fromNodeId"],
      additionalProperties: false,
    },
  },
  {
    name: "pause_sequence_subscribers",
    description:
      "Hold specific contacts on the sequence step they are on, without cancelling them. Use this when a contact's onboarding (or any sequence) must stop temporarily, for example while their account is blocked, and continue later from the same step with resume_sequence_subscribers. Nothing restarts or is skipped. A paused contact gets no further steps from this sequence, keeps its entry event properties and stop-condition snapshots, and cannot be enrolled in the same sequence again while paused; unsubscribes, bounces and cancel_sequence_enrollments still end it. A wait-for-event step does not react while paused; an event that arrived meanwhile is picked up on resume. Applies immediately (no dryRun). An enrollment whose current step a worker is running at that moment comes back with outcome in_progress: call again shortly. This is per contact: pause_sequence_enrollments instead stops new contacts entering the whole sequence. Provide sequenceId and subscriberIds, emails, or both (up to 500 combined).",
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
          description: "Sequence ID whose enrollments should be paused.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Subscriber IDs to pause. Combined with emails, up to 500. Unknown IDs come back in notFound.subscriberIds.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Subscriber email addresses to pause. Combined with subscriberIds, up to 500. Unknown emails come back in notFound.emails.",
        },
        reason: {
          type: "string",
          description:
            "Optional note stored on each paused enrollment and returned by list_sequence_enrollments as pauseReason.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "resume_sequence_subscribers",
    description:
      "Continue contacts paused with pause_sequence_subscribers from the step they were paused on, with the status they had. Waits keep their original wall-clock time, like a whole-sequence pause: a wait that ran out while paused continues right away (so the next email can send as soon as a worker picks it up), and one that has not still ends when it would have. Contacts that are not paused are reported with outcome not_paused and left alone. When the sequence itself is disabled, sequenceRunning is false and resumed contacts continue once it is enabled. Provide sequenceId and subscriberIds, emails, or both (up to 500 combined).",
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
          description: "Sequence ID whose paused enrollments should resume.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Subscriber IDs to resume. Combined with emails, up to 500.",
        },
        emails: {
          type: "array",
          items: { type: "string" },
          description:
            "Subscriber email addresses to resume. Combined with subscriberIds, up to 500.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "realign_sequence_enrollments",
    description:
      "Pull waiting enrollments forward to the start of the sequence's sending window on the day they are already scheduled for. Use this after changing sendingWindow (or a wait-until-weekday step) on a live sequence: node and sequence updates deliberately keep existing wait timestamps, so contacts already parked on an email-bound delay keep resuming at whatever minute their delay landed on, and a narrowed window silently defers them to the NEXT allowed day. Non-email actions are never advanced by the sequence sending window. Realignment never cancels, re-enrolls, or reschedules onto a different local day, and never pushes a contact later - a wait only ever moves earlier within the day it already has, and never earlier than now. Defaults to dryRun. Passing dryRun false queues a background apply and returns jobId; call get_sequence_enrollment_realignment until it completes. Each completed job is capped: when result.hasMore is true, queue another apply with result.nextCursor as cursor.",
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
          description: "Sequence ID whose waiting enrollments should realign.",
        },
        nodeIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional step IDs to limit realignment to. Use nodeIds from get_sequence, or currentNodeId values from list_sequence_enrollments. Defaults to every step.",
        },
        subscriberIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional subscriber IDs to limit realignment to (maximum 500). Defaults to every waiting contact.",
        },
        cursor: {
          type: "string",
          description:
            "Opaque continuation cursor. When a response has hasMore true, pass its nextCursor here to continue after the enrollments already scanned.",
        },
        dryRun: {
          type: "boolean",
          description:
            "When true (the default), reports the new wait times without writing them. Pass false to apply.",
        },
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_sequence_enrollment_realignment",
    description:
      "Check a queued sequence enrollment realignment. Call this with the jobId returned by realign_sequence_enrollments after applying with dryRun false. When status is completed, result contains the realignment counts, sample, and any nextCursor needed for another bounded apply call.",
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
          description: "Sequence ID used when the realignment was queued.",
        },
        jobId: {
          type: "string",
          description:
            "Realignment job ID returned by realign_sequence_enrollments.",
        },
      },
      required: ["sequenceId", "jobId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_sequence",
    description:
      "Permanently delete a sequence. Contacts still in it are removed and get none of its remaining steps; the result's `contactsInSequence` says how many. To stop new entries but let current contacts finish, use `pause_sequence_enrollments` instead, or `disable_sequence` to hold everyone where they are.",
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
    },
  },

  // ============================================================================
  // Transactional Email
];
