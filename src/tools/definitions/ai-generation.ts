import type { Tool } from "../../mcp-types.js";

export const aiGenerationToolDefinitions: Tool[] = [
  // ============================================================================
  // AI Generation
  // ============================================================================
  {
    name: "generate_email",
    description:
      "Generate email blocks from a prompt. Generated blocks include the company's branding chrome (logo, footer with company name/address/unsubscribe) by default, matching emails created in the dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        prompt: {
          type: "string",
          description: "Description of the email to generate",
        },
        style: {
          type: "string",
          description: "Style: minimal, branded, promotional",
        },
        tone: {
          type: "string",
          description: "Tone: professional, casual, friendly",
        },
        applyBranding: {
          type: "boolean",
          description:
            "Wrap the generated content with company branding (logo + footer). Defaults to true; set false to get raw content blocks only.",
        },
        emailType: {
          type: "string",
          enum: ["marketing", "transactional"],
          description:
            "Email type. Transactional emails get a footer without the unsubscribe link. Defaults to marketing.",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_sequence",
    description:
      "[DEPRECATED compatibility alias - use create_sequence] Create and persist a disabled AI-generated email sequence draft from a goal. The saved draft appears in list_sequences. The name defaults to the goal and the trigger defaults to contact_added; optionally pass listId to scope it. Review before enabling.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        goal: {
          type: "string",
          description:
            "Goal of the sequence (e.g., 'onboard new SaaS trial users')",
        },
        name: {
          type: "string",
          description: "Optional sequence name. Defaults to the goal.",
        },
        emailCount: {
          type: "number",
          description: "Number of emails in the sequence (default: 5, max: 10)",
        },
        durationDays: {
          type: "number",
          description: "Total duration in days (default: 14)",
        },
        listId: {
          type: "string",
          description:
            "Optional list ID. When provided, only contacts added to this list trigger the sequence.",
        },
      },
      required: ["goal"],
    },
  },
  {
    name: "generate_subject_lines",
    description: "Generate A/B test subject line variants",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        topic: {
          type: "string",
          description: "Topic or context for the subject lines",
        },
        count: {
          type: "number",
          description: "Number of variants to generate (default: 5)",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: "generate_sms",
    description:
      "Generate SMS marketing message variants from a prompt. Returns plain-text messages with per-message encoding and segment counts. Use the results as the 'text' of an SMS sequence step (insert_sequence_step with type 'sms' or a create_sequence sms step). Messages exclude opt-out footers and brand prefixes - the platform adds those automatically at send time.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        prompt: {
          type: "string",
          description:
            "Description of the SMS to generate (e.g., 'cart reminder with a free-shipping hook')",
        },
        count: {
          type: "number",
          description:
            "Number of message variants to generate (default: 3, max: 10)",
        },
      },
      required: ["prompt"],
    },
  },
  {
    name: "get_sms_settings",
    description:
      "Get the company's SMS add-on status: whether SMS is enabled, plan eligibility, credit balance, brand prefix, phone numbers, and whether SMS steps will actually send. Check this before adding SMS steps to sequences so you can warn the user when SMS is not ready.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "get_sms_usage",
    description:
      "Get per-number SMS usage for the company: sends, delivered, failed, credits charged, last-sent time, and test-send count for each phone number the workspace has sent from. Use it to compare how the workspace's numbers are performing or to check what a number was used for before releasing it.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "update_sms_number_label",
    description:
      "Update one SMS number's settings: the user-facing label and/or its brand prefix override. Use get_sms_settings to find the number ID. Omitted fields keep their value; pass an empty string to clear one. Requires workspace-management permission.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        numberId: {
          type: "string",
          description: "SMS number ID returned by get_sms_settings.",
        },
        label: {
          type: "string",
          description:
            "Label up to 100 characters, such as Marketing or Support. Pass an empty string to clear it.",
        },
        brandPrefix: {
          type: "string",
          description:
            'Per-number brand prefix override up to 100 characters; messages go out as "{prefix}: your message". Pass an empty string to clear it back to the account-wide prefix.',
        },
      },
      required: ["numberId"],
    },
  },
  {
    name: "release_sms_number",
    description:
      "Release an SMS number: hand it back to the carrier and mark it released. This is IRREVERSIBLE - the number cannot be recovered afterward, any campaign/sequence still explicitly set to send from it will SKIP its SMS sends until repointed at another number, and it stops counting toward the workspace's number limit (freeing a slot for a new purchase). Use get_sms_settings to find the number ID. Requires workspace-management permission.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        numberId: {
          type: "string",
          description: "SMS number ID returned by get_sms_settings.",
        },
      },
      required: ["numberId"],
    },
  },
  {
    name: "send_test_sms",
    description:
      "Send a test SMS to a phone number. IMPORTANT: sends a real text message and charges SMS credits - only call when the user explicitly asks for a test send. Requires the SMS add-on with a verified number (check get_sms_settings). Limited to 5 test sends per hour; bypasses quiet hours; excluded from step stats.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        to: {
          type: "string",
          description:
            "Destination phone number in international E.164 format, e.g. +15550100123.",
        },
        text: {
          type: "string",
          description:
            "Plain-text message body. Merge tags are not resolved for test sends to arbitrary numbers. Provide text or blocks.",
        },
        imageUrls: {
          type: "array",
          items: { type: "string" },
          description:
            "Up to 2 publicly reachable image URLs sent as MMS media (US/CA only).",
        },
        blocks: {
          type: "array",
          items: { type: "object" },
          description:
            "SMS content blocks (text + image subset). Provide text or blocks, not both.",
        },
        fromNumberId: {
          type: "string",
          description:
            "Active SMS number ID to send from (see get_sms_settings). Defaults to the company's oldest active number - the same default real sends use.",
        },
      },
      required: ["to"],
    },
  },
];
