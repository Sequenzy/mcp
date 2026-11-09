import { handleAccountHealthTools } from "./account-health.js";
import { handleAccountTools } from "./account.js";
import { handleAccountTools as handleB2bAccountTools } from "./accounts.js";
import { handleAiAndFeedbackTools } from "./ai-and-feedback.js";
import { handleAnalyticsAndTransactionalTools } from "./analytics-and-transactional.js";
import { handleAppTools } from "./apps.js";
import { handleAudienceTools } from "./audience.js";
import { handleCampaignVariationTools } from "./campaign-variations.js";
import { handleCampaignTools } from "./campaigns.js";
import { handleDataExportTools } from "./data-exports.js";
import { handleEmailAiStyleTools } from "./email-ai-style.js";
import { handleEmailBlockTools } from "./email-blocks.js";
import { handleEmailComponentTools } from "./email-components.js";
import { handleEmailReferenceTools } from "./email-references.js";
import { handleEventSchemaTools } from "./event-schemas.js";
import { handleSavedFormTools } from "./forms.js";
import { handleGalleryBrandRequestTools } from "./gallery-brand-requests.js";
import { handleGalleryExampleTools } from "./gallery-examples.js";
import { handleGalleryWatchlistTools } from "./gallery-watchlist.js";
import { handleGeofenceTools } from "./geofences.js";
import { handleImageAssetTools } from "./image-assets.js";
import { handleInAppCampaignTools } from "./in-app-campaigns.js";
import { handleInAppPlacementTools } from "./in-app-placements.js";
import { handleInAppTools } from "./in-app.js";
import { handleIntegrationTools } from "./integrations.js";
import { handleLandingPageTools } from "./landing-pages.js";
import { handleSavedPopupTools } from "./popups.js";
import { handleProductTools } from "./products.js";
import { handlePushImportTools } from "./push-imports.js";
import { handlePushTools } from "./push.js";
import { handleReceivingDomainTools } from "./receiving-domains.js";
import { handleRenderTools } from "./render.js";
import { handleSequenceEmailVariationTools } from "./sequence-email-variations.js";
import { handleSequenceTools } from "./sequences.js";
import { handleSubscriberTools } from "./subscribers.js";
import { handleSuppressionTools } from "./suppressions.js";
import { handleTeamInboxWebhookTools } from "./team-inbox-webhooks.js";
import { handleWarehouseTools } from "./warehouse.js";
import { handleWebTrackingTools } from "./web-tracking.js";

export const toolHandlers = [
  handleAppTools,
  handleAccountTools,
  handleAccountHealthTools,
  handleEmailAiStyleTools,
  handleIntegrationTools,
  handleEventSchemaTools,
  handleGalleryExampleTools,
  handleEmailReferenceTools,
  handleGalleryBrandRequestTools,
  handleGalleryWatchlistTools,
  handleSubscriberTools,
  handleB2bAccountTools,
  handleSuppressionTools,
  handleProductTools,
  handleAudienceTools,
  handleCampaignTools,
  handleCampaignVariationTools,
  handleEmailBlockTools,
  handleEmailComponentTools,
  handleRenderTools,
  handleSavedFormTools,
  handleSavedPopupTools,
  handleLandingPageTools,
  handleImageAssetTools,
  handleSequenceTools,
  handleSequenceEmailVariationTools,
  handleAnalyticsAndTransactionalTools,
  handleTeamInboxWebhookTools,
  handleGeofenceTools,
  handleReceivingDomainTools,
  handleDataExportTools,
  handleWarehouseTools,
  handleWebTrackingTools,
  handlePushTools,
  handlePushImportTools,
  handleInAppTools,
  handleInAppCampaignTools,
  handleInAppPlacementTools,
  handleAiAndFeedbackTools,
];
