import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const accountToolDefinitions: Tool[] = [
  // ============================================================================
  // Account & Setup
  // ============================================================================
  {
    name: "get_account",
    description: `Get current account information including available companies, the current API key's permission scopes, and the API Keys management URL. Call this after a missing-scope error to inspect access and find the replacement-key settings. IMPORTANT: If you have access to multiple companies, you MUST either:
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
    name: "get_app_urls",
    description:
      "Generate Sequenzy dashboard URLs for known resource IDs. Use this when the user asks where to review or edit a generated sequence, campaign, template, or company settings. If companyId is omitted, the selected/current company is used when available.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If omitted, uses the selected/current company when available.",
        },
        campaignId: {
          type: "string",
          description: "Campaign ID for the campaign editor URL.",
        },
        landingPageId: {
          type: "string",
          description: "Landing page ID for the landing page editor URL.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID for the sequence editor URL.",
        },
        templateId: {
          type: "string",
          description: "Template/email ID for the email editor URL.",
        },
        emailId: {
          type: "string",
          description: "Email ID for the email editor URL.",
        },
        transactionalId: {
          type: "string",
          description: "Transactional email ID.",
        },
        emailSendId: {
          type: "string",
          description: "Email send ID for the sent email detail URL.",
        },
        domainId: {
          type: "string",
          description: "Sending domain ID.",
        },
        status: {
          type: "string",
          description: "Status for campaign/sequence list URLs.",
        },
        settingsTab: {
          type: "string",
          description:
            "Settings tab slug, e.g. integrations, domain, tracking, api-keys, team.",
        },
      },
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
    description:
      "Get company details, processing status, product info, brand colors, AI writing context, reply-tracking settings, and effective email localization settings",
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
    name: "update_company",
    description:
      "Edit company product info, brand context, the default email theme, reply-tracking settings, and account-wide sending identity defaults. fromEmail must use a verified sending domain; replyTo may be any valid mailbox. Missing sender/reply profiles are created automatically. Send fromName/replyToName on their own to rename the display name of the existing default profile without changing its address, or pair them with senderProfileId/replyProfileId (from list_sender_profiles) to rename a specific profile. Provide at least one editable field. Profile, branding, and AI-context fields need the company_profile:manage scope; the sending identity and reply-tracking fields additionally need companies:manage.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If omitted, uses the selected/current company when available.",
        },
        name: {
          type: "string",
          description: "Company display name.",
        },
        description: {
          type: "string",
          description:
            "Short product or company summary for AI writing context.",
        },
        logoUrl: {
          type: "string",
          description: "Public logo URL.",
        },
        founderName: {
          type: "string",
          description: "Founder or sender name for personal email signatures.",
        },
        primaryColor: {
          type: "string",
          description:
            "Primary brand color as a 6-digit hex value, e.g. #f97316.",
        },
        brandColors: {
          type: "object",
          description:
            "Stored brand color object. Prefer primaryColor for the main color.",
          additionalProperties: true,
        },
        valueProps: {
          type: "array",
          description:
            "Value propositions, usually objects with title and description.",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        testimonials: {
          type: "array",
          description:
            "Testimonials, usually objects with quote/text and author.",
          items: {
            type: "object",
            additionalProperties: true,
          },
        },
        toneVoice: {
          type: "string",
          description: "Tone of voice guidance for AI-written content.",
        },
        companyContext: {
          type: "string",
          description:
            "Basic product/company knowledge AI should use when writing emails.",
        },
        emailLengthPreference: {
          type: "string",
          description:
            "Email length preference: concise, balanced, or detailed. New workspaces default to concise.",
        },
        socialLinks: {
          type: "object",
          description: "Social profile URLs keyed by platform.",
          additionalProperties: {
            type: "string",
          },
        },
        privacyPolicyUrl: {
          type: "string",
          description: "Privacy policy URL.",
        },
        termsUrl: {
          type: "string",
          description: "Terms of service URL.",
        },
        address: {
          type: "string",
          description: "Physical mailing address for email footers.",
        },
        language: {
          type: "string",
          description: "Primary language code, e.g. en, es, de.",
        },
        pricing: {
          type: "object",
          description: "Pricing information used as product context.",
          additionalProperties: true,
        },
        fontFamily: {
          type: "string",
          description: "Default email font family stack.",
        },
        emailTheme: {
          type: ["object", "null"],
          description:
            "Default email theme applied to campaigns, sequences, and transactional email. Partial update: omitted fields keep their current value (or the preset default). Pass null to reset to the platform default theme. Numeric values are clamped to supported ranges.",
          properties: {
            presetId: {
              type: "string",
              description:
                "Theme preset to base the theme on: default, soft, editorial, or bold.",
            },
            colors: {
              type: "object",
              description: "6-digit hex colors.",
              properties: {
                primary: { type: "string" },
                background: { type: "string" },
                surface: { type: "string" },
                text: { type: "string" },
                mutedText: { type: "string" },
                heading: { type: "string" },
                border: { type: "string" },
                link: { type: "string" },
              },
              additionalProperties: false,
            },
            typography: {
              type: "object",
              description: "Numeric type settings.",
              properties: {
                baseFontSize: { type: "number" },
                leadFontSize: { type: "number" },
                baseLineHeight: { type: "number" },
                heading1Size: { type: "number" },
                heading2Size: { type: "number" },
                heading3Size: { type: "number" },
                buttonFontSize: { type: "number" },
              },
              additionalProperties: false,
            },
            layout: {
              type: "object",
              description: "Numeric layout settings.",
              properties: {
                contentWidth: { type: "number" },
                containerPaddingX: { type: "number" },
                containerPaddingY: { type: "number" },
                blockSpacing: { type: "number" },
                baseRadius: { type: "number" },
                sectionPadding: { type: "number" },
                buttonPaddingX: { type: "number" },
                buttonPaddingY: { type: "number" },
                borderedBlockPadding: { type: "number" },
              },
              additionalProperties: false,
            },
          },
          additionalProperties: false,
        },
        emailDirection: {
          type: "string",
          description: "Default email text direction: ltr or rtl.",
        },
        senderProfileId: {
          type: "string",
          description:
            "Make this existing sender profile the account-wide default, and the one fromName renames. Get IDs from list_sender_profiles. Mutually exclusive with fromEmail.",
        },
        fromEmail: {
          type: "string",
          description:
            "Set the account-wide default From address. Its domain must already be configured and verified.",
        },
        fromName: {
          type: "string",
          description:
            "Display name of the default From profile. Sent alone it renames the current default profile; with senderProfileId it renames that profile; with fromEmail it names the profile for that address. If the address already has several display names, pass senderProfileId to say which one to rename.",
        },
        replyProfileId: {
          type: "string",
          description:
            "Make this existing reply profile the account-wide default, and the one replyToName renames. Get IDs from list_sender_profiles. Mutually exclusive with replyTo.",
        },
        replyTo: {
          type: "string",
          description:
            "Set the account-wide default Reply-To address. Creates a reply profile when needed.",
        },
        replyToName: {
          type: "string",
          description:
            "Display name of the default Reply-To profile. Sent alone it renames the current default profile; with replyProfileId it renames that profile; with replyTo it names the profile for that address.",
        },
        replyTrackingEnabled: {
          type: "boolean",
          description:
            "Enable or disable inbound reply capture for this company.",
        },
        replyTrackingDomainMode: {
          type: "string",
          description:
            "Reply-tracking domain mode: sequenzy for the managed domain or custom for a configured custom domain.",
        },
        forwardReplies: {
          type: "boolean",
          description:
            "Enable or disable forwarding captured replies to the configured mailbox.",
        },
      },
    },
  },
  {
    name: "get_shopify_automation_settings",
    description:
      "Get the connected Shopify store's automation settings: browse abandonment (emails shoppers who viewed a product but didn't buy), cart abandonment (fires ecommerce.cart_abandoned with the full cart after the cart sits inactive), and price drop alerts (emails recent viewers when a product's price falls). Returns the effective values with platform defaults applied.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_shopify_automation_settings",
    description:
      "Update the connected Shopify store's browse-abandonment, cart-abandonment, and/or price-drop automation settings. Partial update: omitted sections are untouched, omitted fields within a section keep their current value, and passing null for a section resets it to the platform defaults (browse abandonment: on, 2h delay, 24h cooldown; cart abandonment: on, 1h inactivity, 24h cooldown; price drop: on, 5% minimum drop, 30-day viewer lookback, 7-day cooldown).",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        browseAbandonment: {
          type: ["object", "null"],
          description:
            "Browse abandonment settings, or null to reset to defaults.",
          properties: {
            enabled: { type: "boolean" },
            delayHours: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 168,
              description:
                "Hours to wait after a product view before checking for abandonment (default 2).",
            },
            cooldownHours: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 720,
              description:
                "Minimum hours between browse-abandoned events per subscriber (default 24).",
            },
          },
          additionalProperties: false,
        },
        cartAbandonment: {
          type: ["object", "null"],
          description:
            "Cart abandonment settings, or null to reset to defaults.",
          properties: {
            enabled: { type: "boolean" },
            delayHours: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 168,
              description:
                "Hours of cart inactivity before the cart counts as abandoned (default 1).",
            },
            cooldownHours: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 720,
              description:
                "Minimum hours between cart-abandoned events per subscriber (default 24).",
            },
          },
          additionalProperties: false,
        },
        priceDrop: {
          type: ["object", "null"],
          description: "Price drop settings, or null to reset to defaults.",
          properties: {
            enabled: { type: "boolean" },
            minPercent: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 95,
              description:
                "Minimum price decrease percent to alert on (default 5).",
            },
            lookbackDays: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 90,
              description:
                "How many days back product viewers qualify as the audience (default 30).",
            },
            cooldownDays: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 90,
              description:
                "Minimum days between price-drop events per subscriber and product (default 7).",
            },
          },
          additionalProperties: false,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_sync_rules",
    description:
      "Get the company's sync rules: the automatic tag changes applied when events fire (e.g. order placed -> add a tag). New companies start with no rules. Returns the effective rules plus isDefault, which is true when the company has explicitly opted into the inherited SaaS/ecommerce platform preset.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "update_sync_rules",
    description:
      "Replace the company's sync rules. Pass the FULL rule set (fetch with get_sync_rules first and edit it - this is not a partial update), [] to disable rules, or null to opt into the inherited SaaS/ecommerce platform preset. Each rule: { triggerEvent, actions: { addTags, removeTags }, conditions? }. Conditions support requiresTags, requiresNotTags, and purchasedProduct ({ tags?, collectionIds?, productTypes?, vendors? }) which matches products on commerce events - e.g. tag buyers of products carrying a given product tag.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        syncRules: {
          type: ["array", "null"],
          description:
            "Full replacement rule set. Use [] to disable sync rules, or null to opt into the inherited SaaS/ecommerce platform preset.",
          items: {
            type: "object",
            properties: {
              triggerEvent: {
                type: "string",
                description:
                  "Event name that triggers the rule, e.g. ecommerce.order_placed or saas.purchase.",
              },
              actions: {
                type: "object",
                properties: {
                  addTags: { type: "array", items: { type: "string" } },
                  removeTags: { type: "array", items: { type: "string" } },
                },
                required: ["addTags", "removeTags"],
                additionalProperties: false,
              },
              conditions: {
                type: "object",
                properties: {
                  requiresTags: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Rule only applies if the subscriber has ALL of these tags.",
                  },
                  requiresNotTags: {
                    type: "array",
                    items: { type: "string" },
                    description:
                      "Rule only applies if the subscriber has NONE of these tags.",
                  },
                  purchasedProduct: {
                    type: "object",
                    description:
                      "For commerce events with product context: rule only applies when a product on the event matches every specified selector.",
                    properties: {
                      tags: { type: "array", items: { type: "string" } },
                      collectionIds: {
                        type: "array",
                        items: { type: "string" },
                      },
                      productTypes: {
                        type: "array",
                        items: { type: "string" },
                      },
                      vendors: { type: "array", items: { type: "string" } },
                    },
                    additionalProperties: false,
                  },
                },
                additionalProperties: false,
              },
            },
            required: ["triggerEvent", "actions"],
            additionalProperties: false,
          },
        },
      },
      required: ["syncRules"],
      additionalProperties: false,
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
        preset: {
          type: "string",
          description:
            "Optional permission preset. Supported values: full_access, read_only, agent_safe, ai_drafting, data_ingest_safe, data_ingest_automations, transactional_sender, marketing_sender. Defaults to full_access when both preset and scopes are omitted; prefer agent_safe when creating a key for an AI agent.",
        },
        scopes: {
          type: "array",
          description:
            "Optional explicit API key permission scopes. If provided, this overrides preset and must include at least one supported scope.",
          items: {
            type: "string",
          },
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "list_api_keys",
    description:
      "List company-scoped API keys as non-secret metadata. Returns IDs, names, prefixes, permissions, usage timestamps, and whether each key is the active credential. It never returns a plain key or stored key hash. Use this before revoke_api_key or delete_api_key to identify the exact unused key.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID whose API keys should be listed",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "update_api_key",
    description:
      "Rename a company-scoped API key or replace its permissions in place, without issuing a new key. Use this when a call fails with a missing-scope error: the key value stays the same, so no client has to be re-wired, and added permissions apply on the next retry. Removed permissions may remain usable for up to five minutes while API caches expire. preset and scopes REPLACE the current selection rather than merging into it - call list_api_keys first and pass the full set you want. Returns non-secret metadata only.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID that owns the API key",
        },
        apiKeyId: {
          type: "string",
          description: "Exact API key ID returned by list_api_keys",
        },
        name: {
          type: "string",
          description: "New human-readable name for the key",
        },
        preset: {
          type: "string",
          description:
            "Replacement permission preset. Supported values: full_access, read_only, agent_safe, ai_drafting, data_ingest_safe, data_ingest_automations, transactional_sender, marketing_sender.",
        },
        scopes: {
          type: "array",
          description:
            "Replacement explicit permission scopes. Overrides preset and must include at least one supported scope.",
          items: {
            type: "string",
          },
        },
      },
      required: ["companyId", "apiKeyId"],
    },
  },
  {
    name: "revoke_api_key",
    description:
      "Permanently revoke a company-scoped API key by ID. The response contains non-secret metadata only. Call list_api_keys first and compare the ID, name, prefix, and isCurrent flag because revoking a key cannot be undone and may invalidate the active credential.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID that owns the API key",
        },
        apiKeyId: {
          type: "string",
          description: "Exact API key ID returned by list_api_keys",
        },
      },
      required: ["companyId", "apiKeyId"],
    },
  },
  {
    name: "delete_api_key",
    description:
      "Compatibility alias for revoke_api_key. Permanently delete a company-scoped API key by ID and return non-secret metadata only. Call list_api_keys first to verify the exact target.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description: "Company ID that owns the API key",
        },
        apiKeyId: {
          type: "string",
          description: "Exact API key ID returned by list_api_keys",
        },
      },
      required: ["companyId", "apiKeyId"],
    },
  },
  {
    name: "list_websites",
    description:
      "List configured sending domains with separate DNS verification, selected home-transport readiness, and SPF, DKIM, and MAIL FROM status",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        label: {
          type: "string",
          description:
            "Optional label name filter. Only templates assigned this label are returned.",
        },
      },
    },
  },
  {
    name: "add_sending_domain",
    description:
      "Add and configure a sending domain. Publish every cohort-specific DNS record returned, including DMARC when present, before calling verify_sending_domain.",
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
          description: "Sending domain to add (for example, mail.example.com).",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "add_website",
    description:
      "Compatibility alias for add_sending_domain. Adds a sending domain and returns the DNS records required for setup.",
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
    description:
      "Read a sending domain's separate DNS verification, selected home-transport readiness, and SPF, DKIM, MAIL FROM diagnostics. Use verify_sending_domain to run a fresh DNS check.",
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
    name: "verify_sending_domain",
    description:
      "Run a fresh DNS check for a configured sending domain and return DNS verification separately from selected home-transport readiness. A DNS-verified domain may still be activating in SES.",
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
          description: "Configured sending domain to verify.",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "list_integrations",
    description:
      "List connected integrations (Stripe, Shopify, Supabase, Clerk, WooCommerce, ad platforms, and so on) with connection status, sync state, last sync time, and last sync error. Read-only: credentials, access tokens, and webhook secrets are never returned. Use this to audit which external systems feed this account and whether their syncs are healthy.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        includeInactive: {
          type: "boolean",
          description:
            "Include disconnected/inactive integrations. Defaults to false (active only).",
        },
      },
    },
  },
  {
    name: "list_sender_profiles",
    description:
      "List sender (From) profiles and reply-to profiles for the company, including which are the account defaults and whether each sender address has verified DNS plus a ready home transport. Use this to audit sending identity before scheduling, or to pick a valid senderProfileId/replyProfileId for create_campaign or update_campaign.",
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
    name: "update_sender_profile",
    description:
      "Rename one sender (From) or reply-to profile in place, without changing which profile is the account default. Use this to standardize a display name across the several identities a mailbox may carry, e.g. renaming 'Viraj from SnapCount' to 'SnapCount'. Get IDs from list_sender_profiles. Only the display name changes: the address, its sending domain, and the account-wide default From/Reply-To selection are untouched, and existing campaigns and sequences pinned to this profile pick up the new name. To change which profile is the default instead, use update_company with senderProfileId/replyProfileId. A company cannot have two sender identities with the same name on one address, so a colliding rename is rejected and reports the ID already using that name. Requires the companies:manage scope.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description:
            "ID of the profile to rename, from list_sender_profiles. Sender profile IDs come from senderProfiles, reply-to IDs from replyProfiles.",
        },
        name: {
          type: "string",
          description:
            "New display name, e.g. 'SnapCount'. Trimmed; must be non-empty and 255 characters or fewer.",
        },
        type: {
          type: "string",
          enum: ["sender", "reply"],
          description:
            "Which list profileId came from. Defaults to sender. Pass reply to rename a reply-to profile.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["profileId", "name"],
    },
  },
  {
    name: "get_sending_status",
    description: `Check whether company-level email sending is active, paused, or suspended, and what it takes to restore it. Call this FIRST whenever a send, test send, or sequence step fails for a reason that is not a validation error, and whenever the account reports a bounce or complaint rate problem.

Returns the pause reason and reason kind, when it was paused, the automated sender-health review state, whether the one-click resume is currently available (and if not, which gate is blocking it), the enforcement counts and thresholds for permanent bounces, temporary bounces, and complaints, and ordered remediation steps.

IMPORTANT - there is no rolling window and no expiry. Enforcement uses all-time totals counted from a reset watermark, so a paused rate does NOT decay over time. Waiting does not restore sending. The rate only changes as real (non-test) sends accumulate or when a resume moves the watermark. Read \`metricsWindow\` for the exact watermark timestamps rather than telling the user to wait it out.

Requires the account:read scope, so a read-only key can diagnose a blocked account. Use resume_sending once the underlying problem is fixed.`,
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
    name: "resume_sending",
    description: `Request that paused company-level sending be restored after fixing the cause. This is the supported remediation path for an account paused by the permanent-bounce rate limit - it is not a bypass and it never removes suppressions.

Only proceed when the bad source is actually fixed (import, form, or integration) and permanent bounces remain suppressed. Call get_sending_status first: resume only succeeds when \`selfResume.canSelfResume\` is true, which requires a hard-bounce pause reason, a cleared automated sender-health review, and no admin block. Any other state needs a support review, and the error tells you which one.

You MUST pass listSanitizationConfirmed: true, and you should only pass it after the user has confirmed the remediation - it is recorded on the account's audit trail as their statement that the list is clean. On success, sending is restored, the bounce watermark resets so the rate is recalculated from later sends, and the service attempts to requeue paused campaigns plus due sequence steps. Relay the response message: it contains support guidance if part of that queue handoff is temporarily unavailable.

Requires the companies:manage scope and owner or admin access to the company.`,
    inputSchema: {
      type: "object",
      properties: {
        listSanitizationConfirmed: {
          type: "boolean",
          description:
            "Must be true. Confirms the user has fixed the source of the invalid addresses and left every permanent bounce suppressed. Recorded on the account audit trail.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["listSanitizationConfirmed"],
    },
  },
  {
    name: "get_tracking_settings",
    description:
      "Get the company's email tracking and signup consent configuration: open/click/unsubscribe tracking flags, opt-in strict bot filtering, default attribution window, automatic UTM tagging, the dedicated click-tracking domain and its verification status, inbound reply-tracking settings, and whether double opt-in is required for new contacts. Use this to audit measurement readiness, to explain why opens or clicks may not be recorded, and to check how contacts enter the list before investigating bot or alias signups.",
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
    name: "update_tracking_settings",
    description:
      "Update the company's account-wide email tracking defaults: open, click, and unsubscribe tracking, opt-in strict bot filtering, the default attribution window, and automatic UTM tagging, plus the account-wide double opt-in requirement for new contacts. Applies to every campaign, sequence, and transactional email sent afterwards; already-sent emails keep the links they were rendered with. Provide at least one field. Reply tracking (inbound email, reply domain mode, reply forwarding) is on update_company, and the dedicated click-tracking domain is configured in the dashboard.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        openTrackingEnabled: {
          type: "boolean",
          description:
            "Whether to embed the open-tracking pixel. Turning this off also stops open rates from being recorded.",
        },
        clickTrackingEnabled: {
          type: "boolean",
          description:
            "Whether to rewrite links through the click-tracking redirect. Turning this off stops click rates and click-based automation triggers.",
        },
        strictBotFilteringEnabled: {
          type: "boolean",
          description:
            "Opt in to aggressive bot detection: strict user-agent patterns, datacenter-IP classification, and cross-send IP sweeps. Off by default because it can also discard real engagement, lowering reported open and click rates. Enable it when the audience sits behind email-security appliances that inflate engagement.",
        },
        unsubscribeTrackingEnabled: {
          type: "boolean",
          description:
            "Whether unsubscribe links are attributed to the email that produced them. Unsubscribe links keep working either way.",
        },
        defaultAttributionWindowHours: {
          type: "number",
          description:
            "Default revenue attribution window in hours (1-720). Used by goals and revenue reporting when no per-goal window is set.",
        },
        doubleOptInEnabled: {
          type: "boolean",
          description:
            "Require email confirmation before a new contact becomes subscribed. When on, contacts added by forms, the API, and integrations start pending and receive a confirmation email; they only become active after clicking it, and they are never sent marketing email while pending. This is the account-wide default that the per-write optInMode on add_subscriber overrides. Use it to stop bot and alias signups from landing in the list as active contacts. Enabling it requires a sender profile and provisions the confirmation email automatically if the account has none; it does not retroactively unsubscribe existing active contacts.",
        },
        autoUtmEnabled: {
          type: "boolean",
          description:
            "Whether to append UTM parameters to outgoing links automatically. Enabling this with no stored parameters seeds the platform defaults.",
        },
        autoUtmSettings: {
          type: ["object", "null"],
          description:
            "UTM templates to merge over the stored ones: source, medium, campaign, content, term. Values support placeholders such as {{email.subject}} and {{link.text}}. Pass null for a single parameter to stop emitting it, or null for the whole object to reset every parameter to the defaults.",
          properties: {
            source: { type: ["string", "null"] },
            medium: { type: ["string", "null"] },
            campaign: { type: ["string", "null"] },
            content: { type: ["string", "null"] },
            term: { type: ["string", "null"] },
          },
        },
      },
    },
  },
  {
    name: "get_notification_preferences",
    description:
      "Get the account notification settings for the API key's own user in this company: whether Sequenzy emails them when a new subscriber joins and when a campaign finishes sending, and whether each arrives per-occurrence or as a daily summary. Returns the supported modes and platform defaults alongside the current values. These are per-person settings - this never reads a teammate's preferences.",
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
    name: "update_notification_preferences",
    description:
      "Change which account notifications Sequenzy emails the API key's own user for this company. Requires the companies:manage scope. Useful before a bulk import or a large migration, when per-signup notifications would otherwise flood the inbox. Modes are 'off', 'instant' (one email per occurrence), and 'daily' (one summary per day); 'daily' is only valid for new_subscriber, because a campaign finishes once. New-subscriber notifications already fall back to a daily summary automatically on high-volume days, and imports never trigger them at all.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        notificationPreferences: {
          type: "array",
          description:
            "Preferences to set. Events not listed keep their current value.",
          items: {
            type: "object",
            properties: {
              event: {
                type: "string",
                enum: ["new_subscriber", "campaign_completed"],
                description: "Which notification to configure.",
              },
              mode: {
                type: "string",
                enum: ["off", "instant", "daily"],
                description:
                  "How to receive it. 'daily' is not supported for campaign_completed.",
              },
            },
            required: ["event", "mode"],
          },
        },
      },
      required: ["notificationPreferences"],
    },
  },
  {
    name: "get_integration_guide",
    description: `Get code examples for integrating Sequenzy into your project.

CRITICAL - FOR SAAS/SUBSCRIPTION APPS:
If the app uses Stripe, Polar, Paddle, Dodo, or Creem - tell the user to connect it in Sequenzy dashboard (Settings → Integrations).
The native integration automatically handles all payment events and customer tags - no code needed!

CRITICAL - FOR E-COMMERCE STORES:
If the store runs on Shopify or WooCommerce - tell the user to connect the native integration in the dashboard instead (it syncs products, orders, and customers automatically).
For any other e-commerce stack (custom checkouts, CheckoutChamp, Sticky.io, headless storefronts), use the 'ecommerce' use case to integrate via the Commerce API.

Only provide manual event tracking code if the user explicitly asks for it.

Use cases:
- 'transactional': Sending one-off emails (welcome, password reset, receipts)
- 'subscribe_form': Adding subscribers from signup forms
- 'event_tracking': Tracking CUSTOM events only (not payment events - those come from the integration)
- 'ecommerce': Connecting a custom e-commerce platform via the Commerce API (sync products, push orders/checkouts, power abandoned cart + back-in-stock automations)

Before protected server-side API work, use create_api_key and save the key to .env as SEQUENZY_API_KEY. Static-site saved forms are the exception: use list_forms/create_form/get_form_embed and never place a secret key in browser code.`,
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
            "Use case: 'transactional' (sending emails), 'subscribe_form' (adding subscribers), 'event_tracking' (tracking CUSTOM events only - payment events should come from Stripe/Polar/etc integration), 'ecommerce' (connecting a custom e-commerce platform via the Commerce API)",
        },
      },
    },
  },
];
