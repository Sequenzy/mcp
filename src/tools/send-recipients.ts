/**
 * Recipient parsing for `send_email`.
 *
 * The transactional send API accepts `to`, `cc`, and `bcc` as either a single
 * address or an array of up to 50, and a transactional send delivers ONE email
 * with a shared visible recipient list. Looping one single-recipient send per
 * address is not the same thing: it produces N separate emails and no true CC.
 */

/** Mirrors the `maxItems: 50` cap on `/api/v1/transactional/send`. */
export const MAX_SEND_RECIPIENTS = 50;

export type SendRecipientField = "to" | "cc" | "bcc";

/**
 * Read a recipient argument as the API's `string | string[]` shape.
 *
 * A single address stays a bare string on the wire so existing callers and
 * response echoes are unchanged. Arrays are trimmed and de-duplicated
 * case-insensitively; an array that empties out is treated as absent, which
 * keeps `cc: []` from reaching the API as a meaningless field.
 */
export function parseSendRecipients(
  args: Record<string, unknown>,
  key: SendRecipientField
): string | string[] | undefined {
  const value = args[key];
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `\`${key}\` must be an email address or an array of email addresses when calling \`send_email\`.`
    );
  }

  if (value.length > MAX_SEND_RECIPIENTS) {
    throw new Error(
      `\`${key}\` accepts at most ${MAX_SEND_RECIPIENTS} email addresses when calling \`send_email\`.`
    );
  }

  const seen = new Set<string>();
  const addresses: string[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      throw new Error(
        `\`${key}\` item ${index + 1} must be an email address when calling \`send_email\`.`
      );
    }

    const trimmed = entry.trim();
    if (trimmed.length === 0) {
      throw new Error(
        `\`${key}\` item ${index + 1} must be a non-empty email address when calling \`send_email\`.`
      );
    }

    const lowered = trimmed.toLowerCase();
    if (seen.has(lowered)) return;
    seen.add(lowered);
    addresses.push(trimmed);
  });

  return addresses.length > 0 ? addresses : undefined;
}

export function countSendRecipients(
  value: string | string[] | undefined
): number {
  if (value === undefined) return 0;
  return typeof value === "string" ? 1 : value.length;
}

function recipientValues(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

function preserveRecipientShape(
  original: string | string[] | undefined,
  accepted: string[]
): string | string[] | undefined {
  if (accepted.length === 0) return undefined;
  return typeof original === "string" ? accepted[0] : accepted;
}

/** Match the REST API's to > cc > bcc cross-field deduplication order. */
export function dedupeSendRecipientFields(input: {
  to: string | string[] | undefined;
  cc: string | string[] | undefined;
  bcc: string | string[] | undefined;
}): {
  to: string | string[] | undefined;
  cc: string | string[] | undefined;
  bcc: string | string[] | undefined;
} {
  const seen = new Set(
    recipientValues(input.to).map((address) => address.toLowerCase())
  );
  const cc = recipientValues(input.cc).filter((address) => {
    const lowered = address.toLowerCase();
    if (seen.has(lowered)) return false;
    seen.add(lowered);
    return true;
  });
  const bcc = recipientValues(input.bcc).filter((address) => {
    const lowered = address.toLowerCase();
    if (seen.has(lowered)) return false;
    seen.add(lowered);
    return true;
  });

  return {
    to: input.to,
    cc: preserveRecipientShape(input.cc, cc),
    bcc: preserveRecipientShape(input.bcc, bcc),
  };
}

/**
 * Marketing mode creates or links a subscriber, honors suppression, and emits
 * per-recipient unsubscribe headers, none of which have a meaning for a shared
 * recipient list. The API rejects the combination; failing here says why and
 * names the fix instead of surfacing a bare 400.
 */
export function assertSendRecipientPolicy(input: {
  emailType: string | undefined;
  to: string | string[] | undefined;
  cc: string | string[] | undefined;
  bcc: string | string[] | undefined;
  subscriberExternalId: unknown;
}): void {
  const toCount = countSendRecipients(input.to);
  const ccCount = countSendRecipients(input.cc);
  const bccCount = countSendRecipients(input.bcc);
  const isMultiRecipient = toCount > 1 || ccCount > 0 || bccCount > 0;

  if (input.emailType === "marketing" && isMultiRecipient) {
    throw new Error(
      "Marketing sends accept exactly one `to` address and do not support `cc` or `bcc` when calling `send_email`. Use the default `transactional` emailType to send one email to several recipients."
    );
  }

  const hasSubscriberExternalId =
    typeof input.subscriberExternalId === "string"
      ? input.subscriberExternalId.trim().length > 0
      : input.subscriberExternalId !== undefined &&
        input.subscriberExternalId !== null;

  if (hasSubscriberExternalId && isMultiRecipient) {
    throw new Error(
      "`subscriberExternalId` is only supported for single-recipient sends when calling `send_email`. Drop it to send to several recipients, or send one email per subscriber."
    );
  }
}
