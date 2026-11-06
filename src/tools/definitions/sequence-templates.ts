import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  companyId: {
    type: "string" as const,
    description:
      "Company ID. Optional with a company-scoped key; required with a personal key that can access several companies.",
  },
};

export const sequenceTemplateToolDefinitions: Tool[] = [
  {
    name: "list_sequence_templates",
    description:
      "List the dashboard's ready-made sequence templates: lifecycle emails for SaaS, ecommerce, content and offline businesses, and push-first journeys for mobile apps (trial to paid, billing issue recovery, cancellation save, paywall viewed but not converted, annual renewal reminder, expired win-back, lapsed users, new install onboarding). Each template lists its trigger event, continue condition, channels (push, in_app, email), channelStrategy (push_first_email_fallback means contacts reachable by push get push and in-app, everyone else gets email), quiet hours, frequency cap, attribution goal, required integration and steps. By default the list is filtered to the company's category (websiteType from get_company) with templates built for it first. Create one with create_sequence_from_template.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyIdProperty,
        websiteType: {
          type: "string",
          enum: [
            "company",
            "all",
            "saas",
            "content",
            "ecommerce",
            "offline",
            "mobile_app",
            "other",
          ],
          description:
            'Category to list for. "company" (default) uses the company\'s own category, "all" lists every template.',
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "create_sequence_from_template",
    description:
      "Create a draft sequence from a template returned by list_sequence_templates, exactly as the dashboard does. Mobile journeys start with a branch on whether the contact is reachable by push (an active device on a platform with APNs, FCM or web push set up): those contacts get push and in-app, everyone else gets email (in-app reaches both). Every wait lands in 09:00-21:00 in the contact's own timezone, email steps respect the company frequency cap, the template's continue condition stops the journey when the contact converts, and an attribution goal is created on the sequence. Emails are written by AI from the brand (30-60 seconds); push and in-app copy comes from the template, so review it with get_sequence and edit with update_sequence_node before enable_sequence. Calendar templates that count down to key dates are dashboard-only; use create_sequence with keyDates instead.",
    inputSchema: {
      type: "object",
      properties: {
        ...companyIdProperty,
        templateId: {
          type: "string",
          description:
            'Template id from list_sequence_templates, e.g. "mobile-trial-conversion".',
        },
        name: {
          type: "string",
          description: "Sequence name. Defaults to the template name.",
        },
      },
      required: ["templateId"],
      additionalProperties: false,
    },
  },
];
