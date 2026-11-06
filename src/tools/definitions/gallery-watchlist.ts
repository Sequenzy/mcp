import type { Tool } from "../../mcp-types.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

/**
 * The competitor watchlist, the same as the dashboard's Competitors page:
 * brands the company watches in the Sequenzy email gallery and the emails
 * they send. A watch is a brand request, so list_gallery_brand_requests
 * shows the same rows.
 */
export const galleryWatchlistToolDefinitions: Tool[] = [
  {
    name: "list_watched_brands",
    description:
      "List the brands (usually competitors) this company watches, newest watch first. Each has a status: available (its emails are in the gallery; emailCount and latestEmailAt say how many and how recent), requested (not in the gallery yet), collecting (added, emails on the way) or declined (with declineReason). Use list_watched_brand_emails to read what they sent. Requires templates:read.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
    },
  },
  {
    name: "watch_brand",
    description:
      "Watch a brand, usually a competitor, by its website or domain. A brand already in the Sequenzy email gallery is watched at once (status available) and its emails can be read with list_watched_brand_emails; any other brand is requested and its emails show up once it is added and they are collected. New emails arrive a few hours after they are sent. Watching again keeps the one watch (a new note replaces the old) and returns created false. A company can keep up to 50 watches and brand requests together. It is not your own website. Requires templates:write.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        website: {
          type: "string",
          description:
            "The brand's website or domain, such as competitor.com or https://competitor.com/pricing.",
        },
        note: {
          type: "string",
          description:
            "Optional, up to 300 characters: what you want to see from them, such as their onboarding emails.",
        },
      },
      required: ["website"],
    },
  },
  {
    name: "unwatch_brand",
    description:
      "Stop watching a brand by its watch id (from list_watched_brands). This also withdraws the brand request with the same id. The brand stays in the gallery. Requires templates:write.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        id: { type: "string", description: "The watch ID." },
      },
      required: ["id"],
    },
  },
  {
    name: "list_watched_brand_emails",
    description:
      "Read emails the watched brands sent, newest first, a page at a time: subject, type, subtype, sentAt, collectedAt, brand, url and a breakdown (analysis, null until analyzed). Pass domain for one brand and since for emails sent at or after a time (for example the start of this week). Emails arrive a few hours after they are sent, so when polling set since about a day before the last check and skip ids already seen. Pass nextCursor back as cursor for older emails. Each url also works as the url of create_template_from_example to remix it. Requires templates:read.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        domain: {
          type: "string",
          description:
            "Only this watched brand, by website or domain, such as linear.app.",
        },
        since: {
          type: "string",
          description:
            "Only emails sent at or after this ISO 8601 date or time, such as 2026-10-01 or 2026-10-01T00:00:00Z.",
        },
        limit: {
          type: "number",
          description: "Emails per page, 1 to 60. Defaults to 24.",
        },
        cursor: {
          type: "string",
          description:
            "nextCursor from the previous page, for older emails. Omit for the newest.",
        },
      },
    },
  },
];
