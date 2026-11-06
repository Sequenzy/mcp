/**
 * Variations results also open the MCP Apps preview, which shows each
 * variation rendered. It needs to know what they are variations of, and,
 * after generating, which ones are new so it follows only those.
 */
export type VariationsWidgetTarget =
  | { target: "campaign"; campaignId: string }
  | { target: "sequence"; sequenceId: string; emailId: string };

export function withVariationsWidget(
  result: unknown,
  target: VariationsWidgetTarget,
  args: Record<string, unknown>,
  generated = false
): Record<string, unknown> {
  const data =
    result !== null && typeof result === "object" && !Array.isArray(result)
      ? (result as Record<string, unknown>)
      : {};
  const variations = Array.isArray(data.variations) ? data.variations : [];
  return {
    ...data,
    mode: "variations",
    ...target,
    ...(typeof args.companyId === "string" && args.companyId.trim()
      ? { companyId: args.companyId }
      : {}),
    ...(generated
      ? {
          newVariationIds: variations.flatMap((variation) =>
            typeof variation?.id === "string" ? [variation.id] : []
          ),
        }
      : {}),
  };
}
