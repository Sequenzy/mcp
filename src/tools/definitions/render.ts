import { APP_RESOURCE_URI } from "../../app-resource.js";
import type { Tool } from "../../mcp-types.js";

export const renderToolDefinitions: Tool[] = [
  {
    name: "render_email",
    _meta: { ui: { resourceUri: APP_RESOURCE_URI } },
    description:
      "Show an interactive desktop/mobile email preview in MCP Apps clients, and render a campaign, sequence email step, or template to the exact email-safe HTML that would be sent, for embedding a visual preview in an external builder or dashboard, or for checking merge tags before anyone is enrolled. Pass exactly one target: campaignId, sequenceId plus nodeId, or templateId. For a sequence step whose nodeType is action_ab_test, also pass variantId from get_sequence.sequence.emails[].abTest.variants - that step has no email of its own and copy lives on the variants. Without a subscriber the email renders for a sample contact, so contact-specific merge tags resolve to empty values. Check unresolvedMergeTags in the response to tell an unrecognized tag apart from one that is merely blank for this contact - both render as an empty string, so the HTML alone cannot distinguish them. An unrecognized name is reported there even when a default filter supplied text in its place, because that fallback then reaches every recipient while the HTML looks perfectly personalized. Only names this render could check are called unknown. Nothing is checkable without the contact's attributes, because a bare {{plan}} reads the same attribute map as {{subscriber.plan}}, so pass subscriberId (or an inline subscriber with customAttributes) to catch typos at all. On top of that, {{event.*}} needs sample event properties in variables, since a real send fills those from the enrolling event, and {{recommendedProducts.*}} is only checkable when a stored subscriberId returns recommendations. Rendering a transactional email is checkable only when variables is passed, since its tags come from the variables of each send call and nothing marks them as such. An optional attribute this contact never had set is kept out of unknown by checking the names other contacts in the account carry, which needs the subscribers:read scope. A sequence step downstream of a create_discount step renders {{discount.*}} with that step's real terms and a clearly fake sample code; when the step is reachable by paths that do not all run the same discount step, or when a template is rendered on its own, {{discount.*}} is reported as no_value rather than as a typo. Conditional blocks are the other half of a preview: a condition on stored subscriber state (tag, segment, list, status, event, purchases, engagement) is evaluated per recipient at send time, so this render can only evaluate it for a stored subscriberId - or, for a `tag` condition, an inline subscriber that states tags. Anything it cannot evaluate renders as false, which is indistinguishable in the HTML from a condition that is genuinely false, so check unevaluatedConditions before treating a preview as proof of which branch a recipient gets. Links stay clean unless tracking is true. Per-send click redirects and the open pixel are added at send time against a real email send record, so they never appear here.",
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
          description: "Campaign ID to render.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID. Requires nodeId.",
        },
        nodeId: {
          type: "string",
          description:
            "Email step node ID from get_sequence. Requires sequenceId.",
        },
        templateId: {
          type: "string",
          description: "Template ID to render.",
        },
        subscriberId: {
          type: "string",
          description:
            "Personalize as this stored subscriber. Mutually exclusive with subscriber. The rendered HTML then carries that subscriber's details, so this needs the subscribers:read scope as well.",
        },
        subscriber: {
          type: "object",
          description:
            "Personalize as an ad-hoc contact that need not exist in the account. Mutually exclusive with subscriberId.",
          properties: {
            email: { type: "string", description: "Contact email address." },
            firstName: { type: "string", description: "Contact first name." },
            lastName: { type: "string", description: "Contact last name." },
            customAttributes: {
              type: "object",
              description: "Custom attributes used by merge tags and blocks.",
              additionalProperties: true,
            },
            tags: {
              type: "array",
              description:
                "Tags this ad-hoc contact carries, used to evaluate `tag` block conditions. Nothing is stored. Without it a tag condition has no tags to read and renders as false, so only the else branch of a tag split can be previewed. Every other stored-state condition (segment, list, event, engagement, purchases) still needs subscriberId.",
              items: { type: "string" },
            },
          },
          required: ["email"],
        },
        variables: {
          type: "object",
          description:
            "Extra merge variables layered over the contact's attributes. Values are HTML-escaped; content can prefix a tag with 'html.' ({{html.subscriber.body_html}}) to render a trusted, sanitized HTML value unescaped, and this tool previews that exactly as a send would.",
          additionalProperties: true,
        },
        locale: {
          type: "string",
          description:
            "Force a localization locale instead of deriving it from the contact.",
        },
        variantId: {
          type: "string",
          description:
            "Render a specific A/B test variant of the campaign or sequence step. Required for sequence steps whose nodeType is action_ab_test: those steps have no emailId of their own, and copy lives on get_sequence.sequence.emails[].abTest.variants. Rendering a sequence variant also needs the ab_tests:read scope, the same scope get_sequence uses to return competing variant copy.",
        },
        variationId: {
          type: "string",
          description:
            "Render a design variation of the campaign's email or of the sequence step's email instead of the email (from list_campaign_variations or list_sequence_email_variations). Not with variantId. A variation still generating, or one that failed, can't be rendered.",
        },
        tracking: {
          type: "boolean",
          description:
            "Apply the company's auto-UTM link decoration as a real send would. Defaults to false so the preview shows the author's clean URLs.",
        },
      },
      required: [],
    },
  },
  {
    name: "check_email",
    description:
      "Run the pre-send email check on a saved campaign, sequence email step, or template: the same rules as the editor's email checker plus live verification of every link and image. Use it before sending or activating to catch broken links (404s, dead domains, bad certificates, redirect loops), links missing https://, localhost/staging/preview URLs, placeholder domains such as example.com, mistyped schemes, link shorteners, link text that shows a different domain than the link, invalid mailto/tel links, broken or oversized images, leftover placeholder copy (lorem ipsum, [First Name], TODO), name merge tags without a fallback, missing alt text, spam-trigger wording, Gmail clipping risk and email-client compatibility problems. Pass exactly one target: campaignId, sequenceId plus nodeId, or templateId. Links in every A/B variant and translation are checked unless variantId or locale pins one version. Returns score, grade, placement, per-category scores, issues (each with severity, rule, message and, when it has one location, blockId and url) and links (every link and image with its live status: ok, broken, invalid, server_error, unreachable, restricted, personalized, not_checked). restricted means the site refused an automated check (for example 401, 403 or 429) and may work in a browser, so it is not counted as broken. Links built from per-recipient merge tags are reported as personalized and only syntax-checked; {{company.url}} links are resolved from the company website. Sender settings are not evaluated here. Read-only: it never edits or sends.",
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
          description: "Campaign ID to check.",
        },
        sequenceId: {
          type: "string",
          description: "Sequence ID. Requires nodeId.",
        },
        nodeId: {
          type: "string",
          description:
            "Email step node ID from get_sequence. Requires sequenceId.",
        },
        templateId: {
          type: "string",
          description: "Template ID to check.",
        },
        subscriberId: {
          type: "string",
          description:
            "Check as this stored subscriber: picks their localization and reports merge tags and conditions that would not resolve for them. Link and content rules always run on the email as written. Mutually exclusive with subscriber. Needs the subscribers:read scope as well.",
        },
        subscriber: {
          type: "object",
          description:
            "Personalize as an ad-hoc contact that need not exist in the account. Mutually exclusive with subscriberId.",
          properties: {
            email: { type: "string", description: "Contact email address." },
            firstName: { type: "string", description: "Contact first name." },
            lastName: { type: "string", description: "Contact last name." },
            customAttributes: {
              type: "object",
              description: "Custom attributes used by merge tags and blocks.",
              additionalProperties: true,
            },
            tags: {
              type: "array",
              description:
                "Tags this ad-hoc contact carries, used to evaluate `tag` block conditions. Nothing is stored. Without it a tag condition has no tags to read and renders as false, so only the else branch of a tag split can be previewed. Every other stored-state condition (segment, list, event, engagement, purchases) still needs subscriberId.",
              items: { type: "string" },
            },
          },
          required: ["email"],
        },
        variables: {
          type: "object",
          description:
            "Extra merge variables layered over the contact's attributes. Values are HTML-escaped; content can prefix a tag with 'html.' ({{html.subscriber.body_html}}) to render a trusted, sanitized HTML value unescaped, and this tool previews that exactly as a send would.",
          additionalProperties: true,
        },
        locale: {
          type: "string",
          description:
            "Force a localization locale instead of deriving it from the contact.",
        },
        variantId: {
          type: "string",
          description:
            "Check a specific A/B test variant of the campaign or sequence step. Required for sequence steps whose nodeType is action_ab_test: those steps have no emailId of their own, and copy lives on get_sequence.sequence.emails[].abTest.variants. Checking a sequence variant also needs the ab_tests:read scope, the same scope get_sequence uses to return competing variant copy.",
        },
        variationId: {
          type: "string",
          description:
            "Render a design variation of the campaign's email or of the sequence step's email instead of the email (from list_campaign_variations or list_sequence_email_variations). Not with variantId. A variation still generating, or one that failed, can't be rendered.",
        },
        links: {
          type: "boolean",
          description:
            "Verify every link and image over the network (HTTP status, redirects, DNS, TLS, image type and size). Defaults to true; pass false for a fast, rules-only check.",
        },
      },
      required: [],
    },
  },
];
