import { handleAccountTools } from "./account.js";
import { handleAiAndFeedbackTools } from "./ai-and-feedback.js";
import { handleAnalyticsAndTransactionalTools } from "./analytics-and-transactional.js";
import { handleAudienceTools } from "./audience.js";
import { handleCampaignTools } from "./campaigns.js";
import { handleLandingPageTools } from "./landing-pages.js";
import { handleProductTools } from "./products.js";
import { handleSequenceTools } from "./sequences.js";
import { handleSubscriberTools } from "./subscribers.js";
import { handleTeamInboxWebhookTools } from "./team-inbox-webhooks.js";

export const toolHandlers = [
  handleAccountTools,
  handleSubscriberTools,
  handleProductTools,
  handleAudienceTools,
  handleCampaignTools,
  handleLandingPageTools,
  handleSequenceTools,
  handleAnalyticsAndTransactionalTools,
  handleTeamInboxWebhookTools,
  handleAiAndFeedbackTools,
];
