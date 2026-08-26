import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const renderToolDefinitions: Tool[] = [
  {
    name: "render_email",
    description:
      "Render a campaign, sequence email step, or template to the exact email-safe HTML that would be sent, for embedding a visual preview in an external builder or dashboard, or for checking merge tags before anyone is enrolled. Pass exactly one target: campaignId, sequenceId plus nodeId, or templateId. Without a subscriber the email renders for a sample contact, so contact-specific merge tags resolve to empty values. Check unresolvedMergeTags in the response to tell an unrecognized tag apart from one that is merely blank for this contact - both render as an empty string, so the HTML alone cannot distinguish them. An unrecognized name is reported there even when a default filter supplied text in its place, because that fallback then reaches every recipient while the HTML looks perfectly personalized. Only names this render could check are called unknown. Nothing is checkable without the contact's attributes, because a bare {{plan}} reads the same attribute map as {{subscriber.plan}}, so pass subscriberId (or an inline subscriber with customAttributes) to catch typos at all. On top of that, {{event.*}} needs sample event properties in variables, since a real send fills those from the enrolling event, and {{recommendedProducts.*}} is only checkable when a stored subscriberId returns recommendations. Rendering a transactional email is checkable only when variables is passed, since its tags come from the variables of each send call and nothing marks them as such. An optional attribute this contact never had set is kept out of unknown by checking the names other contacts in the account carry, which needs the subscribers:read scope. A sequence step downstream of a create_discount step renders {{discount.*}} with that step's real terms and a clearly fake sample code; when the step is reachable by paths that do not all run the same discount step, or when a template is rendered on its own, {{discount.*}} is reported as no_value rather than as a typo. Conditional blocks are the other half of a preview: a condition on stored subscriber state (tag, segment, list, status, event, purchases, engagement) is evaluated per recipient at send time, so this render can only evaluate it for a stored subscriberId - or, for a `tag` condition, an inline subscriber that states tags. Anything it cannot evaluate renders as false, which is indistinguishable in the HTML from a condition that is genuinely false, so check unevaluatedConditions before treating a preview as proof of which branch a recipient gets. Links stay clean unless tracking is true. Per-send click redirects and the open pixel are added at send time against a real email send record, so they never appear here.",
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
            "Render a specific A/B test variant of the campaign or sequence step.",
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
];
