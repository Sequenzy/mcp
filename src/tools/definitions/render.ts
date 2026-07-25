import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const renderToolDefinitions: Tool[] = [
  {
    name: "render_email",
    description:
      "Render a campaign, sequence email step, or template to the exact email-safe HTML that would be sent, for embedding a visual preview in an external builder or dashboard. Pass exactly one target: campaignId, sequenceId plus nodeId, or templateId. Without a subscriber the email renders for a sample contact and merge tags resolve to empty values. Links stay clean unless tracking is true. Per-send click redirects and the open pixel are added at send time against a real email send record, so they never appear here.",
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
          },
          required: ["email"],
        },
        variables: {
          type: "object",
          description:
            "Extra merge variables layered over the contact's attributes.",
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
