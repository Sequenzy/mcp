import type { Tool } from "@modelcontextprotocol/sdk/types.js";

import {
  popupContentDescription,
  popupTemplateDescription,
} from "../internal.js";

const companyIdProperty = {
  type: "string",
  description:
    "Company ID. If not provided, uses the currently selected company.",
} as const;

const popupIdProperty = {
  type: "string",
  description: "Saved popup ID returned by list_popups or create_popup.",
} as const;

const popupContentProperty = {
  type: "object",
  description: popupContentDescription,
  additionalProperties: true,
} as const;

const popupMutationProperties = {
  companyId: companyIdProperty,
  popupId: popupIdProperty,
  name: {
    type: "string",
    description: "Optional popup name update.",
  },
  content: popupContentProperty,
} as const;

export const savedPopupToolDefinitions: Tool[] = [
  {
    name: "list_popups",
    description:
      "List saved signup popups with their complete content, trigger, targeting, status, metrics, and dashboard URLs.",
    inputSchema: {
      type: "object",
      properties: { companyId: companyIdProperty },
      additionalProperties: false,
    },
  },
  {
    name: "get_popup",
    description:
      "Get one saved popup's complete content, trigger, targeting, status, metrics, and dashboard URL.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        popupId: popupIdProperty,
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_popup",
    description:
      "Create and immediately publish a saved signup popup. Start from a template or provide complete popup content, but not both. The returned embed is client-safe and contains no API key.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        name: {
          type: "string",
          description: "Internal popup name.",
        },
        template: {
          type: "string",
          enum: [
            "newsletter-modal",
            "discount-offer",
            "countdown-launch",
            "minimal-slide-in",
            "exit-lead-magnet",
            "live-demo",
            "launch-modal",
            "paper-digest",
            "stark-takeover",
            "top-bar",
            "announcement-bar",
            "fullscreen-welcome",
          ],
          description: popupTemplateDescription,
        },
        content: popupContentProperty,
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_popup",
    description:
      "Update a popup's name or replace its complete content. Read the current popup first before changing content.",
    inputSchema: {
      type: "object",
      properties: popupMutationProperties,
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "publish_popup",
    description:
      "Publish a popup, optionally saving a name or complete content update first. Returns client-safe embed code.",
    inputSchema: {
      type: "object",
      properties: popupMutationProperties,
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "unpublish_popup",
    description:
      "Unpublish a popup, optionally saving a name or complete content update first. Existing embeds remain installed but load a no-op script until republished.",
    inputSchema: {
      type: "object",
      properties: popupMutationProperties,
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_popup",
    description:
      "Permanently delete a popup, including a published popup. Existing deployed embeds stop working immediately.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        popupId: popupIdProperty,
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_popup_embed",
    description:
      "Get a published popup's versioned script URL and HTML, React, WordPress, and Shopify embed recipes. The snippets are client-safe and contain no API key.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: companyIdProperty,
        popupId: popupIdProperty,
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
];
