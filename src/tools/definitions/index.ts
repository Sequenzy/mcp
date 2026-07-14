import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import { abTestToolDefinitions } from "./ab-tests.js";
import { accountToolDefinitions } from "./account.js";
import { aiGenerationToolDefinitions } from "./ai-generation.js";
import { analyticsToolDefinitions } from "./analytics.js";
import { audienceSyncToolDefinitions } from "./audience-syncs.js";
import { campaignToolDefinitions } from "./campaigns.js";
import { feedbackToolDefinitions } from "./feedback.js";
import { savedFormToolDefinitions } from "./forms.js";
import { imageAssetToolDefinitions } from "./image-assets.js";
import { inboxToolDefinitions } from "./inbox.js";
import { landingPageToolDefinitions } from "./landing-pages.js";
import { productToolDefinitions } from "./products.js";
import { sequenceBasicToolDefinitions } from "./sequences-basic.js";
import { sequenceEditingToolDefinitions } from "./sequences-editing.js";
import { subscriberToolDefinitions } from "./subscribers.js";
import { tagListSegmentToolDefinitions } from "./tags-lists-segments.js";
import { teamToolDefinitions } from "./team.js";
import { templateToolDefinitions } from "./templates.js";
import { transactionalToolDefinitions } from "./transactional.js";
import { webhookToolDefinitions } from "./webhooks.js";

export const toolDefinitions: Tool[] = [
  ...accountToolDefinitions,
  ...subscriberToolDefinitions,
  ...productToolDefinitions,
  ...tagListSegmentToolDefinitions,
  ...audienceSyncToolDefinitions,
  ...templateToolDefinitions,
  ...abTestToolDefinitions,
  ...campaignToolDefinitions,
  ...savedFormToolDefinitions,
  ...landingPageToolDefinitions,
  ...imageAssetToolDefinitions,
  ...sequenceBasicToolDefinitions,
  ...sequenceEditingToolDefinitions,
  ...transactionalToolDefinitions,
  ...analyticsToolDefinitions,
  ...teamToolDefinitions,
  ...inboxToolDefinitions,
  ...webhookToolDefinitions,
  ...aiGenerationToolDefinitions,
  ...feedbackToolDefinitions,
];
