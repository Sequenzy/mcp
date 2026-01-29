import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  apiRequest,
  getSelectedCompanyId,
  setSelectedCompanyId,
} from "../index.js";

// Tool definitions
export const tools: Tool[] = [
  // ============================================================================
  // Account & Setup
  // ============================================================================
  {
    name: "get_account",
    description: `Get current account information including available companies. IMPORTANT: If you have access to multiple companies, you MUST either:
1. Call select_company first to choose which company to work with, OR
2. Pass companyId explicitly in each tool call

The response shows 'companies' (all available) and 'selectedCompanyId' (currently active). All subsequent operations will use the selected company unless you pass a companyId override.`,
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "select_company",
    description:
      "Select which company to operate on (for user-scoped API keys with access to multiple companies). Use get_account to see available companies. After selecting, all subsequent operations will use this company unless you pass a companyId override.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "The company ID to select (from get_account's companies list)",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "create_company",
    description:
      "Create a new company/brand. This will parse your website to extract brand information. The tool polls every 20 seconds until the company is fully processed (typically 30-60 seconds).",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "Company name (optional, will be extracted from domain if not provided)",
        },
        domain: {
          type: "string",
          description: "The company's website domain (e.g., example.com)",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_company",
    description: "Get company details and processing status",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "The company ID to check",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "create_api_key",
    description:
      "Create a new API key for a company. Use this when setting up Sequenzy integration in a project. The returned key should be saved to the project's .env file as SEQUENZY_API_KEY. The key can only be retrieved once at creation time.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID to create the key for",
        },
        name: {
          type: "string",
          description:
            "Optional name for the API key (e.g., 'Production', 'Development')",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "list_websites",
    description: "List all configured sender websites/domains",
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
    name: "add_website",
    description: "Add a new sender website. Takes ~30 seconds to process.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        domain: {
          type: "string",
          description: "The domain to add (e.g., example.com)",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "check_website",
    description: "Check if a website has been processed and is ready to use",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        domain: {
          type: "string",
          description: "The domain to check",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "get_integration_guide",
    description: `Get code examples for integrating Sequenzy into your project.

CRITICAL - FOR SAAS/SUBSCRIPTION APPS:
If the app uses Stripe, Polar, Paddle, Dodo, or Creem - tell the user to connect it in Sequenzy dashboard (Settings → Integrations).
The native integration automatically handles all payment events and customer tags - no code needed!

Only provide manual event tracking code if the user explicitly asks for it.

Use cases:
- 'transactional': Sending one-off emails (welcome, password reset, receipts)
- 'subscribe_form': Adding subscribers from signup forms
- 'event_tracking': Tracking CUSTOM events only (not payment events - those come from the integration)

Before implementing, use create_api_key to generate an API key and save it to .env as SEQUENZY_API_KEY.`,
    inputSchema: {
      type: "object",
      properties: {
        framework: {
          type: "string",
          description: "Framework/language (nextjs, express, python, etc.)",
        },
        use_case: {
          type: "string",
          description:
            "Use case: 'transactional' (sending emails), 'subscribe_form' (adding subscribers), 'event_tracking' (tracking CUSTOM events only - payment events should come from Stripe/Polar/etc integration)",
        },
      },
    },
  },

  // ============================================================================
  // Subscribers
  // ============================================================================
  {
    name: "add_subscriber",
    description: "Add a new subscriber to your list",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to add subscriber to. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        attributes: {
          type: "object",
          description: "Custom attributes (name, plan, etc.)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to apply to the subscriber",
        },
        listIds: {
          type: "array",
          items: { type: "string" },
          description: "List IDs to add subscriber to",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "update_subscriber",
    description: "Update an existing subscriber's attributes or tags",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        attributes: {
          type: "object",
          description: "Attributes to update",
        },
        addTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to add",
        },
        removeTags: {
          type: "array",
          items: { type: "string" },
          description: "Tags to remove",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "remove_subscriber",
    description: "Unsubscribe or delete a subscriber",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
        hardDelete: {
          type: "boolean",
          description:
            "If true, permanently deletes. If false, just unsubscribes.",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "get_subscriber",
    description: "Get subscriber details and activity history",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
      },
      required: ["email"],
    },
  },
  {
    name: "search_subscribers",
    description: "Search subscribers by tags, attributes, or segments",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        query: {
          type: "string",
          description: "Search query (email or name)",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        segmentId: {
          type: "string",
          description: "Filter by segment ID",
        },
        limit: {
          type: "number",
          description: "Maximum results (default 50)",
        },
      },
    },
  },

  // ============================================================================
  // Tags, Lists, Segments
  // ============================================================================
  {
    name: "list_tags",
    description: "List all tags in the account",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list tags for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "list_lists",
    description: "List all subscriber lists",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list lists for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_list",
    description: "Create a new subscriber list",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the list in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "List name",
        },
        description: {
          type: "string",
          description: "List description",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "list_segments",
    description: "List all segments",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list segments for. If not provided, uses the currently selected company.",
        },
      },
    },
  },
  {
    name: "create_segment",
    description: "Create a new segment with filter rules",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the segment in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Segment name",
        },
        filters: {
          type: "object",
          description: "Filter rules for the segment",
        },
      },
      required: ["name", "filters"],
    },
  },
  {
    name: "get_segment_count",
    description: "Get the number of subscribers in a segment",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        segmentId: {
          type: "string",
          description: "Segment ID",
        },
      },
      required: ["segmentId"],
    },
  },

  // ============================================================================
  // Templates
  // ============================================================================
  {
    name: "list_templates",
    description: "List all email templates",
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
    name: "get_template",
    description: "Get a template's details and content",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
      },
      required: ["templateId"],
    },
  },
  {
    name: "create_template",
    description: "Create a new email template",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        html: {
          type: "string",
          description: "Email HTML content",
        },
      },
      required: ["name", "subject", "html"],
    },
  },
  {
    name: "update_template",
    description: "Update an existing template",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
        name: {
          type: "string",
          description: "Template name",
        },
        subject: {
          type: "string",
          description: "Email subject line",
        },
        html: {
          type: "string",
          description: "Email HTML content",
        },
      },
      required: ["templateId"],
    },
  },
  {
    name: "delete_template",
    description: "Delete a template",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        templateId: {
          type: "string",
          description: "Template ID",
        },
      },
      required: ["templateId"],
    },
  },

  // ============================================================================
  // Campaigns (Draft Only)
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
    name: "create_campaign",
    description: "Create a new campaign (as draft)",
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
          description: "Email subject line",
        },
        html: {
          type: "string",
          description: "Email HTML content",
        },
        templateId: {
          type: "string",
          description: "Use a template instead of html",
        },
        segmentId: {
          type: "string",
          description: "Target segment ID",
        },
      },
      required: ["name", "subject"],
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
        html: {
          type: "string",
          description: "Email HTML content",
        },
      },
      required: ["campaignId"],
    },
  },
  {
    name: "send_test_email",
    description: "Send a test email to a single address",
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
    description: "Get sequence details and emails",
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
    name: "create_sequence",
    description: `Create a new email sequence. Sequenzy will automatically generate the email content using AI based on your company's brand and the goal you specify. The tool polls until emails are generated (typically 30-60 seconds).

IMPORTANT GUIDELINES:

1. NEVER ENABLE SEQUENCES AUTOMATICALLY:
   - Sequences are created in DRAFT/PAUSED state
   - NEVER call enable_sequence unless the user EXPLICITLY asks to enable/activate
   - The user must review the AI-generated content before going live
   - Sequences send real emails to real people - enabling without review is dangerous

2. KEEP IT SIMPLE: Only suggest sequences that are straightforward to implement:
   - Prefer 3-5 emails per sequence (not 10+)
   - Use simple, achievable triggers that the app already tracks
   - Avoid complex multi-step sequences that require extensive app changes

2. MATCH THE BUSINESS MODEL:
   - If the app has NO trial period, do NOT create trial-related sequences
   - If the app is FREE (no paid plans), do NOT create upgrade/pricing sequences
   - If the app is a one-time purchase (not SaaS), do NOT create subscription sequences
   - Match sequences to events and features that ACTUALLY exist in the app

3. EVENT TRACKING: When you use a custom event (not a built-in event), you MUST:
   - The event will be auto-created in Sequenzy
   - The response includes eventTrackingCode showing exactly what code to add to the app
   - Tell the user what specific user action should trigger each event
   - Be specific: "Track 'project.created' when user creates their first project"

4. SEQUENCE TRIGGER RECIPES - USE THESE EXACT CONFIGURATIONS:

   TRIAL CONVERSION:
   - trigger: tag_added, tagName: "trial"
   - Auto-stops when: user gets "customer" tag
   - Goal: Convert trial users to paying customers

   PAYMENT RECOVERY / DUNNING:
   - trigger: tag_added, tagName: "past-due"
   - Auto-stops when: user no longer has "past-due" tag (they paid)
   - Goal: Recover failed payments before churn

   CANCELLATION RECOVERY / WIN-BACK:
   - trigger: tag_added, tagName: "cancelled"
   - Auto-stops when: user gets "customer" tag again
   - Goal: Win back users who cancelled

   CHURN RECOVERY:
   - trigger: tag_added, tagName: "churned"
   - Auto-stops when: user gets "customer" tag again
   - Goal: Re-engage churned users

   UPGRADE / UPSELL:
   - trigger: tag_added, tagName: "customer"
   - Auto-stops when: user triggers "saas.upgrade" event
   - Goal: Encourage customers to upgrade to higher plans

   ONBOARDING:
   - trigger: event_received, eventName: "signup.completed"
   - Auto-stops when: "onboarding.completed" event fires
   - Goal: Guide new users through product setup

   WELCOME SERIES:
   - trigger: contact_added (optionally with listId)
   - No auto-stop (runs to completion)
   - Goal: Introduce new subscribers to your brand

   RE-ENGAGEMENT:
   - trigger: inactivity, eventName: "login", inactiveDays: 14
   - Auto-stops when: user logs in again
   - Goal: Bring back inactive users

IMPORTANT - PAYMENT PROVIDER INTEGRATION:
If the app uses Stripe, Polar, Paddle, Dodo, or Creem - tell the user to connect it in Sequenzy dashboard (Settings → Integrations).
Once connected, the native integration automatically handles:
- All saas.* events (purchase, cancelled, churn, payment_failed, etc.)
- All status tags (customer, trial, cancelled, churned, past-due, etc.)
- Subscription attributes (MRR, plan name, billing interval)

Only offer manual tracking if the user explicitly asks for it.

CUSTOM EVENTS (these DO require manual tracking):
- onboarding.completed - User finished setup wizard
- feature.used - User engaged with a key feature
- project.created - User created their first project
- team.invited - User invited a team member
- milestone.reached - User hit a usage milestone
For custom events, provide the tracking code snippet from get_integration_guide.

BUILT-IN TAGS (auto-applied by payment integrations):
- "customer" = PAYING customer with active subscription (use this for upgrade sequences, customer-only content)
- "trial" = Currently on free trial (use for trial conversion sequences)
- "lead" = Signed up but never paid (use for nurture sequences)
- "cancelled" = Cancelled but still has access until period ends (use for win-back sequences)
- "churned" = Subscription ended, no longer paying (use for re-engagement)
- "past-due" = Payment failed, at risk of churning (use for dunning/recovery sequences)
- "refunded" = Received a refund
- "saas.monthly" / "saas.yearly" = Billing interval

BUILT-IN EVENTS (auto-fired by payment integrations):
- saas.purchase, saas.purchase.monthly, saas.purchase.yearly - New subscription
- saas.cancelled - User cancelled (still has access)
- saas.churn - Subscription ended
- saas.payment_failed - Card declined/expired
- saas.upgrade, saas.downgrade - Plan changes
- saas.trial_started, saas.trial_will_end, saas.trial_ended - Trial lifecycle
- saas.refund - Refund issued

OTHER BUILT-IN EVENTS:
- email.opened, email.clicked, email.replied, email.bounced, email.unsubscribed
- contact.subscribed, contact.unsubscribed`,
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the sequence in. If not provided, uses the currently selected company.",
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
            "event_received",
            "inactivity",
            "frequency",
          ],
          description:
            "Trigger type: 'contact_added' (when added to a list), 'tag_added' (when tag is applied), 'event_received' (when custom event fires), 'inactivity' (when subscriber hasn't performed an event for X days), 'frequency' (when subscriber performs event X times in Y days)",
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
        // event_received, inactivity, frequency trigger options
        eventName: {
          type: "string",
          description:
            "Event name to trigger on (required for event_received, inactivity, and frequency triggers)",
        },
        // inactivity trigger options
        inactiveDays: {
          type: "number",
          description:
            "Number of days of inactivity (required for inactivity trigger, must be >= 1)",
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
          description: "Number of emails in the sequence (default: 5)",
        },
        goal: {
          type: "string",
          description:
            "What this sequence should accomplish. Be specific to the app's actual features and user journey. Avoid generic goals that don't match the app's business model.",
        },
      },
      required: ["name", "trigger", "goal"],
    },
  },
  {
    name: "update_sequence",
    description: "Update an existing sequence",
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
        emails: {
          type: "array",
          description: "Updated email steps",
        },
      },
      required: ["sequenceId"],
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
    description: "Disable/pause a sequence",
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
  // ============================================================================
  {
    name: "send_email",
    description: "Send a transactional email to a single recipient",
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
          description: "Recipient email address",
        },
        subject: {
          type: "string",
          description: "Email subject (required if not using templateId)",
        },
        html: {
          type: "string",
          description: "Email HTML content (required if not using templateId)",
        },
        templateId: {
          type: "string",
          description: "Template ID to use (alternative to html)",
        },
        variables: {
          type: "object",
          description: "Variables for template personalization",
        },
      },
      required: ["to"],
    },
  },

  // ============================================================================
  // Analytics
  // ============================================================================
  {
    name: "get_stats",
    description: "Get overview statistics for a time period",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        period: {
          type: "string",
          description: "Time period: 7d, 30d, or 90d (default: 7d)",
        },
      },
    },
  },
  {
    name: "get_campaign_stats",
    description: "Get detailed statistics for a campaign",
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
    name: "get_sequence_stats",
    description: "Get statistics for a sequence",
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
    name: "get_subscriber_activity",
    description: "Get activity timeline for a subscriber",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        email: {
          type: "string",
          description: "Subscriber email address",
        },
      },
      required: ["email"],
    },
  },

  // ============================================================================
  // AI Generation
  // ============================================================================
  {
    name: "generate_email",
    description: "Generate email HTML content from a prompt",
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
      },
      required: ["prompt"],
    },
  },
  {
    name: "generate_sequence",
    description:
      "[DEPRECATED - Use create_sequence instead] Generate a multi-email sequence from a goal. Note: create_sequence now handles AI generation automatically.",
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
        emailCount: {
          type: "number",
          description: "Number of emails in the sequence (default: 5)",
        },
        durationDays: {
          type: "number",
          description: "Total duration in days (default: 14)",
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
];

// Tool call handler
export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  try {
    let result: unknown;

    switch (name) {
      // Account
      case "get_account": {
        const accountData = await apiRequest<Record<string, unknown>>(
          "GET",
          "/api/v1/account"
        );
        // Include the locally selected company ID in the response
        const locallySelectedCompanyId = getSelectedCompanyId();
        result = {
          ...accountData,
          selectedCompanyId:
            locallySelectedCompanyId ?? accountData.currentCompanyId,
        };
        break;
      }

      case "select_company": {
        const companyId = args.companyId as string;
        // Verify the company exists by fetching account info first
        const accountInfo = await apiRequest<{
          success: boolean;
          companies?: Array<{ id: string; name: string }>;
        }>("GET", "/api/v1/account");

        const company = accountInfo.companies?.find((c) => c.id === companyId);
        if (!company) {
          throw new Error(
            `Company not found. Available companies: ${accountInfo.companies?.map((c) => `${c.name} (${c.id})`).join(", ") ?? "none"}`
          );
        }

        setSelectedCompanyId(companyId);
        result = {
          success: true,
          message: `Switched to company: ${company.name}`,
          companyId: company.id,
          companyName: company.name,
        };
        break;
      }

      case "create_company": {
        // Create the company
        const createResult = await apiRequest<{
          success: boolean;
          company: { id: string; name: string; status: string };
          message?: string;
        }>("POST", "/api/v1/companies", {
          name: args.name,
          domain: args.domain,
        });

        if (!createResult.success) {
          throw new Error("Failed to create company");
        }

        const newCompanyId = createResult.company.id;
        const maxPolls = 6; // 6 polls * 20 seconds = 2 minutes max
        let pollCount = 0;
        let finalStatus = createResult.company.status;

        // Poll until processed or max polls reached
        while (finalStatus === "processing" && pollCount < maxPolls) {
          // Wait 20 seconds before polling
          await new Promise((resolve) => setTimeout(resolve, 20000));
          pollCount++;

          const statusResult = await apiRequest<{
            success: boolean;
            company: {
              id: string;
              name: string;
              status: string;
              logoUrl?: string;
            };
          }>("GET", `/api/v1/companies/${newCompanyId}`);

          if (statusResult.success) {
            finalStatus = statusResult.company.status;
          }
        }

        // Auto-select the new company
        setSelectedCompanyId(newCompanyId);

        // Get final company details
        const finalResult = await apiRequest<{
          success: boolean;
          company: {
            id: string;
            name: string;
            status: string;
            websiteUrl?: string;
            logoUrl?: string;
          };
        }>("GET", `/api/v1/companies/${newCompanyId}`);

        result = {
          success: true,
          company: finalResult.company,
          message:
            finalStatus === "processing"
              ? "Company created but still processing. You can continue using it while processing completes."
              : `Company '${finalResult.company.name}' created and ready to use.`,
          autoSelected: true,
        };
        break;
      }

      case "get_company": {
        const companyId = args.companyId as string;
        result = await apiRequest("GET", `/api/v1/companies/${companyId}`);
        break;
      }

      case "create_api_key": {
        const companyId = args.companyId as string;
        result = await apiRequest(
          "POST",
          "/api/v1/api-keys",
          { name: args.name },
          companyId
        );
        break;
      }

      case "list_websites": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/websites",
          undefined,
          companyId
        );
        break;
      }

      case "add_website": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/websites",
          { domain: args.domain },
          companyId
        );
        break;
      }

      case "check_website": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/websites/${args.domain}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_integration_guide":
        result = await apiRequest("POST", "/api/v1/integration-guide", args);
        break;

      // Subscribers
      case "add_subscriber": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/subscribers",
          args,
          companyId
        );
        break;
      }

      case "update_subscriber": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "PUT",
          `/api/v1/subscribers/${args.email}`,
          args,
          companyId
        );
        break;
      }

      case "remove_subscriber": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "DELETE",
          `/api/v1/subscribers/${args.email}`,
          args,
          companyId
        );
        break;
      }

      case "get_subscriber": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/subscribers/${args.email}`,
          undefined,
          companyId
        );
        break;
      }

      case "search_subscribers": {
        const companyId = args.companyId as string | undefined;
        const searchParams = new URLSearchParams();
        if (args.query) searchParams.set("query", String(args.query));
        if (args.tags)
          searchParams.set("tags", (args.tags as string[]).join(","));
        if (args.segmentId)
          searchParams.set("segmentId", String(args.segmentId));
        if (args.limit) searchParams.set("limit", String(args.limit));
        result = await apiRequest(
          "GET",
          `/api/v1/subscribers?${searchParams}`,
          undefined,
          companyId
        );
        break;
      }

      // Tags, Lists, Segments
      case "list_tags": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("GET", "/api/v1/tags", undefined, companyId);
        break;
      }

      case "list_lists": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("GET", "/api/v1/lists", undefined, companyId);
        break;
      }

      case "create_list": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("POST", "/api/v1/lists", args, companyId);
        break;
      }

      case "list_segments": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/segments",
          undefined,
          companyId
        );
        break;
      }

      case "create_segment": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("POST", "/api/v1/segments", args, companyId);
        break;
      }

      case "get_segment_count": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/segments/${args.segmentId}/count`,
          undefined,
          companyId
        );
        break;
      }

      // Templates
      case "list_templates": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/templates",
          undefined,
          companyId
        );
        break;
      }

      case "get_template": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/templates/${args.templateId}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_template": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("POST", "/api/v1/templates", args, companyId);
        break;
      }

      case "update_template": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "PUT",
          `/api/v1/templates/${args.templateId}`,
          args,
          companyId
        );
        break;
      }

      case "delete_template": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "DELETE",
          `/api/v1/templates/${args.templateId}`,
          undefined,
          companyId
        );
        break;
      }

      // Campaigns
      case "list_campaigns": {
        const companyId = args.companyId as string | undefined;
        const campaignParams = new URLSearchParams();
        if (args.status) campaignParams.set("status", String(args.status));
        result = await apiRequest(
          "GET",
          `/api/v1/campaigns?${campaignParams}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_campaign": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/campaigns/${args.campaignId}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_campaign": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest("POST", "/api/v1/campaigns", args, companyId);
        break;
      }

      case "update_campaign": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "PUT",
          `/api/v1/campaigns/${args.campaignId}`,
          args,
          companyId
        );
        break;
      }

      case "send_test_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          `/api/v1/campaigns/${args.campaignId}/test`,
          { to: args.to },
          companyId
        );
        break;
      }

      // Sequences
      case "list_sequences": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          "/api/v1/sequences",
          undefined,
          companyId
        );
        break;
      }

      case "get_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/sequences/${args.sequenceId}`,
          undefined,
          companyId
        );
        break;
      }

      case "create_sequence": {
        const companyId = args.companyId as string | undefined;
        // Create the sequence - this queues AI enrichment
        const createSeqResult = await apiRequest<{
          success: boolean;
          sequence: {
            id: string;
            name: string;
            status: string;
            trigger: string;
            emailCount: number;
            enrichmentStatus: string;
          };
          message: string;
        }>("POST", "/api/v1/sequences", args, companyId);

        if (!createSeqResult.success) {
          result = createSeqResult;
          break;
        }

        const sequenceId = createSeqResult.sequence.id;

        // Poll for enrichment completion (20 second intervals, max 6 polls = 2 minutes)
        const maxPolls = 6;
        let pollCount = 0;
        let enrichmentStatus = "pending";

        while (enrichmentStatus !== "complete" && pollCount < maxPolls) {
          // Wait 20 seconds before polling
          await new Promise((resolve) => setTimeout(resolve, 20000));
          pollCount++;

          const statusResult = await apiRequest<{
            success: boolean;
            sequence: {
              id: string;
              name: string;
              status: string;
              enrichmentStatus: string;
              emailCount: number;
              enrichedCount: number;
            };
          }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

          if (statusResult.success) {
            enrichmentStatus = statusResult.sequence.enrichmentStatus;
          }
        }

        // Return final status
        const finalResult = await apiRequest<{
          success: boolean;
          sequence: {
            id: string;
            name: string;
            status: string;
            enrichmentStatus: string;
            emailCount: number;
            enrichedCount: number;
            nodes: unknown[];
          };
        }>("GET", `/api/v1/sequences/${sequenceId}`, undefined, companyId);

        if (finalResult.success) {
          result = {
            success: true,
            sequence: finalResult.sequence,
            message:
              finalResult.sequence.enrichmentStatus === "complete"
                ? `Sequence "${finalResult.sequence.name}" created with ${finalResult.sequence.emailCount} AI-generated emails. The sequence is ready to review and enable.`
                : `Sequence "${finalResult.sequence.name}" created. Email enrichment is still in progress (${finalResult.sequence.enrichedCount}/${finalResult.sequence.emailCount} emails generated). You can check status with get_sequence.`,
          };
        } else {
          result = finalResult;
        }
        break;
      }

      case "update_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "PUT",
          `/api/v1/sequences/${args.sequenceId}`,
          args,
          companyId
        );
        break;
      }

      case "enable_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          `/api/v1/sequences/${args.sequenceId}/enable`,
          undefined,
          companyId
        );
        break;
      }

      case "disable_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          `/api/v1/sequences/${args.sequenceId}/disable`,
          undefined,
          companyId
        );
        break;
      }

      case "delete_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "DELETE",
          `/api/v1/sequences/${args.sequenceId}`,
          undefined,
          companyId
        );
        break;
      }

      // Transactional
      case "send_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/transactional/send",
          args,
          companyId
        );
        break;
      }

      // Analytics
      case "get_stats": {
        const companyId = args.companyId as string | undefined;
        const period = args.period ?? "7d";
        result = await apiRequest(
          "GET",
          `/api/v1/stats?period=${period}`,
          undefined,
          companyId
        );
        break;
      }

      case "get_campaign_stats": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/campaigns/${args.campaignId}/stats`,
          undefined,
          companyId
        );
        break;
      }

      case "get_sequence_stats": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/sequences/${args.sequenceId}/stats`,
          undefined,
          companyId
        );
        break;
      }

      case "get_subscriber_activity": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "GET",
          `/api/v1/subscribers/${args.email}/activity`,
          undefined,
          companyId
        );
        break;
      }

      // AI Generation
      case "generate_email": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/generate/email",
          args,
          companyId
        );
        break;
      }

      case "generate_sequence": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/generate/sequence",
          args,
          companyId
        );
        break;
      }

      case "generate_subject_lines": {
        const companyId = args.companyId as string | undefined;
        result = await apiRequest(
          "POST",
          "/api/v1/generate/subjects",
          args,
          companyId
        );
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}
