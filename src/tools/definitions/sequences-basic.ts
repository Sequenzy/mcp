import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  sequenceEmailBlocksDescription,
  sequenceSendingWindowSchema,
  sequenceWaitUntilSchema,
  sequenceDelaySchema,
  subscriberUpdateConfigSchema,
} from "../internal.js";

export const sequenceBasicToolDefinitions: Tool[] = [
  // ============================================================================
  // Sequences
  // ============================================================================
  {
    name: "list_sequences",
    description: "List all email sequences (automations)",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list sequences for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "get_sequence",
    description:
      "Get sequence details, editable step content, and graph topology. Each sequence.nodes item includes id, nodeType, current config, updatedAt, and updateHints with its editable/managed fields and ready-to-return expectedUpdatedAt token for update_sequence_node/update_sequence_nodes. The response also includes sequence.edges and graphRevision for safe edit_sequence_graph calls, plus sequence.emails with each email step's nodeId, linked emailId, subject, previewText, emailPreset (the per-email Style > Format for native blocks; null for raw HTML), and blocks.",
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
    name: "create_sequence",
    description:
      "Create and persist a disabled draft email sequence, follow-up series, drip campaign, nurture flow, or automation workflow. For natural-language content, provide goal and emailCount. Use explicit steps for finished caller-supplied content, exact workflows, or migrations. Configure trigger plus its relevant field, such as listId, tagName, segmentId, or eventName. Supports email and SMS steps, delays and date waits, actions that dynamically create a provider discount/code, subscriber updates, event filters, enrollment rules, sending windows, and stop conditions. The saved draft appears in list_sequences. Never call enable_sequence unless the user explicitly asks to activate it.",
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
            "Reply-To address for all emails in this sequence. A reply profile is created when needed.",
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
        name: {
          type: "string",
          description:
            "Sequence name (e.g., 'User Onboarding', 'Welcome Series')",
        },
        trigger: {
          type: "string",
          enum: [
            "contact_added",
            "tag_added",
            "segment_entered",
            "event_received",
            "inactivity",
            "frequency",
          ],
          description:
            "Trigger type: 'contact_added' (when added to a list), 'tag_added' (when tag is applied), 'segment_entered' (when a contact newly enters a saved segment), 'event_received' (when custom event fires), 'inactivity' (when subscriber hasn't performed an event for X days), 'frequency' (when subscriber performs event X times in Y days)",
        },
        // contact_added trigger options
        listId: {
          type: "string",
          description:
            "List ID to trigger on (for contact_added trigger). If not provided, triggers on any list.",
        },
        // tag_added trigger options
        tagName: {
          type: "string",
          description:
            "Tag name to trigger on (required for tag_added trigger)",
        },
        // segment_entered trigger options
        segmentId: {
          type: "string",
          description:
            "Segment ID to trigger on (required for segment_entered trigger). Use list_segments first to choose a saved segment.",
        },
        // event_received, inactivity, frequency trigger options
        eventName: {
          type: "string",
          description:
            "Event name to trigger on (required for event_received, inactivity, and frequency triggers)",
        },
        propertyFilters: {
          type: "array",
          description:
            "Optional event property filters for event_received triggers. The sequence only starts when the triggering event's properties match ALL filters. Use a dot-path into the event properties; use [] to match inside arrays. Examples: scope a purchase sequence to one product with { path: 'lineItems[].providerProductId', operator: 'equals', value: 'prod_123' } (ecommerce.order_placed) or { path: 'productIds', operator: 'equals', value: 'prod_123' } (saas.purchase); to match any of several products use { path: 'lineItems[].providerProductId', operator: 'one_of', value: ['prod_123', 'prod_456'] }. Max 10 filters.",
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
            "Sequence re-entry mode. Use 'matching_field' only for event_received triggers when duplicate active runs should be blocked per event field value.",
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
            "Optional explicit auto-stop condition. Use { type: 'has_tag', value: 'customer' } to end the sequence when a subscriber gets a tag, { type: 'does_not_have_tag', value: 'trial' } when a tag is removed, { type: 'entered_segment', value: 'segment_123' } when they enter a segment, { type: 'field_changed', value: 'plan' } when a subscriber field changes, { type: 'removed_from_list', value: 'list_123' } when they leave a list, { type: 'event_received', value: 'onboarding.completed' } when an event is tracked, or { type: 'none', value: null } for no auto-stop.",
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
              description: "Stop condition type.",
            },
            value: {
              type: ["string", "null"],
              description:
                "Tag name, list ID, segment ID, field path, or event name for the stop condition. Use null or omit for type 'none'.",
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
                description:
                  "HTML content for email steps. Stored as one raw HTML block. Use this for imported provider HTML.",
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
              name: {
                type: "string",
                description: "Email template name for email steps.",
              },
              discount: {
                type: "object",
                description:
                  "Discount configuration for create_discount steps. Prefer this nested shape for new integrations; legacy top-level discount fields are still accepted.",
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
      required: ["name", "trigger"],
    },
  },
];
