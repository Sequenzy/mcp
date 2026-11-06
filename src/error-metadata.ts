/** Retry hints are advisory only; parsing one never retries the request. */
export function parseRetryAfter(
  value: string | null,
  now = Date.now()
): number | undefined {
  if (!value?.trim()) return undefined;
  const normalized = value.trim();
  if (/^\d+$/.test(normalized)) {
    const seconds = Number(normalized);
    return Number.isSafeInteger(seconds) ? seconds : undefined;
  }
  // Date.parse accepts bare numbers and other non-HTTP dates. Reject those.
  if (
    !/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(
      normalized
    )
  )
    return undefined;
  const timestamp = Date.parse(normalized);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toUTCString().slice(5) !== normalized.slice(5)
  )
    return undefined;
  return Math.max(0, Math.ceil((timestamp - now) / 1000));
}

export function getErrorCode(
  code: string | undefined,
  statusCode: number | undefined,
  fallback: string
): string {
  if (code && /^[A-Z][A-Z0-9_]{1,95}$/.test(code)) return code;
  switch (statusCode) {
    case 0:
      return "NETWORK_ERROR";
    case 400:
    case 422:
      return "VALIDATION_ERROR";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    case 429:
      return "RATE_LIMITED";
    default:
      return statusCode !== undefined
        ? statusCode >= 500
          ? "SERVER_ERROR"
          : "HTTP_ERROR"
        : fallback;
  }
}
