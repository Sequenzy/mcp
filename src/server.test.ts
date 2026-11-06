import { Client, InMemoryTransport } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import { MCP_SIGNUP_URL } from "./error-output";
import { setSelectedCompanyId } from "./runtime";
import { createSequenzyMcpServer } from "./server";
import type { SequenzyMcpProfile } from "./tools/profiles";

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
async function connectStdioShapedClient(
  profile: SequenzyMcpProfile = "standard",
  options: { apiKeyMissing?: boolean } = {}
) {
  const server = createSequenzyMcpServer({ profile, ...options });
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

  it("applies OpenAI output and error policy to resource reads", async () => {
    globalThis.fetch = (async () =>
      Response.json({
        success: true,
        subscribers: [
          {
            id: "subscriber-1",
            email: "person@example.com",
            customAttributes: { plan: "pro", ssn: "111-22-3333" },
          },
        ],
        requestId: "request-private",
      })) as unknown as typeof fetch;

    const server = createSequenzyMcpServer({ profile: "openai" });
    const client = new Client({ name: "test", version: "0.0.0" });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();

    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);

    try {
      const result = await client.readResource({
        uri: "sequenzy://subscribers/recent",
      });
      const content = result.contents[0];
      if (!content || !("text" in content)) {
        throw new Error("Expected text resource");
      }
      const text = content.text;
      const payload = JSON.parse(text) as Record<string, unknown>;
      const subscribers = payload["subscribers"] as Array<
        Record<string, unknown>
      >;

      expect(payload).not.toHaveProperty("requestId");
      expect(subscribers[0]?.["customAttributes"]).toEqual({ plan: "pro" });

      globalThis.fetch = (async () =>
        Response.json(
          {
            error: "Request failed for person@example.com",
            requestId: "request-private",
          },
          { status: 500 }
        )) as unknown as typeof fetch;

      const failed = await client.readResource({
        uri: "sequenzy://campaigns/recent",
      });
      const errorContent = failed.contents[0];
      if (!errorContent || !("text" in errorContent)) {
        throw new Error("Expected text resource");
      }
      const errorText = errorContent.text;
      expect(errorText).toContain("Sequenzy server error");
      expect(errorText).not.toContain("person@example.com");
      expect(errorText).not.toContain("request-private");
      expect(errorText).not.toContain("Details:");
    } finally {
      await client.close();
      await server.close();
    }
  });
  it.each(["standard", "openai"] as const)(
    "delivers structured tool errors through the real SDK (%s)",
    async (profile) => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        return Response.json(
          {
            error: "private@example.com private backend message",
            code: "SECRET_TOKEN_ABC123456789",
            description: "private context",
            details: "private diagnostics",
          },
          { status: 429, headers: { "Retry-After": "7" } }
        );
      }) as unknown as typeof fetch;
      const { client, server } = await connectStdioShapedClient(profile);
      try {
        await client.listTools();
        const result = await client.callTool({
          name: "list_campaigns",
          arguments: { companyId: "company-b" },
        });
        expect(result.isError).toBe(true);
        expect(result.structuredContent).toMatchObject({
          success: false,
          error: {
            code:
              profile === "openai"
                ? "RATE_LIMITED"
                : "SECRET_TOKEN_ABC123456789",
            statusCode: 429,
            retryAfterSeconds: 7,
          },
        });
        expect(result.content).toMatchObject([{ type: "text" }]);
        expect(calls).toBe(1);
        if (profile === "openai") {
          expect(JSON.stringify(result)).not.toContain("private");
          expect(JSON.stringify(result)).not.toContain("SECRET_TOKEN");
        }
      } finally {
        await client.close();
        await server.close();
      }
    }
  );
});

describe("stdio server started without an API key", () => {
  beforeEach(() => {
    delete process.env["SEQUENZY_API_KEY"];
    setSelectedCompanyId(null);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env["SEQUENZY_API_KEY"];
    } else {
      process.env["SEQUENZY_API_KEY"] = originalApiKey;
    }
    globalThis.fetch = originalFetch;
  });

  it("lists tools and answers every call with signup and setup steps without calling the API", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return Response.json({});
    }) as unknown as typeof fetch;
    const { client, server } = await connectStdioShapedClient("standard", {
      apiKeyMissing: true,
    });

    try {
      expect(client.getInstructions()).toContain(MCP_SIGNUP_URL);
      expect((await client.listTools()).tools.length).toBeGreaterThan(0);

      const result = await client.callTool({
        name: "get_account",
        arguments: {},
      });
      expect(result.isError).toBe(true);
      expect(result.structuredContent).toMatchObject({
        success: false,
        error: { code: "MCP_AUTH_REQUIRED", statusCode: 401 },
      });
      const howToFix = (
        result.structuredContent as { error: { howToFix: string } }
      ).error.howToFix;
      expect(howToFix).toContain(MCP_SIGNUP_URL);
      expect(howToFix).toContain("npx @sequenzy/setup");
      expect(calls).toBe(0);
    } finally {
      await client.close();
      await server.close();
    }
  });

  it("answers every tool with the signup error, including ones that never reach the API", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return Response.json({});
    }) as unknown as typeof fetch;

    for (const profile of ["standard", "openai"] as const) {
      const { client, server } = await connectStdioShapedClient(profile, {
        apiKeyMissing: true,
      });

      try {
        const { tools } = await client.listTools();
        for (const tool of tools) {
          const result = await client.callTool({
            name: tool.name,
            arguments: {},
          });
          expect(result.isError).toBe(true);
          expect(result.structuredContent).toMatchObject({
            error: { code: "MCP_AUTH_REQUIRED" },
          });
        }
      } finally {
        await client.close();
        await server.close();
      }
    }
    expect(calls).toBe(0);
  });

  it("only mentions enabling tools on the connector outside the OpenAI surface", async () => {
    process.env["SEQUENZY_API_KEY"] = "seq_user_test_key";
    for (const [profile, expected] of [
      ["standard", true],
      ["openai", false],
    ] as const) {
      const { client, server } = await connectStdioShapedClient(profile);
      try {
        const instructions = client.getInstructions() ?? "";
        expect(instructions.includes("Sequenzy connector")).toBe(expected);
        expect(instructions).toContain(
          "update_template and update_sequence_node do not edit variant bodies."
        );
      } finally {
        await client.close();
        await server.close();
      }
    }
  });

  it("keeps signup guidance out of the instructions when a key is configured", async () => {
    process.env["SEQUENZY_API_KEY"] = "seq_user_test_key";
    const { client, server } = await connectStdioShapedClient();

    try {
      expect(client.getInstructions()).not.toContain(MCP_SIGNUP_URL);
    } finally {
      await client.close();
      await server.close();
    }
  });
});
