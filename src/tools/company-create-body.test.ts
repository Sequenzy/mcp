import { describe, expect, it } from "bun:test";

import { buildCreateCompanyBody } from "./argument-validation";

describe("create_company request body", () => {
  it("keeps the existing domain request shape", () => {
    expect(buildCreateCompanyBody({ domain: "acme.com" })).toEqual({
      domain: "acme.com",
    });
    // Forwarded untouched, exactly as the tool always sent them.
    expect(
      buildCreateCompanyBody({ domain: " acme.com ", name: " Acme " })
    ).toEqual({ domain: " acme.com ", name: " Acme " });
  });

  // The tool used to forward any domain string, blank included, and the API
  // accepted it. That shape must keep reaching the API unchanged.
  it("keeps forwarding a blank domain without noWebsite", () => {
    expect(buildCreateCompanyBody({ domain: "" })).toEqual({ domain: "" });
    expect(buildCreateCompanyBody({ domain: "  " })).toEqual({ domain: "  " });
  });

  it("uses the domain when both a domain and noWebsite are sent", () => {
    expect(
      buildCreateCompanyBody({ noWebsite: true, domain: "acme.com" })
    ).toEqual({ domain: "acme.com" });
  });

  it("builds a no-website request with welcome context", () => {
    expect(
      buildCreateCompanyBody({
        noWebsite: true,
        name: "Prelaunch App",
        description: "Meal plans for nurses.",
        withWelcomeSequence: true,
      })
    ).toEqual({
      noWebsite: true,
      name: "Prelaunch App",
      description: "Meal plans for nurses.",
      withWelcomeSequence: true,
    });
  });

  it("rejects missing domain, missing name and wrong types", () => {
    for (const args of [
      {},
      { name: "Acme" },
      { noWebsite: true },
      { noWebsite: true, name: "  " },
      { noWebsite: "yes", name: "Acme" },
      { domain: 42 },
      { domain: "acme.com", withWelcomeSequence: "true" },
    ]) {
      expect(() => buildCreateCompanyBody(args)).toThrow();
    }
  });
});
