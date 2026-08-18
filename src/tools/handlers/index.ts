import { handleAccountTools } from "./account.js";
import { handleAiAndFeedbackTools } from "./ai-and-feedback.js";
import { handleAnalyticsAndTransactionalTools } from "./analytics-and-transactional.js";
import { handleAudienceTools } from "./audience.js";
import { handleCampaignTools } from "./campaigns.js";
import { handleEmailBlockTools } from "./email-blocks.js";
import { handleEmailComponentTools } from "./email-components.js";
import { handleEventSchemaTools } from "./event-schemas.js";
import { handleSavedFormTools } from "./forms.js";
import { handleImageAssetTools } from "./image-assets.js";
import { handleIntegrationTools } from "./integrations.js";
import { handleLandingPageTools } from "./landing-pages.js";
import { handleSavedPopupTools } from "./popups.js";
import { handleProductTools } from "./products.js";
import { handleRenderTools } from "./render.js";
import { handleSequenceTools } from "./sequences.js";
import { handleSubscriberTools } from "./subscribers.js";
import { handleSuppressionTools } from "./suppressions.js";
import { handleTeamInboxWebhookTools } from "./team-inbox-webhooks.js";
import { handleWebTrackingTools } from "./web-tracking.js";

export const toolHandlers = [
  handleAccountTools,
  handleIntegrationTools,
  handleEventSchemaTools,
  handleSubscriberTools,
  handleSuppressionTools,
  handleProductTools,
  handleAudienceTools,
  handleCampaignTools,
  handleEmailBlockTools,
  handleEmailComponentTools,
  handleRenderTools,
  handleSavedFormTools,
  handleSavedPopupTools,
  handleLandingPageTools,
  handleImageAssetTools,
  handleSequenceTools,
  handleAnalyticsAndTransactionalTools,
  handleTeamInboxWebhookTools,
  handleWebTrackingTools,
  handleAiAndFeedbackTools,
];
