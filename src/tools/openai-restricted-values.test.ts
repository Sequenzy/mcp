import { describe, expect, it } from "bun:test";

import {
  buildMcpErrorResult,
  formatMcpError,
  RestrictedPersonalDataError,
} from "../error-output.js";

import {
  assertOpenAiInputPolicy,
  projectOpenAiToolResult,
} from "./openai-profile.js";

function blockedCategory(
  toolName: string,
  args: Record<string, unknown>
): string | undefined {
  try {
    assertOpenAiInputPolicy(toolName, args);
    return undefined;
  } catch (error) {
    if (error instanceof RestrictedPersonalDataError) return error.category;
    throw error;
  }
}

describe("OpenAI restricted values", () => {
  it("blocks a bare Social Security number under any attribute name", () => {
    for (const key of ["ss_number", "gov_id", "id_number", "identifier"]) {
      expect({
        key,
        category: blockedCategory("update_subscriber", {
          email: "jane@example.com",
          customAttributes: { [key]: "123-45-6789" },
        }),
      }).toEqual({ key, category: "government identifiers" });
    }
  });

  it("blocks labelled identifiers written without a separator", () => {
    for (const content of [
      "SSN 123-45-6789",
      "Social security number 123456789",
      "passport no. X1234567",
    ]) {
      expect({
        content,
        category: blockedCategory("add_subscriber", {
          email: "jane@example.com",
          customAttributes: { note: content },
        }),
      }).toEqual({ content, category: "government identifiers" });
    }
  });

  it("blocks Luhn-valid card numbers but not phone numbers or order IDs", () => {
    for (const card of [
      "4242 4242 4242 4242",
      "5555-5555-5555-4444",
      "378282246310005",
    ]) {
      expect({
        card,
        category: blockedCategory("trigger_subscriber_event", {
          email: "jane@example.com",
          event: "purchase",
          properties: { reference: card },
        }),
      }).toEqual({ card, category: "payment or financial-account data" });
    }
    for (const value of [
      "+1 415 555 0132",
      "+44 20 7946 0958",
      "4242 4242 4242 4241",
      "ORDER-2026-10-17-0042",
      "1234567890123456",
    ]) {
      expect({
        value,
        category: blockedCategory("trigger_subscriber_event", {
          email: "jane@example.com",
          event: "purchase",
          properties: { reference: value },
        }),
      }).toEqual({ value, category: undefined });
    }
  });

  it("lets product names, topics, order numbers and loyalty cards through", () => {
    for (const value of [
      "Honda Passport 2025",
      "WD My Passport 4TB now $79",
      "Passport 2026 Edition",
      "Social Security 2.5% COLA",
      "Social Security 2026 changes",
      "INV123-45-6789",
      "SKU-123-45-6789",
      "6000 1234 5678 9012",
      "12345-6789",
    ]) {
      expect({
        value,
        category: blockedCategory("trigger_subscriber_event", {
          email: "jane@example.com",
          event: "viewed_product",
          properties: { product: value },
        }),
      }).toEqual({ value, category: undefined });
    }
  });

  it("scans contact names and tags", () => {
    for (const args of [
      { email: "jane@example.com", firstName: "SSN 123-45-6789" },
      { email: "jane@example.com", lastName: "123-45-6789" },
      { email: "jane@example.com", addTags: ["ssn: 123456789"] },
      { email: "jane@example.com", tags: ["123-45-6789"] },
    ]) {
      expect(blockedCategory("update_subscriber", args)).toBe(
        "government identifiers"
      );
    }
  });

  it("treats slug-style tags and hyphenated names as ordinary words", () => {
    for (const args of [
      {
        email: "jane@example.com",
        tags: ["race-day-2026", "passport-renewal"],
      },
      { email: "jane@example.com", addTags: ["medication-reminder"] },
      { email: "jane@example.com", addTags: ["dna-kit-buyer"] },
      { email: "jane@example.com", lastName: "Race-Smith" },
      { email: "jane@example.com", firstName: "Dna-Marie" },
    ]) {
      expect({
        args,
        category: blockedCategory("update_subscriber", args),
      }).toEqual({ args, category: undefined });
    }
    const listed = projectOpenAiToolResult("list_tags", {
      tags: [{ id: "t1", name: "race-day-2026" }, "disability-awareness"],
    }) as { tags: unknown[] };
    expect(listed.tags).toEqual([
      { id: "t1", name: "race-day-2026" },
      "disability-awareness",
    ]);
  });

  it("scans an id or externalId inside free-form data", () => {
    expect(
      blockedCategory("add_subscriber", {
        email: "jane@example.com",
        customAttributes: { id: "123-45-6789" },
      })
    ).toBe("government identifiers");
    expect(
      blockedCategory("trigger_subscriber_event", {
        email: "jane@example.com",
        event: "signup",
        properties: { externalId: "SSN 123456789" },
      })
    ).toBe("government identifiers");
  });

  it("keeps opaque identifiers in results while redacting restricted text", () => {
    const projected = projectOpenAiToolResult("search_subscribers", {
      subscribers: [
        {
          id: "123-45-6789",
          externalId: "4111111111111111",
          email: "jane@example.com",
          firstName: "SSN 123-45-6789",
        },
      ],
    }) as { subscribers: Record<string, unknown>[] };
    const [subscriber] = projected.subscribers;
    expect(subscriber?.id).toBe("123-45-6789");
    expect(subscriber?.externalId).toBe("4111111111111111");
    expect(subscriber?.firstName).not.toBe("SSN 123-45-6789");
  });

  it("leaves authored campaign copy alone", () => {
    expect(
      blockedCategory("create_campaign", {
        name: "Security awareness",
        subject: "Social security changes in 2027",
        html: "<p>Order 123-45-6789 and card 4242 4242 4242 4242 are examples.</p>",
      })
    ).toBeUndefined();
  });

  it("tells the model to stop instead of retrying under another field", () => {
    const error = new RestrictedPersonalDataError(
      "government identifiers",
      "update_subscriber.customAttributes.ssn"
    );
    const result = buildMcpErrorResult(error, {
      includeDetails: false,
      reviewedSurface: true,
    });
    expect(result.error.code).toBe("RESTRICTED_PERSONAL_DATA");
    expect(result.error.message).toContain("government identifiers");
    expect(JSON.stringify(result)).toContain("Do not retry");

    const text = formatMcpError(error, {
      includeDetails: false,
      reviewedSurface: true,
    });
    expect(text).toContain("Restricted personal data rejected");
    expect(text).not.toContain("retry the request with corrected input");
  });
});
