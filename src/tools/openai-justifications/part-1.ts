import type { ToolJustification } from "./types.js";

export const OPENAI_JUSTIFICATIONS_PART_1: Readonly<
  Record<string, ToolJustification>
> = {
  preview_sequence: {
    readOnly:
      "Fetches one saved sequence (nodes, connections, delays, branches and step emails) with GET /sequences/:id and renders it in a preview card; it does not save, activate or enroll anything.",
    destructive:
      "Not destructive: nothing is written, so no sequence, step or enrollment can be changed or lost by opening the preview.",
    openWorld:
      "Not open-world: it reads only the company's own saved sequence from Sequenzy and shows it to the signed-in user; no email is sent and no outside service is contacted.",
  },
  open_image_upload: {
    readOnly:
      "Returns only a UI mode and the companyId so the client can show an image picker; it makes no API call and stores nothing. The actual upload happens only through upload_image_asset after the user submits a file.",
    destructive:
      "Not destructive: opening the picker writes nothing and cannot replace or remove any existing image or email.",
    openWorld:
      "Not open-world: it does not upload, fetch or publish anything; it stays inside the user's ChatGPT session and the company's workspace.",
  },
  monitor_subscriber_import: {
    readOnly:
      "Reads the status of an existing subscriber import with GET /subscribers/imports/:id and lets the card re-read it while it runs; it never starts, retries or cancels an import.",
    destructive:
      "Not destructive: it only polls progress, so no subscriber, list or import record is changed.",
    openWorld:
      "Not open-world: it reads import progress stored in the company's own Sequenzy workspace and contacts no outside service or recipient.",
  },
  get_account: {
    readOnly:
      "Reads the signed-in user's account: accessible companies, the connection's permission scopes and the selected company (GET /account). It creates and updates nothing in the workspace.",
    destructive:
      "Not destructive: no company, key or setting is changed. If the stored company selection points at a company the user can no longer access, that dead selection is cleared so later calls do not fail.",
    openWorld:
      "Not open-world: it reads the user's own Sequenzy account and company memberships only, with no outside service, recipient or public page involved.",
  },
  select_company: {
    readOnly:
      "Writes state: after confirming the company is in the user's account, it stores that companyId as the connection's selected company (Redis, keyed by the connection token) for later calls.",
    destructive:
      "Destructive because it replaces the previous selection, which every later call without an explicit companyId uses, including calls from other chats on the same connection; the old selection is not kept. It refuses companies the user cannot access.",
    openWorld:
      "Not open-world: it only changes which of the user's own Sequenzy companies later calls target; no email, outside service or public page is involved.",
    effects:
      "The selection is stored for this connection and replaces the previous one for every later call without companyId, including calls from other chats on the same connection.",
  },
  get_app_urls: {
    readOnly:
      "Builds dashboard URLs from the IDs passed in and the selected or current company; at most it reads GET /account to find the current company. Nothing is created or changed.",
    destructive:
      "Not destructive: it only formats links and does not touch any campaign, sequence, template or setting.",
    openWorld:
      "Not open-world: the links point at the signed-in user's own Sequenzy dashboard, which requires their login; no public or shareable link is created.",
  },
  create_company: {
    readOnly:
      "Creates a new company (workspace) with default lists, optionally a draft four-email welcome sequence, queues website brand processing, and makes the new company the selected company.",
    destructive:
      "Destructive because it replaces the connection's selected company with the new one for later calls without companyId, and a created workspace cannot be deleted through this connector. The welcome sequence is created as an inactive draft and sends nothing.",
    openWorld:
      "Open-world: when a website domain is given, the queued processing job looks the domain up with brand.dev, an external brand-data provider, and reads the public site to extract logo, colors and product info.",
    effects:
      "Looks up the given website domain with an external brand-data provider (brand.dev), and makes the new company the selected company for later calls without companyId.",
  },
  get_company: {
    readOnly:
      "Fetches one company's details (profile, brand, AI context, email style, branding entitlement, default lists) with GET /companies/:id; no field is written.",
    destructive:
      "Not destructive: it is a plain read, so no company setting, list or email can be changed or lost.",
    openWorld:
      "Not open-world: it returns data stored in the company's own Sequenzy workspace and calls no outside service.",
  },
  update_company: {
    readOnly:
      "Writes the company record (PATCH /companies/:id): brand, AI context, theme, reply tracking, default lists and default sender/reply identity; it can create or rename sender and reply profiles and, with renameMatchingFooters, rewrite footers.",
    destructive:
      "Destructive: each field sent overwrites the stored value with no history, null clears it, and renameMatchingFooters rewrites matching footer blocks in saved emails. fromEmail must be on a verified domain; there is no confirmation or dry-run step.",
    openWorld:
      "Open-world: default sender identity, reply-to, logo, brand colors and theme are applied at send time, so the change alters what recipients of live campaigns, active sequences and transactional emails that use the company defaults see.",
    effects:
      "Changes to sender identity, reply-to, logo, colors and theme apply at send time to live campaigns, active sequences and transactional emails that use the company defaults.",
  },
  get_shopify_automation_settings: {
    readOnly:
      "Reads the browse-abandonment, cart-abandonment and price-drop settings stored on the company's Shopify integration and applies platform defaults for display; nothing is saved.",
    destructive:
      "Not destructive: it is a read of stored settings and cannot change any automation.",
    openWorld:
      "Not open-world: it reads the integration row in Sequenzy's database; it does not call Shopify or contact shoppers.",
  },
  update_shopify_automation_settings: {
    readOnly:
      "Writes the Shopify integration's browse-abandonment, cart-abandonment and price-drop settings (delays, cooldowns, thresholds, on/off) in Sequenzy.",
    destructive:
      "Destructive: provided fields overwrite current values and null resets a whole section to platform defaults, discarding custom values. Turning a section off stops the matching ecommerce events from firing, so sequences built on them stop starting until it is turned back on.",
    openWorld:
      "Open world: an enabled section (or a reset to defaults, which are on) fires browse, cart and price-drop events into the sequences they start, which then email shoppers.",
    effects:
      "Enabled sections fire browse, cart and price-drop events that start sequences emailing shoppers.",
  },
  get_sync_rules: {
    readOnly:
      "Reads the company's stored sync rules (event to tag changes) and returns the effective set plus isDefault; nothing is written.",
    destructive:
      "Not destructive: a read cannot add, remove or change any rule or tag.",
    openWorld:
      "Not open-world: it reads a column on the company's own Sequenzy record and contacts no outside service.",
  },
  update_sync_rules: {
    readOnly:
      "Writes the company's full sync-rule set (PUT /sync-rules), replacing what was stored; [] disables rules and null opts into the platform preset.",
    destructive:
      "Destructive: it is a full replacement, so any rule left out of the payload is deleted with no history or undo; the description tells the caller to fetch with get_sync_rules first. Rules are validated before saving.",
    openWorld:
      "Open world: tags the rules add when matching events arrive start tag_added sequences, which then email those contacts.",
    effects:
      "Tags the rules add on later events start tag_added sequences that can email those contacts.",
  },
  get_email_design_system: {
    readOnly:
      "Reads the company's emailDesignPrompt and returns the parsed design tokens and composition spine; nothing is saved.",
    destructive:
      "Not destructive: it only parses stored text and cannot change the design direction.",
    openWorld:
      "Not open-world: it reads the company's own Sequenzy record; no outside service is contacted.",
  },
  update_email_design_system: {
    readOnly:
      "Writes the company's emailDesignPrompt direction text (PATCH /email-design-system) by prepending the new design-code and spine sentences, or clears it with reset.",
    destructive:
      "Destructive: changed tokens overwrite the stored identity sentences and reset: true clears the whole direction text, with no saved history to restore it. Custom prose is preserved on partial updates; reset cannot be combined with adjustments.",
    openWorld:
      "Not open-world: the direction text is read only by Sequenzy's AI writer for future generations; existing and live emails are not re-rendered and nothing is sent or fetched.",
  },
  get_design_md: {
    readOnly:
      "Builds the company's design.md from stored brand columns (logo, colors, fonts, theme, voice, design direction) and returns it with a version; nothing is written.",
    destructive:
      "Not destructive: it only assembles a document from stored values.",
    openWorld:
      "Not open-world: it reads the company's own Sequenzy record and calls no outside service.",
  },
  update_design_md: {
    readOnly:
      "Writes changed design.md values back to the company's brand columns: logo URL, theme, fonts, colors, voice and design direction (PUT /design-md), unless dryRun is true.",
    destructive:
      "Destructive: changed values overwrite stored brand settings and an empty Voice or Design direction section clears it. Safeguards: dryRun previews changes without saving, and expectedVersion makes a stale write fail with 409; unchanged values are not written.",
    openWorld:
      "Open world: the logo, colors and theme it saves are applied at send time to live emails that have no theme of their own, so recipients of running sequences and campaigns see the change.",
    effects:
      "The saved logo, colors and theme apply at send time to live emails that have no theme of their own.",
  },
  list_sending_domains: {
    readOnly:
      "Lists the company's sending domains with stored DNS verification and readiness from the database (GET /websites); it does not run a DNS check or change status.",
    destructive:
      "Not destructive: a read cannot add, verify or remove any domain.",
    openWorld:
      "Not open-world: it returns stored domain records from the company's workspace; fresh DNS lookups happen only in verify_sending_domain.",
  },
  add_sending_domain: {
    readOnly:
      "Creates a sending domain for the company with its DNS records, a sender profile, a reply profile when none exists, and the company tracking domain on its root when none exists (POST /websites).",
    destructive:
      "Destructive because the domain is bound to this company permanently: it cannot be moved or removed through the API or this connector afterwards, so a wrong company choice cannot be undone here. The description says to confirm the target company first.",
    openWorld:
      "Open-world: it publishes Sequenzy-side DKIM and bounce DNS records in Sequenzy's public Route 53 zone for the domain and queues an automated risk review of the domain; the user then publishes records in their public DNS.",
    effects:
      "Publishes Sequenzy-side DNS records for the domain in Sequenzy's public DNS zone, queues an automated domain risk review, and creates a sender profile for the domain.",
  },
  get_sending_domain: {
    readOnly:
      "Reads one sending domain's stored DNS verification and sending readiness (GET /websites/:domain); it does not re-check DNS or change status.",
    destructive: "Not destructive: it is a plain read of one domain record.",
    openWorld:
      "Not open-world: it returns stored state only; live DNS lookups are left to verify_sending_domain.",
  },
  verify_sending_domain: {
    readOnly:
      "Writes verification state: it runs a fresh DNS check and saves the new status, and a sending-ready domain can be promoted to the company default sender (POST /websites/:domain/verify).",
    destructive:
      "Destructive: a failing check can mark a previously verified domain unverified, and a passing check can make its sender the company default and repoint saved emails that used a built-in sender. There is no dry-run; the check runs immediately.",
    openWorld:
      "Open-world: it queries public DNS for the domain's records, and a resulting default-sender change alters the From identity recipients see on later sends.",
    effects:
      "Saves the new status: a failing check can unverify the domain, and a sending-ready domain can become the company's default sender, repointing saved emails that used a built-in sender.",
  },
  upgrade_sending_domain_dns: {
    readOnly:
      "Starts the domain's upgrade to the per-domain DNS records: it publishes the new records in Sequenzy's zone and stores the CNAMEs to add (POST /websites/:domain/dns-upgrade).",
    destructive:
      "Destructive: an upgrade cannot be cancelled once started, and after the customer publishes the CNAMEs the domain switches its DKIM selector and return path by itself, which changes how its live mail is signed.",
    openWorld:
      "Open-world: it writes records to Sequenzy's public Route 53 zone and checks the customer's public DNS for free names; the customer then edits their own DNS.",
  },
  configure_sending_domain: {
    readOnly:
      "Writes the company tracking domain as <trackingPrefix>.<domain> when the company has none (PATCH /websites/:domain); when one exists it changes nothing.",
    destructive:
      "Additive: it claims a tracking hostname only when the company has none and never replaces or removes an existing one; any other call is a deprecated no-op.",
    openWorld:
      "Open-world: the claimed hostname is registered with Cloudflare, the tracking provider, by the background verification sweep, and once verified it appears in tracked links that recipients click.",
    effects:
      "When the company has no tracking domain, the background verification sweep registers the new hostname with Cloudflare; once verified, tracked links in new emails use it.",
  },
  list_integrations: {
    readOnly:
      "Lists the company's integration records (provider, status, sync state, last sync time and error) from Sequenzy's database; credentials are never returned and nothing is changed.",
    destructive:
      "Not destructive: a read cannot connect, disconnect or resync anything.",
    openWorld:
      "Not open-world: it reads stored integration rows and does not call any provider API.",
  },
  list_sender_profiles: {
    readOnly:
      "Lists the company's sender and reply-to profiles with default flags and stored DNS and transport readiness (GET /sender-profiles); nothing is written.",
    destructive:
      "Not destructive: it is a read and cannot rename, delete or reassign any profile.",
    openWorld:
      "Not open-world: it returns profiles stored in the company's workspace and contacts no outside service.",
  },
  update_sender_profile: {
    readOnly:
      "Writes one sender or reply-to profile's display name (PATCH /sender-profiles/:id or /reply-profiles/:id); the address and default selection stay unchanged.",
    destructive:
      "Destructive: the old display name is overwritten with no history, and every campaign, sequence and transactional email pinned to the profile picks up the new name immediately. A rename that collides with another identity on the same address is rejected.",
    openWorld:
      "Open-world: the display name is the From or Reply-To name recipients see, so live campaigns, active sequences and transactional sends pinned to the profile change for real recipients.",
  },
  delete_sender_profile: {
    readOnly:
      "Deletes one sender profile and reassigns draft campaigns, code-managed transactional emails and the account default to the best remaining sender (DELETE /sender-profiles/:id).",
    destructive:
      "Destructive: the profile is permanently deleted with no undo. Safeguards: it refuses to delete the last sender or one used by a live campaign, active sequence or step override, or transactional email, and reports the fallback sender it assigned.",
    openWorld:
      "Open world: when the deleted profile was the account default or used by code-managed transactional emails, later sends to recipients go out under the fallback From identity.",
    effects:
      "If it was the account default or used by code-managed transactional emails, later sends go out under the fallback From identity.",
  },
  get_sending_status: {
    readOnly:
      "Reads the company's sending state, pause reason, enforcement counts, thresholds and self-resume gate (GET /sending-status); nothing is changed.",
    destructive:
      "Not destructive: it only diagnoses status and cannot pause, resume or alter suppressions.",
    openWorld:
      "Not open-world: it reads the company's own sending records in Sequenzy and contacts no outside service.",
  },
  resume_sending: {
    readOnly:
      "Writes state: it restores paused company sending, records the user's list-clean confirmation on the audit trail, resets the bounce watermark and requeues paused campaigns and due sequence steps.",
    destructive:
      "Destructive: once requeued, paused campaigns and sequence steps go out to recipients and cannot be recalled, and the bounce watermark reset cannot be undone. Safeguards: listSanitizationConfirmed must be true, owner/admin access is required, and it only works when the self-resume gate is open.",
    openWorld:
      "Open-world: on success the requeued campaigns and due sequence emails are delivered to the company's real subscribers.",
  },
  get_tracking_domain: {
    readOnly:
      "Reads the stored company tracking domain (hostname, status, CNAME, last check) from Sequenzy's database; nothing is written.",
    destructive:
      "Not destructive: a read cannot set, verify or remove the tracking domain.",
    openWorld:
      "Not open-world: it returns stored state only and does not query DNS or Cloudflare.",
  },
  set_tracking_domain: {
    readOnly:
      "Writes the company tracking domain (PUT /tracking-domain) after registering the hostname as a Cloudflare custom hostname; repeating the current hostname only rechecks it.",
    destructive:
      "Destructive: a different hostname replaces the company's tracking domain for new emails and restarts verification, so new links use the shared domain until it verifies. The previous hostname is kept serving links already sent; a bare root domain or a hostname held by another company is rejected.",
    openWorld:
      "Open-world: it creates a custom hostname with Cloudflare, the tracking provider, which issues a public HTTPS certificate, and the hostname then appears in tracked links recipients click.",
    effects:
      "Registers the hostname as a custom hostname with Cloudflare, the tracking provider, which issues its HTTPS certificate.",
  },
  verify_tracking_domain: {
    readOnly:
      "Writes verification state: it checks the tracking domain's CNAME and certificate now and saves the resulting status (POST /tracking-domain/verify).",
    destructive:
      "Destructive: a failed check can mark a previously verified tracking domain failed, after which new emails fall back to the shared Sequenzy tracking domain until it passes again. It requires an existing tracking domain and runs immediately, with no dry-run.",
    openWorld:
      "Open-world: it queries public DNS and Cloudflare's custom-hostname and certificate status for the customer's hostname.",
    effects:
      "Queries public DNS and Cloudflare; a failed check can mark a verified tracking domain failed, so new emails use the shared Sequenzy tracking domain.",
  },
  remove_tracking_domain: {
    readOnly:
      "Deletes the company tracking domain record and its Cloudflare custom hostname (DELETE /tracking-domain).",
    destructive:
      "Destructive: the Cloudflare hostname is deleted, so tracked links, images and opens in emails already sent through it stop working permanently; re-adding starts verification from scratch. The description asks for user confirmation; the tool has no confirm parameter.",
    openWorld:
      "Open-world: it deletes the hostname at Cloudflare, and recipients clicking links in already-sent emails reach a dead link.",
  },
  get_frequency_cap: {
    readOnly:
      "Reads the company's stored frequency cap (maxEmails, windowHours) or null; nothing is changed.",
    destructive:
      "Not destructive: a read cannot change which emails are skipped.",
    openWorld:
      "Not open-world: it reads two columns on the company's Sequenzy record.",
  },
  set_frequency_cap: {
    readOnly:
      "Writes the company frequency cap (PUT /frequency-cap), replacing any existing maxEmails and windowHours.",
    destructive:
      "Destructive: it overwrites the previous cap, and from the next email step a contact at the cap has that step skipped in sequences with frequencyCapEnabled; a skipped email is not sent later. Campaigns and transactional emails are never skipped.",
    openWorld:
      "Open world: raising or loosening the cap lets sequence emails reach contacts that the previous cap would have skipped; tightening it stops some of them.",
    effects:
      "A sequence email step skipped under the cap is not sent later; the contact moves on to the next step.",
  },
  clear_frequency_cap: {
    readOnly:
      "Deletes the company frequency cap setting (DELETE /frequency-cap); sequences keep their frequencyCapEnabled flag.",
    destructive:
      "Destructive: the stored cap values are removed and must be re-entered with set_frequency_cap, and until then sequence steps that the cap would have skipped are sent.",
    openWorld:
      "Open world: with no cap, sequence emails that the cap would have skipped are delivered to contacts.",
    effects:
      "Sequence emails the cap would have skipped are delivered once it is cleared.",
  },
  get_tracking_settings: {
    readOnly:
      "Reads the company's tracking, attribution, UTM, reply-tracking and double opt-in settings plus stored tracking-domain status; nothing is written.",
    destructive: "Not destructive: it is a read of stored settings.",
    openWorld:
      "Not open-world: it returns data from the company's Sequenzy record and does not query DNS or any provider.",
  },
  update_tracking_settings: {
    readOnly:
      "Writes the company's open/click/unsubscribe tracking, bot filtering, attribution window, auto-UTM, content storage and double opt-in settings (PATCH /tracking-settings).",
    destructive:
      "Destructive: provided fields overwrite current settings with no history, and every email sent afterwards follows the new values (links, tracking pixels, UTM tags); already-sent emails keep their links. At least one field is required.",
    openWorld:
      "Open-world: the settings change the links and tracking in live emails recipients receive, and turning on double opt-in makes new contacts receive a confirmation email before they are subscribed.",
    effects:
      "Turning on double opt-in makes new contacts receive a confirmation email before they are subscribed.",
  },
  get_notification_preferences: {
    readOnly:
      "Reads the calling user's own notification settings for the company plus supported modes and role defaults; nothing is written and teammates' settings are not read.",
    destructive:
      "Not destructive: a read cannot change which notifications are sent.",
    openWorld:
      "Not open-world: it reads the user's own preferences stored in Sequenzy.",
  },
  update_notification_preferences: {
    readOnly:
      "Writes the calling user's own notification modes for this company (PATCH /notification-preferences).",
    destructive:
      "Destructive: the given modes overwrite the stored ones, and turning a notification off means those alerts or reports are not sent for that period; missed notifications are not delivered later. Only the caller's own settings change; invalid modes are rejected.",
    openWorld:
      "Not open-world: it only controls which Sequenzy account emails go to the signed-in user's own inbox; no subscriber or outside party is contacted.",
  },
  get_integration_guide: {
    readOnly:
      "Returns static code examples for a framework and use case; the POST carries only the selection and nothing is saved.",
    destructive:
      "Not destructive: it generates reference text and changes no data.",
    openWorld:
      "Not open-world: the examples come from Sequenzy's built-in guide; it fetches no URL and calls no outside service.",
  },
  get_account_health: {
    readOnly:
      "Reads the company's account health report: eligibility, settings, latest run, and open and snoozed insights with suggested actions and the caller's own feedback. It writes nothing.",
    destructive:
      "Not destructive: it lists findings and suggested actions but performs none of them.",
    openWorld:
      "Not open-world: it reads stored health runs and insights from the company's workspace and contacts no outside service.",
  },
  update_account_health_settings: {
    readOnly:
      "Writes the company's account health settings: whether the weekly check runs and whether it may draft fixes (PATCH /account-health/settings).",
    destructive:
      "Destructive: the settings are overwritten, and disabling stops the weekly checks so findings for those weeks are never produced. Checks never send subscriber email or activate anything; draft_fixes only creates inactive drafts. Owner or admin only.",
    openWorld:
      "Open world: enabling checks schedules weekly runs whose agent can read pages from the company's own public website through a page fetcher, like run_account_health_check.",
    effects:
      "Enabled checks run weekly, and their AI agent can read pages on the company's website.",
  },
  run_account_health_check: {
    readOnly:
      "Writes state: it queues an account health check run that records a new run, uses AI to analyse the account, and resolves, reopens or updates findings (POST /account-health/runs).",
    destructive:
      "Destructive: the run rewrites existing findings (resolving, reopening or updating them) and, with draft_fixes autonomy, creates draft sequences. It never sends the report email or activates anything; it is limited to one run per 10 minutes and returns an in-progress run instead of starting another.",
    openWorld:
      "Open-world: the check's AI agent can fetch pages from the company's public website to ground its findings.",
    effects:
      "The check's AI agent can read pages on the company's website; the run resolves, reopens or rewrites existing findings and, with draft_fixes autonomy, creates inactive draft sequences.",
  },
  update_account_health_insight: {
    readOnly:
      "Writes one insight's status: dismiss, snooze for N days, resolve or reopen (PATCH /account-health/insights/:id).",
    destructive:
      "Destructive: dismiss hides the finding for good and cannot be undone with reopen, which only restores snoozed or resolved findings. Snooze and resolve are reversible; unknown insights return 404.",
    openWorld:
      "Not open-world: it changes triage state of a finding inside the company's workspace and contacts no one.",
  },
  submit_account_health_feedback: {
    readOnly:
      "Writes the caller's useful/not_useful rating and optional comment on one insight, and forwards it to the Sequenzy team; workspace data is not changed.",
    destructive:
      "Destructive: submitting again replaces the caller's earlier rating, and comment null clears the earlier comment; there is no history. Only the caller's own answer is affected and the insight itself is not changed.",
    openWorld:
      "Open-world: the rating and comment are sent as a notification to the Sequenzy team's Telegram chat, outside the customer's workspace.",
    effects:
      "The rating and comment are sent to the Sequenzy team's Telegram chat.",
  },
  create_account_health_fix: {
    readOnly:
      "Creates one inactive draft sequence from an unhandled_event or missing_sequence insight and queues AI writing of its empty email steps (POST /account-health/insights/:id/fix).",
    destructive:
      "Not destructive: it only adds a draft; a repeat returns the same draft and writes only steps that still have no email, never rewriting existing ones. The sequence stays inactive until the user enables it.",
    openWorld:
      "Not open-world: the draft and its AI-written emails stay inside the company's workspace; nothing is sent, published or fetched from outside.",
  },
  get_email_ai_style: {
    readOnly:
      "Reads the company's saved AI email appearance and its revisionId; nothing is written.",
    destructive: "Not destructive: a read cannot replace or clear the style.",
    openWorld: "Not open-world: it reads the company's own Sequenzy record.",
  },
  save_email_ai_style: {
    readOnly:
      "Writes the company's default AI appearance captured from one of its emails (PUT /email-ai-style); the source email and existing emails are not modified.",
    destructive:
      "Destructive: it replaces the current saved style with no history. Safeguard: expectedStyleId is required (null only for the first save), so a stale write fails with a conflict instead of overwriting a newer style.",
    openWorld:
      "Not open-world: the style is used only by Sequenzy's AI writer for future generations; nothing is sent or fetched.",
  },
  clear_email_ai_style: {
    readOnly:
      "Deletes the company's saved AI appearance (DELETE /email-ai-style) so future generations use normal defaults; existing emails are unchanged.",
    destructive:
      "Destructive: the saved style is removed and can only be recreated by saving again from an email. Safeguard: expectedStyleId is required and a mismatch fails with a conflict that must not be retried automatically.",
    openWorld:
      "Not open-world: it changes only an internal AI-generation setting; no email is sent or re-rendered.",
  },
  disconnect_integration: {
    readOnly:
      "Writes state: it marks a Lemon Squeezy integration inactive, revokes its installation and deletes its managed webhook at Lemon Squeezy.",
    destructive:
      "Destructive: live ingestion and sync stop immediately and the managed provider webhook is deleted, so events during the gap are not received; reconnecting is needed to resume. Manual webhooks remain; other providers are refused. Owner/admin and integrations:manage required.",
    openWorld:
      "Open-world: it calls the Lemon Squeezy API with the stored credentials to delete the managed webhook on the customer's store.",
  },
  get_integration: {
    readOnly:
      "Reads one integration's stored detail (events, tag rules, listening sequences, 24h activity, recommendations) plus live provider state; it writes nothing and returns no credentials.",
    destructive:
      "Not destructive: it is a diagnostic read and cannot change the connection or its settings.",
    openWorld:
      "Open-world: for Shopify it reads the storefront pixel state from the Shopify Admin API, and for Attio it reads the live people-list catalog from Attio, using the stored credentials.",
    effects:
      "For Shopify and Attio integrations it reads the store's pixel state and the Attio list catalog live from those providers' APIs.",
  },
  list_integration_capabilities: {
    readOnly:
      "Returns Sequenzy's static provider catalog (category, events, attributes, actions, caveats), optionally filtered; nothing is written.",
    destructive:
      "Not destructive: it describes what providers offer and connects nothing.",
    openWorld:
      "Not open-world: the catalog is built into Sequenzy; it calls no provider API.",
  },
  list_integration_suggestions: {
    readOnly:
      "Reads the integration suggestions Sequenzy stored while onboarding the company's website and filters out connected providers; nothing is written.",
    destructive: "Not destructive: it suggests providers and connects nothing.",
    openWorld:
      "Not open-world: it reads data Sequenzy already stored and does not fetch the website or call any provider.",
  },
  list_integration_activity: {
    readOnly:
      "Reads the company's integration webhook and sync activity log from the last 24 hours, filtered by integration, provider or status; nothing is written.",
    destructive:
      "Not destructive: a log read cannot replay, retry or delete activity.",
    openWorld:
      "Not open-world: it reads sanitized log rows stored in Sequenzy and contacts no provider.",
  },
  set_integration_sync_enabled: {
    readOnly:
      "Writes the integration's syncEnabled flag in Sequenzy (PATCH /integrations/:id), which turns future bulk imports and backfills on or off.",
    destructive:
      "Destructive: disabling stops future full imports and backfills, so data that changes meanwhile is not backfilled until re-enabled; it does not disconnect or stop live webhooks. Same state returns changed: false; requires integrations:manage and an idle sync.",
    openWorld:
      "Open world: enabling sync resumes background imports that call the provider's API and add or update contacts, like sync_integration; disabling stops them.",
    effects:
      "Enabling resumes background imports from the provider, which add or update contacts.",
  },
  set_integration_list_targeting: {
    readOnly:
      "Writes which lists an integration's newly created contacts join (PATCH /integrations/:id with listIds) in Sequenzy.",
    destructive:
      "Destructive: the new targeting replaces the old one for all future provider writes, changing which lists, and so which list-based campaigns and sequences, new contacts reach; contacts added earlier are not moved back. Same state returns changed: false; unsupported providers are rejected.",
    openWorld:
      "Open world: contacts the integration syncs later join the chosen lists, which starts those lists' contact_added sequences and emails them.",
    effects:
      "Contacts synced later join the chosen lists and can start those lists' contact_added sequences.",
  },
  get_integration_pixel: {
    readOnly:
      "Reads the Shopify storefront pixel's installed state and health live from Shopify; nothing is installed or saved.",
    destructive:
      "Not destructive: it only inspects the pixel and changes nothing on the store or in Sequenzy.",
    openWorld:
      "Open-world: every call queries the merchant's store through the Shopify Admin API using the stored access token.",
  },
  activate_integration_pixel: {
    readOnly:
      "Writes to the merchant's Shopify store: it installs the Sequenzy web pixel or repoints an existing one at this account.",
    destructive:
      "Destructive: repointing overwrites an existing pixel's configuration on the store, so events stop going to whatever account it pointed at before. It first reads the live state, makes no change if Shopify cannot confirm it, and returns changed: false when already live.",
    openWorld:
      "Open-world: it writes a web pixel to the merchant's live Shopify storefront through the Shopify Admin API, which then runs for every storefront visitor.",
  },
  sync_integration: {
    readOnly:
      "Writes state: it queues a background re-sync (customers and revenue, Supabase user backfill, or PostHog/Segment event history) that creates or updates subscribers and events.",
    destructive:
      "Destructive: the sync writes provider data onto subscribers, replacing previously synced attribute and revenue values, and a history import restarts from the beginning. Safeguards: it refuses while a sync is queued or running and already-imported history events dedupe.",
    openWorld:
      "Open-world: the background job calls the external provider's API (Stripe, Supabase, PostHog, Segment and others) with the stored credentials.",
    effects:
      "Synced provider data replaces subscribers' previously synced attribute and revenue values.",
  },
  get_attio_mapping: {
    readOnly:
      "Reads the saved two-way Attio sync maps, inbound webhook health, and the live Attio people-list catalog; nothing is saved and the token is not returned.",
    destructive:
      "Not destructive: it only reads the mapping and Attio's lists.",
    openWorld:
      "Open-world: each call queries the customer's Attio workspace through the Attio API with the stored access token.",
  },
  update_amplitude_settings: {
    readOnly:
      "Writes the Amplitude integration's event scope (syncAllEvents, eventAllowlist, skipInternalEvents) in Sequenzy; the webhook secret is untouched.",
    destructive:
      "Destructive: events outside the new scope are dropped as they arrive and are not replayed if the scope widens later. Nothing already recorded is deleted.",
    openWorld:
      "Open-world: the scope decides which events Amplitude's webhook deliveries record on Sequenzy subscribers and which automations they can start.",
  },
  update_attio_settings: {
    readOnly:
      "Writes the Attio integration's sync maps, syncRemovals, and/or syncCompanyFromDomain in Sequenzy after loading the live Attio list catalog, and creates, updates, or deletes the Attio webhook that inbound maps need.",
    destructive:
      "Destructive: each map is a full replacement, so mappings left out stop syncing; {} clears a map. Turning on syncRemovals lets later removals on one side remove people on the other. Saving does not remove or backfill anyone by itself, and an unchanged request returns changed: false.",
    openWorld:
      "Open-world: it reads the customer's Attio lists and manages a webhook through the Attio API, and the saved maps decide which contacts Sequenzy later writes into Attio and which Attio changes update Sequenzy subscribers.",
  },
  get_event_sample: {
    readOnly:
      "Reads the latest stored event with the given name in the company's workspace (GET /events/sample); it fires no event and changes no test recipient.",
    destructive: "Not destructive: it is a read of recorded event data.",
    openWorld:
      "Not open-world: it reads events already stored in the company's Sequenzy workspace.",
  },
  get_event_schema: {
    readOnly:
      "Returns Sequenzy's static published payload reference for built-in events (GET /events/schemas); nothing is read from or written to the account.",
    destructive:
      "Not destructive: it returns reference data and changes nothing.",
    openWorld:
      "Not open-world: the schemas are built into Sequenzy; no provider or URL is contacted.",
  },
};
