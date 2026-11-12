import type { Tool } from "../../mcp-types.js";
import {
  campaignStoNotCompanyOrSequenceHint,
  emailThemePatchProperties,
} from "../internal.js";

export const accountToolDefinitions: Tool[] = [
  // ============================================================================
  // Account & Setup
  // ============================================================================
  {
    name: "get_account",
    description: `Get your own Sequenzy account information (not your customers' B2B accounts; use list_accounts for those) including available companies, the current API key's permission scopes, and the API Keys management URL. Useful after a missing-scope error to inspect access and find the replacement-key settings. When the key has access to multiple companies, other tools need a target company: either one selected with select_company or a companyId passed in each call.

The response shows 'companies' (all available) and 'selectedCompanyId' (currently active). Subsequent operations use the selected company unless a companyId override is passed.`,
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
      "Generate Sequenzy dashboard URLs for known resource IDs. Use this when the user asks where to review or edit a generated sequence, campaign, template, company settings, or subscription. The response always includes the canonical owner-facing subscription URL when a company is resolved. For compatibility, settingsTab billing or subscription also resolves to that Account page rather than a nonexistent Settings tab. If companyId is omitted, the selected/current company is used when available.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Workspace the URLs point into, from get_account's companies list. Omit to use the selected company.",
        },
        campaignId: {
          type: "string",
          description:
            "Campaign ID from list_campaigns or create_campaign. Adds campaign (editor) and campaignPreview (review step) URLs.",
        },
        landingPageId: {
          type: "string",
          description:
            "Landing page ID from the landing page tools. Adds the landingPage editor URL.",
        },
        sequenceId: {
          type: "string",
          description:
            "Sequence ID from list_sequences or a sequence create tool. Adds the sequence editor URL.",
        },
        templateId: {
          type: "string",
          description:
            "Template ID from list_templates. Same as emailId (templates are saved emails); adds the email and template editor URLs. emailId wins when both are sent.",
        },
        emailId: {
          type: "string",
          description:
            "Saved email ID, such as a template ID or a sequence step's emailId from get_sequence. Adds the email and template editor URLs.",
        },
        transactionalId: {
          type: "string",
          description:
            "Transactional email ID from list_transactional_emails. Adds the transactionalEmail page URL, where its content, stats and sends are managed.",
        },
        emailSendId: {
          type: "string",
          description: "Email send ID for the sent email detail URL.",
        },
        domainId: {
          type: "string",
          description:
            "Sending domain ID from list_sending_domains. Adds domain (settings) and domainVerify (DNS check) URLs.",
        },
        status: {
          type: "string",
          description:
            "Dashboard list status, such as draft, scheduled or sent for campaigns and draft, active, paused or archived for sequences. Adds campaignList and sequenceList URLs that open those lists filtered to it.",
        },
        settingsTab: {
          type: "string",
          description:
            "Settings tab slug, e.g. integrations, domain, tracking, api-keys, team. The billing and subscription aliases return the canonical Account -> Subscription page.",
        },
      },
    },
  },
  {
    name: "create_company",
    description:
      "Create a company with a website domain, or set noWebsite and provide a name. Optionally provide a business description and create a four-email welcome sequence. Requires a personal account key (seq_user_...); company-scoped keys cannot create another workspace. Website creation queues brand processing and this tool polls for completion.",
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
          description:
            "Website domain (e.g., example.com). Required unless noWebsite is true.",
        },
        noWebsite: {
          type: "boolean",
          description:
            "Set true to create without a website; requires name when domain is omitted.",
        },
        description: {
          type: "string",
          description:
            "Optional business description (up to 500 characters). With a domain, website processing may replace it with the site's own description.",
        },
        withWelcomeSequence: {
          type: "boolean",
          description:
            "Set true to create and queue generation of a four-email welcome sequence. Defaults to false.",
        },
        websiteType: {
          type: "string",
          enum: [
            "saas",
            "content",
            "ecommerce",
            "offline",
            "mobile_app",
            "other",
          ],
          description:
            "Company category, recorded as the user's choice. mobile_app is for iOS/Android apps (typically with RevenueCat, Superwall or Adapty): it recommends push-first mobile journeys from list_sequence_templates. Omit to let website processing detect it.",
        },
      },
    },
  },
  {
    name: "get_company",
    description: `Read one company's settings and status: processing status, product info, brand colors, AI writing context, emailStylePreference (visual, plain, or null when not chosen), websiteType (saas, content, ecommerce, offline, mobile_app, other or null) with websiteTypeSource (user when chosen, detected from the website), header and footer (emailPreset), footerStyle for new AI-designed emails (auto, classic, mono, band or editorial), footerTheme (the auto-added footer's resolved colors and copy; change it with update_company footerTheme), reply-tracking settings, effective email localization settings, and darkModeLogoStatus (pending, outlined, not_needed or custom) with darkModeLogoUrl, the logo dark-mode inboxes show (set your own with update_company darkModeLogoUrl). The read-only emailBranding says whether "Sent with Sequenzy" is visible, whether the owner subscription removes it, why, the tier/status, the upgrade or renewal action, and subscriptionUrl. Branding is added at send time, so a paid entitlement removes it from existing live sequences without editing their emails. defaultSubscriberListIds are the lists new contacts join when nothing targets them: JSON null means every current and future list, not an empty selection; [] means no list; an array means exactly those lists. Change it with update_company. Read it before connecting an integration without per-integration list targeting (Dodo Payments, PostHog, Polar, Paddle, and similar): its live contacts and payment-provider backfills land there. PostHog history imports are different: their contacts get no list memberships. ${
      campaignStoNotCompanyOrSequenceHint
    }`,
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company to read, from get_account's companies list or select_company.",
        },
      },
      required: ["companyId"],
    },
  },
  {
    name: "update_company",
    description:
      "Edit company product info, brand context, the default email theme, reply-tracking settings, account-wide sending identity defaults, and defaultSubscriberListIds - which lists new untargeted contacts join. That field is the write path for Dodo Payments and live PostHog events, plus every other integration without per-integration targeting: null = every current and future list (not 'no lists'), [] = no list, [ids] = exactly those lists. PostHog history imports always create contacts without list memberships. fromEmail must use a verified sending domain; replyTo may be any valid mailbox. Missing sender/reply profiles are created automatically. Send fromName/replyToName on their own to rename the display name of the existing default profile without changing its address, or pair them with senderProfileId/replyProfileId (from list_sender_profiles) to rename a specific profile. Provide at least one editable field. Profile, branding, and AI-context fields need the company_profile:manage scope; the sending identity, reply-tracking, and defaultSubscriberListIds fields additionally need companies:manage.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If omitted, uses the selected/current company when available.",
        },
        renameMatchingFooters: {
          type: "boolean",
          description:
            "Optional, default false. With name and previousCompanyName, rename exact matching footer company names in editable emails and saved components. Preserves custom names and protected campaigns. Requires emails:write, templates:write, campaigns:write, sequences:write, transactional:write and ab_tests:write; personal keys require owner/admin access.",
        },
        previousCompanyName: {
          type: "string",
          description:
            "Required when renameMatchingFooters is true. Current name from get_company; stale names return 409. Retrying a completed rename does not change footers again.",
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
        darkModeLogoUrl: {
          type: ["string", "null"],
          description:
            "Your own dark-mode version of the logo (public PNG, JPG or GIF URL). Every email uses it instead of the automatic outlined copy, light and dark inboxes alike, so it must read on both. Requires a logo; changing the logo later drops it. Pass null to go back to the automatic one. get_company returns it as darkModeLogoUrl with darkModeLogoStatus custom.",
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
        emailDesignPrompt: {
          type: "string",
          description:
            "Art direction for AI-designed emails: layout, density, which sections belong in an email, imagery, CTA prominence, reference brands. Steers design; toneVoice steers copy. Overrides the default composition rules. When empty, the next email generation prefills it with the direction derived from the brand, so read the current value from get_company before editing. Pass an empty string to reset - the next generation refills it.",
        },
        emailLengthPreference: {
          type: "string",
          description:
            "Email length preference: concise, balanced, or detailed. New workspaces default to concise.",
        },
        websiteType: {
          type: ["string", "null"],
          enum: [
            "saas",
            "content",
            "ecommerce",
            "offline",
            "mobile_app",
            "other",
            null,
          ],
          description:
            "Company category. It decides which sequence templates are recommended (list_sequence_templates) and steers AI writing; mobile_app turns on push-first mobile journeys and app-aware copy. A value set here is the user's choice and website detection never overwrites it. null clears it so detection may classify the company again. Suggest mobile_app after the user connects RevenueCat, Superwall or Adapty.",
        },
        emailStylePreference: {
          type: ["string", "null"],
          enum: ["visual", "plain", null],
          description:
            "How AI writes emails by default: visual for designed emails with sections and imagery, plain for simple text-focused emails with one button. Both still use the company theme, header and footer. null clears the choice: generation then designs emails and the dashboard asks again. A saved reference email (get_email_ai_style) keeps generated emails designed until it is cleared.",
        },
        emailPreset: {
          type: "string",
          enum: ["branded", "minimal"],
          description:
            "Default header and footer for new emails: branded adds the logo header and the full footer with social links, minimal uses no logo and a compact footer. Applies to designed, simple text and hand-built emails. Existing emails keep their own setting. While a saved reference email exists (get_email_ai_style), AI-generated emails use its header and footer instead until it is cleared.",
        },
        footerStyle: {
          type: "string",
          enum: ["auto", "classic", "mono", "band", "editorial"],
          description:
            "Footer style for new AI-designed emails: classic (brand-colored social icons, centered), mono (monochrome icons, company name as a small wordmark), band (mono on a dark full-width band) or editorial (mono, left-aligned). auto (the default) picks one that fits the brand. Existing emails keep their footers; a footer block's own style field sets one email.",
        },
        footerTheme: {
          type: ["object", "null"],
          description:
            "Colors and copy of the auto-added footer (appended when an email has no footer block). Merged into the stored theme: omitted fields keep their value, null or an empty string resets one, footerTheme: null resets all. Colors are #rrggbb; empty text uses the localized default. get_company values can be sent back as is. Footer font, size and line height are in emailTheme.typography.",
          properties: {
            backgroundColor: {
              type: ["string", "null"],
              description: "Default transparent (the email background).",
            },
            companyTextColor: { type: ["string", "null"] },
            metaTextColor: {
              type: ["string", "null"],
              description: "Reason and address text.",
            },
            linkColor: { type: ["string", "null"] },
            borderColor: {
              type: ["string", "null"],
              description: "Divider above the footer.",
            },
            reasonText: {
              type: ["string", "null"],
              description: "Why the recipient gets the email.",
            },
            unsubscribeText: { type: ["string", "null"] },
            privacyPolicyText: { type: ["string", "null"] },
            showCompanyLine: {
              type: ["boolean", "null"],
              description: "Company name above the reason. Default false.",
            },
            style: {
              type: ["string", "null"],
              enum: ["auto", "classic", "mono", "band", "editorial", "", null],
              description:
                "Same as footerStyle; both with different values is an error.",
            },
          },
          additionalProperties: false,
        },
        socialLinks: {
          type: "object",
          description:
            "Replacement map of profile URLs keyed by platform. Branded footers show an icon for x (or twitter), threads, bluesky, linkedin, instagram, facebook, youtube, tiktok, pinterest, discord, reddit, and the mobile app store listings appstore and googleplay. Other keys are stored but get no icon.",
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
            "Default email theme applied to campaigns, sequences, and transactional email. Partial update: omitted fields keep their current value (or the preset default). Pass null to reset to the platform default theme. Numeric values are clamped to supported ranges. To restyle one sequence email instead, patch that step's emailTheme with update_sequence_node.",
          properties: emailThemePatchProperties,
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
            "Enable or disable inbound reply capture (Inbox) for this company. Turning it on returns 409 receiving_domain_required when the workspace has no verified receiving domain and has never received a conversation: add one with add_receiving_domain instead, and its first verification turns Inbox on.",
        },
        replyTrackingDomainMode: {
          type: "string",
          description:
            "Reply-tracking domain mode: sequenzy always uses Sequenzy's shared reply domain; custom uses the workspace's verified receiving domain for emails from every sending domain, falling back to Sequenzy's domain until one is verified.",
        },
        forwardReplies: {
          type: "boolean",
          description:
            "Enable or disable forwarding captured replies to the configured mailbox.",
        },
        defaultSubscriberListIds: {
          type: ["array", "null"],
          items: { type: "string" },
          description:
            "Which lists new contacts join when something creates a subscriber without explicit list targeting - forms, API writes, events, tag actions, imports, and every integration that does not carry its own targeting. The three states are distinct: null means every current and future list, [] means no list at all, and a populated array means exactly those lists. Repointing this changes only later writes; nobody is moved or removed retroactively. This is the setting that decides where an integration's backfill lands when the provider has no per-integration targeting of its own, so check it with get_company before connecting a store. Unknown list IDs are rejected. In the dashboard it lives under Contacts -> Lists -> Default Lists. Requires the companies:manage scope.",
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
            expireAfterHours: {
              type: "number",
              exclusiveMinimum: 0,
              maximum: 720,
              description:
                "Hours after which an untouched tracked cart is dropped instead of being emailed about or merged into by a later add (default 72). A store can empty a cart without sending a removal - a session or reservation timing out, an inventory hold releasing, checkout finishing on another device - and past this window the cart is no longer treated as evidence the shopper still has those items. Set it below delayHours for stores whose carts expire faster than the abandonment delay; those carts are then intentionally never emailed about.",
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
      "Get the company's sync rules: the automatic tag changes applied when events fire (e.g. order placed -> add a tag). New companies start with the payment and ecommerce lifecycle rules; some older ones have none. Returns the effective rules plus isDefault, which is true when the company has explicitly opted into the inherited SaaS/ecommerce platform preset.",
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
    name: "get_email_design_system",
    description:
      "Get the company's email design system: the visual identity every AI-generated email (campaigns and sequence steps) renders inside - design code (kicker style, title alignment, button shape, divider style, density, sanctioned opener treatments) plus the composition spine (hero-led | editorial | product-spec) that anchors email structure. The identity is stored as the company's emailDesignPrompt direction text; this tool returns the structured tokens parsed from that text (falling back to brand derivation per unstated token), the raw directionText, and isDefault (true while the identity is still purely derived from brand context).",
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
    name: "update_email_design_system",
    description:
      "Adjust the company's email design system (partial update - only pass the fields to change). Affects every future AI-generated email and sequence enrichment. designCode tokens: kickerStyle (chip | letterspaced | none), titleAlignment (left | center), buttonShape (rounded | pill), dividerStyle (line | space), density (airy | compact), openerTreatments (subset of hero-image, hero-color, header-hero, editorial-masthead, title-led). compositionSpine: hero-led | editorial | product-spec. The adjustment is written into the company's emailDesignPrompt direction text (the single source of truth): the new identity's sentences are prepended and any custom prose the text carried is preserved below them. Pass reset: true to clear the direction text and return to brand-derived defaults. Free-form prose edits belong on update_company's emailDesignPrompt instead.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        designCode: {
          type: "object",
          description:
            "Partial visual grammar adjustment; omitted tokens keep their current value.",
          properties: {
            kickerStyle: {
              type: "string",
              enum: ["chip", "letterspaced", "none"],
              description:
                "How eyebrows above titles render: soft badge chips, letter-spaced uppercase text, or none.",
            },
            titleAlignment: {
              type: "string",
              enum: ["left", "center"],
            },
            buttonShape: {
              type: "string",
              enum: ["rounded", "pill"],
            },
            dividerStyle: {
              type: "string",
              enum: ["line", "space"],
              description:
                "Thin divider lines between sections, or whitespace only.",
            },
            density: {
              type: "string",
              enum: ["airy", "compact"],
            },
            openerTreatments: {
              type: "array",
              items: {
                type: "string",
                enum: [
                  "hero-image",
                  "hero-color",
                  "header-hero",
                  "editorial-masthead",
                  "title-led",
                ],
              },
              description:
                "The opener treatments this company's emails may use, primary first.",
            },
          },
          additionalProperties: false,
        },
        compositionSpine: {
          type: "string",
          enum: ["hero-led", "editorial", "product-spec"],
          description:
            "Which worked-example skeleton anchors generation: designed marketing sections, typography-first editorial, or information-dense product/spec.",
        },
        reset: {
          type: "boolean",
          description:
            "true clears the direction text and returns to brand-derived defaults. Cannot be combined with designCode or compositionSpine.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_design_md",
    description:
      "Get the company's design.md: its email design brief as one Markdown document. YAML frontmatter holds the exact values Sequenzy applies when rendering AI-generated emails (logo, colors, fonts.body/heading, buttons.style/radius, cornerRadius, layout tokens); prose sections hold the Voice and the Design direction the AI writer follows, plus a read-only Reference email naming the saved AI style. Values shown are the ones emails actually get. Returns markdown, version (pass it to update_design_md as expectedVersion), and the parsed designSystem. Read this before writing or redesigning emails for the company.",
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
    name: "update_design_md",
    description:
      "Save an edited design.md (full document from get_design_md). Only values you changed are written: a frontmatter value left as returned is not written and keeps its current behavior, a changed radius or heading font is pinned, and a changed layout token is written into the design direction ahead of its prose. Removing a key or section leaves it unchanged; an empty Voice or Design direction section clears it (an empty direction returns to brand-derived defaults). The Reference email section is read-only. Invalid values fail with line-numbered issues; unknown keys are ignored with warnings. Pass dryRun: true to preview changes and warnings without saving. Pass expectedVersion from get_design_md; on a 409 conflict, read again and reapply your edits.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        markdown: {
          type: "string",
          maxLength: 100000,
          description:
            "The full design.md document: optional --- YAML frontmatter --- followed by Markdown with ## Voice and ## Design direction sections. Other ## sections are kept as part of the design direction.",
        },
        expectedVersion: {
          type: "string",
          description:
            "version from get_design_md. Recommended: the save fails with a conflict if design.md changed since that read.",
        },
        dryRun: {
          type: "boolean",
          description:
            "true validates and reports changes and warnings without saving.",
        },
      },
      required: ["markdown"],
      additionalProperties: false,
    },
  },
  {
    name: "create_api_key",
    description:
      "Create a new API key for a company, typically when setting up a Sequenzy integration in a project. The CLI reads the key from the SEQUENZY_API_KEY environment variable; SDK clients accept it through the apiKey option, such as apiKey: process.env.SEQUENZY_API_KEY. The key is returned only once at creation time and cannot be retrieved later.",
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
    name: "request_api_key_handoff",
    description:
      "Prepare an owner-confirmed handoff link for creating or rotating an API key. Intended for when key management fails because the active key is missing api_keys:manage; that scope fails closed on purpose, and this handoff is the supported path. Returns a URL that opens the dashboard's create-key form with the requested name and permissions already filled in. This tool creates nothing and never returns a key: the workspace owner opens the URL, reviews the form, clicks Create, and copies the new key from the browser. To rotate, pass replaceApiKeyId (or the literal string 'current' for the key you are authenticated with) and the dashboard offers to revoke the predecessor after the replacement is created. Requires only account:read.",
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
          description:
            "Suggested name for the new key (e.g., 'Production sync (rotated)').",
        },
        preset: {
          type: "string",
          description:
            "Suggested permission preset. Supported values: full_access, read_only, agent_safe, ai_drafting, data_ingest_safe, data_ingest_automations, transactional_sender, marketing_sender. Prefer agent_safe for an AI agent key.",
        },
        scopes: {
          type: "array",
          description:
            "Suggested explicit permission scopes. Overrides preset. Unsupported scopes are rejected here rather than silently dropped from the owner's form.",
          items: {
            type: "string",
          },
        },
        replaceApiKeyId: {
          type: "string",
          description:
            "ID of the key the new one replaces, so the owner can revoke it in the same visit. Pass 'current' for the key this session is authenticated with; its ID is also in get_account under apiKeyPermissions.activeKey.id.",
        },
      },
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
      "List configured sending domains with separate DNS verification, sending readiness, and SPF, DKIM, and MAIL FROM status.",
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
      "Add and configure a sending domain. A domain belongs to exactly one company and cannot be moved or removed through the API, CLI or MCP afterwards, so confirm the target company with the user before adding. Before calling verify_sending_domain, publish the DKIM record from website.dnsRecords (when dnsRecords.platformDnsRecords is present, publish those CNAMEs instead: active and spare DKIM selectors plus a recommended bounces CNAME; only required entries block verification), the bounce records described by website.bounceRecords (its cnameRecord when style is cname, otherwise spf.record and mailFrom.mxRecord; never both at the same name), and DMARC when present. Tracked links use the company tracking domain shared by every sending domain; the first domain creates it under itself (links.<domain>) and returns its CNAME as dnsRecords.trackingRecord. It is optional and never blocks verification or sending: until it verifies, links use the shared Sequenzy domain. Manage it with set_tracking_domain.",
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
        mailFromPrefix: {
          type: "string",
          description:
            "Optional return-path (MAIL FROM) subdomain label, default rp. New domains also get a second return path, usually <label>2 (rp2 by default); publish the returned names. One DNS label of 1 to 63 letters, numbers or hyphens; inbound is reserved. Applies only when the domain is created.",
        },
        trackingPrefix: {
          type: "string",
          description:
            "Optional label of the company tracking domain created under the domain (<label>.<domain>, or <label>.<root> when it equals mailFromPrefix), default links (links2 to links5 are tried if it is taken). Used only when the company has no tracking domain yet; ignored otherwise. inbound is reserved. Change it later with set_tracking_domain.",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "add_website",
    description:
      "Compatibility alias for add_sending_domain. Adds a sending domain and returns the DNS records required for setup. The domain cannot be moved to another company afterwards; confirm the target company first.",
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
        mailFromPrefix: {
          type: "string",
          description:
            "Optional return-path (MAIL FROM) subdomain label, default rp. New domains also get a second return path, usually <label>2 (rp2 by default); publish the returned names. One DNS label of 1 to 63 letters, numbers or hyphens; inbound is reserved. Applies only when the domain is created.",
        },
        trackingPrefix: {
          type: "string",
          description:
            "Optional label of the company tracking domain created under the domain (<label>.<domain>, or <label>.<root> when it equals mailFromPrefix), default links (links2 to links5 are tried if it is taken). Used only when the company has no tracking domain yet; ignored otherwise. inbound is reserved. Change it later with set_tracking_domain.",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "check_website",
    description:
      "Read a sending domain's separate DNS verification and sending readiness. Use verify_sending_domain to run a fresh check. dnsUpgrade.status: available (see upgrade_sending_domain_dns), in_progress (records to add), completed (oldRecords to delete) or unavailable. Receiving mail (inbox addresses and replies) is set up on receiving domains instead: see list_receiving_domains.",
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
      "Run a fresh DNS check for a configured sending domain and return DNS verification separately from sending readiness. When readyToSend is false, read readiness.reason. Receiving mail (inbox addresses and replies) is checked on receiving domains instead: see verify_receiving_domain.",
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
    name: "upgrade_sending_domain_dns",
    description:
      "Recommended, optional one-time upgrade of a verified sending domain to the current per-domain CNAME DNS records, for better deliverability and security, without removing it; it keeps sending on current records and sending is normally not interrupted at the switch. Once started it runs to the switch. Needs website.dnsUpgrade.status available; an older SES-only domain also needs a DMARC record (400 otherwise). Publish the returned dnsUpgrade.records CNAMEs next to the current records, removing nothing; the domain switches by itself about an hour after the required ones are public (verify_sending_domain checks now, no skip). Removing dnsUpgrade.oldRecords (listed beforehand as replacedRecords) after deleteOldRecordsAfter (8 days) is optional; each is marked removed once gone from public DNS.",
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
          description: "Configured sending domain.",
        },
        mailFromPrefix: {
          type: "string",
          description:
            "Optional return-path label, default rp (then rp1, sqrp); SES one is <label>2. Not a label with DNS records.",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "configure_sending_domain",
    description:
      "Deprecated: tracking is company-wide; prefer set_tracking_domain. Sets <trackingPrefix>.<domain> as the company tracking domain when the company has none. Repeating the company's current tracking hostname is a no-op; a different one changes nothing and the response message says so (use set_tracking_domain to change it). Publish the returned website.tracking.cnameRecord; sending never waits for it.",
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
          description:
            "Configured sending domain (for example, mail.example.com).",
        },
        trackingPrefix: {
          type: "string",
          description:
            "Tracking subdomain label, for example links. One DNS label of 1 to 63 letters, numbers or hyphens; inbound is reserved.",
        },
      },
      required: ["domain", "trackingPrefix"],
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
            "Display name recipients see beside the address, e.g. 'SnapCount'. Surrounding spaces are removed; up to 255 characters.",
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
    name: "delete_sender_profile",
    description:
      "Permanently delete one sender (From) profile. This cannot be undone. Deletion is refused when this is the company's last sender or when a live campaign, active sequence (including a step-level override), or transactional email still uses it. Draft and rejected campaigns plus the account default are reassigned to the best remaining sender when needed; read fallbackSenderProfileId in the result and review that identity before sending. Reply-to profiles are not supported by this tool. Get the profile ID from list_sender_profiles. Requires the companies:manage scope.",
    inputSchema: {
      type: "object",
      properties: {
        profileId: {
          type: "string",
          description:
            "Sender (From) profile ID to delete, from senderProfiles in list_sender_profiles.",
        },
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
      },
      required: ["profileId"],
    },
  },
  {
    name: "get_sending_status",
    description: `Check whether company-level email sending is active, paused, or suspended, and what it takes to restore it. Relevant whenever a send, test send, or sequence step fails for a reason that is not a validation error, and whenever the account reports a bounce or complaint rate problem.

Returns the pause reason and reason kind, when it was paused, the automated sender-health review state, whether the one-click resume is currently available (and if not, which gate is blocking it), the enforcement counts and thresholds for permanent bounces, temporary bounces, and complaints, and ordered remediation steps.

There is no rolling window and no expiry. Enforcement uses all-time totals counted from a reset watermark, so a paused rate does NOT decay over time. Waiting does not restore sending. The rate only changes as real (non-test) sends accumulate or when a resume moves the watermark. \`metricsWindow\` contains the exact watermark timestamps.

Requires the account:read scope, so a read-only key can diagnose a blocked account. resume_sending restores sending once the underlying problem is fixed.`,
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

Intended for after the bad source (import, form, or integration) is actually fixed while permanent bounces remain suppressed. get_sending_status reports the current gate: for a paused workspace, resume only restores sending when \`selfResume.canSelfResume\` is true, which requires a hard-bounce pause reason, a cleared automated sender-health review, and no admin block. A workspace that is already active succeeds as a no-op with \`resumed: false\`; any other blocked state needs a support review, and the error names which one.

listSanitizationConfirmed: true is required and represents the user's confirmation that the remediation is done; it is recorded on the account's audit trail as their statement that the list is clean. On success, sending is restored, the bounce watermark resets so the rate is recalculated from later sends, and the service attempts to requeue paused campaigns plus due sequence steps. The response message contains support guidance if part of that queue handoff is temporarily unavailable.

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
    name: "get_tracking_domain",
    description:
      "Get the company tracking domain every sending domain uses for tracked links and opens: hostname, status, whether links use it now (active), the CNAME record to publish, and the last check. trackingDomain is null when none is set and links use the shared Sequenzy domain.",
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
    name: "set_tracking_domain",
    description:
      "Set or change the company tracking domain: one hostname every sending domain uses for tracked links and opens, for example links.example.com. Any subdomain the user controls works; a bare root domain is rejected. Publish the returned trackingDomain.cnameRecord. It never blocks sending: until it verifies, links use the shared Sequenzy domain. Changing it keeps the previous hostname serving links in emails already sent while its old CNAME stays. Confirm the hostname with the user first.",
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
          description:
            "Tracking hostname, a subdomain such as links.example.com.",
        },
      },
      required: ["domain"],
    },
  },
  {
    name: "verify_tracking_domain",
    description:
      "Check the company tracking domain's CNAME and HTTPS certificate now instead of waiting for the automatic check. Returns verified, a message with the next step, and the tracking domain status.",
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
    name: "remove_tracking_domain",
    description:
      "Remove the company tracking domain. New emails use the shared Sequenzy tracking domain, and links and images in emails already sent through the removed domain stop working. Confirm with the user first.",
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
    name: "get_frequency_cap",
    description:
      "Get the company frequency cap: the most marketing emails (campaigns plus marketing sequence emails) one contact may receive in a rolling window. frequencyCap is null when no cap is set. Only sequences with frequencyCapEnabled respect it: their email steps are skipped for a contact already at the cap, and the contact moves to the next step. Campaigns count toward the cap but always send. Transactional emails never count and are never skipped.",
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
    name: "set_frequency_cap",
    description:
      "Set or change the company frequency cap: at most maxEmails marketing emails per contact in any windowHours. Applies from the next email step onward to sequences with frequencyCapEnabled (set it with create_sequence or update_sequence). Campaigns count toward the cap but always send. Transactional emails never count and are never skipped.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        maxEmails: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description:
            "Most marketing emails one contact may receive in the window (1-50). 1 means a contact gets at most one marketing email per window.",
        },
        windowHours: {
          type: "integer",
          minimum: 1,
          maximum: 168,
          description:
            "Rolling window in hours (1-168). For example 16 for one day of quiet, 168 for a week.",
        },
      },
      required: ["maxEmails", "windowHours"],
    },
  },
  {
    name: "clear_frequency_cap",
    description:
      "Turn the company frequency cap off. Sequences keep their frequencyCapEnabled setting, but nothing is skipped until a cap is set again with set_frequency_cap.",
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
    name: "get_tracking_settings",
    description:
      "Get the company's email tracking and signup consent configuration: account-wide and Transactional API open/click defaults, unsubscribe tracking, opt-in strict bot filtering, default attribution window, automatic UTM tagging, the company tracking domain (shared by every sending domain) and its verification status, inbound reply-tracking settings, and whether double opt-in is required for new contacts. Use this to audit measurement readiness, to explain why opens or clicks may not be recorded, and to check how contacts enter the list before investigating bot or alias signups.",
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
      "Update the company's email tracking defaults: account-wide open and click tracking, narrower open and click defaults for Transactional API sends, unsubscribe tracking, opt-in strict bot filtering, the default attribution window, and automatic UTM tagging, plus the account-wide double opt-in requirement for new contacts. Applies to emails sent afterwards; already-sent emails keep the links they were rendered with. Transactional API defaults cannot enable an account-wide setting that is off, and an individual send may opt out again. Provide at least one field. Reply tracking (inbound email, reply domain mode, reply forwarding) is on update_company. The company tracking domain is managed with set_tracking_domain, verify_tracking_domain and remove_tracking_domain.",
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
        transactionalOpenTrackingEnabled: {
          type: "boolean",
          description:
            "Whether Transactional API sends include the open-tracking pixel by default. This cannot enable opens when openTrackingEnabled is false; individual sends may still opt out.",
        },
        transactionalClickTrackingEnabled: {
          type: "boolean",
          description:
            "Whether Transactional API sends rewrite links for click tracking by default. This cannot enable clicks when clickTrackingEnabled is false; individual sends may still opt out.",
        },
        strictBotFilteringEnabled: {
          type: "boolean",
          description:
            "Opt in to aggressive bot detection: strict user-agent patterns, datacenter and Microsoft Azure IPs, fast campaign and sequence clicks from IPs clicking other recipients' emails, and cross-send IP sweeps. Off by default because it can also discard real engagement, lowering reported open and click rates. Enable it when the audience sits behind email-security appliances that inflate engagement.",
        },
        unsubscribeTrackingEnabled: {
          type: "boolean",
          description:
            "Whether unsubscribe links that point to other services are routed through your tracking domain. Sequenzy's own unsubscribe and preference links, including the one-click unsubscribe header, always use your tracking domain (or the shared one). Actual unsubscribes and their email attribution are recorded either way.",
        },
        emailContentStorageEnabled: {
          type: "boolean",
          description:
            "Leave this true unless the user explicitly needs it off for privacy reasons; most workspaces never change it. Whether Sequenzy keeps each sent email's rendered content and subject, and the IP address, user agent and country of opens and clicks. When false, sent-email records keep the email's name in place of its subject and no body once sent, opens and clicks store no IP address, user agent or country, and view-in-browser links stop working. Body and subject rules apply to emails sent afterwards; IP address, user agent and country follow the setting at each open or click.",
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
        doubleOptInRedirectUrl: {
          type: ["string", "null"],
          description:
            "Where the hosted confirmation page sends subscribers after they confirm - typically a branded thank-you or welcome page on the company's own site. Must be an http(s) URL; a bare domain is normalized to https. Pass null to clear it, which keeps subscribers on the hosted confirmation page (branded with the company's name, logo, and colors).",
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
      "Get the account notification settings for the API key's own user in this company: whether Sequenzy emails them when a new subscriber joins, when a form is submitted, when a campaign finishes sending, and whether they get the Monday weekly report (last week's sends, engagement, new subscribers, revenue, goals, and sequence trends versus the week before; on by default for the workspace owner, off by default for invited members, only sent for weeks with more than 10 emails sent), whether they get the account health check's findings (account_health: on by default for the owner, opt-in for members; carried inside the Monday report when they get it, otherwise sent as their own email), and whether each arrives per-occurrence, as a daily summary, or weekly. Instant form-submission notifications stop after 50 per workspace per UTC day. Returns the supported modes and the platform defaults for this user's role alongside the current values. These are per-person settings - this never reads a teammate's preferences.",
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
      "Change which account notifications Sequenzy emails the API key's own user for this company. Requires the companies:manage scope. Useful before a bulk import or a large migration, when per-signup notifications would otherwise flood the inbox, or to turn the Monday weekly report off (it is on by default only for the workspace owner; invited members set weekly_report to 'weekly' to receive it), or to opt in or out of the account health check's findings (account_health 'instant' or 'off'). Modes are 'off', 'instant' (one email per occurrence), 'daily' (one summary per day), and 'weekly' (the Monday report); 'daily' is only valid for new_subscriber, because a campaign finishes once and each form submit is its own lead, and 'weekly' is only valid for weekly_report; account_health accepts only 'off' or 'instant'. Instant form-submission notifications stop after 50 per workspace per UTC day. New-subscriber notifications already fall back to a daily summary automatically on high-volume days, and imports never trigger them at all.",
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
                enum: [
                  "new_subscriber",
                  "form_submitted",
                  "campaign_completed",
                  "weekly_report",
                  "account_health",
                ],
                description: "Which notification to configure.",
              },
              mode: {
                type: "string",
                enum: ["off", "instant", "daily", "weekly"],
                description:
                  "How to receive it. 'daily' is not supported for form_submitted or campaign_completed. weekly_report accepts only 'off' or 'weekly'; account_health only 'off' or 'instant'.",
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

SaaS and subscription apps: when the app uses Stripe, Polar, Paddle, Dodo, Lemon Squeezy, or Creem, the native integration in the Sequenzy dashboard (Settings -> Integrations) handles payment events and customer tags automatically, so no code is needed for those.

E-commerce stores: Shopify and WooCommerce stores use the native integration in the dashboard, which syncs products, orders, and customers automatically. Other e-commerce stacks (custom checkouts, CheckoutChamp, Sticky.io, headless storefronts) integrate through the 'ecommerce' use case and the Commerce API.

Manual event tracking code is an opt-in use case for custom events only.

Use cases:
- 'transactional': Sending one-off emails (welcome, password reset, receipts)
- 'subscribe_form': Adding subscribers from signup forms
- 'event_tracking': Tracking CUSTOM events only (not payment events - those come from the integration)
- 'ecommerce': Connecting a custom e-commerce platform via the Commerce API (sync products, push orders/checkouts, power abandoned cart + back-in-stock automations)

Protected server-side API work needs an API key (create_api_key), passed to the SDK as apiKey: process.env.SEQUENZY_API_KEY. Non-Webflow static-site saved forms are the exception: list_forms/create_form/get_form_embed return public embed code, and secret keys must never be placed in browser code. Webflow-connected companies use explicitly selected native forms in Settings -> Integrations -> Webflow; custom embed code is disabled.`,
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
