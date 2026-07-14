export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function optionalString(
  record: Record<string, unknown>,
  key: string
): string | undefined {
  const value = record[key];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function requiredString(
  toolName: string,
  record: Record<string, unknown>,
  key: string
): string {
  const value = optionalString(record, key);
  if (value === undefined) {
    throw new Error(`\`${key}\` is required when calling \`${toolName}\`.`);
  }

  return value;
}
