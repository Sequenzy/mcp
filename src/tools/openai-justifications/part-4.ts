import type { ToolJustification } from "./types.js";

export const OPENAI_JUSTIFICATIONS_PART_4: Readonly<
  Record<string, ToolJustification>
> = {
  update_ab_test_variant: {
    readOnly:
      "Writes new subject, preview text, html or blocks onto an existing A/B test variant via PATCH /api/v1/ab-tests/:id/variants/:variantId; nothing is only read.",
    destructive:
      "Overwrites the variant's previous content with no stored history. Campaign variants are editable only while the test is in draft; sequence variants that already sent require confirmLiveChange=true, otherwise the call is refused.",
    openWorld:
      "On an active sequence the saved content is what contacts reaching that step receive from then on, so the edit changes live email going to real recipients outside the workspace.",
    effects:
      "On an active sequence, the saved variant content is sent to contacts who reach the step after the edit.",
  },
  update_ab_test: {
    readOnly:
      "Updates stored A/B test settings (name, sample percentage, duration, winner criteria, sequence threshold and auto-select) and can queue sample-resize and deadline jobs.",
    destructive:
      "Replaces the previous settings. On a running campaign test a past deadline selects the winner at once and a larger sample sends variants to more contacts; the winner metric locks once testing starts, expectedUpdatedAt rejects stale writes (409), live sequence edits need confirmLiveChange.",
    openWorld:
      "Changing a running test changes which variant real recipients receive next: resized samples go out to added contacts and an earlier deadline triggers the winner send to the rest of the audience.",
    effects:
      "On a running campaign test, a deadline already in the past selects the winner immediately and a larger sample sends test variants to more contacts.",
  },
  create_ab_test: {
    readOnly:
      "Inserts an A/B test with control variant A, and for automationNodeId rewrites the sequence email node into an action_ab_test node.",
    destructive:
      "Converting a sequence node moves the step's copy off the node onto variants, changing nodeType so update_sequence_node can no longer edit it; deleting variants does not undo it. Active sequences require confirmLiveChange; campaign tests require a draft or rejected campaign with no existing test.",
    openWorld:
      "When the converted step belongs to an active sequence, contacts reaching it start being split across the competing variants immediately, so real recipients receive the new content.",
    effects:
      "On an active sequence, contacts reaching the converted step start receiving the competing variants at once.",
  },
  add_ab_test_variant: {
    readOnly:
      "Inserts a new variant (and, for sequence tests, its own email template) into an existing A/B test.",
    destructive:
      "The variant itself is a new record, but on a sequence step it takes a share of future sends away from the existing variants, changing live delivery. Refused once the test has started; tests in an active sequence require confirmLiveChange.",
    openWorld:
      "For a test on an active sequence step, contacts reaching the step can be sent the new variant, so the content reaches real recipients.",
    effects:
      "On an active sequence, contacts who reach the step afterwards can receive the new variant.",
  },
  delete_ab_test_variant: {
    readOnly:
      "Deletes one variant row from a draft A/B test via DELETE /api/v1/ab-tests/:id/variants/:variantId.",
    destructive:
      "Permanently removes the variant and its content; there is no restore. Control variant A and the minimum variant count are protected, removal is refused after the test starts, and tests in an active sequence require confirmLiveChange.",
    openWorld:
      "Open world: on an active sequence (with confirmLiveChange) contacts reaching the step stop receiving the removed variant and get the remaining ones instead, like add_ab_test_variant.",
    effects:
      "On an active sequence, contacts who reach the step afterwards no longer receive this variant.",
  },
  delete_ab_test: {
    readOnly:
      "Deletes a campaign A/B test row, all of its variants and their localizations.",
    destructive:
      "Permanent: the test, every variant's content and translations are deleted with no undo. Refused for running tests (testing or winner_selected), for sequence tests, and unless the linked campaign is draft or rejected.",
    openWorld:
      "Restricted to draft or rejected campaigns, so nothing has been sent and no recipient or public page is affected; the request only touches the company's own records.",
  },
  create_campaign_for_audience: {
    readOnly:
      "Creates a new draft campaign whose audience is a frozen snapshot of the selected contacts (up to 100,000) via POST /api/v1/campaigns/from-audience.",
    destructive:
      "Purely additive: inserts one blank draft and its frozen contact group; no existing campaign, contact or list is modified and nothing is scheduled.",
    openWorld:
      "Stays inside the company's workspace: it reads contacts and activity already stored there, sends no email and creates no public link.",
  },
  list_campaigns: {
    readOnly:
      "Returns a paginated page of the company's campaigns with status, Style > Format and pacing fields via GET /api/v1/campaigns; writes nothing.",
    destructive:
      "Read-only listing; it cannot delete, overwrite or send anything.",
    openWorld: "Reads only the company's stored campaign records in Sequenzy.",
  },
  get_campaign: {
    readOnly:
      "Returns one campaign's stored details, stats, share URL and pacing via GET /api/v1/campaigns/:id; writes nothing.",
    destructive:
      "Read-only lookup of a single campaign; nothing is changed or sent.",
    openWorld:
      "Reads only the company's own campaign data and stats held by Sequenzy.",
  },
  get_campaign_audience: {
    readOnly:
      "Resolves the campaign's stored targeting into list/segment names, filters and a live recipient count via GET /api/v1/campaigns/:id/audience; it does not change targeting.",
    destructive:
      "Read-only; it only computes who would be reached and leaves the campaign untouched.",
    openWorld:
      "Counts the company's own subscribers inside Sequenzy; no email is sent and no outside service is contacted.",
  },
  share_campaign: {
    readOnly:
      "Writes a share token onto the campaign the first time it is called, creating a public view-in-browser URL; a repeat call returns the existing link.",
    destructive:
      "Additive: it only creates a link (or returns the active one with created=false) and never rotates, deletes or edits campaign content.",
    openWorld:
      "Produces a public URL that anyone who receives it can open without signing in; the hosted page renders the campaign's current email content to the open internet.",
  },
  unshare_campaign: {
    readOnly:
      "Clears the campaign's stored share token via DELETE /api/v1/campaigns/:id/share-link.",
    destructive:
      "Irreversible for the old link: the shared URL returns 404 immediately and sharing again mints a different URL, so every copy already sent to others stays dead. Returns revoked=false when no link was active.",
    openWorld:
      "Breaks a public URL that people outside the workspace may already hold, so it changes what the public can access.",
  },
  list_email_sends: {
    readOnly:
      "Lists stored delivery rows (recipient, status, timestamps) from the last 14 days with filters via GET /api/v1/email-sends; writes nothing.",
    destructive:
      "Read-only history query; it cannot resend, cancel or delete deliveries.",
    openWorld:
      "Reads the company's own delivery records in Sequenzy; nothing is sent to recipients or outside services.",
  },
  get_email_send: {
    readOnly:
      "Returns one stored email send with its HTML, delivery status and event timeline via GET /api/v1/email-sends/:id; writes nothing.",
    destructive:
      "Read-only lookup of a past or queued send; it does not retry or alter it.",
    openWorld:
      "Reads stored delivery data and the company's analytics events inside Sequenzy only.",
  },
  create_campaign: {
    readOnly:
      "Inserts a new campaign and its email body (empty, caller-supplied, imported, or AI-generated from prompt).",
    destructive:
      "Additive: always creates a new record and never edits or deletes an existing campaign; status 'sent' only records an already-sent import. The AI writer saves the company's design prompt only when it is blank (compare-and-swap).",
    openWorld:
      "With prompt, the AI email writer fetches URLs named in the prompt and pages from the company's website to ground the draft, reaching the public internet. Nothing is sent to recipients.",
    effects:
      "With prompt, the AI writer can fetch URLs named in the prompt and pages on the company's website.",
  },
  update_campaign: {
    readOnly:
      "Overwrites fields on a draft campaign: content, audience targeting, sender and reply identity, labels, pacing and recipient cap, via PUT /api/v1/campaigns/:id.",
    destructive:
      "Replaces the previous content, audience and identity with no version history or conflict check; only draft campaigns are accepted, so nothing already scheduled or sent changes.",
    openWorld:
      "If the campaign has an active public share link, that page renders the current content, so the update changes what anyone holding the link sees.",
    effects:
      "If the campaign has an active share link, the public page shows the updated content immediately.",
  },
  schedule_campaign: {
    readOnly:
      "Sets the campaign to scheduled (or waiting_approval) with a future send time or recurrence and enqueues its delivery job.",
    destructive:
      "Commits a send to the whole targeted audience at scheduledAt; emails that go out cannot be recalled. Safeguards: scheduledAt must be in the future, validation requires subject, content and audience, and unschedule_campaign or cancel_campaign can stop it before delivery.",
    openWorld:
      "Delivers email to the campaign's real recipients outside the workspace at the scheduled time, and on every cadence run when recurringInterval is set.",
  },
  send_test_email: {
    readOnly:
      "Creates an email send record and queues a test email job for the given address; it is not a read.",
    destructive:
      "Each call sends a real email that cannot be recalled once delivered. It goes only to the single to address and requires a verified sending domain.",
    openWorld:
      "Emails an arbitrary caller-supplied address, which can be anyone outside the company.",
  },
  unschedule_campaign: {
    readOnly:
      "Moves a scheduled campaign back to draft, clearing scheduledAt and recurrence and removing its queued delivery jobs.",
    destructive:
      "Discards the saved schedule and recurring cadence, which must be set again to send; the campaign and content are kept. Only works while status is scheduled, guarded by a delivery-generation compare-and-swap that returns 409 if sending already began.",
    openWorld:
      "Only stops a pending send inside Sequenzy; it sends nothing and changes no public page.",
  },
  cancel_campaign: {
    readOnly:
      "Sets the campaign status to cancelled, raises the stop flag for workers and removes scheduled and pending chunk jobs.",
    destructive:
      "Irreversible: remaining recipients will never receive the campaign and a cancelled campaign cannot be restarted. Applies only to scheduled, sending, paused or approval-pending campaigns.",
    openWorld:
      "Stops outbound delivery rather than reaching anyone; no email, URL fetch or public page change results.",
  },
  pause_campaign: {
    readOnly:
      "Sets a sending campaign to paused and sets a Redis pause flag so in-progress delivery workers stop.",
    destructive:
      "Interrupts a live send midway; recipients not yet reached stop getting it until resume_campaign is called, and the original delivery timing is lost. Only campaigns in sending status can be paused; nothing is deleted.",
    openWorld:
      "Halts delivery inside Sequenzy; it sends nothing and reaches no outside service.",
  },
  resume_campaign: {
    readOnly:
      "Sets a paused campaign back to sending, optionally with a new spreadOverHours, and requeues the remaining delivery.",
    destructive:
      "Restarts delivery of the remaining emails to recipients, which cannot be recalled once sent. Only paused campaigns are accepted.",
    openWorld:
      "Sends the campaign's remaining emails to real recipients outside the workspace.",
  },
  delete_campaign: {
    readOnly: "Deletes the campaign row via DELETE /api/v1/campaigns/:id.",
    destructive:
      "Permanent: the campaign, its content and its share token are removed with no undo. Sending, scheduled or paused campaigns are refused until cancelled.",
    openWorld:
      "Deleting removes the campaign's public share link, so a URL anyone outside the workspace may hold stops working.",
    effects:
      "Deletion also disables the campaign's public share link if one exists.",
  },
  duplicate_campaign: {
    readOnly:
      "Inserts a new draft campaign copied from an existing one (optionally with its A/B test, or one variant's content).",
    destructive:
      "Additive: the source campaign is left untouched and the copy is a new draft that is not scheduled.",
    openWorld:
      "Copies records inside the company's workspace; nothing is sent or published.",
  },
  create_non_opener_resend_draft: {
    readOnly:
      "Inserts a new draft campaign copying the sent campaign's email, with the original audience plus a didn't-open exclusion rule.",
    destructive:
      "Additive: creates a separate draft and leaves the original campaign unchanged; nothing is sent until the draft is scheduled separately.",
    openWorld:
      "Reads the company's own open data to build the audience; it sends no email and creates no public link.",
  },
  list_campaign_goals: {
    readOnly:
      "Returns the campaign's conversion goals and the company-wide goals via GET /api/v1/campaigns/:id/goals; writes nothing.",
    destructive: "Read-only list; no goal is created, changed or removed.",
    openWorld: "Reads the company's own goal configuration inside Sequenzy.",
  },
  create_campaign_goal: {
    readOnly: "Inserts one new conversion goal row scoped to the campaign.",
    destructive:
      "Additive: adds a goal without changing existing goals, the campaign email or its audience.",
    openWorld:
      "Only defines how the company's own events, attributes or tags are attributed in reports; nothing is sent or fetched.",
  },
  update_campaign_goal: {
    readOnly:
      "Overwrites fields of an existing campaign goal, including its trigger, attribution window and active state.",
    destructive:
      "Replaces the previous goal definition with no history, so later conversions are attributed under the new rule; isActive=false stops it counting. Scoped to campaign goals of that campaign only.",
    openWorld:
      "Changes reporting configuration inside the workspace; no email, URL fetch or public page is involved.",
  },
  delete_campaign_goal: {
    readOnly:
      "Deletes one campaign-scoped goal row and clears the goal attribution cache.",
    destructive:
      "Permanent: the goal definition is removed and no longer appears as a conversion step on the campaign report; there is no restore. The delete is limited to campaign-scope goals of the given campaign, not company-wide goals.",
    openWorld:
      "Only removes reporting configuration in the company's workspace.",
  },
  list_campaign_variations: {
    readOnly:
      "Lists the campaign email's non-discarded variations with status and content; writes nothing.",
    destructive:
      "Read-only; polling it does not change variations or the campaign email.",
    openWorld: "Reads variation rows stored for the company's campaign.",
  },
  get_campaign_variation: {
    readOnly: "Returns one variation's status and blocks; writes nothing.",
    destructive: "Read-only lookup; nothing is modified.",
    openWorld: "Reads a variation stored in the company's workspace.",
  },
  generate_campaign_variations: {
    readOnly:
      "Inserts 1 to 4 new variation rows and starts AI generation for them; the campaign email itself is not modified.",
    destructive:
      "Additive: each call creates new variations and never overwrites the email or existing variations. The company's email design prompt is saved only if it is blank (compare-and-swap).",
    openWorld:
      "The prompt goes through the AI email writer, which fetches URLs named in the prompt and pages from the company's website.",
    effects:
      "The AI writer can fetch URLs named in the prompt and pages on the company's website.",
  },
  create_campaign_variation: {
    readOnly:
      "Inserts one new ready variation from caller-supplied blocks or html.",
    destructive:
      "Additive: saves a new variation and leaves the campaign email and other variations unchanged.",
    openWorld:
      "Stores caller content in the workspace; no AI writer, URL fetch, send or public page is involved.",
  },
  update_campaign_variation: {
    readOnly:
      "Overwrites a variation's name, content, theme, font or canvas position.",
    destructive:
      "Replaces the variation's previous blocks, subject and look with no version kept; content changes are refused unless the variation is ready. The campaign email is not changed.",
    openWorld:
      "Edits a draft-only alternative inside the workspace; variations are not sent or publicly shared until used.",
  },
  discard_campaign_variation: {
    readOnly:
      "Marks a variation as discarded (sets discardedAt) so it leaves the list.",
    destructive:
      "Not destructive: it only hides the variation from the canvas and keeps its content, and restore_campaign_variation brings it back with its label. The campaign email is not changed.",
    openWorld: "Changes only variation bookkeeping in the workspace.",
  },
  restore_campaign_variation: {
    readOnly:
      "Clears discardedAt on a discarded variation so it returns to the list.",
    destructive:
      "Additive: brings back a previously discarded variation without overwriting any content.",
    openWorld: "Changes only variation state inside the workspace.",
  },
  use_campaign_variation: {
    readOnly:
      "Writes a ready variation's blocks, and subject/preview text when present, into the campaign email and re-derives translations.",
    destructive:
      "Overwrites the campaign email's content and derived translations. Safeguards: draft campaigns only, and if the current content is not already a variation it is first saved as 'Before <label>' and returned as savedPrevious.",
    openWorld:
      "If the draft has an active public share link, that page renders the new content, so it changes what anyone holding the link sees.",
    effects:
      "If the campaign has an active share link, the public page shows the new content immediately.",
  },
  generate_campaign_variation_section_options: {
    readOnly:
      "Returns AI-generated replacement blocks without storing variations or email content, but runs the email writer, which records the company's design prompt on first use.",
    destructive:
      "Additive at most: options are returned, not saved, and the only write is the design prompt saved when it is blank (compare-and-swap, never replacing an existing one).",
    openWorld:
      "Open world: the prompt runs through the AI email writer, which can fetch URLs named in it and pages from the company's website while drafting the section options.",
    effects:
      "The AI writer can fetch URLs named in the prompt and pages on the company's website.",
  },
  edit_campaign_variation: {
    readOnly:
      "Runs an AI edit and saves the result over one ready variation's content.",
    destructive:
      "Overwrites the variation's previous blocks (and, for whole edits, its theme and font) with no version kept. Refused with 409 if the variation is not ready or changed during the edit, and 400 when the AI changed nothing; the campaign email is untouched.",
    openWorld:
      "Open world: the edit instruction runs through the AI email writer, which can fetch URLs named in it and pages from the company's website before saving the edited variation.",
    effects:
      "The AI writer can fetch URLs named in the prompt and pages on the company's website.",
  },
  render_email: {
    readOnly:
      "Renders a stored campaign, sequence step or template to HTML with a sample or inline subscriber; the POST only returns HTML and stores nothing.",
    destructive:
      "Read-only rendering; content, contacts and sends are untouched.",
    openWorld:
      "Renders from the company's stored content inside Sequenzy; it sends no email and does not fetch the email's links or images.",
  },
  check_email: {
    readOnly:
      "Runs checker rules over a stored email and requests its links and images, returning findings; it stores and sends nothing.",
    destructive:
      "Read-only: reports issues without editing the email or sending it.",
    openWorld:
      "Makes live HTTP requests to every link and image URL in the email, which can be any public website.",
  },
  list_forms: {
    readOnly:
      "Lists the company's saved signup forms with settings and public action URLs via GET; writes nothing.",
    destructive: "Read-only; no form is created, edited or unpublished.",
    openWorld:
      "Returns stored form records; listing does not contact any site or visitor.",
  },
  create_form: {
    readOnly: "Inserts a new signup form and publishes it immediately.",
    destructive:
      "The form accepts public submissions at once; with duplicateStrategy overwrite submissions replace existing contacts' fields, the default resubscribeBehavior reactivate resubscribes unsubscribed contacts, and applied tags can start sequences.",
    openWorld:
      "Publishes a public form action that any site visitor can submit, adding real people to the company's lists.",
    effects:
      "With duplicateStrategy overwrite, submissions replace existing contacts' data; by default unsubscribed contacts who submit are resubscribed.",
  },
  update_form: {
    readOnly:
      "Overwrites a saved form's name, audience, duplicate handling, copy, theme or content blocks via PATCH /api/v1/forms/:id.",
    destructive:
      "Replaces the previous configuration and blocks with no history; switching duplicateStrategy to overwrite lets later submissions replace existing contacts' data.",
    openWorld:
      "A published form changes at once for every visitor on sites where it is embedded, and retargeting changes which lists public signups join.",
    effects:
      "Changes apply immediately to the published form wherever it is embedded.",
  },
  get_form_embed: {
    readOnly:
      "Returns a published form's action URL and embed snippets via GET /api/v1/forms/embed/:id; writes nothing.",
    destructive:
      "Read-only; generating snippets does not publish, change or delete the form.",
    openWorld:
      "Builds snippets from stored form data; the call itself does not contact any site.",
  },
  list_popups: {
    readOnly:
      "Lists the company's saved popups with status and view/conversion stats; writes nothing.",
    destructive:
      "Not destructive: it only lists the company's saved popups and their settings; nothing is published, changed or removed.",
    openWorld: "Reads stored popup records and counters inside Sequenzy.",
  },
  get_popup: {
    readOnly:
      "Returns one saved popup's full content, trigger, targeting and theme; writes nothing.",
    destructive:
      "Not destructive: it only returns one saved popup's content and targeting; the live popup is not changed.",
    openWorld: "Reads a stored popup inside the company's workspace.",
  },
  create_popup: {
    readOnly:
      "Inserts a new popup, published by default, and returns its embed script.",
    destructive:
      "Published by default, so it collects submissions as soon as its script runs on a site; with duplicateStrategy overwrite submissions replace existing contacts' data, reactivate resubscribes unsubscribed contacts, and tags can start sequences. status=draft avoids going live.",
    openWorld:
      "A published popup is shown to public visitors on any site that loads its script and adds them to the company's lists.",
    effects:
      "With duplicateStrategy overwrite, submissions replace existing contacts' data; by default unsubscribed contacts who submit are resubscribed.",
  },
  update_popup: {
    readOnly:
      "Overwrites a popup's status, audience, trigger, targeting, copy, theme or blocks via PATCH /api/v1/popups/:id.",
    destructive:
      "Replaces the previous configuration and content with no history; status changes publish or hide it, and overwrite duplicate handling replaces contacts' data on later submissions.",
    openWorld:
      "Changes what public visitors see on sites running the popup's script, and which lists their signups join, as soon as it is saved.",
    effects:
      "Changes apply immediately on every site that loads the popup's embed script.",
  },
  get_popup_embed: {
    readOnly:
      "Returns a published popup's script URL and paste-ready snippets; writes nothing.",
    destructive: "Read-only; generating snippets changes no popup.",
    openWorld:
      "Builds snippets from stored data; it does not contact the customer's site or any platform.",
  },
  duplicate_popup: {
    readOnly: "Inserts a draft copy of a popup with its own zeroed counters.",
    destructive:
      "Additive: the original keeps showing and keeps its stats; the copy starts as a draft.",
    openWorld: "The copy is a draft, so nothing new is shown to visitors.",
  },
  delete_popup: {
    readOnly: "Deletes the popup row and its view and conversion counts.",
    destructive:
      "Permanent: the popup, its content and stats are removed with no undo, even while published; captured subscribers are kept. Setting status to draft via update_popup is the non-destructive alternative.",
    openWorld:
      "A published popup stops showing at once to visitors on every site that loads its script.",
    effects:
      "A published popup stops showing immediately on every site that loads its embed script.",
  },
  list_landing_pages: {
    readOnly:
      "Lists the company's landing pages via GET /api/v1/landing-pages; writes nothing.",
    destructive:
      "Not destructive: it only lists the company's landing pages with status and URLs; no page is published, edited or deleted.",
    openWorld: "Reads stored landing page records inside Sequenzy.",
  },
  get_landing_page: {
    readOnly:
      "Returns one landing page's content, metrics and URLs; writes nothing.",
    destructive:
      "Not destructive: it only returns one landing page and its preview link; the page itself is not changed.",
    openWorld:
      "Reads the company's stored page; the signed previewUrl is computed from the page ID, not created or published.",
  },
  get_landing_page_stats: {
    readOnly:
      "Returns stored visit, click and subscribe analytics for a page; writes nothing.",
    destructive: "Read-only analytics query.",
    openWorld:
      "Reads the company's own recorded page events; no outside service is contacted.",
  },
  render_landing_page: {
    readOnly:
      "Returns a signed preview URL for a page; the POST stores nothing and never publishes or changes the page.",
    destructive: "Read-only; it does not publish, unpublish or edit the page.",
    openWorld:
      "Computes an unlisted, non-indexed preview URL from the page ID without creating a public page; draft preview forms do not collect contacts.",
  },
  create_landing_page: {
    readOnly:
      "Inserts a new draft landing page from caller content or static template copy.",
    destructive:
      "Additive: creates a draft with a unique slug and does not modify other pages.",
    openWorld:
      "The page is a draft with no public URL until publish_landing_page; templates are built-in copy, not fetched.",
  },
  update_landing_page: {
    readOnly:
      "Overwrites a page's name, slug or full content via PUT /api/v1/landing-pages/:id.",
    destructive:
      "Replaces the full content with no version history; on a published page the change goes live at once and a new slug moves the public URL, breaking the old one.",
    openWorld:
      "Edits a published page in place, so anyone visiting its public URL sees the change immediately.",
    effects:
      "On a published page, edits go live immediately and a new slug changes its public URL.",
  },
  duplicate_landing_page: {
    readOnly:
      "Inserts a draft copy of a landing page with its own slug and stats.",
    destructive:
      "Additive: the original page, its URL and stats are untouched.",
    openWorld: "The copy is a draft without a public URL.",
  },
  delete_landing_page: {
    readOnly:
      "Deletes the landing page row and its recorded visit and conversion events.",
    destructive:
      "Permanent: page content and analytics events are deleted with no undo. Safeguards: refused while the page is published and while a domain is connected to it.",
    openWorld:
      "Closed world: published pages and pages with a connected domain are refused, so deletion never changes a public page; it removes a draft and its stats from the workspace.",
    effects:
      "Published pages and pages with a connected domain are refused; deletion also removes the page's visit and conversion history.",
  },
  publish_landing_page: {
    readOnly:
      "Sets the page status to published, saving optional name, slug or content updates first.",
    destructive:
      "Optional updates overwrite the existing content and slug, and published content is exposed publicly where it can be seen and crawled; unpublish_landing_page takes it down but cannot recall copies.",
    openWorld:
      "Makes the page reachable by anyone on the public domain and lets its signup form collect real contacts.",
  },
  unpublish_landing_page: {
    readOnly:
      "Sets the page back to draft, saving optional name, slug or content updates first.",
    destructive:
      "The public URL stops serving the page and its form stops collecting signups; optional updates overwrite content and slug. Republishing restores it, but links shared meanwhile fail.",
    openWorld:
      "Takes a public page offline, so visitors and anyone holding its URL lose access.",
    effects:
      "The public URL stops serving the page to visitors until it is published again.",
  },
};
