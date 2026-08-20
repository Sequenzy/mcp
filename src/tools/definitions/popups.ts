import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const POPUP_TEMPLATE_DESCRIPTION =
  "Starting design. One of: newsletter-modal, discount-offer, countdown-launch, minimal-slide-in, exit-lead-magnet, live-demo, launch-modal, paper-digest, stark-takeover, top-bar, announcement-bar, fullscreen-welcome. Defaults to newsletter-modal.";

const POPUP_TRIGGER_DESCRIPTION =
  'When the popup opens. { "type": "delay" | "scroll" | "exit-intent" | "click" | "manual", "delaySeconds": 0-3600, "scrollPercent": 1-100, "clickSelector": "#join" }. Only the key each type uses matters: delay reads delaySeconds, scroll reads scrollPercent, and click requires a clickSelector CSS selector. Merged into the current trigger, so patching one key keeps the rest.';

const POPUP_TARGETING_DESCRIPTION =
  'Where the popup may show. { "domains": ["shop.example.com"], "paths": ["/pricing"], "excludedPaths": ["/checkout"], "device": "all" | "desktop" | "mobile" }. Empty arrays mean no restriction. Merged into the current targeting.';

const POPUP_SCHEDULE_DESCRIPTION =
  'Optional run window as ISO 8601 timestamps: { "startsAt": "2026-09-01T00:00:00Z", "endsAt": "2026-09-08T00:00:00Z" }. Use null on either key to clear it. Merged into the current schedule.';

const POPUP_FREQUENCY_DESCRIPTION =
  'How often one visitor sees it: { "maxDisplays": 1-100, "windowDays": 1-365 }. Merged into the current frequency.';

const POPUP_VISUAL_DESCRIPTION =
  'Media panel and urgency treatment: { "style": "none" | "accent" | "header" | "rail" | "image" | "countdown", "placement": "top" | "left" | "center" | "right", "imageUrl": "https://...", "imageAlt": "...", "countdownMinutes": 1-10080 }. Use style "image" with an imageUrl for a product panel, or "countdown" with countdownMinutes for a deadline. Style "image" requires an https imageUrl - without one the popup renders the accent rail instead of the split layout, so setting it without an image is rejected. Merged into the current visual.';

const POPUP_BLOCKS_DESCRIPTION =
  'Full replacement for the popup\'s content blocks. Fetch the current blocks from get_popup, modify them, and send the complete array - the popup must keep exactly one required email field and one submit button. Blocks render in array order; every block needs a globally unique "id" and a "kind", and "sectionId" ("success" or "error") moves a content block into that screen. Layout groups use { id, kind: "group", label, layout: "stack" | "row" | "grid" | "overlay", columns (1-4), gap (0-64), padding (0-64), overlayColor (hex), overlayPosition ("top" | "center" | "bottom"), overlayShade (0-100), children: [...] }. In Overlay, gap spaces foreground children while the direct image remains the background. Overlay needs exactly one direct image; images inside subgroups only enable Overlay for that subgroup, while zero or multiple direct images fall back to Stack. Groups may nest to three levels; descendants must use the same sectionId as their group, while form-step, success-screen, and error-state remain at the root. Input blocks are kind "form-field": { id, kind: "form-field", fieldType, name, label, placeholder, required, defaultValue, showLabel, width ("full" | "half"), mapsTo, options }. fieldType is one of text, email, phone, number, textarea, select, radio, checkbox, consent, hidden. mapsTo is one of email, firstName, lastName, phone, customAttribute and defaults to customAttribute, which stores the answer under the block\'s "name" as a subscriber custom attribute. select, radio, and checkbox fields require options: [{ value, label, id }] - label and id default to value when omitted. Other kinds and their properties: heading { content, level (1-3), align }, text { content, variant ("paragraph" | "eyebrow" | "caption"), align }, image { src, alt, fit ("cover" | "contain") }, button { text, url, variant, align }, divider {}, spacer { height (8-160) }, custom-html { html, height (40-1200) } - the markup goes in "html", not "content" - feature-grid { features: [{ title, description }], columns }, testimonial { testimonials: [{ quote, name, role }] }, countdown { label, endsAt }, form-step { title, description, blockIds }, submit-button { text, width }, success-screen { heading, message }, error-state { message }. Properties outside a kind\'s list are rejected rather than dropped, so a typo is reported instead of silently saving an empty block. Validation errors name the offending property, for example "blocks[3].children[0].options[0].value".';

const POPUP_THEME_DESCRIPTION =
  "Visual theme overrides merged into the current theme. Any subset of: accentColor, backgroundColor, textColor, mutedTextColor, cardColor, borderColor (all #rrggbb), borderRadius (0-32), headingFontFamily, bodyFontFamily, density (compact | balanced | spacious).";

export const savedPopupToolDefinitions: Tool[] = [
  {
    name: "list_popups",
    description:
      "List saved signup popups for a company with their status, view and conversion counts, and engagement rates. Content blocks are omitted by default to keep the response small - use get_popup for one popup's full content. Popups are the on-site overlay capture surface; use list_forms for inline embedded forms.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to list popups for. If not provided, uses the currently selected company.",
        },
        includeContent: {
          type: "boolean",
          description:
            "Include every popup's full content blocks. Off by default because each popup adds roughly 1.8k characters; prefer get_popup when you only need one.",
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_popup",
    description:
      "Get one saved popup with its complete content blocks, trigger, targeting, schedule, frequency, and theme. Read this before editing blocks so the replacement array stays complete.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        popupId: {
          type: "string",
          description:
            "Saved popup ID returned by list_popups or create_popup.",
        },
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "create_popup",
    description:
      "Create a saved signup popup and get the one-line script tag that deploys it. The popup is published by default; its trigger, targeting, audience, and duplicate handling stay server-side, so the deployed script carries no API key. Pick a template for the starting design, then refine copy and behavior with update_popup.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID to create the popup in. If not provided, uses the currently selected company.",
        },
        name: {
          type: "string",
          description: "Internal saved-popup name.",
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
          description: POPUP_TEMPLATE_DESCRIPTION,
        },
        status: {
          type: "string",
          enum: ["draft", "published"],
          description:
            "Defaults to published, which makes the embed script live immediately. Use draft to stage a popup that should not show yet.",
        },
        listIds: {
          type: "array",
          description:
            "List IDs every signup is added to. Omit or pass an empty array to capture into every list, matching the dashboard default. Use list_lists to resolve IDs.",
          items: { type: "string" },
        },
        tagIds: {
          type: "array",
          description:
            "Optional existing tag IDs applied to every signup. Use list_tags to resolve IDs.",
          items: { type: "string" },
        },
        duplicateStrategy: {
          type: "string",
          enum: ["skip", "merge", "overwrite"],
          description:
            "How to handle an existing subscriber. Defaults to skip.",
        },
        headline: {
          type: "string",
          description: "Optional popup headline.",
        },
        description: {
          type: "string",
          description: "Optional supporting popup copy.",
        },
        buttonText: {
          type: "string",
          description: "Optional submit button label.",
        },
        successMessage: {
          type: "string",
          description:
            "Confirmation shown after a successful signup when redirectUrl is omitted.",
        },
        redirectUrl: {
          type: "string",
          description:
            "Optional HTTP or HTTPS URL for successful signups. Omit it to show the saved confirmation message.",
        },
        presentation: {
          type: "string",
          enum: ["modal", "slide-in", "floating-bar", "fullscreen"],
          description: "How the popup is presented on the page.",
        },
        placement: {
          type: "string",
          enum: ["center", "left", "right", "top", "bottom"],
          description: "Where the popup sits in the viewport.",
        },
        trigger: {
          type: "object",
          description: POPUP_TRIGGER_DESCRIPTION,
          additionalProperties: true,
        },
        targeting: {
          type: "object",
          description: POPUP_TARGETING_DESCRIPTION,
          additionalProperties: true,
        },
        schedule: {
          type: "object",
          description: POPUP_SCHEDULE_DESCRIPTION,
          additionalProperties: true,
        },
        frequency: {
          type: "object",
          description: POPUP_FREQUENCY_DESCRIPTION,
          additionalProperties: true,
        },
        visual: {
          type: "object",
          description: POPUP_VISUAL_DESCRIPTION,
          additionalProperties: true,
        },
        theme: {
          type: "object",
          description: POPUP_THEME_DESCRIPTION,
          additionalProperties: true,
        },
        blocks: {
          type: "array",
          description: POPUP_BLOCKS_DESCRIPTION,
          items: { type: "object", additionalProperties: true },
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "update_popup",
    description:
      "Update a saved popup: rename it, publish or unpublish it via status, retarget its audience, change when and where it fires, edit its copy, restyle its theme, or replace its content blocks. Read the current content via get_popup first when editing blocks. Setting status to draft stops it showing without deleting it or changing the embed script.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        popupId: {
          type: "string",
          description:
            "Saved popup ID returned by list_popups or create_popup.",
        },
        name: {
          type: "string",
          description: "New internal saved-popup name.",
        },
        status: {
          type: "string",
          enum: ["draft", "published"],
          description:
            "Set to published to make the popup live, or draft to stop it showing while keeping it and its stats. The embed script stays valid either way.",
        },
        listIds: {
          type: "array",
          description:
            "Replacement list targeting. Pass an empty array to capture into every list.",
          items: { type: "string" },
        },
        tagIds: {
          type: "array",
          description:
            "Replacement tag IDs applied to every signup. Pass an empty array to clear tags.",
          items: { type: "string" },
        },
        duplicateStrategy: {
          type: "string",
          enum: ["skip", "merge", "overwrite"],
          description: "How to handle an existing subscriber.",
        },
        headline: {
          type: "string",
          description:
            "New text for the popup's first heading block. Fails if the popup has no heading block; edit blocks instead.",
        },
        description: {
          type: "string",
          description:
            "New text for the popup's first paragraph block. Fails if the popup has no paragraph block; edit blocks instead.",
        },
        buttonText: {
          type: "string",
          description: "New submit button label.",
        },
        successMessage: {
          type: "string",
          description: "New confirmation message on the success screen.",
        },
        redirectUrl: {
          type: "string",
          description:
            "HTTP or HTTPS URL for successful signups. Pass an empty string to switch back to the confirmation message.",
        },
        presentation: {
          type: "string",
          enum: ["modal", "slide-in", "floating-bar", "fullscreen"],
          description: "How the popup is presented on the page.",
        },
        placement: {
          type: "string",
          enum: ["center", "left", "right", "top", "bottom"],
          description: "Where the popup sits in the viewport.",
        },
        trigger: {
          type: "object",
          description: POPUP_TRIGGER_DESCRIPTION,
          additionalProperties: true,
        },
        targeting: {
          type: "object",
          description: POPUP_TARGETING_DESCRIPTION,
          additionalProperties: true,
        },
        schedule: {
          type: "object",
          description: POPUP_SCHEDULE_DESCRIPTION,
          additionalProperties: true,
        },
        frequency: {
          type: "object",
          description: POPUP_FREQUENCY_DESCRIPTION,
          additionalProperties: true,
        },
        visual: {
          type: "object",
          description: POPUP_VISUAL_DESCRIPTION,
          additionalProperties: true,
        },
        theme: {
          type: "object",
          description: POPUP_THEME_DESCRIPTION,
          additionalProperties: true,
        },
        blocks: {
          type: "array",
          description: POPUP_BLOCKS_DESCRIPTION,
          items: { type: "object", additionalProperties: true },
        },
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "get_popup_embed",
    description:
      "Get a published popup's script URL and ready-to-paste embed snippets for plain HTML, React/Next.js, WordPress, and Shopify. The snippet contains no API key - the trigger, targeting, and audience rules stay server-side.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        popupId: {
          type: "string",
          description:
            "Saved popup ID returned by list_popups or create_popup.",
        },
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "duplicate_popup",
    description:
      "Copy a saved popup into a new draft with its own view and conversion counts. The original keeps showing and keeps its stats. Use this to test a new offer or headline against a popup that already performs.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        popupId: {
          type: "string",
          description: "Saved popup ID to copy.",
        },
        name: {
          type: "string",
          description:
            'Name for the copy. Defaults to the original name with " (copy)" appended.',
        },
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
  {
    name: "delete_popup",
    description:
      "Permanently delete a saved popup and its view and conversion counts. Subscribers it already captured are not affected. To stop a popup from showing while keeping its stats, set status to draft with update_popup instead.",
    inputSchema: {
      type: "object",
      properties: {
        companyId: {
          type: "string",
          description:
            "Company ID. If not provided, uses the currently selected company.",
        },
        popupId: {
          type: "string",
          description:
            "Saved popup ID returned by list_popups or create_popup.",
        },
      },
      required: ["popupId"],
      additionalProperties: false,
    },
  },
];
