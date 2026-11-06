import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

/**
 * Account health: the scheduled check of a company's lifecycle email setup,
 * the same report as the dashboard's Account Health card.
 */
export const accountHealthToolDefinitions: Tool[] = [
  {
    name: "get_account_health",
    description:
      "Read the company's account health report: what to fix in its email setup. Returns eligibility (checks need more than 1,000 active subscribers and an email sent in the last 14 days; hasMinimumSubscribers and sentRecently say which is missing), settings (enabled, autonomy), nextRunAt, the latest run (status, AI summary, stats snapshot of this period vs the one before) and runInProgress, plus open and snoozed insights, most severe first. Each insight has a detector (unhandled_event, stalled_sequence, campaign_gap, stale_campaign_drafts, underperforming_sequence_email, deliverability_spike, sending_domain_failing, missing_sequence: a standard lifecycle sequence such as welcome or re-engagement the workspace does not run yet, with the suggested playbook, name, goal, trigger and steps in evidence; over_emailing: people who got 4+ marketing emails within 24 hours in the last 7 days, with overloadedSubscribers, recipients, peakPerDay, frequencyCap and the campaigns, sequences and marketing Send API email (type api, which the cap does not limit) behind it as sources in evidence, where a sequence with enrollsEveryTime and peakEnrollmentsPerPerson 3 or more re-enrolls the same people and is fixed first with update_sequence enrollmentMode one_time; neglected_subscribers: active subscribers who got no marketing email in 90 days, with neglectedSubscribers, eligibleSubscribers and estimated in evidence; unengaged_signups: contacts who joined in the last 60 days with the same consumer mailbox provider (Gmail, Yahoo, Outlook; business domains are never reported) and first list, got 2+ emails each and almost never opened or clicked while other new signups do, usually a bot filling a signup form or a bought list, with provider, providerLabel, listId, listName, emailed, sends, engaged, baselineEmailed and baselineEngaged in evidence), severity, title, detail, recommendation fixAutomationId when the agent drafted an inactive sequence to fix it, and actions: what to do about it, primary first. Each action has kind (create_sequence, open_sequence, activate_sequence, pause_sequence, create_campaign, review_campaign_drafts, open_campaign, verify_sending_domain, open_domain_settings, review_deliverability, open_frequency_cap_settings, apply_frequency_cap, review_subscribers), label, targetId, a dashboard path for screens, a confirm prompt for changes to live sending, and the api call that performs it: create_sequence -> create_account_health_fix, activate_sequence -> enable_sequence, pause_sequence -> disable_sequence, verify_sending_domain -> verify_sending_domain, open_frequency_cap_settings -> set_frequency_cap (for example maxEmails 1, windowHours 16) when evidence.frequencyCap is null, otherwise get_frequency_cap and only tighten it (the cap only holds back sequences, so when the sources are only campaigns or api it does not help; suggest spacing those out instead), apply_frequency_cap -> update_sequence with frequencyCapEnabled true on targetId (only on sequences that can wait, such as tips and nudges, not welcome or onboarding); the others open dashboard screens. Each insight also has feedback: the API key owner's own answer from submit_account_health_feedback ({rating, comment, updatedAt}), or null. Confirm with the user before set_frequency_cap or apply_frequency_cap. Confirm with the user before activate_sequence or pause_sequence. Requires analytics:read.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "update_account_health_settings",
    description:
      "Turn the weekly account health check on or off and choose whether it drafts fixes. Pass only the fields to change. Checks never send email to subscribers or activate anything: autonomy draft_fixes only creates inactive draft sequences. Checks run every Monday at 05:00 UTC, before the Monday weekly report that carries the findings; the schedule is fixed. Who gets the findings is each person's own account_health notification preference (update_notification_preferences), not a workspace setting. Owner or admin only. Requires companies:manage.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        enabled: {
          type: "boolean",
          description: "Turn scheduled checks on or off.",
        },
        autonomy: {
          type: "string",
          enum: ["draft_fixes", "report_only"],
          description:
            "draft_fixes lets the agent lay out up to 2 inactive draft sequences per check for gaps it finds (named for the business, with trigger, timing and titled email steps; the check writes no email, they are written when the draft is opened in the dashboard or create_account_health_fix is called for its insight); report_only only reports.",
        },
      },
    },
  },
  {
    name: "run_account_health_check",
    description:
      "Queue an account health check now and return the run. If a check is already queued or running it is returned with alreadyInProgress true instead. Manual checks are limited to one every 10 minutes and wait a day after a check that left findings open (both 429 RATE_LIMITED with retryAfterSeconds), need more than 1,000 active subscribers and an email sent in the last 14 days (409 NOT_ELIGIBLE), and never send the report email. The check usually finishes within a minute; poll get_account_health until runInProgress is false. Requires sequences:write.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "update_account_health_insight",
    description:
      "Act on one account health insight by id (from get_account_health): dismiss hides it for good, snooze hides it for snoozeDays (default 7, up to 90), resolve marks it fixed (it reopens if the next check still finds it), reopen brings back a snoozed or resolved one. Requires sequences:write.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        insightId: { type: "string", description: "The insight ID." },
        action: {
          type: "string",
          enum: ["dismiss", "snooze", "resolve", "reopen"],
          description: "What to do with the insight.",
        },
        snoozeDays: {
          type: "integer",
          minimum: 1,
          maximum: 90,
          description:
            "Days to snooze, only with action snooze. Defaults to 7.",
        },
      },
      required: ["insightId", "action"],
    },
  },
  {
    name: "submit_account_health_feedback",
    description:
      "Tell the Sequenzy team whether an account health insight (id from get_account_health) was useful to the user: rating useful or not_useful, with an optional comment on why. Use it when the user says a finding or suggestion helped or missed, in their words; do not rate on their behalf. It records the API key owner's own answer and changes nothing in the workspace (to hide a finding use update_account_health_insight). One answer per person per insight: submitting again replaces the rating and keeps the earlier comment unless comment is passed (null clears it). Works for insights of any status. 404 for an unknown insight. Requires analytics:read.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        insightId: { type: "string", description: "The insight ID." },
        rating: {
          type: "string",
          enum: ["useful", "not_useful"],
          description: "Whether the insight helped the user.",
        },
        comment: {
          type: ["string", "null"],
          maxLength: 2000,
          description:
            "Optional: what made it useful or not, in the user's words. Omit to keep an earlier comment; null clears it.",
        },
      },
      required: ["insightId", "rating"],
    },
  },
  {
    name: "create_account_health_fix",
    description:
      "Build the draft sequence an account health insight asks for, from an unhandled_event or missing_sequence insight (its primary action kind is create_sequence). Creates an inactive sequence with its timing and empty, titled email steps: for unhandled_event, triggered by the event and named for the moment (for example New customer onboarding for saas.purchase); for missing_sequence, with the name, trigger (contact added, an event, or manual enrollment) and steps from the insight's evidence. Like a sequence from a template, a new draft has its emails written with AI: enrichmentStatus is processing while they are written (get_sequence reports progress), or not_queued when writing could not start (opening the sequence in the dashboard starts it; do not build again). Running it again returns the same draft with created false; steps that still have no email (for example a check's own draft nobody opened yet) are written then, with enrichmentStatus, and existing emails are never rewritten. 409 IN_PROGRESS when another build of the same insight is running; 400 for other insight types. Show it with get_sequence; enable_sequence only works once every email step has an email, and only after the user approves. Requires sequences:write.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        insightId: { type: "string", description: "The insight ID." },
      },
      required: ["insightId"],
    },
  },
];
