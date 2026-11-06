import { parseRetryAfter } from "./error-metadata.js";

/**
 * Reads that land on a deploy swap or a proxy hiccup get a short retry, so a
 * second of 502s while the API container is replaced does not fail a command.
 * Only GET is retried: a write can have side effects (a send, a contact
 * update), so its failure still reaches the caller, who decides whether to
 * repeat it with the same request key.
 */
const TRANSIENT_STATUSES = new Set([502, 503, 504]);
export const TRANSIENT_RETRY_DELAYS_MS: readonly number[] = [250, 1000, 2000];
// A longer Retry-After is a real throttle or maintenance window, not a swap.
const MAX_RETRY_AFTER_MS = 5000;

export interface TransientRetryOptions {
  delaysMs?: readonly number[];
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchWithTransientRetry(
  method: string,
  send: () => Promise<Response>,
  {
    delaysMs = TRANSIENT_RETRY_DELAYS_MS,
    sleep = defaultSleep,
  }: TransientRetryOptions = {}
): Promise<Response> {
  const retries = method === "GET" ? delaysMs.length : 0;

  for (let attempt = 0; attempt < retries; attempt += 1) {
    const delayMs = delaysMs[attempt] ?? 0;
    let response: Response;
    try {
      response = await send();
    } catch {
      await sleep(delayMs);
      continue;
    }

    if (!TRANSIENT_STATUSES.has(response.status)) return response;
    const retryAfterMs =
      (parseRetryAfter(response.headers.get("Retry-After")) ?? 0) * 1000;
    if (retryAfterMs > MAX_RETRY_AFTER_MS) return response;

    await response.body?.cancel().catch(() => undefined);
    await sleep(Math.max(delayMs, retryAfterMs));
  }

  // The last attempt, or the only one for a write, returns or throws as is.
  return send();
}
