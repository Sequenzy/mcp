import type { Tool } from "../../mcp-types.js";

import { abTestToolDefinitions } from "./ab-tests.js";
import { accountHealthToolDefinitions } from "./account-health.js";
import { accountToolDefinitions } from "./account.js";
import { accountToolDefinitions as b2bAccountToolDefinitions } from "./accounts.js";
import { aiGenerationToolDefinitions } from "./ai-generation.js";
import { analyticsToolDefinitions } from "./analytics.js";
import { appToolDefinitions } from "./apps.js";
import { audienceSyncToolDefinitions } from "./audience-syncs.js";
import { campaignGoalToolDefinitions } from "./campaign-goals.js";
import { campaignVariationToolDefinitions } from "./campaign-variations.js";
import { campaignToolDefinitions } from "./campaigns.js";
import { dataExportToolDefinitions } from "./data-exports.js";
import { emailAiStyleToolDefinitions } from "./email-ai-style.js";
import { emailBlockToolDefinitions } from "./email-blocks.js";
import { emailComponentToolDefinitions } from "./email-components.js";
import { emailReferenceToolDefinitions } from "./email-references.js";
import { eventSchemaToolDefinitions } from "./event-schemas.js";
import { feedbackToolDefinitions } from "./feedback.js";
import { savedFormToolDefinitions } from "./forms.js";
import { galleryBrandRequestToolDefinitions } from "./gallery-brand-requests.js";
import { galleryExampleToolDefinitions } from "./gallery-examples.js";
import { galleryWatchlistToolDefinitions } from "./gallery-watchlist.js";
import { geofenceToolDefinitions } from "./geofences.js";
import { imageAssetToolDefinitions } from "./image-assets.js";
import { inAppToolDefinitions } from "./in-app.js";
import { inboxToolDefinitions } from "./inbox.js";
import { integrationToolDefinitions } from "./integrations.js";
import { landingPageToolDefinitions } from "./landing-pages.js";
import { savedPopupToolDefinitions } from "./popups.js";
import { productToolDefinitions } from "./products.js";
import { pushImportToolDefinitions } from "./push-imports.js";
import { pushLiveActivityToolDefinitions } from "./push-live-activities.js";
import { pushToolDefinitions } from "./push.js";
import { receivingDomainToolDefinitions } from "./receiving-domains.js";
import { renderToolDefinitions } from "./render.js";
import { sequenceDefinitionToolDefinitions } from "./sequence-definitions.js";
import { sequenceEmailVariationToolDefinitions } from "./sequence-email-variations.js";
import { sequenceGoalToolDefinitions } from "./sequence-goals.js";
import { sequenceInboundWebhookToolDefinitions } from "./sequence-inbound-webhook.js";
import { sequenceTemplateToolDefinitions } from "./sequence-templates.js";
import { sequenceBasicToolDefinitions } from "./sequences-basic.js";
import { sequenceEditingToolDefinitions } from "./sequences-editing.js";
import { subscriberOperationToolDefinitions } from "./subscriber-operations.js";
import { subscriberToolDefinitions } from "./subscribers.js";
import { suppressionToolDefinitions } from "./suppressions.js";
import { tagListSegmentToolDefinitions } from "./tags-lists-segments.js";
import { teamToolDefinitions } from "./team.js";
import { templateToolDefinitions } from "./templates.js";
import { transactionalToolDefinitions } from "./transactional.js";
import { warehouseToolDefinitions } from "./warehouse.js";
import { webTrackingToolDefinitions } from "./web-tracking.js";
import { webhookToolDefinitions } from "./webhooks.js";

export const toolDefinitions: Tool[] = [
  ...appToolDefinitions,
  ...accountToolDefinitions,
  ...accountHealthToolDefinitions,
  ...emailAiStyleToolDefinitions,
  ...integrationToolDefinitions,
  ...eventSchemaToolDefinitions,
  ...galleryExampleToolDefinitions,
  ...emailReferenceToolDefinitions,
  ...galleryBrandRequestToolDefinitions,
  ...galleryWatchlistToolDefinitions,
  ...subscriberOperationToolDefinitions,
  ...subscriberToolDefinitions,
  ...b2bAccountToolDefinitions,
  ...suppressionToolDefinitions,
  ...productToolDefinitions,
  ...pushToolDefinitions,
  ...pushImportToolDefinitions,
  ...pushLiveActivityToolDefinitions,
  ...inAppToolDefinitions,
  ...tagListSegmentToolDefinitions,
  ...audienceSyncToolDefinitions,
  ...templateToolDefinitions,
  ...emailBlockToolDefinitions,
  ...emailComponentToolDefinitions,
  ...abTestToolDefinitions,
  ...campaignToolDefinitions,
  ...campaignGoalToolDefinitions,
  ...campaignVariationToolDefinitions,
  ...renderToolDefinitions,
  ...savedFormToolDefinitions,
  ...savedPopupToolDefinitions,
  ...landingPageToolDefinitions,
  ...imageAssetToolDefinitions,
  ...sequenceBasicToolDefinitions,
  ...sequenceEditingToolDefinitions,
  ...sequenceDefinitionToolDefinitions,
  ...sequenceEmailVariationToolDefinitions,
  ...sequenceGoalToolDefinitions,
  ...sequenceTemplateToolDefinitions,
  ...sequenceInboundWebhookToolDefinitions,
  ...transactionalToolDefinitions,
  ...analyticsToolDefinitions,
  ...teamToolDefinitions,
  ...inboxToolDefinitions,
  ...receivingDomainToolDefinitions,
  ...webTrackingToolDefinitions,
  ...webhookToolDefinitions,
  ...geofenceToolDefinitions,
  ...dataExportToolDefinitions,
  ...warehouseToolDefinitions,
  ...aiGenerationToolDefinitions,
  ...feedbackToolDefinitions,
];
