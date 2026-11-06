import { RestrictedPersonalDataError } from "../error-output.js";
import type { JsonSchemaObject, Tool } from "../mcp-types.js";

import { emailBlockGuidanceHint } from "./descriptions.js";
import { OPENAI_TOOL_JUSTIFICATIONS } from "./openai-justifications/index.js";
import {
  isOmittedOutputField,
  normalizeFieldName,
  redactRestrictedUrls,
  restrictedAttributePathCategory,
  restrictedEmbeddedUrlCategory,
  restrictedFieldCategory,
  restrictedMergeTagCategory,
  restrictedRecordIssue,
  restrictedTextCategory,
  restrictedValueShapeCategory,
  type RestrictedIssue,
} from "./openai-profile-matchers.js";
import {
  ATTRIBUTE_PATH_LIST_FIELDS,
  OPENAI_APPROVED_INPUT_PROPERTIES,
  OPENAI_DEFAULT_ARGUMENTS,
  DATA_BEARING_FIELDS,
  DATA_BEARING_FIELDS_BY_TOOL,
  FREE_FORM_FIELDS,
  IDENTIFIER_FIELDS,
  LANDING_PAGE_PREVIEW_PATH_PREFIX,
  LANDING_PAGE_PREVIEW_TOOLS,
  NOTICE_INPUT_FIELDS,
  OPENAI_BLOCKED_SETTINGS_TABS,
  OPENAI_CONNECTOR_TEXT_REWRITES,
  OPENAI_TEXT_REWRITES,
  OPENAI_EMAIL_BRANDING_FIELDS,
  OPENAI_EXCLUDED_TOOL_NAMES,
  OPENAI_SPLIT_TOOLS,
  OPENAI_TOOL_RENAMES,
  REDACTED_VALUE,
  SECRET_ENDPOINT_TOOLS,
  SHAPE_SCANNED_FIELDS,
  TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS,
  type RestrictedCategory,
} from "./openai-profile-rules.js";
import { appendOpenAiRestrictedDataNotice } from "./openai-profile-schemas.js";
import { shareOpenAiBlockGuidance } from "./openai-size-rewrites.js";
import { collapseRepeatedSchemas } from "./schema-collapse.js";
import { getToolTitle } from "./tool-hints.js";

export {
  OPENAI_EXCLUDED_TOOL_NAMES,
  OPENAI_SPLIT_TOOLS,
  OPENAI_TOOL_RENAMES,
} from "./openai-profile-rules.js";

const OPENAI_TOOL_TARGETS: Readonly<
  Record<string, { handlerName: string; action?: string }>
> = Object.fromEntries([
  ...Object.entries(OPENAI_TOOL_RENAMES).map(([handlerName, renamed]) => [
    renamed,
    { handlerName },
  ]),
  ...Object.entries(OPENAI_SPLIT_TOOLS).flatMap(([handlerName, splits]) =>
    splits.map(({ name, action }) => [name, { handlerName, action }])
  ),
]);

/**
 * Maps an OpenAI-surface tool name to the shared handler name and, for split
 * tools, the `action` the handler needs.
 */
export function getOpenAiToolTarget(name: string): {
  handlerName: string;
  action?: string;
} {
  return OPENAI_TOOL_TARGETS[name] ?? { handlerName: name };
}

/** Fills the arguments the OpenAI surface defaults differently, if omitted. */
export function withOpenAiDefaultArguments(
  handlerName: string,
  args: Record<string, unknown>
): Record<string, unknown> {
  const defaults = OPENAI_DEFAULT_ARGUMENTS[handlerName];
  if (!defaults) return args;
  const missing = Object.entries(defaults).filter(
    ([key]) => args[key] === undefined
  );
  return missing.length > 0
    ? { ...Object.fromEntries(missing), ...args }
    : args;
}

/**
 * Profiles one shared tool for the OpenAI surface, listing split tools in
 * place of their multi-operation source.
 */
export function withOpenAiToolProfiles(tool: Tool): Tool[] {
  return withOpenAiToolProfilesWithoutEffects(tool).map(withOpenAiEffects);
}

/** Appends the tool's effects sentence, if it has one, to its description. */
function withOpenAiEffects(tool: Tool): Tool {
  const effects = OPENAI_TOOL_JUSTIFICATIONS[tool.name]?.effects;
  if (!effects) return tool;
  const base = tool.description?.trim() ?? "";
  const sentence = base && !/[.!?]$/.test(base) ? `${base}.` : base;
  return {
    ...tool,
    description: [sentence, effects].filter(Boolean).join(" "),
  };
}

function withOpenAiToolProfilesWithoutEffects(tool: Tool): Tool[] {
  const profiled = withOpenAiToolProfile(tool);
  if (!profiled) return [];
  const splits = OPENAI_SPLIT_TOOLS[tool.name];
  if (!splits) return [profiled];

  const properties = profiled.inputSchema.properties ?? {};
  return splits.map((split) => ({
    ...profiled,
    name: split.name,
    description: applyOpenAiTextRewrites(split.description),
    annotations: { ...profiled.annotations, title: getToolTitle(split.name) },
    inputSchema: {
      ...profiled.inputSchema,
      properties: Object.fromEntries(
        split.properties.map((name) => {
          const property = properties[name] as JsonSchemaObject;
          const description = split.propertyDescriptions[name];
          return [name, description ? { ...property, description } : property];
        })
      ),
      required: [...split.required],
    },
  }));
}
export { OPENAI_RESTRICTED_DATA_NOTICE } from "./openai-profile-schemas.js";

type ScanContext = {
  toolName: string;
  path: string;
  /** The property this value sits under; array items inherit the array's key. */
  key?: string;
  /** True once inside a data-bearing field, where labelled prose is checked. */
  textScanned: boolean;
  /** True once inside a free-form container such as customAttributes. */
  freeForm?: boolean;
};

/**
 * The restricted-data category of one string value, if any: names and tags
 * get only value-shape rules, identifiers outside free-form containers are
 * exempt, and other values under data-bearing fields get every text rule.
 */
function restrictedStringCategory(
  value: string,
  ctx: ScanContext
): RestrictedCategory | undefined {
  if (ctx.key && SHAPE_SCANNED_FIELDS.has(ctx.key)) {
    return restrictedValueShapeCategory(value);
  }
  if (!ctx.textScanned) return undefined;
  if (ctx.key && IDENTIFIER_FIELDS.has(ctx.key) && !ctx.freeForm) {
    return undefined;
  }
  return restrictedTextCategory(value);
}

function isDataBearing(toolName: string, key: string): boolean {
  return (
    DATA_BEARING_FIELDS.has(key) ||
    DATA_BEARING_FIELDS_BY_TOOL[toolName]?.has(key) === true
  );
}

/**
 * One recursive pass over every argument of every tool. Structural rules
 * (field names, attribute paths, named records, merge tags, embedded URLs)
 * apply everywhere; labelled-prose rules apply only under data-bearing fields
 * so authored campaign copy is left alone.
 */
function scanInputValue(
  value: unknown,
  ctx: ScanContext
): RestrictedIssue | undefined {
  if (typeof value === "string") {
    const urlCategory = restrictedEmbeddedUrlCategory(value);
    if (urlCategory) return { category: urlCategory, path: ctx.path };
    const mergeTagCategory = restrictedMergeTagCategory(value);
    if (mergeTagCategory) return { category: mergeTagCategory, path: ctx.path };
    if (ctx.key && ATTRIBUTE_PATH_LIST_FIELDS.has(ctx.key)) {
      const category = restrictedAttributePathCategory(value);
      if (category) return { category, path: ctx.path };
    }
    const category = restrictedStringCategory(value, ctx);
    if (category) return { category, path: ctx.path };
    return undefined;
  }

  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const issue = scanInputValue(value[index], {
        ...ctx,
        path: `${ctx.path}[${index}]`,
      });
      if (issue) return issue;
    }
    return undefined;
  }

  if (value === null || typeof value !== "object") return undefined;

  const record = value as Record<string, unknown>;
  const recordIssue = restrictedRecordIssue(record, ctx.path, ctx.key);
  if (recordIssue) return recordIssue;

  for (const [key, nestedValue] of Object.entries(record)) {
    const path = `${ctx.path}.${key}`;
    const category = restrictedFieldCategory(key);
    if (category) return { category, path };

    const issue = scanInputValue(nestedValue, {
      toolName: ctx.toolName,
      path,
      key,
      textScanned: ctx.textScanned || isDataBearing(ctx.toolName, key),
      freeForm: ctx.freeForm === true || FREE_FORM_FIELDS.has(key),
    });
    if (issue) return issue;
  }
  return undefined;
}

function restrictedDataError(issue: RestrictedIssue): Error {
  return new RestrictedPersonalDataError(issue.category, issue.path);
}

export function withOpenAiToolProfile(tool: Tool): Tool | null {
  if (OPENAI_EXCLUDED_TOOL_NAMES.has(tool.name)) return null;

  const properties = {
    ...tool.inputSchema.properties,
    ...OPENAI_APPROVED_INPUT_PROPERTIES[tool.name],
  };
  if (tool.name === "attach_product_file") {
    // Local uploads only work with the stdio package, not a remote connector.
    delete properties.filePath;
    properties.url = {
      ...(properties.url as JsonSchemaObject),
      description: "Public https URL of the file, such as a hosted PDF guide.",
    };
  }
  if (tool.name === "upload_image_asset") {
    delete properties.filePath;
    properties.imageBase64 = {
      ...(properties.imageBase64 as JsonSchemaObject),
      description: "Raw base64 image bytes or a base64 data URL.",
    };
    properties.filename = {
      ...(properties.filename as JsonSchemaObject),
      description: "File name including extension.",
    };
  }
  for (const [name, property] of Object.entries(properties)) {
    if (
      !NOTICE_INPUT_FIELDS.has(name) &&
      DATA_BEARING_FIELDS_BY_TOOL[tool.name]?.has(name) !== true
    ) {
      continue;
    }
    if (property === null || typeof property !== "object") continue;
    const profiledProperty = appendOpenAiRestrictedDataNotice(
      property as JsonSchemaObject
    );
    properties[name] =
      tool.name === "cancel_sequence_enrollments" && name === "fieldValues"
        ? {
            ...profiledProperty,
            description: `${profiledProperty.description ?? ""} On this MCP surface, fieldPath is required whenever fieldValues is provided.`,
          }
        : profiledProperty;
  }
  let inputSchema: Tool["inputSchema"] = { ...tool.inputSchema, properties };

  if (tool.name === "render_email" || tool.name === "check_email") {
    const properties = { ...inputSchema.properties };
    delete properties.subscriberId;
    inputSchema = { ...inputSchema, properties };
  }

  if (tool.name === "get_app_urls" && inputSchema.properties?.settingsTab) {
    inputSchema = {
      ...inputSchema,
      properties: {
        ...inputSchema.properties,
        settingsTab: {
          ...(inputSchema.properties.settingsTab as JsonSchemaObject),
          description:
            "Settings tab slug, e.g. integrations, domain, tracking, api-keys, team.",
        },
      },
    };
  }

  const descriptionOverrides: Readonly<Record<string, string>> = {
    // Gallery emails come from Sequenzy signing up to a brand's public list.
    request_gallery_brand:
      "Suggest a brand, such as a competitor, for Sequenzy's public email gallery, so its marketing emails can be used as design references. Pass its website or domain. This call only records the suggestion: Sequenzy reviews it and, if the brand is added, signs up to the brand's public mailing list like any reader. Suggesting the same domain again keeps the one request (a new note replaces the old) and returns created false. If the brand is already in the gallery, the request comes back with status available. A company can keep up to 50 requests and cannot suggest its own website. Requires templates:write.",
    watch_brand:
      "Follow a brand's marketing emails, such as a competitor's newsletters and promotions, in Sequenzy's public email gallery. Pass its website or domain. Gallery emails are the ones a brand sends to its public mailing list, which Sequenzy signs up to like any reader; no one's private mailbox is read. A brand already in the gallery is followed at once (status available) and its emails can be read with list_watched_brand_emails; any other brand is suggested for the gallery and its emails show up once it is added. New emails arrive a few hours after they are sent. Watching again keeps the one watch (a new note replaces the old) and returns created false. A company can keep up to 50 watches and gallery suggestions together and cannot watch its own website. Requires templates:write.",
    list_watched_brand_emails:
      "Read the marketing emails that watched brands sent to their public mailing lists, as collected in Sequenzy's public email gallery, newest first, a page at a time: subject, type, subtype, sentAt, collectedAt, brand, url and a breakdown (analysis, null until analyzed). Pass domain for one brand and since for emails sent at or after a time (for example the start of this week). Emails arrive a few hours after they are sent, so when polling set since about a day before the last check and skip ids already seen. Pass nextCursor back as cursor for older emails. Each url also works as the url of create_template_from_example to remix it. Read-only. Requires templates:read.",
    search_subscribers:
      "Search the company's own contacts by free-text query, tags, list, segment, custom attribute, or opt-out date, for example to check one contact's status or to size an audience. Each contact carries unsubscribedAt, the date the contact opted out; use it rather than updatedAt, which any later tag or attribute write overwrites. Omitting limit returns every match in one call. To page through a large audience instead, pass limit and follow pagination.nextCursor (or pagination.nextOffset) until pagination.hasMore is false. Default searches are newest first; searches with attribute use stable subscriber-ID ascending order. Read-only.",
    list_account_members:
      "List the member contacts of one of your customers' accounts (a B2B organization such as a company, workspace or team, identified by your own externalId), with each member's role: owners first, then admins, then members. These are not the members of your Sequenzy workspace. Read-only.",
    get_account:
      "Get your own Sequenzy account: the companies (workspaces) you can access, which one is selected, and this connection's permission scopes. This is not your customers' B2B accounts; use list_accounts for those. Other tools use the selected company unless a companyId is passed, and select_company changes the selection. Use it when the user asks which companies they can access, or after a missing-permission error to see what this connection can do.",
    get_sequence_inbound_webhook:
      "Read the non-secret mapping, sample payload, setup status, and dashboard URL for a sequence inbound webhook. The credential-bearing endpoint URL is omitted here.",
    configure_sequence_inbound_webhook:
      "Create or update the mapping and sample attached to a sequence inbound_webhook trigger. The response omits the endpoint secret and credential-bearing URL; a human can copy it from the returned sequence dashboard URL.",
    check_email:
      "Check a saved campaign, sequence email step or template before sending: the email checker rules plus live verification of every link and image (broken pages, dead domains, missing https://, placeholder or staging URLs, broken images). Checking against a stored subscriber ID is unavailable here; omit it or pass a policy-checked inline subscriber. Read-only.",
    render_email:
      "Render an email with a sample contact or caller-supplied, policy-checked subscriber and variables. Rendering against a stored subscriber ID is unavailable here because stored custom attributes cannot be inspected before personalization.",
    list_integration_capabilities:
      "Describe what each integration Sequenzy supports, such as Stripe, Shopify or Clerk, provides, whether or not it is connected: category, how it connects, what it syncs, the events it emits and the moment each one fires, the subscriber attributes it writes, supported actions, availability, and caveats. Useful for questions like 'what would connecting Stripe give me?' or whether a provider emits the event a sequence needs. Read-only.",
    upsert_products:
      "Add or update products in your Sequenzy catalog, keyed by your own productId, for products your store or payment provider does not sync automatically. Sequenzy uses the catalog for product emails, recommendations and purchase-triggered sequences; it does not sell products or take payments. Marking a product back in stock can send back-in-stock emails to subscribers waiting for it.",
    upload_image_asset:
      "Upload an image to the selected company's shared media library and return a public hosted URL plus a ready-to-insert Sequenzy image block. When an email needs a new image, call this before create/update campaign, sequence, template, or transactional tools, then place the returned imageBlock in the target blocks array. Provide the image as imageBase64 with a filename. PNG, JPEG, GIF, and WebP are supported up to 10MB. cropHeight with objectFit:'cover' provides a precise centered screenshot crop while displayWidthPercent keeps the image responsive. Anyone with the hosted URL can view the image.",
    attach_product_file:
      "Attach a file, such as a PDF guide, to a product in your catalog by public URL, so the sequence emails Sequenzy sends after someone buys from your own store can include a download link ({{event.download.url}} and {{event.download.name}}). Sequenzy does not sell products or take payments. Replaces any file already attached to the product.",
  };

  const description = applyOpenAiTextRewrites(
    descriptionOverrides[tool.name] ?? tool.description ?? ""
  );

  const renamed = OPENAI_TOOL_RENAMES[tool.name];
  // Output schemas are optional in MCP and made up a third of this surface's
  // tools/list; results still carry structuredContent without them.
  const { outputSchema: _outputSchema, ...withoutOutputSchema } = tool;

  return {
    ...withoutOutputSchema,
    ...(renamed
      ? {
          name: renamed,
          annotations: { ...tool.annotations, title: getToolTitle(renamed) },
        }
      : {}),
    ...(description ? { description } : {}),
    inputSchema: shareOpenAiBlockGuidance(
      tool.name,
      collapseRepeatedSchemas(
        withOpenAiSchemaText(inputSchema) as JsonSchemaObject
      ),
      openAiBlockGuidance()
    ) as Tool["inputSchema"],
  };
}

let cachedBlockGuidance: string | undefined;

/** emailBlockGuidanceHint as this surface lists it, after its rewrites. */
function openAiBlockGuidance(): string {
  cachedBlockGuidance ??= applyOpenAiTextRewrites(emailBlockGuidanceHint);
  return cachedBlockGuidance;
}

export function assertOpenAiInputPolicy(
  toolName: string,
  args: Record<string, unknown>
): void {
  if (
    (toolName === "render_email" || toolName === "check_email") &&
    args.subscriberId !== undefined
  ) {
    throw new Error(
      "`subscriberId` is unavailable on this MCP surface. Use a policy-compliant inline `subscriber`, or omit it to use sample data."
    );
  }

  if (
    toolName === "get_app_urls" &&
    typeof args.settingsTab === "string" &&
    OPENAI_BLOCKED_SETTINGS_TABS.has(args.settingsTab.trim().toLowerCase())
  ) {
    throw new Error(
      "`settingsTab` must name a Settings tab, such as integrations, domain, tracking, api-keys, or team."
    );
  }

  if (
    toolName === "cancel_sequence_enrollments" &&
    args.fieldValues !== undefined &&
    (typeof args.fieldPath !== "string" || !args.fieldPath.trim())
  ) {
    throw new Error(
      "`fieldPath` is required with `fieldValues` on this MCP surface so restricted personal-data selectors can be checked before cancellation."
    );
  }

  const issue = scanInputValue(args, {
    toolName,
    path: toolName,
    textScanned: false,
  });
  if (issue) throw restrictedDataError(issue);
}

const OMIT_SANITIZED_VALUE = Symbol("omit-sanitized-value");

function isLandingPagePreviewUrl(value: string): boolean {
  try {
    return new URL(value).pathname.startsWith(LANDING_PAGE_PREVIEW_PATH_PREFIX);
  } catch {
    return false;
  }
}

function applyRewrites(
  text: string,
  rewrites: typeof OPENAI_TEXT_REWRITES
): string {
  return rewrites.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    text
  );
}

function applyOpenAiTextRewrites(text: string): string {
  return applyRewrites(text, OPENAI_TEXT_REWRITES);
}

function withOpenAiSchemaText(value: unknown): unknown {
  if (typeof value === "string") return applyOpenAiTextRewrites(value);
  if (Array.isArray(value)) return value.map(withOpenAiSchemaText);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [
      key,
      withOpenAiSchemaText(nested),
    ])
  );
}

/**
 * Matches Sequenzy's own Account -> Subscription page, including its route
 * template. Only the dashboard company route counts, so a customer's own
 * "/account?tab=subscription" link in email or page content is kept.
 */
const SUBSCRIPTION_PAGE_PATH = /^\/dashboard\/company\/[^/]+\/account\/?$/;

function isSubscriptionPageUrl(value: string): boolean {
  if (!value.includes("tab=subscription") || /\s/.test(value)) return false;
  try {
    const url = new URL(value, "https://placeholder.invalid");
    return (
      SUBSCRIPTION_PAGE_PATH.test(url.pathname) &&
      url.searchParams.get("tab") === "subscription"
    );
  } catch {
    return false;
  }
}

function pickEmailBrandingFields(
  value: Record<string, unknown>
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).filter(([field]) =>
      OPENAI_EMAIL_BRANDING_FIELDS.has(field)
    )
  );
}

function sanitizeOutputValue(
  value: unknown,
  ctx: ScanContext
): unknown | typeof OMIT_SANITIZED_VALUE {
  if (typeof value === "string") {
    if (isSubscriptionPageUrl(value)) return OMIT_SANITIZED_VALUE;
    if (restrictedMergeTagCategory(value)) return REDACTED_VALUE;
    if (restrictedStringCategory(value, ctx)) return REDACTED_VALUE;
    const text = applyRewrites(value, OPENAI_CONNECTOR_TEXT_REWRITES);
    const previewExempt =
      ctx.key === "previewUrl" &&
      LANDING_PAGE_PREVIEW_TOOLS.has(ctx.toolName) &&
      isLandingPagePreviewUrl(text);
    return previewExempt ? text : redactRestrictedUrls(text);
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      const sanitized = sanitizeOutputValue(item, {
        ...ctx,
        path: `${ctx.path}[${index}]`,
      });
      return sanitized === OMIT_SANITIZED_VALUE ? [] : [sanitized];
    });
  }

  if (value === null || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (restrictedRecordIssue(record, ctx.path, ctx.key)) {
    return OMIT_SANITIZED_VALUE;
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(record)) {
    const normalizedKey = normalizeFieldName(key);
    if (isOmittedOutputField(key)) continue;
    if (
      SECRET_ENDPOINT_TOOLS.has(ctx.toolName) &&
      ctx.path === "webhook" &&
      (normalizedKey === "url" || normalizedKey === "webhookurl")
    ) {
      continue;
    }

    const metadataApiKey =
      normalizedKey === "apikey" &&
      nestedValue !== null &&
      typeof nestedValue === "object";
    if (restrictedFieldCategory(key) && !metadataApiKey) continue;

    if (ATTRIBUTE_PATH_LIST_FIELDS.has(key) && Array.isArray(nestedValue)) {
      sanitized[key] = nestedValue.filter(
        (item) =>
          typeof item !== "string" ||
          restrictedAttributePathCategory(item) === undefined
      );
      continue;
    }

    const path = ctx.path ? `${ctx.path}.${key}` : key;
    const brandingValue =
      key === "emailBranding" &&
      nestedValue !== null &&
      typeof nestedValue === "object" &&
      !Array.isArray(nestedValue)
        ? pickEmailBrandingFields(nestedValue as Record<string, unknown>)
        : nestedValue;
    const sanitizedValue = sanitizeOutputValue(brandingValue, {
      toolName: ctx.toolName,
      path,
      key,
      textScanned: ctx.textScanned || isDataBearing(ctx.toolName, key),
      freeForm: ctx.freeForm === true || FREE_FORM_FIELDS.has(key),
    });
    if (sanitizedValue !== OMIT_SANITIZED_VALUE) {
      sanitized[key] = sanitizedValue;
    }
  }
  return sanitized;
}

function readSafeCompanies(value: unknown): Array<Record<string, string>> {
  if (!Array.isArray(value)) return [];
  const allowedFields = ["id", "name", "role", "url", "settingsUrl"] as const;

  return value.flatMap((entry) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      return [];
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.name !== "string") {
      return [];
    }

    const company: Record<string, string> = {};
    for (const field of allowedFields) {
      if (typeof record[field] === "string") company[field] = record[field];
    }
    return [company];
  });
}

function readSafeApiKeyPermissions(
  value: unknown
): Record<string, unknown> | undefined {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const allowedFields = [
    "preset",
    "description",
    "fullAccess",
    "selectedScopeCount",
    "currentScopeCount",
    "scopes",
    "canDiscoverMarketingWork",
    "missingMarketingReadScopes",
    "canSendLive",
    "missingLiveDeliveryScopes",
    "liveDeliveryBlockedByRole",
    "roleRestrictedScopes",
    "manageUrl",
  ] as const;
  const safe: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (record[field] !== undefined) safe[field] = record[field];
  }
  return safe;
}

function projectOpenAiAccountResult(result: unknown): unknown {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return result;
  }

  const record = result as Record<string, unknown>;
  const projected: Record<string, unknown> = {
    success: record.success === true,
    companies: readSafeCompanies(record.companies),
    currentCompanyId:
      typeof record.currentCompanyId === "string"
        ? record.currentCompanyId
        : null,
    selectedCompanyId:
      typeof record.selectedCompanyId === "string"
        ? record.selectedCompanyId
        : null,
  };
  const permissions = readSafeApiKeyPermissions(record.apiKeyPermissions);
  if (permissions) projected.apiKeyPermissions = permissions;
  for (const field of ["message", "note"] as const) {
    if (typeof record[field] === "string") projected[field] = record[field];
  }
  return projected;
}

export function projectOpenAiToolResult(
  toolName: string,
  result: unknown
): unknown {
  const projected =
    toolName === "get_account" ? projectOpenAiAccountResult(result) : result;
  const sanitized = sanitizeOutputValue(projected, {
    toolName,
    path: "",
    textScanned: TEXTUAL_PERSONAL_DATA_OUTPUT_TOOLS.has(toolName),
  });
  return sanitized === OMIT_SANITIZED_VALUE ? null : sanitized;
}
