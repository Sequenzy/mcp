import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { setSelectedCompanyId } from "./runtime";
import { createSequenzyMcpServer } from "./server";

const originalApiKey = process.env["SEQUENZY_API_KEY"];
const originalApiUrl = process.env["SEQUENZY_API_URL"];
const originalFetch = globalThis.fetch;

const COMPANY_A = { id: "company-a", name: "Magic Insights" };
const COMPANY_B = { id: "company-b", name: "CMS Brew" };

interface RecordedRequest {
  url: string;
  companyIdHeader: string | null;
}

/**
 * Stubs the Sequenzy API for the account lookups the account tools make, and
 * records the `x-company-id` header each call carried so tests can assert
 * which company a parameterless tool call actually targeted.
 */
function stubApi(options: { companies?: Array<{ id: string; name: string }> }) {
  const requests: RecordedRequest[] = [];
  const companies = options.companies ?? [COMPANY_A, COMPANY_B];

  globalThis.fetch = (async (
    input: string | URL | Request,
    init?: RequestInit
  ) => {
    const request = new Request(input as never, init);
    const companyIdHeader = request.headers.get("x-company-id");
    requests.push({ url: request.url, companyIdHeader });

    // The real API rejects a company the key cannot reach, which is what a
    // deleted company becomes.
    if (
      companyIdHeader !== null &&
      !companies.some((company) => company.id === companyIdHeader)
    ) {
      return Response.json(
        { error: "Access denied to the requested company" },
        { status: 403 }
      );
    }

    return Response.json({
      success: true,
      user: { id: "user-1" },
      companies,
      currentCompanyId: companies[0]?.id ?? null,
    });
  }) as unknown as typeof fetch;

  return requests;
}

/** A stdio-shaped server: no host-provided per-request context. */
async function connectStdioShapedClient() {
  const server = createSequenzyMcpServer();
  const client = new Client({ name: "test", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return { client, server };
}

function readToolResult(result: unknown): Record<string, unknown> {
  const content = (result as { content?: Array<{ text?: string }> }).content;
  return JSON.parse(content?.[0]?.text ?? "{}") as Record<string, unknown>;
}

describe("createSequenzyMcpServer without a host request context", () => {
  beforeEach(() => {
    process.env["SEQUENZY_API_KEY"] = "seq_user_test_key";
    process.env["SEQUENZY_API_URL"] = "https://api.example.com";
    setSelectedCompanyId(null);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env["SEQUENZY_API_KEY"];
    } else {
      process.env["SEQUENZY_API_KEY"] = originalApiKey;
    }
    if (originalApiUrl === undefined) {
      delete process.env["SEQUENZY_API_URL"];
    } else {
      process.env["SEQUENZY_API_URL"] = originalApiUrl;
    }
    globalThis.fetch = originalFetch;
    setSelectedCompanyId(null);
  });

  it("keeps the company selected by select_company for later tool calls", async () => {
    const requests = stubApi({});
    const { client, server } = await connectStdioShapedClient();

    try {
      await client.callTool({
        name: "select_company",
        arguments: { companyId: COMPANY_B.id },
      });

      const account = readToolResult(
        await client.callTool({ name: "get_account", arguments: {} })
      );
      expect(account["selectedCompanyId"]).toBe(COMPANY_B.id);

      // The selection has to reach the API too, otherwise a parameterless call
      // silently runs against the key's first company.
      await client.callTool({ name: "list_sequences", arguments: {} });
      const sequenceRequest = requests.find((request) =>
        request.url.includes("/api/v1/sequences")
      );
      expect(sequenceRequest?.companyIdHeader).toBe(COMPANY_B.id);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("clears a selection whose company is no longer available", async () => {
    stubApi({ companies: [COMPANY_B] });
    setSelectedCompanyId(COMPANY_A.id);
    const { client, server } = await connectStdioShapedClient();

    try {
      const account = readToolResult(
        await client.callTool({ name: "get_account", arguments: {} })
      );

      expect(account["selectedCompanyId"]).toBe(COMPANY_B.id);
      expect(account["note"]).toContain(COMPANY_A.id);

      // The stale selection must be gone, not just omitted from this response.
      const followUp = readToolResult(
        await client.callTool({ name: "get_account", arguments: {} })
      );
      expect(followUp["selectedCompanyId"]).toBe(COMPANY_B.id);
      expect(followUp["note"]).toBeUndefined();
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("can switch away from a selected company that was deleted", async () => {
    stubApi({ companies: [COMPANY_B] });
    setSelectedCompanyId(COMPANY_A.id);
    const { client, server } = await connectStdioShapedClient();

    try {
      // The recovery path must not send the dead company on its own lookup,
      // or it fails with the error it is supposed to resolve.
      const selected = readToolResult(
        await client.callTool({
          name: "select_company",
          arguments: { companyId: COMPANY_B.id },
        })
      );

      expect(selected["companyId"]).toBe(COMPANY_B.id);
      expect(selected["success"]).toBe(true);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
