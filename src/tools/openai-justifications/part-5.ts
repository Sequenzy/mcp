import type { ToolJustification } from "./types.js";

export const OPENAI_JUSTIFICATIONS_PART_5: Readonly<
  Record<string, ToolJustification>
> = {
  connect_landing_page_domain: {
    readOnly:
      "Writes a landing_page_domain row for the workspace or one page and registers the hostname with the hosting provider, so it is not a read.",
    destructive:
      "Without landingPageId, connecting a different hostname replaces the workspace domain and releases the old hostname from the provider, so pages stop loading there. A dedicated page domain is refused with 409 rather than replaced; reconnecting resets verification to pending.",
    openWorld:
      "Calls the Vercel domains API to add the hostname and serves public landing pages on a domain the company owns, which visitors reach once DNS points to it.",
    effects:
      "Registers the hostname with the hosting provider (Vercel); connecting a new workspace-wide domain releases the previous workspace hostname, so pages stop loading there.",
  },
  update_landing_page_domain_settings: {
    readOnly:
      "Changes the stored domain or rewrites its verification status after checking DNS and the provider; neither mode is a pure read.",
    destructive:
      "Setting a new workspace domain replaces the old one and releases that hostname, breaking live page URLs on it. verify rewrites stored status and can mark an unhealthy domain failed. Dedicated page domains are never replaced; the API returns 409 until the old one is removed.",
    openWorld:
      "Adds or releases hostnames through the Vercel domains API and looks up public DNS records during verification; the result decides which public hostname serves the pages.",
    effects:
      "A new workspace domain replaces and releases the previous hostname with the hosting provider (Vercel); verify rechecks DNS and the provider and rewrites the stored status.",
  },
  remove_landing_page_domain: {
    readOnly:
      "Deletes the page's landing_page_domain row and removes the hostname from the hosting provider.",
    destructive:
      "Irreversible for live traffic: the page stops answering at the custom hostname at once, so links and bookmarks to it break until the domain is connected and verified again. Scoped to one page; the workspace and Sequenzy fallback URLs keep working.",
    openWorld:
      "Calls the Vercel domains API to release the hostname and removes apex/www redirects, changing which public URL visitors can open.",
    effects:
      "Releases the hostname from the hosting provider (Vercel), so the page stops loading at that custom domain and existing links to it break.",
  },
  upload_image_asset: {
    readOnly:
      "Stores a new image object in the company's media library via POST /api/v1/media/upload-url and the upload endpoint; it writes storage.",
    destructive:
      "Purely additive: each call creates a new immutable object with a new key and never overwrites or deletes an existing image or email.",
    openWorld:
      "The image is stored in public object storage and the returned URL can be opened by anyone who has it, including email recipients once it is placed in an email.",
    effects:
      "The returned URL is public: anyone with the link can load the image.",
  },
  list_sequences: {
    readOnly:
      "Issues GET /api/v1/sequences with optional status, search, label and paging filters and returns sequence summaries; nothing is written.",
    destructive: "A list read; it cannot change, pause or delete any sequence.",
    openWorld:
      "Reads only the selected company's own sequences from Sequenzy's database; no outside service is contacted.",
  },
  get_sequence: {
    readOnly:
      "Issues GET /api/v1/sequences/:id and returns settings, nodes, edges, graphRevision and email content; the updateHints it returns are tokens for later edits, not writes.",
    destructive:
      "Read-only detail fetch; it changes no node, email or A/B test.",
    openWorld:
      "Returns the company's own sequence data from its Sequenzy workspace without contacting external systems.",
  },
  list_sequence_enrollments: {
    readOnly:
      "Issues GET /sequences/:id/enrollments and returns enrollment tokens; stopConditionMatch only evaluates the stop condition in memory and saves nothing.",
    destructive: "Read-only; it cannot cancel, move or advance any enrollment.",
    openWorld:
      "Reads enrollment rows and redacted entry context from the company's own data; no recipient is contacted.",
  },
  get_sequence_enrollment: {
    readOnly:
      "Issues GET /sequences/:id/enrollments/:enrollmentId and returns one token with its bounded ClickHouse node history; nothing is stored.",
    destructive: "A single-record read with no write path.",
    openWorld:
      "Reads the company's own Postgres and ClickHouse enrollment history only.",
  },
  start_sequence_test_run: {
    readOnly:
      "POSTs /sequences/:id/test-runs, which creates a test run and queues a worker that executes the sequence's real actions for one subscriber.",
    destructive:
      "Actions run for real and are not rolled back: tag, attribute and discount changes persist, webhooks are posted and test-marked emails are delivered. Stalled-job recovery can replay actions. Scoped to one existing active subscriber; the sequence is not enabled.",
    openWorld:
      "Delivers real email to the chosen subscriber's address and posts any outbound webhook steps to their external URLs; discount steps create codes with Stripe or Shopify.",
  },
  get_sequence_test_run: {
    readOnly:
      "Issues GET /sequences/:id/test-runs/:runId and returns status, step logs and errors; it does not restart or cancel the run.",
    destructive: "Read-only status check.",
    openWorld:
      "Reads the stored test-run record in the company's workspace; no message is sent.",
  },
  simulate_sequence: {
    readOnly:
      "Issues GET /sequences/:id/simulate, which computes current trigger matches, readiness errors and an optional branch path without creating enrollments or sends.",
    destructive:
      "A dry run: it enrolls nobody, sends nothing and saves no simulation state.",
    openWorld:
      "Evaluates the company's own subscribers, lists and segments inside Sequenzy; no email or external call is made.",
  },
  send_sequence_test_email: {
    readOnly:
      "POSTs /sequences/:id/nodes/:nodeId/test, which creates email_send records and queues delivery to each reviewer address.",
    destructive:
      "Each call delivers 1-10 real emails that cannot be recalled once sent, and repeating the call sends another set. Limited to one saved action_email step and requires a verified sending domain; no subscriber is enrolled.",
    openWorld:
      "Emails arbitrary reviewer addresses supplied by the caller, which can be outside the company.",
  },
  create_sequence: {
    readOnly:
      "POSTs /api/v1/sequences, which saves a new sequence with its nodes and emails (and queues AI enrichment for a goal), so it writes data.",
    destructive:
      "Additive: it inserts a new disabled draft and never edits, activates or deletes an existing sequence; nothing is sent until enable_sequence is called.",
    openWorld:
      "With a goal, the AI email writer drafts the emails and can fetch URLs named in the goal and pages from the company's own website.",
    effects:
      "With goal, the AI email writer drafts the emails and can fetch URLs named in the goal and pages from the company's own website.",
  },
  update_sequence: {
    readOnly:
      "PUTs /api/v1/sequences/:id and saves settings, trigger, sender identity, email/SMS content and inserted or deleted steps.",
    destructive:
      "Overwrites settings and email content in place, and deleting a step immediately moves or completes parked recipients. On an active sequence, structural changes need confirmStructuralChange and trigger changes need confirmLiveChange, enforced again under a row lock.",
    openWorld:
      "On an active sequence, saved content, sender identity and trigger changes reach real recipients on their next sends, and step deletion releases parked contacts onto the next live step.",
    effects:
      "On an active sequence, saved content, sender and trigger changes apply to the next sends to real contacts.",
  },
  update_sequence_node: {
    readOnly:
      "PUTs /api/v1/sequences/:id with one node patch, saving the node's config and, for email nodes, the linked email content or style.",
    destructive:
      "Overwrites the node's stored config with no undo. Safeguards: the required expectedUpdatedAt rejects stale writes, and an active sequence refuses the change unless confirmLiveChange is true.",
    openWorld:
      "Saved email content goes to real contacts on the next sends of an active sequence and shows on the email's public share link; webhook nodes post to whatever external URL is set.",
    effects:
      "Saved email content goes out with the next sends of an active sequence and shows on the email's public share link.",
  },
  update_sequence_nodes: {
    readOnly:
      "PUTs /api/v1/sequences/:id with several node patches committed in one transaction, saving each node's config and linked email content.",
    destructive:
      "Overwrites every listed node in place, all or nothing. Each patch needs a matching expectedUpdatedAt, and an active sequence refuses the batch unless confirmLiveChange is true; there is no undo.",
    openWorld:
      "On an active sequence the new delays, content or styles apply to contacts' next sends, and email changes show on public share links.",
    effects:
      "Saved email content goes out with the next sends of an active sequence and shows on the email's public share link.",
  },
  edit_sequence_emails: {
    readOnly:
      "POSTs /sequences/:id/emails/edit; the AI rewrites the targeted emails and saves each changed one unless dryRun is true.",
    destructive:
      "Saves AI rewrites over the existing email blocks, subject or style, with no automatic undo. dryRun previews without saving, and an email saved elsewhere meanwhile is returned with saved:false instead of being overwritten.",
    openWorld:
      "The AI email writer can fetch URLs named in the prompt and pages from the company's website, and saved changes go to real contacts on an active sequence's next sends.",
    effects:
      "The AI email writer can fetch URLs named in the prompt and pages from the company's own website.",
  },
  move_sequence_step: {
    readOnly:
      "Runs edit_sequence_graph with action move_node, which rewrites the sequence's edges through PUT /api/v1/sequences/:id.",
    destructive:
      "Overwrites the stored step order. Safeguards: graphRevision rejects edits made against a stale graph, edits that would disconnect a node are refused, and an active sequence requires confirmStructuralChange.",
    openWorld:
      "On an active sequence, contacts follow the new order from their next step, which changes which emails real recipients get and when.",
    effects:
      "On an active sequence, contacts follow the new order from their next step, changing which emails they receive and when.",
  },
  duplicate_sequence_step: {
    readOnly:
      "Runs edit_sequence_graph with action duplicate_node, inserting a copied node and rewiring edges through PUT /api/v1/sequences/:id.",
    destructive:
      "Rewires existing edges around the copy, and on an active sequence contacts passing that point get an extra email or action that cannot be recalled. graphRevision blocks stale edits and confirmStructuralChange is required on an active sequence.",
    openWorld:
      "On an active sequence the copied step runs for real contacts: a copied email is sent to them and a copied webhook or discount step calls its external service.",
    effects:
      "On an active sequence, contacts that reach the copy receive its email or action in addition to the original.",
  },
  delete_sequence_step: {
    readOnly:
      "Runs edit_sequence_graph with action delete_node, deleting the node and rewiring edges through PUT /api/v1/sequences/:id.",
    destructive:
      "Permanently removes the step and its config; contacts parked on it move to the next step at once or complete the sequence. graphRevision blocks stale edits and an active sequence requires confirmStructuralChange.",
    openWorld:
      "Released contacts continue onto the next live step, which can send them its email immediately.",
    effects: "Released contacts can receive the next step's email immediately.",
  },
  replace_sequence_paths: {
    readOnly:
      "Runs edit_sequence_graph with action replace_edges, overwriting the sequence's full edge list through PUT /api/v1/sequences/:id.",
    destructive:
      "Replaces every existing connection, including branch paths, with the supplied list. graphRevision blocks stale edits, a graph that would disconnect a node is refused, and an active sequence requires confirmStructuralChange.",
    openWorld:
      "On an active sequence, contacts follow the new connections from their next step, changing which emails and external actions real recipients get.",
    effects:
      "On an active sequence, contacts follow the new connections from their next step, changing which emails and actions they receive.",
  },
  insert_sequence_step: {
    readOnly:
      "PUTs /api/v1/sequences/:id with one new step, saving a node (and email for email steps) and rewiring edges after afterNodeId.",
    destructive:
      "Rewires the edge after afterNodeId, and on an active sequence contacts reaching the new step get its email, SMS, webhook or discount, which cannot be recalled. The API refuses structural changes on an active sequence without confirmStructuralChange.",
    openWorld:
      "New steps can post to an external webhook URL, create Stripe or Shopify discount codes, call a language model per contact (AI steps), and send email or SMS to live recipients.",
    effects:
      "On an active sequence, contacts reaching the new step receive it; webhook steps post to external URLs, discount steps create Stripe or Shopify codes, and AI steps call a language model.",
  },
  enable_sequence: {
    readOnly:
      "POSTs /sequences/:id/enable, which sets status active and queues held tokens that are already due.",
    destructive:
      "Starts live sending: trigger matches enroll and receive emails that cannot be recalled, and recipients held while disabled resume at once. No dryRun; simulate_sequence is the recommended preview and readiness errors block activation.",
    openWorld:
      "Sends the sequence's emails, SMS and webhook actions to real contacts and external endpoints as triggers fire.",
    effects:
      "Matching contacts start receiving the sequence's emails, and contacts held while it was disabled resume from their current step.",
  },
  disable_sequence: {
    readOnly:
      "POSTs /sequences/:id/disable, which sets status paused and enrollmentPaused true with pause attribution.",
    destructive:
      "Stops all live sending at once: new trigger matches are not enrolled and current recipients are frozen until enable_sequence. Holding is reversible, but trigger events missed while disabled are not replayed.",
    openWorld:
      "Only changes the sequence's status inside the workspace; it sends nothing and contacts no external system.",
  },
  duplicate_sequence: {
    readOnly:
      "POSTs /sequences/:id/duplicate, which inserts a new sequence with copies of its graph, email templates and A/B tests.",
    destructive:
      "Additive: it creates an independent disabled draft and leaves the original untouched.",
    openWorld:
      "The copy is a draft in the company's workspace; it is not enabled, so nothing is sent.",
  },
  archive_sequence: {
    readOnly:
      "POSTs /sequences/:id/archive, which sets status archived and enrollmentPaused true.",
    destructive:
      "Stops new enrollments and cancels contacts still in the sequence when their next step runs; unarchiving does not restore those enrollments. No confirmation step.",
    openWorld:
      "Changes only the sequence's state in the workspace; it emails no one and calls no outside service.",
    effects:
      "Contacts still in the sequence are cancelled when their next step runs; unarchiving restores a draft but not those enrollments.",
  },
  unarchive_sequence: {
    readOnly:
      "POSTs /sequences/:id/unarchive, which rewrites an archived sequence's status to draft and clears its pause fields.",
    destructive:
      "Overwrites the archived status and pause attribution rather than adding a record; the sequence returns as a disabled draft, so it never resumes sending by itself. Only archived sequences match.",
    openWorld:
      "Changes only the sequence's status inside the workspace; a draft sends nothing.",
  },
  pause_sequence_enrollments: {
    readOnly:
      "POSTs /sequences/:id/pause-enrollments, which sets enrollmentPaused true on the sequence.",
    destructive:
      "Trigger matches that arrive while paused are not enrolled and are not replayed after resume; current recipients continue. Reversible with resume_sequence_enrollments.",
    openWorld:
      "Only blocks new entrants inside Sequenzy; it sends nothing and calls no external service.",
    effects:
      "Trigger events that arrive while enrollment is paused do not enroll those contacts later.",
  },
  resume_sequence_enrollments: {
    readOnly:
      "POSTs /sequences/:id/resume-enrollments, which sets enrollmentPaused false so triggers enroll contacts again.",
    destructive:
      "Reopens live enrollment: every new trigger match enters the sequence and receives its emails, which cannot be recalled. No dryRun or confirmation.",
    openWorld:
      "Newly enrolled contacts receive the sequence's emails and any webhook steps post to external URLs.",
    effects: "New trigger matches start receiving the sequence's emails again.",
  },
  enroll_subscribers_in_sequence: {
    readOnly:
      "POSTs /sequences/:id/enroll, which creates enrollment tokens for up to 500 active subscribers.",
    destructive:
      "Enrolled contacts start receiving emails at the first or targeted step, and sent messages cannot be recalled; enrollment can be cancelled but not undone. Capped at 500 per call, skips inactive or already enrolled contacts, refused while enrollment is closed.",
    openWorld:
      "Sends the sequence's emails and actions to the enrolled subscribers' real addresses.",
    effects:
      "Enrolled contacts start receiving the sequence's emails and actions from the first or targeted step.",
  },
  enroll_sequence_audience: {
    readOnly:
      "With dryRun false it POSTs /enroll-audience, creating a background run that enrolls contacts; the default dryRun calls /enroll-audience/estimate, which only counts.",
    destructive:
      "A started run enrolls the audience in batches and their emails cannot be recalled; cancelling stops later batches only. Defaults to dryRun estimate, skips existing, unsubscribed and bounced contacts, and allows one run per sequence.",
    openWorld:
      "A started run sends the sequence's emails to every enrolled contact's real address.",
    effects:
      "With dryRun false, enrolled contacts start receiving the sequence's emails and actions.",
  },
  list_sequence_audience_enrollments: {
    readOnly:
      "Issues GET /sequences/:id/audience-enrollments and returns recent runs with counters; nothing is started or cancelled.",
    destructive:
      "Not destructive: it only lists past and running audience enrollment jobs for a sequence; no job is started or cancelled.",
    openWorld: "Reads the company's stored run records only.",
  },
  get_sequence_audience_enrollment: {
    readOnly:
      "Issues GET /sequences/:id/audience-enrollments/:runId and returns one run's status and counters.",
    destructive: "Read-only poll; it does not advance or stop the run.",
    openWorld: "Reads the company's own run record inside Sequenzy.",
  },
  cancel_sequence_audience_enrollment: {
    readOnly:
      "POSTs /audience-enrollments/:runId/cancel, which marks the run cancelled or asks the worker to stop after its current batch.",
    destructive:
      "Cancellation is final for that run: it cannot be resumed, and a new run is needed for the remaining audience. Contacts already enrolled stay enrolled, so nothing already sent is affected.",
    openWorld: "Only stops a background job inside Sequenzy; it sends nothing.",
    effects:
      "A cancelled run cannot be resumed; a new run is needed to enroll the remaining contacts.",
  },
  get_sequence_recurring_enrollment: {
    readOnly:
      "Issues GET /sequences/:id/recurring-enrollment and returns the stored schedule with its next run times; nothing is changed.",
    destructive:
      "Not destructive: it only reads a sequence's recurring schedule; no run is started, skipped or removed.",
    openWorld: "Reads the company's own sequence settings inside Sequenzy.",
  },
  set_sequence_recurring_enrollment: {
    readOnly:
      "PUTs or DELETEs /sequences/:id/recurring-enrollment, storing or removing a schedule that enrolls an audience automatically.",
    destructive:
      "Each scheduled run enrolls the audience and their emails cannot be recalled; removing or switching off the schedule stops later runs only. Nothing is enrolled until the first scheduled time, and only manual-trigger sequences accept a schedule.",
    openWorld:
      "Scheduled runs send the sequence's emails to every enrolled contact's real address.",
    effects:
      "From the first scheduled time, the audience is enrolled at every run and starts receiving the sequence's emails and actions.",
  },
  cancel_sequence_enrollments: {
    readOnly:
      "POSTs /sequences/:id/enrollments/cancel; with dryRun false it sets matching active, waiting, or paused tokens to cancelled.",
    destructive:
      "Cancelled enrollments cannot be restored, and re-enrolling loses entry event properties and stop-condition snapshots. Bulk targets default to dryRun and are capped per call; a single subscriberId cancels immediately.",
    openWorld:
      "Stops future sends inside Sequenzy; it messages no one and calls no external service.",
    effects:
      "Cancelled enrollments cannot be restored; re-enrolling starts over without the original entry event properties.",
  },
  move_sequence_enrollments: {
    readOnly:
      "POSTs /sequences/:id/enrollments/move; with dryRun false it moves waiting tokens to the target step and can tag the moved contacts.",
    destructive:
      "Moved contacts become active on the target step and its email goes out once the worker picks them up, which cannot be undone. Defaults to dryRun, limit 100 (max 500), optional dailyLimit; tags need subscribers:tag.",
    openWorld:
      "Sends the target step's email to the moved contacts' real addresses as soon as the worker picks them up; optional tags are applied without starting tag-triggered sequences.",
  },
  pause_sequence_subscribers: {
    readOnly:
      "POSTs /sequences/:id/enrollments/pause, which sets the named contacts' active or waiting tokens to paused.",
    destructive:
      "Paused contacts get no further steps until resumed; a wait-for-event step only acts on an event that arrived meanwhile once they are resumed. Applies immediately with no dryRun; reversible with resume_sequence_subscribers. Capped at 500 contacts per call.",
    openWorld:
      "Only holds enrollments inside Sequenzy; it sends nothing and calls no external service.",
    effects:
      "A paused contact's wait-for-event step only reacts to events once the contact is resumed.",
  },
  resume_sequence_subscribers: {
    readOnly:
      "POSTs /sequences/:id/enrollments/resume, which returns the named contacts' paused tokens to active or waiting and queues them.",
    destructive:
      "Resumed contacts continue the sequence; a step whose wait ran out while paused sends right away, which cannot be recalled. No dryRun. Capped at 500 contacts per call.",
    openWorld:
      "Resumed contacts receive the sequence's remaining emails at their real addresses, and webhook steps post to external URLs.",
    effects:
      "A step whose wait ran out while the contact was paused runs as soon as a worker picks it up.",
  },
  realign_sequence_enrollments: {
    readOnly:
      "With dryRun false it POSTs realign-sending-window and queues a job that rewrites waiting tokens' scheduled times; the default dryRun only reports.",
    destructive:
      "Applied moves pull waits earlier within the same day and are not reverted, so contacts get their next email sooner. Defaults to dryRun, never cancels or pushes a wait later, never earlier than now, capped per job.",
    openWorld:
      "Advances when real contacts receive their next email from a live sequence.",
    effects:
      "Applied realignment makes affected contacts receive their next email earlier and is not reverted.",
  },
  get_sequence_enrollment_realignment: {
    readOnly:
      "Issues GET realign-sending-window/jobs/:jobId and returns the queued job's status and result.",
    destructive: "Read-only job status; it does not queue another apply.",
    openWorld: "Reads a job record in the company's workspace.",
  },
  delete_sequence: {
    readOnly:
      "Issues DELETE /api/v1/sequences/:id, which removes the sequence and its nodes, edges, segment state and enrollment tokens in one transaction.",
    destructive:
      "Permanent hard delete with no undo or confirmation step, allowed even for an active sequence; every in-flight enrollment is removed, so those contacts get no further emails.",
    openWorld:
      "Removes a live flow that real contacts were receiving and the step content behind the sequence's public email share links.",
    effects:
      "Permanently deletes the sequence, its steps and every in-flight enrollment, even while it is active; there is no undo.",
  },
  list_sequence_email_variations: {
    readOnly:
      "Calls GET on the email's variations route and returns stored variations; it never applies one to the email.",
    destructive:
      "Read-only; variations change the email only through use_sequence_email_variation.",
    openWorld: "Reads stored variation records in the company's workspace.",
  },
  generate_sequence_email_variations: {
    readOnly:
      "POSTs the variations route, which saves 1-4 new variation records and starts background AI generation.",
    destructive:
      "Additive: it creates new variation records and leaves the email itself unchanged.",
    openWorld:
      "The AI designer drafts the variations through the email writer, which can fetch URLs named in the prompt and pages from the company's own website.",
    effects:
      "The AI writer can fetch URLs named in the prompt and pages from the company's own website.",
  },
  use_sequence_email_variation: {
    readOnly:
      "POSTs the variation use route, which saves the variation's blocks, theme and font into the email (and, with scope all, other emails' style) unless dryRun.",
    destructive:
      "Overwrites the email's design, and with scope all every other email's style, with no automatic undo. dryRun previews, and an email saved elsewhere meanwhile returns saved:false instead of being overwritten.",
    openWorld:
      "On an active sequence the new design goes to real contacts on the next sends and shows on the email's public share link.",
  },
  discard_sequence_email_variation: {
    readOnly:
      "Issues DELETE on the variation, which sets discardedAt so it no longer lists.",
    destructive:
      "Hides the variation from this surface, which has no restore tool; the row is soft-deleted and restorable from the dashboard. The email itself is unchanged.",
    openWorld:
      "Only flags a stored variation in the workspace; nothing is sent or published.",
  },
  list_sequence_templates: {
    readOnly:
      "Issues GET /sequences/templates and returns the built-in template catalog.",
    destructive:
      "Not destructive: it only reads the fixed template catalog and the company category.",
    openWorld: "Reads static templates and the company's own category.",
  },
  create_sequence_from_template: {
    readOnly:
      "POSTs /sequences/from-template, which inserts a draft sequence, its steps and a goal.",
    destructive:
      "Not destructive: it only adds a new draft sequence; nothing existing changes and nothing is sent until the sequence is enabled.",
    openWorld:
      "Writes a draft inside the company's workspace; nothing reaches contacts until enable_sequence.",
  },
  list_sequence_goals: {
    readOnly: "Issues GET /sequences/:id/goals and returns the attached goals.",
    destructive:
      "Not destructive: it only lists a sequence's conversion goals; goals and enrollments stay as they are.",
    openWorld: "Reads goal definitions in the company's workspace.",
  },
  create_sequence_goal: {
    readOnly: "POSTs /sequences/:id/goals, which inserts a goal row.",
    destructive:
      "Additive: adds a new goal and leaves existing goals and the sequence's sending unchanged.",
    openWorld:
      "Goals only count conversions from the company's own events, attributes and tags inside Sequenzy.",
  },
  get_sequence_definition: {
    readOnly:
      "Issues GET /sequences/definitions/:key or /sequences/:id/definition and returns the definition document.",
    destructive:
      "Read-only; it does not change the sequence, its steps or its enrollments.",
    openWorld:
      "Reads the company's own sequence configuration inside Sequenzy; webhook header values stay redacted.",
  },
  push_sequence_definition: {
    readOnly:
      "PUTs /sequences/definitions/:key, which creates the sequence or replaces its steps, connections and given settings.",
    destructive:
      "Removes steps that are missing from the document, moving waiting contacts to the following step, and replaces email content in place. dryRun true previews without writing, and it never turns a sequence on or off.",
    openWorld:
      "Changes what the sequence will send to the company's own contacts once it is active; nothing is sent by the push itself.",
  },
  update_sequence_goal: {
    readOnly:
      "PATCHes /sequences/:id/goals/:goalId, overwriting the goal's signal, attribution window or active flag.",
    destructive:
      "Overwrites the goal definition in place with no version history, so later conversions are attributed under the new rules; isActive false stops counting new conversions.",
    openWorld:
      "Changes internal attribution only; nothing is sent or shared outside the workspace.",
  },
  delete_sequence_goal: {
    readOnly:
      "Issues DELETE /sequences/:id/goals/:goalId, which removes the goal row.",
    destructive:
      "Permanent hard delete scoped to one goal of this sequence; the goal stops attributing conversions and has to be recreated by hand.",
    openWorld: "Affects only internal attribution data in the workspace.",
  },
  get_sequence_inbound_webhook: {
    readOnly:
      "Issues GET /sequences/:id/inbound-webhook and returns mapping, sample payload and setup status; the secret URL is omitted on this surface.",
    destructive: "Read-only; it does not create, rotate or clear the webhook.",
    openWorld:
      "Reads stored configuration; no external system is contacted and no credential is returned.",
  },
  configure_sequence_inbound_webhook: {
    readOnly:
      "PUTs /sequences/:id/inbound-webhook, which creates the webhook row with a secret if missing and saves or clears the field mapping and sample.",
    destructive:
      "Overwrites the stored mapping and sample. Saving a mapping makes the endpoint enroll contacts from posts; clearing it sets pending_setup, so later posts are only captured as samples and are not replayed.",
    openWorld:
      "Activates an endpoint that accepts posts from external systems at a secret URL and turns them into sequence enrollments that email contacts.",
    effects:
      "Once a mapping is saved, posts from external systems to the secret URL enroll contacts; clearing it stops enrollment from those posts.",
  },
  list_transactional_emails: {
    readOnly:
      "Issues GET /api/v1/transactional with search, filter and sort options and returns templates with metrics.",
    destructive:
      "Not destructive: it only lists transactional email templates; nothing is sent, disabled or deleted.",
    openWorld: "Reads the company's own templates and aggregate stats.",
  },
  get_transactional_email: {
    readOnly:
      "Issues GET /api/v1/transactional/:idOrSlug and returns one template's content and settings.",
    destructive:
      "Not destructive: it only returns one transactional email's settings and content; nothing is sent or changed.",
    openWorld: "Reads one stored template in the company's workspace.",
  },
  create_transactional_email: {
    readOnly:
      "POSTs /api/v1/transactional, which saves a new template with its email content and slug.",
    destructive:
      "Additive: inserts a new template and slug without changing existing ones. Without a prompt it is enabled by default, so the new slug can be sent by API immediately.",
    openWorld:
      "With a prompt, the AI email writer can fetch URLs named in the prompt and pages from the company's own website.",
    effects:
      "With prompt, the AI email writer can fetch URLs named in the prompt and pages from the company's own website.",
  },
  update_transactional_email: {
    readOnly:
      "PATCHes /api/v1/transactional/:idOrSlug, overwriting name, enabled flag, subject, preview text or body.",
    destructive:
      "Replaces the stored body and subject with no version check or undo; enabled false makes later sends of the slug, including trackAs sends, fail.",
    openWorld:
      "Every later send of this slug from the company's applications delivers the new content or is rejected when disabled.",
    effects:
      "Saved content and enabled changes apply to every later send of this slug, including sends from the company's own applications.",
  },
  delete_transactional_email: {
    readOnly:
      "Issues DELETE /api/v1/transactional/:idOrSlug, which removes the template record.",
    destructive:
      "Permanent: the slug stops sending and is freed for reuse. Sent deliveries and stats are kept; the linked content stays unless the email is code-managed, in which case its snapshot is deleted too. Disabling is the documented reversible alternative.",
    openWorld:
      "Later send requests from the company's applications that use the slug are rejected.",
  },
  send_email: {
    readOnly:
      "POSTs /api/v1/transactional/send, which creates an email_send record and queues delivery.",
    destructive:
      "Delivers real email that cannot be recalled. Safeguard: an idempotencyKey returns the original send for 14 days instead of sending again; without one, each call sends again.",
    openWorld:
      "Emails arbitrary external addresses (up to 50 each in to, cc, bcc), fetches attachments from public path URLs, and {{viewInBrowserUrl}} links to a hosted copy of the email.",
  },
  get_stats: {
    readOnly:
      "Issues GET /api/v1/metrics for a period and returns counts, rates, subscriber totals and any precomputed commerce forecast.",
    destructive:
      "Read-only aggregate; it does not compute or store a new forecast.",
    openWorld: "Aggregates the company's own send and subscriber data.",
  },
  get_transactional_stats: {
    readOnly:
      "Issues GET /api/v1/metrics/transactional/:idOrSlug and returns aggregate counts for one template.",
    destructive:
      "Not destructive: it only aggregates delivery statistics for transactional sends; no email or setting is changed.",
    openWorld: "Reads the company's own delivery events.",
  },
  get_campaign_stats: {
    readOnly:
      "Issues GET /api/v1/metrics/campaigns/:id and returns funnel, revenue, goal, link and poll summaries.",
    destructive: "Read-only metrics; it changes no campaign or goal.",
    openWorld: "Reads the company's own campaign analytics.",
  },
  get_email_client_stats: {
    readOnly:
      "Issues GET /api/v1/metrics/clients (or the per-campaign variant) and returns client and device shares of unique opens.",
    destructive: "Read-only aggregate.",
    openWorld: "Reads stored open events; no mailbox or client is queried.",
  },
  get_stats_breakdown: {
    readOnly:
      "Issues GET /api/v1/metrics/breakdown and returns aggregate funnel rows; nothing is changed.",
    destructive: "Read-only aggregate.",
    openWorld: "Reads stored email events and conversions only.",
  },
  get_link_click_stats: {
    readOnly:
      "Issues GET /api/v1/metrics/links and returns clicks per destination; the link URLs are not requested.",
    destructive: "Read-only aggregate.",
    openWorld: "Reads stored click events only; destinations are not fetched.",
  },
  list_poll_responses: {
    readOnly:
      "Issues GET /metrics/campaigns/:id/poll-responses and returns paginated respondent answers.",
    destructive:
      "Read-only; it does not alter answers or subscriber attributes.",
    openWorld: "Reads responses stored in the company's workspace.",
  },
  get_sequence_stats: {
    readOnly:
      "Issues GET /api/v1/metrics/sequences/:id and returns per-step and aggregate metrics plus a live enrollment snapshot.",
    destructive: "Read-only metrics; it does not touch enrollments.",
    openWorld: "Reads the company's own event stream and enrollment rows.",
  },
};
