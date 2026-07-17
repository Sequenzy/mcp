import { isRecord } from "./common-primitives.js";
import {
  getSegmentFilterValidationError,
  collectSegmentFilterValidationErrors,
} from "./segment-validation.js";

export function validateHtmlOrBlocksArgs(
  toolName: string,
  args: Record<string, unknown>,
  options?: {
    requireContent?: boolean | undefined;
  }
): void {
  if (args.html !== undefined && args.blocks !== undefined) {
    throw new Error(
      `Provide either \`html\` or \`blocks\` when calling \`${toolName}\`, not both.`
    );
  }

  if (args.blocks !== undefined && !Array.isArray(args.blocks)) {
    throw new Error(
      `\`blocks\` must be an array when calling \`${toolName}\`.`
    );
  }

  if (
    options?.requireContent &&
    args.html === undefined &&
    args.blocks === undefined
  ) {
    throw new Error(
      `Provide either \`html\` or \`blocks\` when calling \`${toolName}\`.`
    );
  }
}

export function validateLabelsArg(
  toolName: string,
  args: Record<string, unknown>
): void {
  if (args.labels === undefined) {
    return;
  }

  if (!Array.isArray(args.labels)) {
    throw new Error(
      `\`labels\` must be an array when calling \`${toolName}\`.`
    );
  }

  if (
    args.labels.some(
      (label) => typeof label !== "string" || label.trim().length === 0
    )
  ) {
    throw new Error(
      `\`labels\` must contain only non-empty strings when calling \`${toolName}\`.`
    );
  }
}

export function validateCreateSegmentArgs(args: Record<string, unknown>): void {
  const hasFilters = args.filters !== undefined;
  const hasRoot = args.root !== undefined;

  if (hasFilters && hasRoot) {
    throw new Error(
      "Provide either `filters` or `root` when calling `create_segment`, not both."
    );
  }

  if (!hasFilters && !hasRoot) {
    throw new Error(
      "Provide either `filters` or `root` when calling `create_segment`."
    );
  }

  if (hasFilters) {
    if (!Array.isArray(args.filters)) {
      throw new Error(
        "`filters` must be an array when calling `create_segment`."
      );
    }

    if (args.filters.length === 0) {
      throw new Error(
        "`filters` must include at least one filter when calling `create_segment`."
      );
    }
  }

  if (hasRoot && (typeof args.root !== "object" || args.root === null)) {
    throw new Error("`root` must be an object when calling `create_segment`.");
  }

  const validationErrors = hasFilters
    ? (args.filters as unknown[]).flatMap((filter) => {
        const error = getSegmentFilterValidationError(filter);
        return error ? [error] : [];
      })
    : collectSegmentFilterValidationErrors(args.root);

  if (validationErrors.length > 0) {
    throw new Error(
      validationErrors[0] ?? "Invalid segment filter in `create_segment`."
    );
  }
}

export function validateUpdateSegmentArgs(args: Record<string, unknown>): void {
  const hasFilters = args.filters !== undefined;
  const hasRoot = args.root !== undefined;

  if (hasFilters && hasRoot) {
    throw new Error(
      "Provide either `filters` or `root` when calling `update_segment`, not both."
    );
  }

  if (
    args.name === undefined &&
    args.filterJoinOperator === undefined &&
    !hasFilters &&
    !hasRoot
  ) {
    throw new Error(
      "Provide at least one of `name`, `filters`, `root`, or `filterJoinOperator` when calling `update_segment`."
    );
  }

  if (hasFilters) {
    if (!Array.isArray(args.filters)) {
      throw new Error(
        "`filters` must be an array when calling `update_segment`."
      );
    }

    if (args.filters.length === 0) {
      throw new Error(
        "`filters` must include at least one filter when calling `update_segment`."
      );
    }
  }

  if (hasRoot && (typeof args.root !== "object" || args.root === null)) {
    throw new Error("`root` must be an object when calling `update_segment`.");
  }

  const validationErrors = hasFilters
    ? (args.filters as unknown[]).flatMap((filter) => {
        const error = getSegmentFilterValidationError(filter);
        return error ? [error] : [];
      })
    : hasRoot
      ? collectSegmentFilterValidationErrors(args.root)
      : [];

  if (validationErrors.length > 0) {
    throw new Error(
      validationErrors[0] ?? "Invalid segment filter in `update_segment`."
    );
  }
}

export const COMPANY_UPDATE_FIELDS = [
  "name",
  "description",
  "logoUrl",
  "founderName",
  "primaryColor",
  "brandColors",
  "valueProps",
  "testimonials",
  "toneVoice",
  "companyContext",
  "emailLengthPreference",
  "socialLinks",
  "privacyPolicyUrl",
  "termsUrl",
  "address",
  "language",
  "pricing",
  "fontFamily",
  "emailDirection",
  "fromEmail",
  "fromName",
  "replyTo",
  "replyToName",
  "replyTrackingEnabled",
  "replyTrackingDomainMode",
  "forwardReplies",
] as const;

export function validateOptionalObjectArg(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): void {
  if (args[key] !== undefined && !isRecord(args[key])) {
    throw new Error(
      `\`${key}\` must be an object when calling \`${toolName}\`.`
    );
  }
}

export function validateOptionalArrayArg(
  toolName: string,
  args: Record<string, unknown>,
  key: string
): void {
  if (args[key] !== undefined && !Array.isArray(args[key])) {
    throw new Error(
      `\`${key}\` must be an array when calling \`${toolName}\`.`
    );
  }
}

export function buildUpdateCompanyBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  const allowedKeys = new Set(["companyId", ...COMPANY_UPDATE_FIELDS]);
  const unsupportedKeys = Object.keys(args).filter(
    (key) => !allowedKeys.has(key)
  );

  if (unsupportedKeys.length > 0) {
    throw new Error(
      `\`update_company\` accepts only editable company settings. Unsupported field${unsupportedKeys.length === 1 ? "" : "s"}: ${unsupportedKeys.map((key) => `\`${key}\``).join(", ")}.`
    );
  }

  const body: Record<string, unknown> = {};
  for (const key of COMPANY_UPDATE_FIELDS) {
    if (args[key] !== undefined) {
      body[key] = args[key];
    }
  }

  if (Object.keys(body).length === 0) {
    throw new Error(
      `Provide at least one of ${COMPANY_UPDATE_FIELDS.map((key) => `\`${key}\``).join(", ")} when calling \`update_company\`.`
    );
  }

  for (const key of [
    "name",
    "description",
    "logoUrl",
    "founderName",
    "primaryColor",
    "toneVoice",
    "companyContext",
    "emailLengthPreference",
    "privacyPolicyUrl",
    "termsUrl",
    "address",
    "language",
    "fontFamily",
    "emailDirection",
    "fromEmail",
    "fromName",
    "replyTo",
    "replyToName",
    "replyTrackingDomainMode",
  ]) {
    if (args[key] !== undefined && typeof args[key] !== "string") {
      throw new Error(
        `\`${key}\` must be a string when calling \`update_company\`.`
      );
    }
  }

  validateOptionalObjectArg("update_company", args, "brandColors");
  validateOptionalObjectArg("update_company", args, "socialLinks");
  validateOptionalObjectArg("update_company", args, "pricing");
  validateOptionalArrayArg("update_company", args, "valueProps");
  validateOptionalArrayArg("update_company", args, "testimonials");

  for (const key of ["replyTrackingEnabled", "forwardReplies"] as const) {
    if (args[key] !== undefined && typeof args[key] !== "boolean") {
      throw new Error(
        `\`${key}\` must be a boolean when calling \`update_company\`.`
      );
    }
  }

  if (
    args.replyTrackingDomainMode !== undefined &&
    args.replyTrackingDomainMode !== "sequenzy" &&
    args.replyTrackingDomainMode !== "custom"
  ) {
    throw new Error(
      "`replyTrackingDomainMode` must be `sequenzy` or `custom` when calling `update_company`."
    );
  }

  if (
    typeof args.primaryColor === "string" &&
    !/^#[0-9a-f]{6}$/i.test(args.primaryColor.trim())
  ) {
    throw new Error(
      "`primaryColor` must be a 6-digit hex color such as #f97316 when calling `update_company`."
    );
  }

  for (const key of ["fromEmail", "replyTo"] as const) {
    const value = args[key];
    if (
      typeof value === "string" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
    ) {
      throw new Error(
        `\`${key}\` must be a valid email address when calling \`update_company\`.`
      );
    }
  }
  if (args.fromName !== undefined && args.fromEmail === undefined) {
    throw new Error(
      "`fromName` requires `fromEmail` when calling `update_company`."
    );
  }
  if (args.replyToName !== undefined && args.replyTo === undefined) {
    throw new Error(
      "`replyToName` requires `replyTo` when calling `update_company`."
    );
  }

  return body;
}

export const sequenceEmailStepIdentityKeys = [
  "senderProfileId",
  "fromEmail",
  "fromName",
  "replyProfileId",
  "replyTo",
  "replyToName",
] as const;

export function hasSequenceEmailStepIdentityArgs(
  step: Record<string, unknown>
): boolean {
  return sequenceEmailStepIdentityKeys.some((key) => step[key] !== undefined);
}

export function isSequenceEmailPathStep(
  step: Record<string, unknown>
): boolean {
  if (typeof step.nodeType === "string") {
    return step.nodeType === "action_email";
  }

  return step.type === undefined || step.type === "email";
}

export function validateSequenceEmailStepIdentityArgs(
  toolName: string,
  location: string,
  step: Record<string, unknown>
): void {
  for (const key of sequenceEmailStepIdentityKeys) {
    const value = step[key];
    if (value !== undefined && typeof value !== "string") {
      throw new Error(
        `\`${key}\` must be a string for ${location} when calling \`${toolName}\`.`
      );
    }
  }
  if (step.senderProfileId !== undefined && step.fromEmail !== undefined) {
    throw new Error(
      `Provide either \`senderProfileId\` or \`fromEmail\` for ${location} when calling \`${toolName}\`, not both.`
    );
  }
  if (step.replyProfileId !== undefined && step.replyTo !== undefined) {
    throw new Error(
      `Provide either \`replyProfileId\` or \`replyTo\` for ${location} when calling \`${toolName}\`, not both.`
    );
  }
  if (step.replyToName !== undefined && step.replyTo === undefined) {
    throw new Error(
      `\`replyToName\` requires \`replyTo\` for ${location} when calling \`${toolName}\`.`
    );
  }
}

export function validateSequencePathStepIdentityArgs(
  toolName: string,
  location: string,
  step: Record<string, unknown>
): void {
  if (
    hasSequenceEmailStepIdentityArgs(step) &&
    !isSequenceEmailPathStep(step)
  ) {
    throw new Error(
      `Sender identity fields are only supported for email steps at ${location} when calling \`${toolName}\`.`
    );
  }

  validateSequenceEmailStepIdentityArgs(toolName, location, step);
}

export function validateSequenceEmailStepIdentityArray(
  toolName: string,
  location: string,
  value: unknown
): void {
  if (!Array.isArray(value)) return;
  value.forEach((step, index) => {
    if (isRecord(step)) {
      validateSequenceEmailStepIdentityArgs(
        toolName,
        `${location}[${index}]`,
        step
      );
    }
  });
}

export function validateSequencePathStepIdentityArray(
  toolName: string,
  location: string,
  value: unknown
): void {
  if (!Array.isArray(value)) return;
  value.forEach((step, index) => {
    if (isRecord(step)) {
      validateSequencePathStepIdentityArgs(
        toolName,
        `${location}[${index}]`,
        step
      );
    }
  });
}

export function validateUpdateSequenceStepIdentities(
  args: Record<string, unknown>
): void {
  const toolName = "update_sequence";
  validateSequenceEmailStepIdentityArray(toolName, "emails", args.emails);
  validateSequenceEmailStepIdentityArray(toolName, "steps", args.steps);

  if (isRecord(args.insertSteps)) {
    validateSequencePathStepIdentityArray(
      toolName,
      "insertSteps.steps",
      args.insertSteps.steps
    );
  }

  if (!isRecord(args.branch)) return;
  if (Array.isArray(args.branch.branches)) {
    args.branch.branches.forEach((branch, branchIndex) => {
      if (isRecord(branch)) {
        validateSequencePathStepIdentityArray(
          toolName,
          `branch.branches[${branchIndex}].steps`,
          branch.steps
        );
      }
    });
  }
  validateSequencePathStepIdentityArray(
    toolName,
    "branch.elseSteps",
    args.branch.elseSteps
  );
}

export function buildUpdateSequenceBody(
  args: Record<string, unknown>
): Record<string, unknown> {
  if (args.fromEmail !== undefined && args.senderProfileId !== undefined) {
    throw new Error(
      "Provide either `fromEmail` or `senderProfileId` when calling `update_sequence`, not both."
    );
  }
  if (args.replyTo !== undefined && args.replyProfileId !== undefined) {
    throw new Error(
      "Provide either `replyTo` or `replyProfileId` when calling `update_sequence`, not both."
    );
  }
  if (args.fromName !== undefined && args.fromEmail === undefined) {
    throw new Error(
      "`fromName` requires `fromEmail` when calling `update_sequence`."
    );
  }
  if (args.replyToName !== undefined && args.replyTo === undefined) {
    throw new Error(
      "`replyToName` requires `replyTo` when calling `update_sequence`."
    );
  }
  if (
    args.clearEnrollmentFieldPath === true &&
    args.enrollmentFieldPath !== undefined
  ) {
    throw new Error(
      "Provide either `enrollmentFieldPath` or `clearEnrollmentFieldPath` when calling `update_sequence`, not both."
    );
  }
  if (args.clearSendingWindow === true && args.sendingWindow !== undefined) {
    throw new Error(
      "Provide either `sendingWindow` or `clearSendingWindow` when calling `update_sequence`, not both."
    );
  }
  if (args.clearBccEmails === true && args.bccEmails !== undefined) {
    throw new Error(
      "Provide either `bccEmails` or `clearBccEmails` when calling `update_sequence`, not both."
    );
  }
  if (args.branch !== undefined && args.insertSteps !== undefined) {
    throw new Error(
      "Provide either `branch` or `insertSteps` when calling `update_sequence`, not both."
    );
  }
  validateUpdateSequenceStepIdentities(args);

  const body = { ...args };
  delete body.clearEnrollmentFieldPath;
  delete body.clearSendingWindow;
  delete body.clearBccEmails;

  if (args.clearEnrollmentFieldPath === true) {
    body.enrollmentFieldPath = null;
  }
  if (args.clearSendingWindow === true) {
    body.sendingWindow = null;
  }
  if (args.clearBccEmails === true) {
    body.bccEmails = null;
  }

  return body;
}
