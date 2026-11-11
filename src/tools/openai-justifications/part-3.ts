import type { ToolJustification } from "./types.js";

export const OPENAI_JUSTIFICATIONS_PART_3: Readonly<
  Record<string, ToolJustification>
> = {
  remove_push_device: {
    readOnly:
      "Not read-only: sends DELETE /push/devices/:id, which sets the device row to status unsubscribed and clears its link to the contact.",
    destructive:
      "Destructive: the device stops receiving every push campaign and test, and the contact link is erased; the tool cannot relink it. Only the site or app re-registering restores delivery, and browsers come back as anonymous devices.",
    openWorld:
      "Open world: segments can filter on push devices, so the change can move the contact into or out of segments whose running sequences then message them.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  send_test_push: {
    readOnly:
      "Not read-only: inserts a test push send and queues delivery to the chosen device or every active device of the contact.",
    destructive:
      "Destructive: the notification is delivered to a real phone or browser and cannot be recalled once accepted by the push service. Scoped to one device or one contact, and capped at 200 test sends per company per rolling 24 hours.",
    openWorld:
      "Open world: delivery goes out through Web Push browser endpoints, Apple APNs or Google FCM to an actual person's device.",
  },
  list_live_activities: {
    readOnly:
      "Read-only: GET /push/live-activities returns masked ActivityKit and Android Live Update tokens and per-type counts; nothing is written.",
    destructive:
      "Not destructive: it only lists token records and changes no activity or device.",
    openWorld:
      "Closed world: reads the company's stored tokens in Sequenzy; Apple APNs and Google FCM are not contacted.",
  },
  start_live_activity: {
    readOnly:
      "Not read-only: queues an ActivityKit start push (and an Android Live Update start) to the push-to-start tokens of the contact or of every contact in the segment, list or tag, and records each delivery outcome on the token.",
    destructive:
      "Destructive: a Live Activity appears on real people's Lock Screens and Dynamic Islands (or as Android Live Update notifications) and cannot be recalled except by ending it. Scoped to one contact's devices, or to every contact in the named segment, list or tag (up to 100,000 devices); repeating the call starts another copy.",
    openWorld:
      "Open world: delivery goes through Apple APNs to the recipients' iPhones and Google FCM to their Android devices.",
  },
  update_live_activity: {
    readOnly:
      "Not read-only: queues an ActivityKit or Android Live Update push to every running copy of the activity and records the outcome on each token.",
    destructive:
      "Destructive: replaces what the activity shows on real devices (one contact's, or with broadcast every signed-in device running it), and an alert lights the screen. The previous content cannot be restored except by sending it again.",
    openWorld:
      "Open world: delivery goes through Apple APNs and Google FCM to the person's devices.",
  },
  end_live_activity: {
    readOnly:
      "Not read-only: queues an ActivityKit or Android Live Update end push and marks each token ended once APNs or FCM accepts it.",
    destructive:
      "Destructive: the activity ends on every device running it (one contact's, or with broadcast every signed-in device) and can no longer be updated; starting it again needs a new start.",
    openWorld:
      "Open world: the end push goes through Apple APNs and Google FCM to every device still showing the activity.",
  },
  list_push_campaigns: {
    readOnly:
      "Read-only: GET /push/campaigns returns stored push campaigns for the company, filtered by status with limit/offset paging; nothing is written.",
    destructive:
      "Not destructive: it only lists records and changes no campaign, schedule or send.",
    openWorld:
      "Closed world: reads the company's own campaign rows in Sequenzy and contacts no push service or recipient.",
  },
  get_push_campaign: {
    readOnly:
      "Read-only: GET /push/campaigns/:id loads one campaign's content, audience and status, plus aggregated send stats when it is not a draft.",
    destructive:
      "Not destructive: it reads the campaign and its push_sends aggregates without changing either.",
    openWorld:
      "Closed world: data comes from the company's Sequenzy database only; no push provider is queried.",
  },
  create_push_campaign: {
    readOnly:
      "Not read-only: POST /push/campaigns inserts a new push campaign row with status draft and any supplied content and audience.",
    destructive:
      "Not destructive: purely additive. It creates a new draft and nothing is scheduled or sent until send_push_campaign is called.",
    openWorld:
      "Closed world: the draft lives only in the company's workspace; no notification is delivered and no external service is called.",
  },
  update_push_campaign: {
    readOnly:
      "Not read-only: PATCH /push/campaigns/:id overwrites the campaign's name, title, body, links, images, platforms or target lists.",
    destructive:
      "Destructive: passed fields replace the previous content and audience with no version history or conflict check. Limited to draft or scheduled campaigns; sent, sending and cancelled ones are refused.",
    openWorld:
      "Open world: a scheduled campaign keeps its queued send, which reads the saved content and audience at send time, so an edit changes the notifications real devices receive.",
    effects:
      "A scheduled campaign's queued send reads the saved content and audience at send time, so edits change what recipients' devices receive.",
  },
  estimate_push_campaign_recipients: {
    readOnly:
      "Read-only: although sent as POST, it only counts contacts in the given audience and those with an active device; no campaign or estimate is stored.",
    destructive:
      "Not destructive: it computes two counts and modifies nothing.",
    openWorld:
      "Closed world: counts come from the company's contacts and push_devices tables in Sequenzy; no device is contacted.",
  },
  send_push_campaign: {
    readOnly:
      "Not read-only: changes the campaign to sending or scheduled and enqueues the BullMQ job that delivers it.",
    destructive:
      "Destructive: once sent, notifications land on every eligible device in the audience and cannot be recalled. Requires content and an audience, works only on draft or scheduled campaigns, and the description asks for user confirmation first.",
    openWorld:
      "Open world: delivers notifications through Web Push, APNs and FCM to the devices of every audience contact with an active device on a set-up platform.",
  },
  unschedule_push_campaign: {
    readOnly:
      "Not read-only: sets the campaign back to draft, clears scheduledAt and removes the queued delivery job.",
    destructive:
      "Destructive: the scheduled send is cancelled and the schedule time is erased; nothing goes out until someone sends or schedules it again. Only allowed while the campaign is still scheduled.",
    openWorld:
      "Closed world: it changes the campaign row and the internal queue only; no notification is sent and no outside service is called.",
    effects:
      "Clears the scheduled time and cancels the queued send; the campaign must be sent or scheduled again to deliver.",
  },
  cancel_push_campaign: {
    readOnly:
      "Not read-only: sets the campaign status to cancelled and marks every still-pending push send as skipped.",
    destructive:
      "Destructive: cancellation is final; cancelled campaigns cannot be sent again (only duplicated), and unsent recipients are skipped. Already delivered notifications stay delivered. Allowed only for scheduled or sending campaigns.",
    openWorld:
      "Closed world: it only stops further sends inside Sequenzy and does not contact devices or push providers.",
  },
  translate_push_campaign: {
    readOnly:
      "Not read-only: POST /push/campaigns/:id/translate saves AI-written language versions on the draft or scheduled campaign.",
    destructive:
      "Destructive: a scheduled campaign sends the new versions to contacts in those languages, and outdated AI versions are replaced. Versions a person wrote are replaced only with overwrite: true. The save is skipped if the campaign changed meanwhile.",
    openWorld:
      "Open world: the title and message are sent to an AI model for translation.",
    effects:
      "Contacts in the translated languages get those versions when the campaign sends.",
  },
  translate_push_content: {
    readOnly:
      "Read-only: POST /push/translate returns translated titles and messages and saves nothing.",
    destructive:
      "Not destructive: nothing in the workspace changes until the caller saves the returned versions.",
    openWorld:
      "Open world: the title and message are sent to an AI model for translation.",
  },
  duplicate_push_campaign: {
    readOnly:
      "Not read-only: inserts a new draft push campaign copying the source campaign's content and audience.",
    destructive:
      "Not destructive: purely additive. The source campaign is untouched and the copy is a draft that sends nothing.",
    openWorld:
      "Closed world: the copy is created within the company's workspace; nothing is delivered.",
  },
  get_push_campaign_stats: {
    readOnly:
      "Read-only: GET /push/campaigns/:id/stats aggregates the campaign's push_sends by status and skip/failure reason.",
    destructive:
      "Not destructive: reports counts and changes no campaign or send record.",
    openWorld:
      "Closed world: aggregates stored delivery records in Sequenzy; push providers are not queried.",
  },
  list_in_app_messages: {
    readOnly:
      "Read-only: GET /in-app/messages returns one contact's open feed or history of in-app messages and cards; reading does not mark anything displayed, and the tool sends deliver=false so live in-app campaigns are not delivered by looking.",
    destructive:
      "Not destructive: it lists items without changing their status, timestamps or counts.",
    openWorld:
      "Closed world: reads the company's in-app message rows in Sequenzy for the identified contact.",
  },
  record_in_app_event: {
    readOnly:
      "Not read-only: sets displayedAt, clickedAt, dismissedAt or readAt on the item (and increments clickCount for clicks), and records an engagement event.",
    destructive:
      "Destructive: the first-reported timestamps cannot be cleared by any tool, and once an item is marked displayed, clicked or dismissed (cards: dismissed) it permanently leaves the contact's open feed, so the app stops showing it.",
    openWorld:
      "Open world: the recorded activity is visible to segment filters, so the contact can enter segments whose running sequences then message them. No automation starts in the request itself.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  delete_in_app_message: {
    readOnly:
      "Not read-only: DELETE /in-app/messages/:id hard-deletes the in-app message or card row.",
    destructive:
      "Destructive: the item is permanently removed and the contact's app stops showing it; there is no restore. Scoped to one message in the company.",
    openWorld:
      "Closed world: it deletes a row in the company's Sequenzy data; the contact's app simply no longer receives it from the feed.",
    effects:
      "Deletion is permanent; the item cannot be restored to the contact's feed.",
  },
  list_in_app_templates: {
    readOnly:
      "Read-only: GET /in-app/templates returns Sequenzy's built-in in-app step templates.",
    destructive:
      "Not destructive: it lists static templates and changes nothing.",
    openWorld:
      "Closed world: the templates ship with Sequenzy; nothing is fetched or sent.",
  },
  write_in_app_copy: {
    readOnly:
      "Read-only: POST /in-app/copy returns AI-written text and saves nothing; no step, message or setting is created or changed.",
    destructive: "Not destructive: it only returns suggested copy.",
    openWorld:
      "The brief and company name go to the AI model only; the writer fetches no URLs and contacts no recipient.",
  },
  validate_in_app_html: {
    readOnly:
      "Read-only: POST /in-app/html/validate analyzes the submitted HTML and saves nothing; no step, message or setting is created or changed.",
    destructive:
      "Not destructive: it only returns a size, warnings and errors.",
    openWorld:
      "Closed world: the document is analyzed in Sequenzy; its scripts are never run and no URL in it is fetched.",
  },
  list_in_app_placements: {
    readOnly:
      "Read-only: GET /in-app/placements returns the company's placement definitions and their item counts.",
    destructive:
      "Not destructive: it lists placements and computes counts without changing anything.",
    openWorld:
      "Closed world: reads placement and in-app records stored in Sequenzy.",
  },
  get_in_app_placement: {
    readOnly:
      "Read-only: GET /in-app/placements/:key returns one placement definition and its item counts.",
    destructive: "Not destructive: it reads one placement and changes nothing.",
    openWorld:
      "Closed world: reads placement and in-app records stored in Sequenzy.",
  },
  get_in_app_placement_content: {
    readOnly:
      "Read-only: GET /in-app/placement-feed returns which open placement item each requested placement shows one contact; reading does not mark anything displayed.",
    destructive:
      "Not destructive: it selects items without changing their status, timestamps or counts.",
    openWorld:
      "Closed world: reads the company's in-app rows in Sequenzy for the identified contact.",
  },
  create_in_app_placement: {
    readOnly:
      "Not read-only: POST /in-app/placements creates a placement definition in the company.",
    destructive:
      "Not destructive: it adds a definition and changes no existing data; nothing is shown to contacts until a sequence step targets it.",
    openWorld:
      "Closed world: it writes a definition in Sequenzy; no message is created or sent.",
  },
  update_in_app_placement: {
    readOnly:
      "Not read-only: PATCH /in-app/placements/:key changes a placement's name, description or size hints.",
    destructive:
      "Destructive: the previous name, description and size hints are overwritten and cannot be restored by any tool. The key, items and steps are untouched.",
    openWorld:
      "Closed world: it edits a definition in Sequenzy; contacts see no change.",
    effects:
      "Only dashboard labels and size hints change; what contacts see is unaffected.",
  },
  delete_in_app_placement: {
    readOnly:
      "Not read-only: DELETE /in-app/placements/:key removes a placement definition.",
    destructive:
      "Destructive: the slot stops showing content in the customer's app on its next refresh, and sequence steps that target the key skip contacts until a placement with the same key is created again. Items already created stay in contact history.",
    openWorld:
      "Closed world: it deletes a definition in Sequenzy; the customer's app simply receives empty slots for that key.",
    effects:
      "The app's slot for this key collapses for every contact until the placement is recreated.",
  },
  get_in_app_step_stats: {
    readOnly:
      "Read-only: GET /in-app/steps/:id/stats verifies the step is an in-app step in a company sequence and returns created, displayed, clicked and dismissed counts.",
    destructive: "Not destructive: computes counts and changes nothing.",
    openWorld:
      "Closed world: reads sequence and in-app records stored in Sequenzy.",
  },
  list_tags: {
    readOnly:
      "Read-only: GET /tags returns the company's tag definitions (name, color, system flag).",
    destructive:
      "Not destructive: it lists tags and does not apply, remove or edit any.",
    openWorld:
      "Closed world: reads the company's tag definitions in Sequenzy only.",
  },
  create_tag: {
    readOnly:
      "Not read-only: POST /tags inserts a new tag definition with a normalized name and color.",
    destructive:
      "Not destructive: purely additive. It defines a tag but applies it to no contact, so no tag automation fires.",
    openWorld:
      "Closed world: the definition is stored in the company's workspace and is not visible to contacts.",
  },
  update_tag: {
    readOnly:
      "Not read-only: PATCH /tags/:id overwrites the tag definition's color.",
    destructive:
      "Destructive in the narrow sense that the previous color is replaced with no history; the name and contact assignments are unchanged, and system tags are refused.",
    openWorld:
      "Closed world: tag colors are a dashboard label inside Sequenzy and are never shown to contacts.",
  },
  delete_tag: {
    readOnly:
      "Not read-only: removes the tag name from every contact's tags array and deletes the tag definition.",
    destructive:
      "Destructive: which contacts had the tag is lost permanently and cannot be restored by recreating it. Safeguards: system tags are refused (403), and tags referenced by any sequence trigger, condition or action are refused (409).",
    openWorld:
      "Open world: stripping the tag from every contact changes who matches segments that filter on it, so running segment-entered or -exited sequences can enroll and email those contacts.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  list_lists: {
    readOnly:
      "Read-only: GET /lists returns the company's lists with subscriberCount and activeSubscriberCount.",
    destructive:
      "Not destructive: it reads lists and membership counts without modifying them.",
    openWorld: "Closed world: reads list records stored in Sequenzy.",
  },
  create_list: {
    readOnly:
      "Not read-only: POST /lists inserts a new list with name, description, privacy and member-unsubscribe settings.",
    destructive:
      "Not destructive: purely additive. A new empty list is created and no existing list or contact changes.",
    openWorld:
      "Open world: lists are public by default, so the new list is shown in the email preference center where any recipient can join or leave it, unless isPrivate is set.",
  },
  update_list: {
    readOnly:
      "Not read-only: PATCH /lists/:id overwrites the list's name, description, isPrivate or allowMemberUnsubscribe.",
    destructive:
      "Destructive: the previous values are replaced with no history; making a list public or private, or disabling member unsubscribe, immediately changes what recipients can do.",
    openWorld:
      "Open world: a public list's name appears in the email preference center, and switching it to public lets any recipient join it there.",
  },
  delete_list: {
    readOnly:
      "Not read-only: deletes the list and all of its memberships, then marks affected contacts for segment re-evaluation.",
    destructive:
      "Destructive: the list and the record of who was on it are permanently gone; contacts themselves are kept. No in-use check or confirmation step.",
    openWorld:
      "Open world: a public list disappears from the email preference center, and subscriber.list_unsubscribed webhooks are sent to the company's configured endpoints for active members.",
    effects:
      "A public list disappears from the email preference center, and subscriber.list_unsubscribed webhooks fire for its active members.",
  },
  add_subscribers_to_list: {
    readOnly:
      "Not read-only: creates missing contacts and adds each email to the list through addSubscriber.",
    destructive:
      "Destructive: duplicateStrategy overwrite rewrites existing contacts; enrollInSequences true starts sequences, and the opt-in mode can send double opt-in confirmations; sent emails cannot be recalled. Defaults are skip duplicates and no enrollment.",
    openWorld:
      "Open world: with enrollInSequences or double opt-in (by optInMode or the company default), real emails go to the added addresses, and list webhooks reach the company's endpoints.",
    effects:
      "Can email the added addresses: double opt-in confirmations when required, and matching sequences when enrollInSequences is true; overwrite updates existing contacts.",
  },
  remove_subscribers_from_list: {
    readOnly:
      "Not read-only: deletes list membership rows for up to 500 matched emails.",
    destructive:
      "Destructive: the memberships, including any unsubscribedAt history, are deleted and cannot be restored except by re-adding contacts. Contacts stay in the account.",
    openWorld:
      "Open world: it queues list-removed webhooks to the company's configured endpoints and marks segments for re-evaluation, so running segment-exited or -entered sequences can email the affected contacts.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  list_segments: {
    readOnly:
      "Read-only: GET /segments returns the company's saved segments and their filter rules.",
    destructive: "Not destructive: it lists definitions and changes none.",
    openWorld: "Closed world: reads segment records stored in Sequenzy.",
  },
  create_segment: {
    readOnly:
      "Not read-only: POST /segments validates the filter rules and inserts a new segment.",
    destructive:
      "Not destructive: purely additive. A new segment is defined and no existing segment, contact or campaign changes.",
    openWorld:
      "Closed world: a new segment is referenced by no sequence, campaign or audience sync yet, so creating it triggers nothing outside the workspace.",
  },
  update_segment: {
    readOnly:
      "Not read-only: PATCH /segments/:id overwrites the segment's name and, when filters or root are passed, replaces its rules and rebuilds its trigger index.",
    destructive:
      "Destructive: passing filters or root replaces the existing rules wholesale with no history or conflict check, which changes who the segment includes everywhere it is used.",
    openWorld:
      "Open world: newly matching contacts receive scheduled campaigns that target this segment and Meta audience syncs, and segment-entered sequences on segments that reference it can email them. Its own triggered sequences re-baseline and enroll no one on an edit.",
    effects:
      "Scheduled campaigns and audience syncs use the new membership, and segment-entered sequences on segments that reference this one can email new matches.",
  },
  delete_segment: {
    readOnly:
      "Not read-only: DELETE /segments/:id deletes the segment row and removes its trigger index and cached audience membership.",
    destructive:
      "Destructive: the segment definition is permanently deleted and cannot be restored; contacts are unaffected. Deleting is not blocked when the segment is in use (the result lists the sequences, unsent campaigns, segments and ad audience syncs that read it), and it requires the separate segments:delete permission.",
    openWorld:
      "Open world: segments that reference the deleted one change who they match (an exclusion of it then matches everyone), so their running sequences can enroll and email contacts.",
    effects:
      "Segments that reference this one change who they match (an exclusion of it then matches everyone), and their running sequences can email the new matches.",
  },
  get_segment_count: {
    readOnly:
      "Read-only: GET /segments/:id/count evaluates the segment and returns the number of matching subscribers.",
    destructive: "Not destructive: returns a count and stores nothing.",
    openWorld:
      "Closed world: counts the company's own contacts in Sequenzy and ClickHouse.",
  },
  list_audience_syncs: {
    readOnly:
      "Read-only: GET /audience-syncs returns the stored segment-to-Meta audience mappings with schedule and last sync status.",
    destructive:
      "Not destructive: lists sync records without pausing, running or editing them.",
    openWorld:
      "Closed world: reads sync rows from the Sequenzy database; it does not call Meta or Zernio.",
  },
  list_ad_accounts: {
    readOnly:
      "Read-only: GET /ad-accounts lists the Meta ad accounts available to the connected integration; nothing is stored.",
    destructive: "Not destructive: it only retrieves account ids and names.",
    openWorld:
      "Open world: each call queries Meta through the Zernio ads API (zernio.com) using the company's connected Meta Ads account.",
    effects: "Fetched live from Meta through the Zernio ads API on each call.",
  },
  create_audience_sync: {
    readOnly:
      "Not read-only: creates a Meta custom audience via Zernio, inserts the sync row (and a template segment if predefinedSegmentId is used), and queues the first upload.",
    destructive:
      "Destructive: segment contacts' emails are uploaded to Meta right away and on every scheduled run; the audience is add-only, so uploaded people cannot be removed by Sequenzy. Duplicate syncs for the same segment and ad account are refused.",
    openWorld:
      "Open world: creates an audience in the company's Meta ad account and uploads subscriber emails to Meta through the Zernio API.",
  },
  update_audience_sync: {
    readOnly:
      "Not read-only: PATCH /audience-syncs/:id overwrites the sync's frequency or isActive flag.",
    destructive:
      "Destructive: changing frequency or resuming a paused sync controls when segment emails are next uploaded to Meta, and those uploads cannot be undone; pausing stops future uploads.",
    openWorld:
      "Open world: resuming or rescheduling determines future uploads of subscriber emails to the Meta custom audience through Zernio.",
    effects:
      "Resuming or changing frequency controls the scheduled uploads of segment emails to the Meta custom audience.",
  },
  delete_audience_sync: {
    readOnly:
      "Not read-only: DELETE /audience-syncs/:id deletes the sync mapping row.",
    destructive:
      "Destructive: the mapping and its schedule are permanently removed and future uploads stop; recreating it makes a new audience. The Meta audience itself and running ads are left intact.",
    openWorld:
      "Closed world: only the Sequenzy sync record is deleted; no request is sent to Meta or Zernio.",
  },
  sync_audience_now: {
    readOnly:
      "Not read-only: enqueues a manual sync job that uploads the segment's active contacts to the Meta audience.",
    destructive:
      "Destructive: the upload sends subscriber emails to Meta and cannot be undone, since the audience is add-only. Refused while the sync is paused.",
    openWorld:
      "Open world: the job uploads subscriber emails to the company's Meta custom audience through the Zernio API.",
  },
  list_templates: {
    readOnly:
      "Read-only: GET /templates returns paginated email bodies (standalone templates and bodies behind campaigns and transactional emails) with localization status.",
    destructive: "Not destructive: it lists bodies and modifies none.",
    openWorld:
      "Closed world: reads stored email bodies in the company's Sequenzy workspace.",
  },
  get_template: {
    readOnly:
      "Read-only: GET /templates/:id returns one body's content, localized variants, sync status and current share URL.",
    destructive:
      "Not destructive: reports the template and creates no share link or variant.",
    openWorld:
      "Closed world: reads the company's stored email body and localizations.",
  },
  create_template: {
    readOnly:
      "Not read-only: POST /templates inserts a new email body from supplied blocks or HTML, or from content the AI writer drafts for a prompt.",
    destructive:
      "Not destructive: purely additive. A new template is created and no existing email is edited or sent.",
    openWorld:
      "Open world: with prompt, the AI email writer can fetch URLs named in the prompt and pages from the company's own website to ground the draft.",
    effects:
      "With prompt, the AI email writer can fetch URLs named in the prompt and pages from the company's website to ground the draft.",
  },
  update_template: {
    readOnly:
      "Not read-only: PUT /templates/:id overwrites the body's name, subject, preview text, content, labels or template flag, then requeues localizations.",
    destructive:
      "Destructive: content is replaced with no version history or conflict check, including bodies behind live sequence steps and transactional emails. Code-managed transactional emails and A/B variant bodies are refused.",
    openWorld:
      "Open world: the edited body is what later sequence and transactional sends deliver to contacts, and any public share link renders the new content.",
    effects:
      "Bodies behind live sequence steps and transactional emails are overwritten too, so later sends and any public share link use the new content.",
  },
  set_template_localization: {
    readOnly:
      "Not read-only: PUT /templates/:id/localizations/:locale creates or replaces one locale's subject, preview text and content.",
    destructive:
      "Destructive: an existing variant for that locale is overwritten wholesale, including a translation someone edited. Primary and disabled locales and code-managed emails are refused; keepEdits protects it from later auto-translation.",
    openWorld:
      "Open world: contacts whose locale matches receive this variant on live sends of the email, so a replacement changes what they get next.",
    effects:
      "Contacts in this locale receive the variant on live sends of the email, so replacing it changes what they get next.",
  },
  sync_template_localizations: {
    readOnly:
      "Not read-only: POST /templates/:id/localizations/sync marks locales stale and queues AI translation jobs that write new localized variants.",
    destructive:
      "Destructive: finished translations overwrite stored variants, including human-edited ones unless skipEdited is set. Only enabled non-primary locales are touched; code-managed emails are refused.",
    openWorld:
      "Open world: email copy is sent to an AI model for translation, and the results replace variants used on live sends to contacts in those locales.",
    effects:
      "Completed translations replace stored locale variants, which live sends to contacts in those locales use.",
  },
  get_template_localization_coverage: {
    readOnly:
      "Read-only: GET /templates/localizations/coverage counts, per enabled language, how many sequence and transactional emails and sequence push steps are translated.",
    destructive: "Not destructive: it counts translations and changes none.",
    openWorld:
      "Closed world: reads the company's stored emails and translations.",
  },
  translate_missing_template_localizations: {
    readOnly:
      "Not read-only: POST /templates/localizations/translate-missing queues AI translation jobs that write new localized variants of emails and sequence push steps.",
    destructive:
      "Destructive: contacts in those locales stop getting the fallback language on live sends once a translation lands. Only missing or failed translations are written; edited, up-to-date and outdated ones are left alone.",
    openWorld:
      "Open world: email and push copy is sent to an AI model for translation, and the results become the variants live sends use for contacts in those locales.",
    effects:
      "New translations become the variants live sends use for contacts in those locales.",
  },
  delete_template: {
    readOnly:
      "Not read-only: DELETE /templates/:id deletes the email body and all its localized variants.",
    destructive:
      "Destructive: the body and translations are permanently removed. Safeguards: refused while a campaign, sequence step, transactional email or A/B test uses it, and for code-managed emails.",
    openWorld:
      "Open world: if the email had a public view-in-browser link, that page stops resolving for everyone who received the URL.",
    effects:
      "Deletion is permanent and removes all localized variants; any public share link for the email stops working.",
  },
  share_template: {
    readOnly:
      "Not read-only: POST /templates/:id/share-link stores a share token on the email when none exists, or returns the existing one.",
    destructive:
      "Not destructive: additive and idempotent. It never rotates or revokes an existing link and does not change email content.",
    openWorld:
      "Open world: it creates a public URL that anyone can open to view an anonymized render of the email's current content.",
  },
  unshare_template: {
    readOnly:
      "Not read-only: DELETE /templates/:id/share-link clears the email's share token.",
    destructive:
      "Destructive: the public URL returns 404 at once and can never be restored; sharing again mints a different URL, so every previously distributed copy stays dead.",
    openWorld:
      "Open world: it revokes a public page that people outside the company may already have, affecting anyone holding the link.",
  },
  preview_cart_items: {
    readOnly:
      "Read-only: posts the caller's sample items to /email-blocks/line-items/assist, which returns mapping suggestions and preview items; nothing is saved.",
    destructive:
      "Not destructive: a pure computation on the supplied items that saves and sends nothing.",
    openWorld:
      "Closed world: works only on the items passed in the call and reads no account data or external source.",
  },
  get_email_block_schema: {
    readOnly:
      "Read-only: GET /email-blocks returns the block field reference, for one block type or all of them.",
    destructive: "Not destructive: returns static reference data.",
    openWorld:
      "Closed world: the reference is served by the Sequenzy API and contains no company or contact data.",
  },
  list_email_components: {
    readOnly:
      "Read-only: GET /email-components lists the company's saved components and pinned default slots.",
    destructive:
      "Not destructive: lists components without editing or pinning any.",
    openWorld: "Closed world: reads component records stored in Sequenzy.",
  },
  get_email_component: {
    readOnly:
      "Read-only: GET /email-components/:id returns one component's blocks, version and default-slot status.",
    destructive: "Not destructive: reads a single component.",
    openWorld: "Closed world: reads the company's component data in Sequenzy.",
  },
  get_default_email_component: {
    readOnly:
      "Read-only: GET /email-components/defaults/:slot returns the component pinned for the slot (currently the footer) or not_found.",
    destructive:
      "Not destructive: reads the current default without changing it.",
    openWorld:
      "Closed world: reads the company's default component record in Sequenzy.",
  },
  preview_default_email_component: {
    readOnly:
      "Read-only: although sent as POST, it plans which emails a proposed footer would affect and returns counts, optional HTML samples and a concurrency token without saving.",
    destructive:
      "Not destructive: the default footer and every email stay unchanged; applying requires a separate set_default_email_component call with the token.",
    openWorld:
      "Closed world: renders and counts the company's own emails inside Sequenzy and sends nothing.",
  },
  set_default_email_component: {
    readOnly:
      "Not read-only: PUT /email-components/defaults/:slot creates or replaces the pinned default footer and, with application and previewToken, rewrites footers in existing emails.",
    destructive:
      "Destructive: replaces the existing default wholesale and, with an application scope, overwrites footers in selected emails. Safeguards: requires a matching preview token (stale returns conflict), preserves customized footers by default, and omitting application leaves existing emails unchanged.",
    openWorld:
      "Open world: with an application scope it rewrites footers in active sequences, scheduled campaigns and transactional emails that send to real recipients.",
  },
  create_email_component: {
    readOnly:
      "Not read-only: POST /email-components inserts a new reusable component from the supplied blocks.",
    destructive:
      "Not destructive: purely additive. It is not pinned as a default, so no existing or future email changes until someone uses it.",
    openWorld:
      "Closed world: the component is stored in the company's workspace and is not sent or published.",
  },
  update_email_component: {
    readOnly:
      "Not read-only: PATCH /email-components/:id overwrites the component's name, description, type or blocks.",
    destructive:
      "Destructive: replaced blocks overwrite the previous version with no restore; the version number bumps. Emails that already cloned the component keep their copy.",
    openWorld:
      "Closed world: changes apply only to emails built afterwards in the editor, so no existing send changes and nothing leaves the workspace.",
  },
  duplicate_email_component: {
    readOnly:
      "Not read-only: POST /email-components/:id/duplicate inserts a new component copied from an existing one.",
    destructive:
      "Not destructive: purely additive. The source component is unchanged and the copy is never pinned as a default, so no email changes.",
    openWorld:
      "Closed world: the copy is stored in the company's workspace and is not sent or published.",
  },
  delete_email_component: {
    readOnly:
      "Not read-only: DELETE /email-components/:id deletes the component row.",
    destructive:
      "Destructive: the component is permanently removed with no in-use check; if it was the pinned default footer, newly built emails fall back to the generated footer. Emails that already copied it keep their blocks.",
    openWorld:
      "Closed world: existing emails are unchanged and nothing is sent; the deletion stays within the company's workspace.",
  },
  list_ab_tests: {
    readOnly:
      "Read-only: GET /ab-tests lists the company's A/B tests and their variants, optionally for one sequence.",
    destructive:
      "Not destructive: lists tests without changing winners or settings.",
    openWorld: "Closed world: reads A/B test records stored in Sequenzy.",
  },
  get_ab_test: {
    readOnly:
      "Read-only: GET /ab-tests/:id returns one test's settings, variants and localization status.",
    destructive: "Not destructive: reads a single test record.",
    openWorld: "Closed world: reads the company's A/B test data in Sequenzy.",
  },
  get_ab_test_stats: {
    readOnly:
      "Read-only: GET /ab-tests/:id/stats aggregates per-variant engagement and significance for the chosen period.",
    destructive:
      "Not destructive: computes statistics and does not select a winner or change the test.",
    openWorld:
      "Closed world: aggregates the company's stored send and engagement events in Sequenzy and ClickHouse.",
  },
  restart_ab_test: {
    readOnly:
      "Not read-only: creates a new A/B test and control email, stages it on the sequence step, and for more than one variant queues AI generation of the new variants.",
    destructive:
      "Destructive: the step's current test and winner are superseded by the new test, with no confirmLiveChange check. Allowed only for the step's current sequence test after a winner is selected.",
    openWorld:
      "Open world: on an active sequence, once the new variants are ready, contacts reaching the step are split across different emails than the previous winner.",
    effects:
      "On an active sequence the step switches to the new test once its variants are ready, so contacts reaching it receive the new variants.",
  },
  select_ab_test_winner: {
    readOnly:
      "Not read-only: records the winning variant and, for a campaign test, enqueues the winner send to the remaining audience.",
    destructive:
      "Destructive: a campaign winner starts emailing the rest of the audience, which cannot be recalled; a sequence winner changes what later contacts receive. Active sequences require confirmLiveChange.",
    openWorld:
      "Open world: for campaign tests it starts real email delivery to the remaining recipients; for sequence tests it changes the email live contacts get at that step.",
  },
  resume_ab_test: {
    readOnly:
      "Not read-only: clears the sequence test's winner, turns off automatic winner selection and resumes splitting.",
    destructive:
      "Destructive: the selected winner, including an automatic one, is erased and automatic selection is disabled; contacts reaching the step stop getting the winner. Campaign tests are refused and active sequences require confirmLiveChange.",
    openWorld:
      "Open world: on an active sequence, real contacts reaching the step are again split across all variants, changing the emails they receive.",
  },
};
