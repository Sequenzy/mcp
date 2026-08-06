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

/**
 * Read an optional array-of-strings argument, de-duplicated and trimmed.
 *
 * A bare string is accepted as a one-item list: models routinely pass
 * `sequenceId: "seq_1"` for an array parameter, and silently dropping it would
 * widen the caller's scope to every sequence instead of failing loudly.
 */
export function optionalStringArray(
  toolName: string,
  record: Record<string, unknown>,
  key: string
): string[] {
  const value = record[key];
  if (value === undefined || value === null) {
    return [];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? [trimmed] : [];
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `\`${key}\` must be an array of strings when calling \`${toolName}\`.`
    );
  }

  const values: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(
        `\`${key}\` item ${index + 1} must be a string when calling \`${toolName}\`.`
      );
    }

    const trimmed = entry.trim();
    if (trimmed.length > 0 && !values.includes(trimmed)) {
      values.push(trimmed);
    }
  });

  return values;
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
