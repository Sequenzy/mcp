import { afterAll, describe, expect, it, mock } from "bun:test";

import {
  formatDefaultedCompanyNote,
  recordDefaultedCompany,
  withCompanyDefaultCollector,
} from "./company-default-notice.js";

// Bun keeps module mocks for the rest of a single-process run (`bun test` in
// this package), so the mock below spreads the real runtime and is replaced by
// it again afterwards; a partial mock breaks later files' runtime imports.
const actualRuntime = { ...(await import("./runtime.js")) };

function responseWithHeaders(headers: Record<string, string>) {
  return new Response("{}", { headers });
}

describe("company default collector", () => {
  it("captures the first defaulted company inside one collection", async () => {
    const { value, defaultedCompanyId } = await withCompanyDefaultCollector(
      async () => {
        recordDefaultedCompany(
          responseWithHeaders({
            "X-Sequenzy-Company-Id": "company-a",
            "X-Sequenzy-Company-Defaulted": "true",
          })
        );
        await Promise.resolve();
        recordDefaultedCompany(
          responseWithHeaders({
            "X-Sequenzy-Company-Id": "company-b",
            "X-Sequenzy-Company-Defaulted": "true",
          })
        );
        return 42;
      }
    );
    expect(value).toBe(42);
    expect(defaultedCompanyId).toBe("company-a");
  });

  it("ignores responses that were not defaulted and calls outside a collection", async () => {
    recordDefaultedCompany(
      responseWithHeaders({
        "X-Sequenzy-Company-Id": "company-a",
        "X-Sequenzy-Company-Defaulted": "true",
      })
    );
    const { defaultedCompanyId } = await withCompanyDefaultCollector(
      async () => {
        recordDefaultedCompany(
          responseWithHeaders({ "X-Sequenzy-Company-Id": "company-a" })
        );
      }
    );
    expect(defaultedCompanyId).toBeNull();
  });

  it("keeps concurrent tool calls apart", async () => {
    const run = (companyId: string, delay: number) =>
      withCompanyDefaultCollector(async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        recordDefaultedCompany(
          responseWithHeaders({
            "X-Sequenzy-Company-Id": companyId,
            "X-Sequenzy-Company-Defaulted": "true",
          })
        );
      });
    const [first, second] = await Promise.all([
      run("company-a", 10),
      run("company-b", 1),
    ]);
    expect(first.defaultedCompanyId).toBe("company-a");
    expect(second.defaultedCompanyId).toBe("company-b");
  });
});

describe("tool results", () => {
  afterAll(async () => {
    await mock.module("./runtime.js", () => actualRuntime);
  });

  it("adds a separate note block and leaves structured content unchanged", async () => {
    const apiResult = { success: true, campaigns: [] };
    let defaulted = true;
    await mock.module("./runtime.js", () => ({
      ...actualRuntime,
      apiRequest: async () => {
        recordDefaultedCompany(
          responseWithHeaders(
            defaulted
              ? {
                  "X-Sequenzy-Company-Id": "company-default",
                  "X-Sequenzy-Company-Defaulted": "true",
                }
              : { "X-Sequenzy-Company-Id": "company-default" }
          )
        );
        return apiResult;
      },
      apiUploadRequest: async () => undefined,
      areLocalFileUploadsEnabled: () => false,
      getSelectedCompanyId: () => null,
      setSelectedCompanyId: () => undefined,
    }));
    const { handleToolCall } = await import("./tools/index.js");

    const result = await handleToolCall("list_campaigns", {});
    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(2);
    expect(result.content[0]?.text).toBe(JSON.stringify(apiResult, null, 2));
    expect(result.content[1]?.text).toBe(
      formatDefaultedCompanyNote("company-default")
    );
    expect(result.structuredContent).toMatchObject(apiResult);
    expect(JSON.stringify(result.structuredContent)).not.toContain(
      "company-default"
    );

    defaulted = false;
    const explicit = await handleToolCall("list_campaigns", {});
    expect(explicit.content).toHaveLength(1);
  });
});
