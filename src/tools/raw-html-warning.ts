import { rawHtmlContentWarning } from "./descriptions.js";

const RAW_HTML_AUTHORING_TOOLS = new Set([
  "create_campaign",
  "update_campaign",
  "create_template",
  "update_template",
  "set_template_localization",
  "create_transactional_email",
  "update_transactional_email",
  "create_sequence",
  "update_sequence",
  "update_sequence_node",
  "update_sequence_nodes",
  "insert_sequence_step",
  "update_ab_test_variant",
  "create_ab_test",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function containsRawHtml(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(containsRawHtml);
  }
  if (!isRecord(value)) {
    return false;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      (key === "html" || key === "htmlContent") &&
      typeof child === "string" &&
      child.trim().length > 0
    ) {
      return true;
    }
    if (containsRawHtml(child)) {
      return true;
    }
  }
  return false;
}

export function addRawHtmlWarning(
  toolName: string,
  args: Record<string, unknown>,
  result: unknown
): unknown {
  if (
    !RAW_HTML_AUTHORING_TOOLS.has(toolName) ||
    !containsRawHtml(args) ||
    !isRecord(result)
  ) {
    return result;
  }

  const existingWarnings = Array.isArray(result["warnings"])
    ? result["warnings"].filter(
        (warning): warning is string => typeof warning === "string"
      )
    : [];
  return {
    ...result,
    warnings: [...new Set([...existingWarnings, rawHtmlContentWarning])],
  };
}
