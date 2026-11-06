import { describe, expect, it } from "bun:test";

import { buildUpdateCompanyBody } from "./argument-validation";
import { accountToolDefinitions } from "./definitions/account";

describe("update_company darkModeLogoUrl", () => {
  it("passes a URL or null through to the API", () => {
    const url = "https://images.sequenzy.com/logos/c/dark.png";
    expect(buildUpdateCompanyBody({ darkModeLogoUrl: url })).toEqual({
      darkModeLogoUrl: url,
    });
    expect(buildUpdateCompanyBody({ darkModeLogoUrl: null })).toEqual({
      darkModeLogoUrl: null,
    });
  });

  it("rejects other values", () => {
    expect(() => buildUpdateCompanyBody({ darkModeLogoUrl: 42 })).toThrow(
      "`darkModeLogoUrl` must be a URL string"
    );
  });

  it("is declared as a nullable string without anyOf", () => {
    const tool = accountToolDefinitions.find(
      (definition) => definition.name === "update_company"
    );
    const property = (
      tool?.inputSchema as { properties: Record<string, { type: unknown }> }
    ).properties["darkModeLogoUrl"];
    expect(property?.type).toEqual(["string", "null"]);
  });
});
