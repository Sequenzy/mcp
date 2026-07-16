import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  replacementEmailBlocksDescription,
  sequenceEmailBlocksDescription,
  sequenceSendingWindowSchema,
  sequenceWaitUntilSchema,
  sequenceDelaySchema,
  sequenceNodeChangesSchema,
  sequenceNodeUpdateItemSchema,
  subscriberUpdateConfigSchema,
  sequenceEmailStepIdentityProperties,
  sequencePathStepSchema,
} from "../internal.js";

export const sequenceEditingToolDefinitions: Tool[] = [
  {
    name: "update_sequence",
    description:
      "Update an existing sequence. To target a specific existing step, use IDs returned by get_sequence. The emails/steps arrays edit email steps, smsSteps edits SMS steps, and subscriberUpdateSteps replaces the config of action_update_attributes steps. To insert new linear steps, use insertSteps with an afterNodeId from get_sequence; omit afterNodeId only to append to an unambiguous linear tail. For active sequences, structural changes such as insertSteps or branch require confirmStructuralChange:true after the user confirms the live-flow impact.",
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
        fromEmail: {
          type: "string",
          description:
            "Set the From address for all emails in this sequence. Its domain must be configured and verified.",
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
        replyTo: {
          type: "string",
          description:
            "Set the Reply-To address for all emails in this sequence.",
        },
        replyToName: {
          type: "string",
          description:
            "Display name for a newly created reply profile. Requires replyTo.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Set an existing reply profile. Mutually exclusive with replyTo.",
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
        enrollmentMode: {
          type: "string",
          enum: ["unlimited", "one_time", "matching_field"],
          description:
            "Updated sequence re-entry mode. 'matching_field' is only valid for event-based sequence triggers.",
        },
        enrollmentFieldPath: {
          type: "string",
          description:
            "Scalar dot-path event property used by enrollmentMode='matching_field', such as 'order.id' or 'product.providerVariantId'. Array traversal with [] is not supported; use propertyFilters for array matching. Omit to leave unchanged. Use clearEnrollmentFieldPath to clear it.",
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
            "Update the sequence auto-stop condition. Example: { type: 'has_tag', value: 'customer' } ends the sequence when the subscriber has that tag. Use { type: 'entered_segment', value: 'segment_123' } to stop when they enter a segment, { type: 'field_changed', value: 'plan' } to stop when a subscriber field changes, { type: 'removed_from_list', value: 'list_123' } to stop when they leave a list, or { type: 'none', value: null } to clear it.",
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
            },
            value: {
              type: ["string", "null"],
              description:
                "Tag name, list ID, segment ID, field path, or event name for the stop condition.",
            },
          },
          required: ["type"],
        },
        branch: {
          type: "object",
          description:
            "Insert an if/else branch into an existing sequence. The branch is inserted after afterNodeId and creates an if path plus an else fallback path. Use get_sequence first to choose afterNodeId. Each branch condition should include steps, and elseSteps is required unless allowEmptyPaths is true. Conditions support tag presence/absence, lists, saved segments, events, clicked links, and field comparisons. Use activityScope for event_received and link_clicked checks.",
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
            branches: {
              type: "array",
              description:
                "Conditional branches evaluated in order. An else fallback is created automatically.",
              items: {
                type: "object",
                properties: {
                  id: {
                    type: "string",
                    description:
                      "Optional stable branch ID. Defaults to branch-0, branch-1, etc.",
                  },
                  label: {
                    type: "string",
                    description: "Display label, e.g. 'If has customer tag'.",
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
                    ],
                    description:
                      "Condition type for this branch. has_phone (contact has a phone number) and sms_subscribed (contact opted in to SMS marketing) need no extra fields.",
                  },
                  tagName: {
                    type: "string",
                    description:
                      "Tag name for has_tag and does_not_have_tag conditions. This can be used instead of tagId.",
                  },
                  tagId: {
                    type: "string",
                    description:
                      "Tag ID or tag name for has_tag and does_not_have_tag conditions.",
                  },
                  listId: {
                    type: "string",
                    description: "List ID for in_list conditions.",
                  },
                  segmentId: {
                    type: "string",
                    description: "Segment ID for in_segment conditions.",
                  },
                  segmentName: {
                    type: "string",
                    description:
                      "Optional display name for in_segment conditions.",
                  },
                  eventName: {
                    type: "string",
                    description:
                      "Event name for event_received conditions, such as project.invite.accepted.",
                  },
                  linkUrl: {
                    type: "string",
                    description:
                      "Optional URL substring for link_clicked conditions. Omit to match any clicked link.",
                  },
                  activityScope: {
                    type: "string",
                    enum: ["ever", "this_sequence", "previous_email"],
                    description:
                      "Scope for event_received and link_clicked conditions. Omit to check ever.",
                  },
                  fieldName: {
                    type: "string",
                    description:
                      "Subscriber attribute name for field conditions.",
                  },
                  fieldValue: {
                    type: "string",
                    description: "Comparison value for field conditions.",
                  },
                  steps: {
                    type: "array",
                    description:
                      "Steps to create inside this branch path. Required by default so the branch is not an empty placeholder.",
                    items: sequencePathStepSchema,
                  },
                },
                required: ["conditionType"],
              },
            },
            elseSteps: {
              type: "array",
              description:
                "Steps to create inside the else fallback path. Required by default so the else arm is usable.",
              items: sequencePathStepSchema,
            },
            allowEmptyPaths: {
              type: "boolean",
              description:
                "Set true only when intentionally creating empty UI placeholders. Normal API/MCP use should omit this and provide branch steps plus elseSteps.",
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
                description:
                  "Updated HTML content. Stored as one raw HTML block. Use this to preserve imported provider HTML.",
              },
              htmlContent: {
                type: "string",
                description:
                  "Alias for html. Stored as one raw HTML block. Use this when updating imported provider HTML for a step.",
              },
              emailPreset: {
                type: "string",
                enum: ["branded", "minimal"],
                description:
                  "Per-email Style > Format. Minimal removes the company logo/full footer for a text-forward note; branded restores them. Does not change the company default. Do not combine with html/htmlContent in the same update; change the format separately so imported HTML remains one raw block.",
              },
              blocks: {
                type: "array",
                description: replacementEmailBlocksDescription,
                items: { type: "object" },
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
                description:
                  "Updated HTML content. Stored as one raw HTML block. Use this to preserve imported provider HTML.",
              },
              htmlContent: {
                type: "string",
                description:
                  "Alias for html. Stored as one raw HTML block. Use this when updating HTML content for a step.",
              },
              emailPreset: {
                type: "string",
                enum: ["branded", "minimal"],
                description:
                  "Per-email Style > Format. Minimal removes the company logo/full footer for a text-forward note; branded restores them. Does not change the company default. Do not combine with html/htmlContent in the same update; change the format separately so imported HTML remains one raw block.",
              },
              blocks: {
                type: "array",
                description: replacementEmailBlocksDescription,
                items: { type: "object" },
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
      "Patch one existing sequence node in place. Call get_sequence first, select sequence.nodes[].id, inspect nodeType/config, and pass that node's updatedAt as expectedUpdatedAt. This supports every stored sequence node type, including delays, email/SMS content, actions, conditions, branches without topology changes, webhooks, and trigger settings. Delay example: changes:{ delay:{ days:7 } }. For a direct text-forward email, use changes:{ emailPreset:'minimal' } on its action_email node; this changes only that linked email's Style > Format. The update is type-aware and preserves fields you omit. It cannot change nodeType, managed linked-resource IDs, or graph topology; use edit_sequence_graph for structural work. On an active sequence, set confirmLiveChange:true only after the user confirms the live behavior change. Existing recipients already waiting keep their scheduled timestamp; the new delay applies when recipients reach the node in the future.",
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
      "Atomically patch multiple existing sequence nodes. Call get_sequence first and include each node's id plus its updatedAt as expectedUpdatedAt. Every patch follows update_sequence_node's type-aware rules. Either every node update commits or none do, making this the preferred tool for changes such as replacing all 5-minute delays with 7-day delays or setting several action_email nodes to changes:{ emailPreset:'minimal' } without changing the company theme. A node may appear only once. It cannot change node types or graph topology. On an active sequence, set confirmLiveChange:true only after the user confirms the live behavior change. Existing recipients already waiting keep their scheduled timestamps.",
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
    name: "edit_sequence_graph",
    description:
      "Restructure an existing sequence graph using node IDs, edges, and graphRevision from get_sequence. move_node repositions one non-split step; beforeNodeId can place an A/B test or other step at the shared continuation below a branch. duplicate_node creates an independent copy and deep-copies linked email or A/B test content. delete_node safely splices a linear step; deleting a split node requires the complete replacement edges. replace_edges atomically replaces the complete topology for advanced reconnect or multi-node reorder work. Always call get_sequence immediately before this tool and pass its graphRevision. Active sequences require confirmStructuralChange:true after the user confirms live-flow impact.",
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
          description:
            "Graph operation. Use move_node for a single step reorder, duplicate_node for an independent copy, delete_node to remove a step/node, or replace_edges for an atomic reconnect/reorder of the whole topology.",
        },
        graphRevision: {
          type: "string",
          description:
            "Exact graphRevision returned by the latest get_sequence call. The edit is rejected if the graph changed since then.",
        },
        nodeId: {
          type: "string",
          description:
            "Existing node to move, duplicate, or delete. Required for those actions and unused by replace_edges.",
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
      "Insert one new email or SMS step into an existing sequence. Prefer this over update_sequence.steps/emails when adding a step: it creates the step node (plus an email template for email steps) and, when delay or delayMs is provided, a logic_delay node immediately before it. For SMS steps set type:'sms' and provide 'text' (generate copy with generate_sms; check get_sms_settings first and warn the user if SMS is not enabled). Use get_sequence first, then pass afterNodeId from sequence.nodes or sequence.emails to choose the insertion point. If afterNodeId is omitted, the step is appended only when the sequence has exactly one linear tail. For active sequences, set confirmStructuralChange:true only after the user confirms the live-flow impact.",
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
          enum: ["email", "sms"],
          description:
            "Step type. Defaults to 'email'. Use 'sms' to insert an SMS step (requires 'text').",
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
          description:
            "HTML content for the new step. Stored as one raw HTML block. Use this for imported provider HTML. Provide either html or blocks, not both.",
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
            "Email steps only: display name for a newly created reply profile. Requires replyTo.",
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
        label: {
          type: "string",
          description: "SMS steps only: display label for the step.",
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
            "Optional wait in milliseconds before the new step. Prefer delay for readability.",
        },
        waitUntil: sequenceWaitUntilSchema,
      },
      required: ["sequenceId"],
      additionalProperties: false,
    },
  },
  {
    name: "enable_sequence",
    description:
      "Enable/activate a sequence. IMPORTANT: Only call this when the user EXPLICITLY asks to enable or activate a sequence. Never enable sequences automatically after creation - the user must review the content first.",
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
    name: "cancel_sequence_enrollments",
    description:
      "Cancel active/waiting enrollments in one sequence. Provide sequenceId and exactly one target: subscriberId for one subscriber, or fieldValues to match stored entry event properties. For fieldValues, fieldPath is optional when the sequence has enrollmentFieldPath configured; otherwise provide a dot path such as order.id.",
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
        subscriberId: {
          type: "string",
          description:
            "Subscriber ID to cancel in this sequence. Provide subscriberId or fieldValues, not both.",
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
            "Entry field values to match. Cancels all active/waiting enrollments in the sequence whose entry field value is in this list. Provide fieldValues or subscriberId, not both.",
        },
        dryRun: {
          type: "boolean",
          description:
            "When true, returns matching enrollments without cancelling them. Field-value cancellation defaults to dryRun on the API unless explicitly false.",
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
    name: "delete_sequence",
    description: "Delete a sequence",
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
