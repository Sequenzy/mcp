import type { ToolJustification } from "./types.js";

export const OPENAI_JUSTIFICATIONS_PART_2: Readonly<
  Record<string, ToolJustification>
> = {
  create_template_from_example: {
    readOnly:
      "Writes data: inserts a new HTML template row for the company after the AI rewrite, and fills the company's email design prompt when it is blank.",
    destructive:
      "Purely additive: each call adds one new template and changes no existing email. The design prompt is written only while blank, with a compare-and-swap that never replaces an existing value.",
    openWorld:
      "Reads the gallery email from Sequenzy's own database (the URL is parsed for slugs, not fetched) and rewrites it with the company's stored brand data; the brief is passed to the model as text and its URLs are not fetched.",
  },
  preview_template_from_example: {
    readOnly:
      "Not strictly read-only: without website it resolves the company's brand context, which saves the company's email design prompt when that field is blank. It creates no template.",
    destructive:
      "Nothing is overwritten or deleted: the only write fills a blank design prompt through a compare-and-swap that never replaces an existing value; the preview itself is returned, not stored.",
    openWorld:
      "With website, looks up that domain with the brand.dev brand data provider and fetches the site's sitemap and pages to brand the preview; any public site can be named.",
    effects:
      "With website, the site is looked up with a brand data provider and its pages are fetched; without it, a blank company email design prompt is filled in.",
  },
  preview_sequence_from_example: {
    readOnly:
      "Not strictly read-only: without website it resolves the company's brand context, which saves the company's email design prompt when blank. No sequence or email is created.",
    destructive:
      "Nothing is overwritten or deleted: the up-to-3 rewritten emails are returned, not stored, and a blank design prompt is filled only through a compare-and-swap that keeps any existing value.",
    openWorld:
      "With website, looks up that domain with the brand.dev brand data provider and fetches the site's sitemap and pages to write the emails in that brand; any public site can be named.",
    effects:
      "With website, the site is looked up with a brand data provider and its pages are fetched; without it, a blank company email design prompt is filled in.",
  },
  create_sequence_from_example: {
    readOnly:
      "Writes data: creates a draft sequence with trigger, timing and placeholder email steps, then queues a background job that writes each step's email.",
    destructive:
      "Purely additive: inserts one new draft sequence per call and never enables it, so nothing is sent; existing sequences and emails are untouched.",
    openWorld:
      "Clones a gallery sequence from Sequenzy's own database (URL parsed for slugs) and the background job rewrites each step with the gallery remix model; no URL in the brief is fetched and nothing reaches contacts while it is a draft.",
  },
  list_email_references: {
    readOnly:
      "Strictly a read: returns gallery emails and the company's ranked similar brands; the ranking is cached for up to 10 minutes and no company data is written.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Sends the company description and any search text to an external embeddings API (OpenRouter) to rank gallery brands by similarity.",
  },
  list_gallery_brand_requests: {
    readOnly:
      "Strictly a read: lists this company's gallery brand requests with their status and decline reason; nothing is written.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads only this company's request rows in Sequenzy's database; no external service is contacted.",
  },
  request_gallery_brand: {
    readOnly:
      "Writes data: inserts a brand request row for the domain, or updates the stored note on an existing request for the same domain.",
    destructive:
      "Asking again for a domain with a different note overwrites the earlier note, which is not kept. The company's own domain is refused and a company is capped at 50 requests.",
    openWorld:
      "Only records the request inside Sequenzy for its team to review; the brand's website is normalized as text and not contacted by this call.",
  },
  remove_gallery_brand_request: {
    readOnly:
      "Writes data: deletes one of the company's brand request rows by id.",
    destructive:
      "Permanently deletes the request and its note; because watches and requests share one record, it also ends any watch of that brand. Scoped to the caller's company; gallery content is kept.",
    openWorld:
      "Deletes a row in the company's own Sequenzy data; no outside service or person is contacted.",
    effects:
      "Deleting the request also stops watching that brand, since a watch and its request are the same record.",
  },
  list_watched_brands: {
    readOnly:
      "Strictly a read: lists the company's watched brands with status, email counts and latest email time; nothing is written.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads the company's watchlist and gallery counts from Sequenzy's database; no external site is fetched.",
  },
  watch_brand: {
    readOnly:
      "Writes data: creates a watch (a brand request record) for the domain, or updates the note on the existing one.",
    destructive:
      "Watching a domain again with a new note overwrites the stored note. Shares the 50-record cap with brand requests and refuses the company's own domain.",
    openWorld:
      "Stores the watch in Sequenzy; the brand's site is not contacted by this call, and its emails come from Sequenzy's own gallery collection later.",
  },
  unwatch_brand: {
    readOnly: "Writes data: deletes the company's watch record by id.",
    destructive:
      "Permanently deletes the watch and its note, which also withdraws the brand request with the same id; re-watching creates a new record. Scoped to the caller's company; the brand stays in the gallery.",
    openWorld:
      "Deletes a row in the company's own Sequenzy data; nothing outside Sequenzy is contacted.",
  },
  list_watched_brand_emails: {
    readOnly:
      "Strictly a read: pages through gallery emails sent by the company's watched brands; nothing is written.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads emails already collected into Sequenzy's gallery database; no brand site or mailbox is contacted at request time.",
  },
  start_subscriber_operation: {
    readOnly:
      "Writes data: creates a background operation that adds tags to every contact matching the audience (all contacts when audience is omitted), creating missing tag definitions.",
    destructive:
      "Tags can reach the whole contact base; with triggerAutomations true, tag_added sequences start and their emails cannot be recalled. requestKey prevents duplicate runs and cancel stops later pages, but applied tags remain.",
    openWorld:
      "With triggerAutomations, tag_added sequences send email to the tagged contacts, who are real external recipients.",
    effects:
      "With triggerAutomations true, tag_added sequences start for every tagged contact and can email them; tags already applied stay if the operation is cancelled.",
  },
  list_subscriber_operations: {
    readOnly:
      "Strictly a read: returns the company's 20 most recent tagging operations with progress and failures.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads operation records from the company's own Sequenzy data only.",
  },
  get_subscriber_operation: {
    readOnly:
      "Strictly a read: returns one operation's state, counts and per-contact failures.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads one operation record from the company's own Sequenzy data only.",
  },
  cancel_subscriber_operation: {
    readOnly:
      "Writes data: sets a queued or running tagging operation's status to cancelled.",
    destructive:
      "Cancellation is final: the operation cannot be resumed and remaining contacts are not tagged unless a new operation is started. Only queued or running operations can be cancelled; applied tags are kept.",
    openWorld:
      "Changes an operation record in the company's workspace; it sends nothing and contacts no outside service.",
    effects:
      "A cancelled operation cannot be resumed; tagging the remaining contacts needs a new start_subscriber_operation call.",
  },
  add_subscriber: {
    readOnly:
      "Writes data: creates a contact (or matches an existing one) with profile fields, attributes, tags and list memberships.",
    destructive:
      "Can send email that cannot be recalled: matching sequences enroll by default and double opt-in sends a confirmation. enrollInSequences false (or createdAt) skips enrollment; an existing contact's status is never changed.",
    openWorld:
      "Emails a real external recipient when the new contact enrolls in sequences, triggers tag_added flows or gets a double opt-in confirmation.",
    effects:
      "Can email the contact at once: enrolled sequences send, and double opt-in (optInMode or company setting) sends a confirmation email.",
  },
  create_subscriber_import: {
    readOnly:
      "Writes data: queues an import job that creates or updates up to 5,000 contacts with fields, tags, lists and attributes.",
    destructive:
      "duplicateStrategy overwrite replaces existing contacts' public fields; enrollInSequences and double opt-in can email imported contacts irreversibly. Defaults are safer: skip duplicates, no enrollment; idempotencyKey prevents a repeat import.",
    openWorld:
      "Imported contacts can receive double opt-in confirmations or sequence emails, reaching external recipients.",
    effects:
      "duplicateStrategy overwrite replaces existing contacts' fields, and enrollInSequences or double opt-in can email imported contacts.",
  },
  get_subscriber_import: {
    readOnly:
      "Strictly a read: returns an import's progress, counts and skipped/failed reason summaries.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads the import record from the company's own Sequenzy data only.",
  },
  update_subscriber: {
    readOnly:
      "Writes data: patches an existing contact's names, phone, SMS consent, status, custom attributes and tags.",
    destructive:
      "customAttributes replaces the whole attribute map, unsubscribed cancels active sequence enrollments and list memberships, and a phone change resets SMS consent. No undo or conflict check; attributes merges instead.",
    openWorld:
      "Added tags can start tag_added sequences that email the contact, and changes are delivered to the company's subscriber webhooks.",
    effects:
      "Added tags can start tag_added sequences that email the contact, and customAttributes replaces the whole custom-attribute map.",
  },
  remove_subscriber: {
    readOnly:
      "Writes data: by default sets the contact's status to unsubscribed; with hardDelete true deletes the contact.",
    destructive:
      "Unsubscribing cancels active sequence enrollments and list memberships; hardDelete permanently removes the contact, notes, memberships and push devices and queues data erasure. Hard delete only runs when hardDelete is true.",
    openWorld:
      "Open world: it posts subscriber.unsubscribed or deletion events to the webhook URLs the company configured, outside Sequenzy, like update_subscriber. It sends nothing to the contact.",
    effects:
      "Unsubscribing also cancels the contact's active sequence enrollments; hardDelete also removes notes, list memberships and push devices.",
  },
  get_subscriber: {
    readOnly:
      "Strictly a read: returns the contact profile with tags, notes, lists, enrollments, stats and recent activity.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads the company's own contact data only.",
  },
  list_subscriber_notes: {
    readOnly: "Strictly a read: lists the internal notes on one contact.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads internal notes from the company's own Sequenzy data only.",
  },
  list_subscriber_attributes: {
    readOnly:
      "Strictly a read: samples contacts to list custom attribute names, types and example values.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads the company's own contact attributes only.",
  },
  add_subscriber_note: {
    readOnly: "Writes data: inserts one internal note on the contact.",
    destructive:
      "Purely additive: adds a new note and changes no existing note or contact field.",
    openWorld:
      "Notes are internal to the workspace; the contact never sees them and nothing is sent.",
  },
  delete_subscriber_note: {
    readOnly: "Writes data: deletes one internal note row by id.",
    destructive:
      "Permanently deletes the note text; there is no restore. Scoped to the caller's company.",
    openWorld:
      "Deletes internal workspace data only; nothing is sent to the contact or any outside service.",
  },
  trigger_subscriber_event: {
    readOnly:
      "Writes data: records a custom event, creates the contact if missing, applies sync rules and enrolls the contact in matching sequences.",
    destructive:
      "Sequence emails started by the event cannot be recalled. eventId makes retries idempotent, and an occurredAt more than an hour old stores history only, starting no sequences.",
    openWorld:
      "Matching event_received sequences send email to the contact, a real external recipient.",
    effects:
      "Enrolled sequences can email the contact right away; events whose occurredAt is more than an hour old are stored as history and start nothing.",
  },
  trigger_subscriber_events: {
    readOnly:
      "Writes data: records several events in order for one contact, creating the contact and event definitions if missing.",
    destructive:
      "Each recent event can start sequences whose emails cannot be recalled; a partial failure leaves earlier events recorded. A batch entirely over an hour old is stored as history and starts nothing.",
    openWorld:
      "Recent events trigger sequences that email the contact, a real external recipient.",
    effects:
      "Recent events can enroll the contact in event_received sequences that email them; the contact is created if missing.",
  },
  import_subscriber_events: {
    readOnly:
      "Writes data: records up to 25 events across contacts and creates contacts for rows with an email.",
    destructive:
      "A contact with any event less than an hour old goes live: sequence triggers, sync rules and double opt-in can email them irreversibly. Older groups are stored as history only; eventId keeps retries to one receipt.",
    openWorld:
      "Live groups can trigger sequence or double opt-in emails to real external recipients.",
    effects:
      "Contacts with recent events run sequence triggers and sync rules, which can email them.",
  },
  bulk_add_subscriber_tags: {
    readOnly:
      "Writes data: adds tags to up to 500 existing contacts and can create missing tag definitions.",
    destructive:
      "With triggerAutomations true, tag_added sequences start and their emails cannot be recalled; by default no automations run and missing contacts are reported, not created.",
    openWorld:
      "Only when triggerAutomations is true, tag_added sequences email the tagged contacts, who are real external recipients.",
  },
  bulk_remove_subscriber_tags: {
    readOnly: "Writes data: removes tags from up to 500 existing contacts.",
    destructive:
      "Removes tag assignments, which can drop contacts from tag-based segments and audiences; no undo except re-adding. Missing contacts are reported, not created.",
    openWorld:
      "Open world: removing tags marks segments for re-evaluation, so contacts can enter or exit segments whose running segment-entered or -exited sequences then email them. Tag removal itself starts no tag automation.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  search_subscribers: {
    readOnly:
      "Strictly a read: searches contacts by text, tags, list, segment, attributes or opt-out date, paging through results.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads the company's own contact data only.",
  },
  list_accounts: {
    readOnly:
      "Strictly a read: lists the company's customer accounts (B2B organizations) with search and paging.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads account records from the company's own Sequenzy data only.",
  },
  get_account_by_external_id: {
    readOnly:
      "Strictly a read: returns one account and up to 100 members with roles.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads one account from the company's own Sequenzy data only.",
  },
  upsert_account: {
    readOnly:
      "Writes data: creates or updates an account, its attributes and optional members, and turns Accounts on with the first account.",
    destructive:
      "Overwrites account fields: a null attribute deletes that key and replaceAttributes replaces them all, changing every member's account.* values. Members are preflighted so a bad identity changes nothing.",
    openWorld:
      "Members with new emails become contacts, which can start contact_added sequences or double opt-in emails to those external recipients.",
    effects:
      "Members with new emails are created as contacts, which can start contact_added sequences or double opt-in emails to them.",
  },
  delete_account: {
    readOnly: "Writes data: deletes the account and all its memberships.",
    destructive:
      "Permanently deletes the account, its attributes and memberships, and clears members' account.* attributes, changing segments and merge tags. Contacts themselves are kept.",
    openWorld:
      "Open world: clearing the account fields on its contacts marks segments for re-evaluation, so running segment-entered or -exited sequences can enroll and email those contacts.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  list_account_members: {
    readOnly: "Strictly a read: lists an account's member contacts and roles.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads the company's own account data only.",
  },
  add_account_member: {
    readOnly:
      "Writes data: adds a contact to an account (creating the contact when the email is new) and can update the member's role.",
    destructive:
      "Re-adding an existing member with a role overwrites the current role, and the contact's account.* attributes are rewritten. A newly created contact can receive sequence emails that cannot be recalled.",
    openWorld:
      "A contact created from a new email can enter contact_added sequences or get a double opt-in email, reaching an external recipient.",
    effects:
      "A new contact created here can start contact_added sequences or receive a double opt-in email.",
  },
  remove_account_member: {
    readOnly: "Writes data: deletes the contact's membership in the account.",
    destructive:
      "Deletes the membership and its role, and clears or replaces the contact's account.* attributes, which changes segments and merge values. The contact is kept.",
    openWorld:
      "Open world: clearing the contact's account fields marks segments for re-evaluation, so running segment-entered or -exited sequences can enroll and email the contact.",
    effects:
      "Segment membership is re-evaluated, so running segment-entered or -exited sequences can email affected contacts.",
  },
  trigger_account_event: {
    readOnly:
      "Writes data: records an event on the account timeline and delivers contact events to the chosen members.",
    destructive:
      "Delivered events run sync rules and sequence triggers, so emails can go out to owners (the default), admins or all members and cannot be recalled. recipients none records only; eventId makes retries idempotent.",
    openWorld:
      "Sequence triggers can email the recipient member contacts, who are real external recipients.",
    effects:
      "Sequences triggered by the delivered contact events can email the recipient members, and those emails cannot be recalled.",
  },
  list_account_events: {
    readOnly: "Strictly a read: lists recent events on an account timeline.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads the company's own event data only.",
  },
  list_account_suggestions: {
    readOnly:
      "Strictly a read: groups contacts by shared work email domain and returns suggested accounts with sample emails; nothing is created.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Computed from the company's own contact emails; no external lookup is made.",
  },
  accept_account_suggestions: {
    readOnly:
      "Writes data: creates accounts from up to 25 domains and adds the domain's unaffiliated contacts as members, or adds them to an existing account using that domain.",
    destructive:
      "Moves contacts into accounts and rewrites their account.* attributes, changing segments and merge values. Domains partly in another account or used by several accounts are skipped; roles are kept.",
    openWorld:
      "Runs no sync rules or segment-entered sequences and sends no email; it only changes the company's own account data.",
    effects:
      "Contacts added as members get their account.* attributes rewritten, which changes segment membership and {{account.*}} merge values.",
  },
  detect_account_organization_ids: {
    readOnly:
      "Strictly a read: scans the last 180 days of event properties and contact attributes for organization ID keys.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Queries the company's own events and contacts only.",
  },
  preview_accounts_from_organization_id: {
    readOnly:
      "Strictly a read: computes the largest accounts a key would create, with names, domains and sample emails, before anything is written.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Computed from the company's own events and contacts only.",
  },
  create_accounts_from_organization_id: {
    readOnly:
      "Writes data: turns Accounts on for the workspace and queues a job that creates accounts and memberships from an organization ID key.",
    destructive:
      "Adds members to existing accounts with the same ID and rewrites members' account.* attributes, changing segments and merge values. Names, domains and roles are kept; the description requires a confirmed preview first.",
    openWorld:
      "Sends no email and runs no sync rules or segment-entered sequences; it only changes the company's own account data.",
    effects:
      "Turns Accounts on for the workspace and rewrites members' account.* attributes; existing accounts with the same ID gain members.",
  },
  get_account_organization_id_job: {
    readOnly:
      "Strictly a read: returns a background account job's state, counts or error.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads job status from Sequenzy's own job store only.",
  },
  list_recipient_suppressions: {
    readOnly:
      "Strictly a read: lists bounce, complaint and invalid-recipient suppressions for addresses associated with the company.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads Sequenzy's own suppression records for the company; no provider list is queried.",
  },
  get_recipient_suppression: {
    readOnly:
      "Strictly a read: checks one exact address against Sequenzy's bounce and complaint records.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads Sequenzy's own suppression records only; the email provider's suppression list is not consulted.",
  },
  remove_recipient_suppression: {
    readOnly:
      "Writes data: deletes a workspace soft-bounce escalation for one address and reactivates the company's bounced contacts with that address.",
    destructive:
      "The safeguard is undone: reactivated contacts receive live campaigns and sequences again. Only soft-bounce escalations are removable; hard-bounce, global invalid, complaint and unsubscribe suppressions are refused (409).",
    openWorld:
      "Resumes delivery to that external address, so live campaigns and sequences email the recipient again.",
    effects:
      "Reactivated contacts become eligible for live campaigns and sequences again, so mail to the address resumes.",
  },
  list_products: {
    readOnly:
      "Strictly a read: lists synced and pushed catalog products with variants and attached delivery files.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads the company's stored catalog only; Stripe, Shopify or WooCommerce are not called.",
  },
  upsert_products: {
    readOnly:
      "Writes data: creates or updates up to 100 Commerce API products keyed by productId.",
    destructive:
      "Overwrites stored fields of existing products, and marking a product back in stock fires back-in-stock events that email waiting subscribers; those emails cannot be recalled.",
    openWorld:
      "Back-in-stock transitions email subscribers who asked to be notified, who are real external recipients.",
  },
  delete_product: {
    readOnly: "Writes data: deletes one Commerce API product row by productId.",
    destructive:
      "Permanently deletes the product, including any attached delivery file link; only products pushed through the Commerce API can be deleted, synced store products are refused (404).",
    openWorld: "Removes a row from the company's own catalog; nothing is sent.",
  },
  attach_product_file: {
    readOnly:
      "Writes data: stores a delivery file URL and name on the product.",
    destructive:
      "Replaces any file already attached, so later purchase emails link the new file; the previous link is not kept.",
    openWorld:
      "The URL is sent as a download link in post-purchase sequence emails to buyers, external recipients; the server stores it without fetching it.",
  },
  remove_product_file: {
    readOnly: "Writes data: clears the product's delivery file metadata.",
    destructive:
      "Removes the stored file link, so later purchase emails using {{event.download.url}} carry no download; re-adding needs the URL again.",
    openWorld: "Changes only the company's catalog record; nothing is sent.",
    effects:
      "Later purchase emails that use {{event.download.url}} no longer get a download link for this product.",
  },
  sync_products: {
    readOnly:
      "Writes data: queues a job that imports the connected Stripe catalog into the products list.",
    destructive:
      "The sync overwrites stored Stripe product titles, descriptions, images and prices and marks products no longer active in Stripe as out of stock. Requires an active Stripe integration with bulk sync enabled.",
    openWorld:
      "Reads the company's catalog from the Stripe API through a background job.",
    effects:
      "The sync overwrites stored Stripe product details and marks products no longer active in Stripe as out of stock.",
  },
  get_push_settings: {
    readOnly:
      "Strictly a read: returns web, APNs and Firebase readiness, last errors and device counts.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads stored push settings only; Apple and Google services are not contacted.",
  },
  update_web_push_settings: {
    readOnly:
      "Writes data: updates web push enabled state and default icon, generating VAPID keys on first enable.",
    destructive:
      "Disabling stops web push delivery for push campaigns and sequence steps until re-enabled, and defaultIconUrl overwrites the icon on later notifications. Keys are kept on disable.",
    openWorld:
      "Open world: the default icon it saves appears on later web push notifications that recipients receive.",
    effects:
      "Disabling stops web push delivery for push campaigns and sequence steps until re-enabled; defaultIconUrl replaces the icon on later notifications.",
  },
  remove_apns_credentials: {
    readOnly:
      "Writes data: deletes the stored APNs key, team and bundle settings.",
    destructive:
      "Deletes the stored private key; iOS push stops for every campaign and sequence until a key is saved again, which this surface cannot do. Registered devices are kept.",
    openWorld:
      "Deletes stored credentials only; Apple's service is not called and nothing is sent.",
  },
  remove_fcm_credentials: {
    readOnly: "Writes data: deletes the stored Firebase service account.",
    destructive:
      "Deletes the stored service account; Android push stops for every campaign and sequence until one is uploaded again, which this surface cannot do. Registered devices are kept.",
    openWorld:
      "Deletes stored credentials only; Firebase is not called and nothing is sent.",
  },
  get_push_import_preflight: {
    readOnly:
      "Strictly a read: checks the workspace's stored APNs and Firebase settings and returns warnings.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads stored settings only; no push provider or service is contacted.",
  },
  list_push_imports: {
    readOnly:
      "Strictly a read: lists recent push imports with status, progress and counts.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads stored import records only; no provider is contacted.",
  },
  get_push_import: {
    readOnly:
      "Strictly a read: returns one push import's status, progress, counts and warnings.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld: "Reads a stored import record only; no provider is contacted.",
  },
  start_push_import: {
    readOnly:
      "Queues a background job that writes push devices and, for opted-in devices with an email, creates contacts.",
    destructive:
      "Writes devices and contacts in bulk; there is no undo, though canceling stops further writes. It never re-activates, re-links or downgrades a device the workspace already has, never sends a notification, and new contacts join no lists or sequences.",
    openWorld:
      "Reads devices from OneSignal, Braze or Customer.io with the API key stored on the draft.",
  },
  cancel_push_import: {
    readOnly:
      "Marks the import canceled and deletes its staged rows and stored source key.",
    destructive:
      "Cannot be undone: a canceled import cannot be restarted. Devices already imported stay.",
    openWorld: "Changes stored records only; no provider is contacted.",
  },
  list_push_devices: {
    readOnly:
      "Strictly a read: lists registered push devices with masked tokens, filtered by contact, platform or status.",
    destructive: "Read-only, so nothing can be deleted, overwritten or sent.",
    openWorld:
      "Reads stored device records only; no push service is contacted.",
  },
};
