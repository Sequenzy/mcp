import type { ToolJustification } from "./types.js";

export const OPENAI_JUSTIFICATIONS_PART_6: Readonly<
  Record<string, ToolJustification>
> = {
  list_campaign_events: {
    readOnly:
      "Lists stored email events (deliveries by default, or opens, clicks, bounces and other types) for one campaign through a GET request; it changes no campaign, contact or event data.",
    destructive:
      "Nothing is created, changed or deleted; the tool only pages through events that were already recorded.",
    openWorld:
      "Reads only the company's own campaign event history held by Sequenzy; it sends nothing and contacts no outside service or recipient.",
  },
  list_sequence_events: {
    readOnly:
      "Lists stored per-recipient email events for a sequence's email steps, or one step via automationNodeId, through a GET request; enrollments and steps are left unchanged.",
    destructive:
      "Purely a read of recorded events; no sequence, step, enrollment or event is modified or removed.",
    openWorld:
      "Bounded to the company's own sequence event history inside Sequenzy; no email is sent and no external system is called.",
  },
  list_email_metrics: {
    readOnly:
      "Returns aggregated per-email delivery funnels, conversions and revenue for campaigns and sequence steps via GET /api/v1/metrics; it only computes totals from retained events.",
    destructive:
      "No record is written; filters, sorting and paging only shape the read-only metrics result.",
    openWorld:
      "Aggregates the company's own campaign and sequence metrics stored by Sequenzy; nothing leaves the workspace and no recipient is contacted.",
  },
  get_subscriber_activity: {
    readOnly:
      "Fetches one contact by email or externalId and returns its recent activity, email stats and sequence enrollments; the contact record itself is not changed.",
    destructive:
      "A lookup only; no contact field, tag, enrollment or event is written or removed.",
    openWorld:
      "Reads a single contact's history inside the company's workspace; it does not email the contact or call any third party.",
  },
  list_team_members: {
    readOnly:
      "Lists the company owner, members with their roles, and pending or expired invitations via GET /api/v1/team; roles and invitations are not modified.",
    destructive:
      "Read-only listing; no member, role or invitation is added, changed or cancelled.",
    openWorld:
      "Returns the company's own team roster from Sequenzy; no invitation email is sent and no outside service is contacted.",
  },
  invite_team_member: {
    readOnly:
      "Writes team access: it inserts a member row for an existing Sequenzy user, or creates or reissues an invitation row and emails the invitee.",
    destructive:
      "The invitation email cannot be recalled once sent, and an existing Sequenzy user gets workspace access immediately without accepting. Reissuing an expired or cancelled invitation rotates its token, so the old link stops working. Only owners or admins may invite; only the owner grants billing.",
    openWorld:
      "Sends an invitation email to the address supplied, which can be anyone outside the company.",
    effects:
      "Existing Sequenzy users gain access at once with no acceptance step; reissuing an expired or cancelled invitation replaces its link.",
  },
  cancel_team_invitation: {
    readOnly:
      "Updates the invitation row to status cancelled with a cancelledAt time; it is a state change, not a read.",
    destructive:
      "The invitee's link stops working permanently: a cancelled invitation cannot be reinstated and a new invitation is required (with a resend cooldown). Accepted or already cancelled invitations are refused; owner or admin only.",
    openWorld:
      "Only changes the invitation record in the company's workspace; no email is sent to the invitee or anyone else.",
    effects:
      "A cancelled invitation cannot be restored; inviting the address again creates a new invitation link.",
  },
  get_inbox_address: {
    readOnly:
      "Reads the company's default and branded inbox addresses, receiving status, attachment storage and retention settings via GET; nothing is saved.",
    destructive:
      "Read-only; no address, domain or retention setting is changed.",
    openWorld:
      "Returns the company's own inbox configuration from Sequenzy; no DNS lookup, email or external call is made.",
  },
  update_inbox_address: {
    readOnly:
      "Writes the company's branded inbox address (inboxLocalPart and inboxDomainId), or clears both with reset.",
    destructive:
      "Replaces the branded address the team shares without keeping the old value; on an older inbound host shared by several workspaces, mail to the old address stops reaching this inbox. The domain must be the company's own, the address untaken, and the description asks for user confirmation.",
    openWorld:
      "Open world: naming a verified sending domain that has no receiving domain yet registers its inbound host with Amazon SES, an outside service, like add_receiving_domain.",
    effects:
      "Naming a verified sending domain that has no receiving domain yet creates a pending receiving domain on its inbound host and registers it with Amazon SES.",
  },
  list_conversations: {
    readOnly:
      "Lists inbox conversations with filters and pagination via GET /api/v1/conversations; listing does not mark anything read or change status.",
    destructive:
      "Read-only; no conversation, message, read flag or spam flag is changed.",
    openWorld:
      "Reads conversations already stored in the company's inbox; it sends no reply and contacts no external system.",
  },
  get_conversation: {
    readOnly:
      "Fetches one conversation with its message history, subscriber details and context via GET; it does not mark messages read (mark_conversation_read does that).",
    destructive: "Read-only; no message, status or read state is altered.",
    openWorld:
      "Reads the company's own conversation. Attachment downloadUrls are short-lived signed links to the company's stored files, returned only to the caller and expiring in one hour; nothing is published or sent.",
  },
  reply_to_conversation: {
    readOnly:
      "Inserts a message in the conversation, updates its counters and last-message fields, reopens a closed conversation on outbound replies, and enqueues an email send.",
    destructive:
      "An outbound reply is emailed to the subscriber and cannot be recalled; each successful call sends another email, so a retried call duplicates it. Mode 'note' only adds a private team note.",
    openWorld:
      "Outbound mode (the default) delivers email to the conversation's external contact, optionally from a chosen sender profile and with attachments.",
  },
  update_conversation_status: {
    readOnly:
      "Writes the conversation's status (open or closed) and records a status event; it is a state change.",
    destructive:
      "Overwrites the current status; closing can hide the conversation from the open queue teammates work from. It is reversible by calling again with the other status, and nothing is deleted.",
    openWorld:
      "Changes only the conversation record in the company's inbox; no email is sent to the contact.",
  },
  bulk_update_conversation_status: {
    readOnly:
      "Writes the status of up to 100 conversations at once, rewriting only those whose status differs.",
    destructive:
      "Overwrites the status of every listed conversation in one call, so a wrong ID list can close many active threads at once. Reversible with the opposite status; rows already in the target status and IDs from other companies are left untouched.",
    openWorld:
      "Bounded to the company's own conversations (other companies' IDs return notFound); no message is sent to anyone.",
  },
  bulk_update_conversation_spam: {
    readOnly:
      "Writes the spam flag on up to 100 conversations, moving them into or out of the Spam folder.",
    destructive:
      "Overwrites the folder placement of each listed conversation; spam conversations drop out of normal lists and recipient filters. Reversible with spam false; unchanged and other-company IDs are skipped.",
    openWorld:
      "Only flips isSpam on the company's own conversation rows; it reports nothing to any outside spam service and sends no email.",
  },
  list_conversation_recipients: {
    readOnly:
      "Returns the distinct inbox addresses the company's non-spam conversations started at, via GET; nothing is written.",
    destructive:
      "Read-only listing; no conversation or address setting is changed.",
    openWorld:
      "Queries the company's own conversations in Sequenzy; no external lookup or email is involved.",
  },
  mark_conversation_read: {
    readOnly:
      "Sets isRead, readAt and readBy on every unread inbound message and clears the conversation's hasUnread flag.",
    destructive:
      "Overwrites the read state of all unread inbound messages; mark_conversation_unread restores the unread flag only on the latest received message, so per-message unread state for earlier messages is lost.",
    openWorld:
      "Updates read flags inside the company's inbox only; the sender is not notified and no read receipt is sent.",
    effects:
      "Records the caller as reader on each message; mark_conversation_unread re-flags only the latest received message.",
  },
  mark_conversation_unread: {
    readOnly:
      "Clears isRead, readAt and readBy on the latest received message and sets the conversation's hasUnread flag.",
    destructive:
      "Overwrites the latest message's read record (who read it and when is cleared); reversible with mark_conversation_read, but the original reader and time are not restored.",
    openWorld:
      "Changes inbox state for the company's team only; no email or notification goes to the contact.",
  },
  forward_conversation_message: {
    readOnly:
      "Creates a system message recording the forward and enqueues an email carrying the selected message and its stored attachments.",
    destructive:
      "The forwarded email, including attachments that may hold a contact's personal data, cannot be recalled; each call sends another copy. Notes cannot be forwarded.",
    openWorld:
      "Emails a copy to any address given in 'to', which can be outside the company.",
  },
  list_receiving_domains: {
    readOnly:
      "Lists the company's receiving domains with status and records via GET; it does not run a DNS check or change status.",
    destructive: "Read-only; no domain is added, verified or removed.",
    openWorld:
      "Returns stored receiving-domain rows from Sequenzy without querying DNS or Amazon SES.",
  },
  add_receiving_domain: {
    readOnly:
      "Inserts a receiving domain row, may switch the company's reply domain mode to custom, and runs a first check that stores SES and DNS status.",
    destructive:
      "Once the first receiving domain verifies, every later email's reply address moves to it. Adding can also delete another workspace's expired, unverified claim on the name. Safeguards: owner or admin only, one domain per workspace (409), and refusal when the domain already has a mailbox.",
    openWorld:
      "Looks up the domain's MX records in public DNS and requests an ownership token from Amazon SES receiving for it.",
  },
  get_receiving_domain: {
    readOnly:
      "Reads one stored receiving domain's status, DNS records, error and claim expiry via GET; no check is triggered.",
    destructive:
      "Read-only; the domain row and its status are left as they are.",
    openWorld: "Returns stored data only; it does not query DNS or Amazon SES.",
  },
  verify_receiving_domain: {
    readOnly:
      "Runs a DNS and SES check and writes the result to the domain row; the first success can turn Inbox on.",
    destructive:
      "A failed check on a verified domain (confirmed by a second lookup) marks it failed, so new reply addresses stop using it; a first successful check turns Inbox on. Owner or admin only; already-arriving mail is still accepted.",
    openWorld:
      "Queries public DNS for the domain's MX record and checks or creates the receiving setup in Amazon SES.",
    effects:
      "A failed check on a verified domain marks it failed, and new reply addresses fall back to Sequenzy's shared address until it is fixed.",
  },
  remove_receiving_domain: {
    readOnly:
      "Deletes the receiving domain row, clears a branded inbox address on it, and releases its SES receipt rule and identity.",
    destructive:
      "Irreversible for mail in transit: all mail to the domain stops, including replies to emails already sent with reply addresses on it, and the branded address is cleared. Safeguards: owner or admin only, and the description requires user confirmation.",
    openWorld:
      "Deletes the domain's receipt rule and receiving-only identity in Amazon SES; contacts replying to earlier emails on that domain are affected.",
  },
  list_web_tracking_keys: {
    readOnly:
      "Lists the company's publishable web tracking keys with allowed origins, last-used time and install snippet; nothing is created or revoked.",
    destructive: "Read-only; no key, origin list or active flag is changed.",
    openWorld:
      "Returns the company's stored key settings from Sequenzy; it contacts no website and accepts no events.",
  },
  get_web_tracking_key: {
    readOnly:
      "Fetches one web tracking key with its install snippet and ingest endpoint via GET; the key is not modified.",
    destructive:
      "Read-only; the key's name, origins and status stay as they are.",
    openWorld:
      "Reads a stored key; the snippet is returned to the caller and nothing is deployed or published by the tool.",
  },
  create_web_tracking_key: {
    readOnly:
      "Creates a new publishable key row with its allowed origins and app IDs and returns the install snippet.",
    destructive:
      "Purely additive: a new key is inserted and no existing key, contact or setting is changed. A publishable key alone cannot trigger automations.",
    openWorld:
      "The key is meant to be embedded in the customer's public website or mobile app and accepts events from the internet; with no allowedOrigins and no allowedAppIds it accepts anonymous events from any site or app.",
  },
  update_web_tracking_key: {
    readOnly:
      "Writes the key's name, replaces its allowedOrigins or allowedAppIds list, or sets isActive to revoke or reactivate it.",
    destructive:
      "allowedOrigins and allowedAppIds each replace the whole list, so entries left out stop being accepted; isActive false rejects events from deployed snippets within about a minute. The key value is preserved, so revocation is reversible.",
    openWorld:
      "Controls which public websites and apps can send events with a key that lives in site HTML or app binaries; empty allowedOrigins and allowedAppIds lists open it to events from any site or app.",
    effects:
      "Empty allowedOrigins and allowedAppIds lists let any website or app send events with the key.",
  },
  delete_web_tracking_key: {
    readOnly: "Permanently deletes the web tracking key row.",
    destructive:
      "Irreversible: the key cannot be recovered, and after about one minute events from any snippet still using it are rejected and never backfilled. The description recommends isActive false instead when the key may be needed again.",
    openWorld:
      "Removes a record inside Sequenzy; no call is made to the customer's website or any third party.",
  },
  list_webhooks: {
    readOnly:
      "Lists the company's outbound webhook endpoints and subscribed event types via GET; no endpoint is changed and nothing is delivered.",
    destructive: "Read-only; no endpoint, secret or event list is modified.",
    openWorld:
      "Returns stored endpoint configuration; it does not call any webhook URL.",
  },
  update_webhook: {
    readOnly:
      "Writes the endpoint's name, URL, event list or enabled status, and resets its failure state when the URL changes or it is re-enabled.",
    destructive:
      "Overwrites the endpoint settings: events replaces the whole list, a new URL redirects all future deliveries, and disabling stops them. Previous values are not kept. URLs must be HTTPS and not private or localhost.",
    openWorld:
      "Sets the external HTTPS URL that later receives the company's event payloads, which can include contact data.",
  },
  delete_webhook: {
    readOnly:
      "Deletes the outbound webhook endpoint and all of its delivery history rows in one transaction.",
    destructive:
      "Irreversible: the endpoint, its signing secrets and its delivery history are removed and cannot be restored; deliveries stop. The description points to update_webhook with status disabled as the reversible option.",
    openWorld:
      "Removes records inside Sequenzy only; no request is sent to the endpoint URL.",
  },
  test_webhook: {
    readOnly:
      "Records a test delivery and queues a signed test event to the endpoint; it writes delivery state and triggers an outbound request.",
    destructive:
      "A delivered HTTP request cannot be recalled, and the receiving system may act on it; each call sends another test event. It refuses disabled endpoints.",
    openWorld:
      "Sends an HTTPS POST to the customer-configured external webhook URL.",
    effects:
      "Each call sends another signed test event to the endpoint URL; the receiving system may process it like a real event.",
  },
  list_data_exports: {
    readOnly:
      "Lists data export destinations with status, per-dataset progress and last error via GET; credentials are never returned and nothing is written.",
    destructive:
      "Read-only; no destination, schedule or credential is changed.",
    openWorld:
      "Reads stored destination settings from Sequenzy; it does not connect to the customer's bucket.",
  },
  get_data_export: {
    readOnly:
      "Fetches one data export destination's status, exportedThrough progress, next run and last error via GET.",
    destructive:
      "Read-only; the destination and its progress are not modified.",
    openWorld:
      "Returns stored data only; no connection to the bucket is opened.",
  },
  delete_data_export: {
    readOnly:
      "Deletes the data export destination, its stored credentials and its run history rows.",
    destructive:
      "Irreversible: the destination, credentials and run history are removed, and scheduled exports stop; a recreated export starts from its creation time, so the gap is not backfilled. Files already in the bucket are kept.",
    openWorld:
      "Removes Sequenzy's records only; it does not touch or delete anything in the customer's bucket.",
    effects: "Also deletes the export's run history and stored credentials.",
  },
  test_data_export: {
    readOnly:
      "Writes a small JSON probe object into the customer's bucket with the stored credentials.",
    destructive:
      "Each test overwrites the same probe object under the export's path prefix, so the previous probe file is replaced. No export data or Sequenzy record is changed.",
    openWorld:
      "Connects to the customer's own external bucket (S3, GCS or S3-compatible endpoint) and writes the probe file there.",
    effects:
      "Each test writes the probe object to the same key under the export's path prefix, replacing the previous probe file.",
  },
  run_data_export: {
    readOnly:
      "Marks the destination due and queued and enqueues an export job that writes data files to the bucket.",
    destructive:
      "Exported files with contact and event data leave Sequenzy and cannot be recalled from the customer's storage. Paused exports are refused and the caller needs read scopes for every exported dataset.",
    openWorld:
      "Writes gzipped data files to the customer's external bucket through a background job.",
    effects:
      "Queues a job that writes email, SMS, event and subscriber data files to the destination bucket.",
  },
  list_data_export_runs: {
    readOnly:
      "Lists recent export runs from the last 14 days with rows, files, bytes and errors via GET.",
    destructive: "Read-only; runs and destinations are not changed.",
    openWorld:
      "Reads run history stored in Sequenzy; it does not contact the bucket.",
  },
  list_warehouse_connections: {
    readOnly:
      "Lists warehouse connections with status, last test and sync count via GET; credentials are never returned.",
    destructive: "Read-only; no connection or credential is changed.",
    openWorld:
      "Reads stored connection metadata; no query is sent to the warehouse.",
  },
  get_warehouse_connection: {
    readOnly:
      "Fetches one warehouse connection's settings, status, last test and sync count via GET.",
    destructive: "Read-only; the connection is not modified or tested.",
    openWorld: "Returns stored data without connecting to the warehouse.",
  },
  delete_warehouse_connection: {
    readOnly:
      "Deletes the warehouse connection row and its stored credentials.",
    destructive:
      "Irreversible: the connection and credentials are gone and must be re-entered to reconnect. It refuses while any sync still uses the connection, including one created during the delete.",
    openWorld:
      "Removes Sequenzy's stored record only; nothing is changed in the customer's warehouse.",
  },
  test_warehouse_connection: {
    readOnly:
      "Runs a probe query with the stored credentials and writes the outcome to the connection row.",
    destructive:
      "Overwrites the connection's stored status, lastError and lastTestedAt with the new result; a failed test marks a working connection as error. No warehouse data is modified.",
    openWorld:
      "Connects to the customer's external warehouse (Snowflake, BigQuery, Redshift or Postgres) and runs a test query.",
    effects:
      "Overwrites the connection's stored status, last error and last-tested time with this result.",
  },
  list_warehouse_syncs: {
    readOnly:
      "Lists warehouse syncs with schedule, status, cursor and latest run via GET; no sync is started or changed.",
    destructive: "Read-only; syncs, cursors and runs are left as they are.",
    openWorld: "Reads stored sync data; it does not query the warehouse.",
  },
  get_warehouse_sync: {
    readOnly:
      "Fetches one warehouse sync with its status and latest run via GET.",
    destructive: "Read-only; the sync is not run or modified.",
    openWorld: "Returns stored data without contacting the warehouse.",
  },
  create_warehouse_sync: {
    readOnly:
      "Creates a scheduled sync and immediately queues its first run, which imports contacts or events into the workspace.",
    destructive:
      "Imports use duplicateStrategy overwrite, so mapped columns replace existing contacts' field values. With triggerAutomations or double_opt_in, runs can start sequences or send confirmation emails, which needs the automations:trigger permission.",
    openWorld:
      "Queries the customer's external warehouse on a schedule; with triggerAutomations or double opt-in, imported contacts can receive emails.",
    effects:
      "Imports overwrite existing contacts' mapped fields; triggerAutomations or double_opt_in can start sequences or send confirmation emails.",
  },
  update_warehouse_sync: {
    readOnly:
      "Writes the sync's name, query, mapping, cursor, schedule, lists, options or enabled state.",
    destructive:
      "Overwrites the sync definition; a changed query or cursor rereads from the beginning, and later runs overwrite contacts' mapped fields. Turning on triggerAutomations or double_opt_in can email contacts and requires automations:trigger.",
    openWorld:
      "Changes what is queried from the customer's external warehouse; enabling automations or double opt-in lets later runs email imported contacts.",
    effects:
      "Later runs overwrite contacts' mapped fields; enabling triggerAutomations or double_opt_in can start sequences or send confirmation emails.",
  },
  delete_warehouse_sync: {
    readOnly:
      "Deletes the sync, its run history and its stored row fingerprints.",
    destructive:
      "Irreversible: the sync definition, run history and change-tracking state are removed and scheduled imports stop; recreating needs the query and mapping again. Contacts and events already imported stay.",
    openWorld:
      "Removes Sequenzy's records only; nothing is changed in the customer's warehouse.",
    effects: "Also deletes the sync's run history and change-tracking state.",
  },
  run_warehouse_sync: {
    readOnly:
      "Marks the sync due, optionally flags a full resync, and queues a run that imports rows into contacts or events.",
    destructive:
      "Each run overwrites contacts' mapped fields. fullResync forgets row fingerprints and the cursor and sends every row again, which on a sync with triggerAutomations can start automations for every contact; that requires automations:trigger. Paused syncs are refused.",
    openWorld:
      "Queries the customer's external warehouse; when the sync triggers automations or uses double opt-in, imported contacts can receive emails.",
    effects:
      "Runs overwrite contacts' mapped fields; with fullResync on a triggering sync, every row can start automations again.",
  },
  list_warehouse_sync_runs: {
    readOnly:
      "Lists a sync's runs from the last 30 days with row counts, sample row problems and import progress via GET.",
    destructive:
      "Read-only; runs, the sync and imported contacts are not changed.",
    openWorld:
      "Reads run history stored in Sequenzy; it does not query the warehouse.",
  },
  generate_email: {
    readOnly:
      "Returns draft email blocks, but the first generation for a company writes its inferred email design direction into the blank emailDesignPrompt field.",
    destructive:
      "Additive: no email is created or sent, and the design prompt is written only while blank, through a compare-and-swap that never replaces an existing value.",
    openWorld:
      "The AI email writer can fetch URLs named in the prompt and pages from the company's own website to ground the draft.",
    effects:
      "The writer can fetch URLs named in the prompt and pages from the company's website to ground the draft.",
  },
  generate_sequence: {
    readOnly:
      "Creates and saves a new disabled sequence draft with AI-generated emails via create_sequence; it is a persistent write.",
    destructive:
      "Additive: it inserts a new disabled sequence that sends nothing until enabled, and no existing sequence is changed. The design prompt is only filled while blank.",
    openWorld:
      "The goal is drafted by the same AI email writer, which can fetch URLs named in the goal and pages from the company's website.",
    effects:
      "The goal goes through the AI email writer, which can fetch URLs named in it and pages from the company's website.",
  },
  generate_subject_lines: {
    readOnly:
      "Returns subject line suggestions only, but the first generation for a company writes its inferred design direction into the blank emailDesignPrompt field.",
    destructive:
      "Additive: no A/B test, campaign or variant is created or changed, and the design prompt is filled only while blank via compare-and-swap.",
    openWorld:
      "The topic and brand context go to the AI model only; the generator fetches no URLs, reads no website and contacts no recipient.",
  },
  generate_sms: {
    readOnly:
      "Returns SMS text variants with encoding and segment counts, but the first generation for a company writes its inferred design direction into the blank emailDesignPrompt field.",
    destructive:
      "Additive: no SMS step or message is created or sent, and the design prompt is filled only while blank via compare-and-swap.",
    openWorld:
      "The prompt and brand context go to the AI model only; no URL is fetched and no text message is sent.",
  },
  get_sms_settings: {
    readOnly:
      "Reads the SMS add-on status, eligibility, credit balance, brand prefix and phone numbers via GET; nothing is purchased or changed.",
    destructive: "Read-only; no number, credit or setting is modified.",
    openWorld:
      "Returns the company's stored SMS settings; it does not contact the carrier or send any text.",
  },
  get_sms_usage: {
    readOnly:
      "Aggregates per-number send, delivery, failure, credit and test-send counts from stored SMS sends via GET.",
    destructive: "Read-only; no number or send record is changed.",
    openWorld:
      "Computes usage from the company's own SMS send records; no carrier call is made.",
  },
  update_sms_number_settings: {
    readOnly:
      "Writes one SMS number's label, per-number brand prefix override and link shortening setting.",
    destructive:
      "Overwrites the stored values; previous ones are not kept. The brand prefix and link shortening apply to every later SMS sent from the number. Requires workspace-management permission; omitted fields are unchanged.",
    openWorld:
      "Open world: the brand prefix and link shortening settings change every later SMS that recipients receive from this number.",
    effects:
      "brandPrefix and linkShorteningEnabled change every later SMS sent from this number: the prefix recipients see and whether links become tracked short links.",
  },
  release_sms_number: {
    readOnly:
      "Hands the number back to the carrier and marks it released in the workspace.",
    destructive:
      "Irreversible: the number cannot be recovered, and campaigns or sequences pinned to it skip their SMS sends until repointed. It requires workspace-management permission and refuses numbers already released or with a purchase in progress.",
    openWorld: "Calls the SMS carrier to release the phone number.",
  },
  send_test_sms: {
    readOnly:
      "Creates a test send record, charges SMS credits and queues delivery of a real text message.",
    destructive:
      "A delivered text cannot be recalled and the credits are consumed; each successful call sends another text. Limited to 100 test sends per company per rolling 24 hours, needs a verified number and enough credits, and never purchases credits.",
    openWorld:
      "Delivers a real SMS through the carrier to the phone number given in 'to'.",
  },
  list_in_app_campaigns: {
    readOnly:
      "Read-only: GET /in-app/campaigns returns stored in-app campaigns for the company, filtered by status with limit/offset paging; nothing is written.",
    destructive:
      "Not destructive: it only lists records and changes no campaign or inbox item.",
    openWorld:
      "Closed world: reads the company's own campaign rows in Sequenzy and contacts no app or person.",
  },
  get_in_app_campaign: {
    readOnly:
      "Read-only: GET /in-app/campaigns/:id loads one campaign's message, audience, schedule and state, plus aggregated reach and engagement once launched.",
    destructive:
      "Not destructive: it reads the campaign and counts its inbox items without changing either.",
    openWorld:
      "Closed world: data comes from the company's Sequenzy database only.",
  },
  create_in_app_campaign: {
    readOnly:
      "Not read-only: POST /in-app/campaigns inserts a new in-app campaign row with status draft and any supplied message and audience.",
    destructive:
      "Not destructive: purely additive. It creates a new draft and nothing is shown to anyone until send_in_app_campaign is called.",
    openWorld:
      "Closed world: the draft lives only in the company's workspace; no app shows it.",
  },
  update_in_app_campaign: {
    readOnly:
      "Not read-only: PATCH /in-app/campaigns/:id overwrites the campaign's name, message fields, priority, end time or audience.",
    destructive:
      "Destructive: passed fields replace the previous values with no version history. Limited to draft or scheduled campaigns; live, ended and stopped ones are refused.",
    openWorld:
      "Open world: a scheduled campaign goes live with the saved message and audience, so an edit changes what people see in the app.",
    effects:
      "A scheduled campaign goes live with the saved message and audience, so edits change what people see in the customer's app.",
  },
  estimate_in_app_campaign_recipients: {
    readOnly:
      "Read-only: although sent as POST, it only counts contacts who match the given audience; nothing is stored.",
    destructive: "Not destructive: it computes one count and modifies nothing.",
    openWorld:
      "Closed world: counts come from the company's contacts in Sequenzy; no app is contacted.",
  },
  send_in_app_campaign: {
    readOnly:
      "Not read-only: makes the campaign live now, or schedules it and queues the job that takes it live.",
    destructive:
      "Destructive: once live, every contact in the audience who opens the app gets the message, which cannot be taken back from those who saw it. Requires a message and an audience, and the description asks for user confirmation first.",
    openWorld:
      "Open world: the customer's app shows the message to real people in the audience the next time it fetches their feed.",
  },
  unschedule_in_app_campaign: {
    readOnly:
      "Not read-only: sets the campaign back to draft, clears scheduledAt and removes the queued go-live job.",
    destructive:
      "Destructive: the scheduled start is cancelled and its time erased; nothing is shown until someone launches or schedules it again. Only allowed while the campaign is still scheduled.",
    openWorld:
      "Closed world: it changes the campaign row and the internal queue only; no app is contacted.",
    effects:
      "Clears the scheduled start; the campaign must be launched or scheduled again to be shown.",
  },
  stop_in_app_campaign: {
    readOnly:
      "Not read-only: sets the campaign to cancelled and ends every inbox item it delivered that is still open.",
    destructive:
      "Destructive: stopping is final; the campaign cannot be launched again (only duplicated), nobody new gets it, and messages contacts have not seen leave their feeds. Allowed only for scheduled or live campaigns.",
    openWorld:
      "Open world: apps stop showing the message to real contacts on their next feed.",
  },
  duplicate_in_app_campaign: {
    readOnly:
      "Not read-only: inserts a new draft copying the source campaign's message, priority, audience and a future end time.",
    destructive:
      "Not destructive: additive only; the source campaign is untouched and the copy is not launched.",
    openWorld:
      "Closed world: the copy lives only in the company's workspace; nothing is shown.",
  },
  get_in_app_campaign_stats: {
    readOnly:
      "Read-only: GET /in-app/campaigns/:id/stats counts the campaign's inbox items by engagement; nothing is written.",
    destructive: "Not destructive: it computes counts and modifies nothing.",
    openWorld:
      "Closed world: counts come from the company's Sequenzy database.",
  },
};
