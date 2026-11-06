import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, describe, expect, it } from "bun:test";

import {
  APP_MIME_TYPE,
  APP_RESOURCE_URI,
  readAppResource,
} from "./app-resource";
import { setSelectedCompanyId } from "./runtime";
import { createSequenzyMcpServer } from "./server";
import { handleAppTools } from "./tools/handlers/apps";
import { handleToolCall, tools } from "./tools/index";
import { getToolsForProfile } from "./tools/profiles";

const originalFetch = globalThis.fetch;
const originalKey = process.env["SEQUENZY_API_KEY"];
const originalUrl = process.env["SEQUENZY_API_URL"];
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env["SEQUENZY_API_KEY"];
  else process.env["SEQUENZY_API_KEY"] = originalKey;
  if (originalUrl === undefined) delete process.env["SEQUENZY_API_URL"];
  else process.env["SEQUENZY_API_URL"] = originalUrl;
  setSelectedCompanyId(null);
});

function stub(body: unknown, status = 200) {
  process.env["SEQUENZY_API_KEY"] = "test-key";
  process.env["SEQUENZY_API_URL"] = "https://api.example.test";
  const requests: Request[] = [];
  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    requests.push(new Request(input as never, init));
    return Response.json(body, { status });
  }) as typeof fetch;
  return requests;
}

describe("MCP Apps", () => {
  it("leaves other handlers alone", async () => {
    expect(await handleAppTools("get_account", {})).toEqual({
      handled: false,
      result: undefined,
    });
  });

  it("requires an explicit company and sequence ID, and rejects unknown arguments", async () => {
    const requests = stub({});
    for (const [name, args] of [
      ["preview_sequence", {}],
      ["preview_sequence", { companyId: " " }],
      ["preview_sequence", { companyId: 12 }],
      ["preview_sequence", { companyId: "a", filePath: "/etc/passwd" }],
      ["preview_sequence", { companyId: "a" }],
    ] as const) {
      expect((await handleToolCall(name, args)).isError).toBe(true);
    }
    expect(requests).toHaveLength(0);
  });

  it("reads only the requested sequence with the pinned company", async () => {
    const record = {
      id: "batch/a",
      status: "draft",
      nodes: [],
      edges: [],
      emails: [],
    };
    const requests = stub({ success: true, sequence: record });
    setSelectedCompanyId("company-b");
    const result = await handleToolCall("preview_sequence", {
      companyId: "company-a",
      sequenceId: "batch/a",
    });
    expect(result.structuredContent).toMatchObject({
      mode: "sequence",
      companyId: "company-a",
      sequenceId: "batch/a",
      sequence: record,
    });
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe("GET");
    expect(requests[0].headers.get("x-company-id")).toBe("company-a");
    expect(requests[0].url).toEndWith("/api/v1/sequences/batch%2Fa");
  });

  it("preserves API auth, cross-company, not-found and rate-limit failures without retries", async () => {
    for (const status of [401, 403, 404, 429, 500]) {
      const requests = stub(
        { success: false, error: "Request rejected" },
        status
      );
      const result = await handleToolCall("preview_sequence", {
        companyId: "a",
        sequenceId: "b",
      });
      expect(result.isError).toBe(true);
      expect(requests).toHaveLength(1);
    }
  });

  it("preserves OpenAI output projection and input policy", async () => {
    const requests = stub({
      success: true,
      sequence: { id: "i", status: "draft", apiKey: "private-secret" },
    });
    const result = await handleToolCall(
      "preview_sequence",
      { companyId: "a", sequenceId: "i" },
      { profile: "openai" }
    );
    expect(JSON.stringify(result)).not.toContain("private-secret");
    expect(requests).toHaveLength(1);
    for (const profile of ["standard", "openai"] as const) {
      for (const name of [
        "preview_sequence",
        "render_email",
        "open_image_upload",
        "monitor_subscriber_import",
      ]) {
        const tool = getToolsForProfile(tools, profile).find(
          (tool) => tool.name === name
        )!;
        expect(tool._meta).toEqual({ ui: { resourceUri: APP_RESOURCE_URI } });
        expect(tool.annotations?.readOnlyHint).toBe(true);
        expect(tool.inputSchema.type).toBe("object");
      }
    }
  });

  it("opens upload without writing and monitors only the pinned import", async () => {
    const requests = stub({
      success: true,
      import: { id: "batch/a", status: "running" },
    });
    setSelectedCompanyId("other");
    expect(
      (await handleToolCall("open_image_upload", { companyId: "a" }))
        .structuredContent
    ).toMatchObject({ mode: "upload", companyId: "a" });
    expect(requests).toHaveLength(0);
    expect(
      (
        await handleToolCall("monitor_subscriber_import", {
          companyId: "a",
          importId: "batch/a",
        })
      ).structuredContent
    ).toMatchObject({
      mode: "import",
      companyId: "a",
      importId: "batch/a",
      import: { status: "running" },
    });
    expect(requests[0].method).toBe("GET");
    expect(requests[0].headers.get("x-company-id")).toBe("a");
    expect(requests[0].url).toEndWith("/subscribers/imports/batch%2Fa");
    for (const [name, args] of [
      ["open_image_upload", {}],
      ["monitor_subscriber_import", { companyId: "a" }],
      ["open_image_upload", { companyId: "a", filename: "x" }],
    ] as const)
      expect((await handleToolCall(name, args)).isError).toBe(true);
  });

  it("does not retry import access failures", async () => {
    for (const status of [401, 403, 404, 429, 500]) {
      const requests = stub({ error: "Rejected" }, status);
      expect(
        (
          await handleToolCall("monitor_subscriber_import", {
            companyId: "a",
            importId: "b",
          })
        ).isError
      ).toBe(true);
      expect(requests).toHaveLength(1);
    }
  });

  it("serves a self-contained resource through the MCP transport", async () => {
    const server = createSequenzyMcpServer();
    const client = new Client({ name: "app-test", version: "1" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const listed = await client.listResources();
      expect(
        listed.resources.some((resource) => resource.uri === APP_RESOURCE_URI)
      ).toBe(true);
      const response = await client.readResource({ uri: APP_RESOURCE_URI });
      const content = response.contents[0];
      expect(content.mimeType).toBe(APP_MIME_TYPE);
      expect(content._meta).toEqual({
        ui: { csp: { connectDomains: [], resourceDomains: ["https:"] } },
      });
      expect("text" in content && content.text).toContain("Sequence flow");
      expect(readAppResource().contents[0].text).not.toContain(
        "/* APP_SCRIPT */"
      );
      // Hosts download the widget on every scan and render; keep it small.
      expect(readAppResource().contents[0].text.length).toBeLessThan(100_000);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("lists image origins as URLs on the OpenAI route", async () => {
    // OpenAI's tool scan fails with "_meta.ui.csp.resourceDomains entries
    // must be valid URLs" when the list contains a scheme such as "https:".
    const server = createSequenzyMcpServer({ profile: "openai" });
    const client = new Client({ name: "app-test", version: "1" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    try {
      const response = await client.readResource({ uri: APP_RESOURCE_URI });
      const csp = (
        response.contents[0]._meta as {
          ui: { csp: { connectDomains: string[]; resourceDomains: string[] } };
        }
      ).ui.csp;
      expect(csp.connectDomains).toEqual([]);
      expect(csp.resourceDomains).toContain("https://images.sequenzy.com");
      for (const domain of csp.resourceDomains) {
        const url = new URL(domain);
        expect(url.protocol).toBe("https:");
        expect(url.host).toContain(".");
        expect(url.origin).toBe(domain);
      }
    } finally {
      await client.close();
      await server.close();
    }
  });
});
