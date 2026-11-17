import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, mock } from "bun:test";

import type { Tool } from "../mcp-types";
import * as runtime from "../runtime.js";

// The package suite runs every test file in one process, and other files mock
// `../runtime.js` with local uploads switched off. Own the flag here so these
// tests see the connection type they set, whatever ran before.
const actualRuntime = { ...runtime };
let localFileUploads = false;
await mock.module("../runtime.js", () => ({
  ...actualRuntime,
  areLocalFileUploadsEnabled: () => localFileUploads,
}));

const { buildUpdateCompanyBody } = await import("./argument-validation");
const { sendUpdateCompany } = await import("./company-update");
const { accountToolDefinitions } = await import("./definitions/account");
const { withOpenAiToolProfile } = await import("./openai-profile");

function updateCompanyProperties() {
  const tool = accountToolDefinitions.find(
    (definition) => definition.name === "update_company"
  );
  return (
    tool?.inputSchema as {
      properties: Record<string, { type: unknown; enum?: unknown[] }>;
    }
  ).properties;
}

describe("update_company founder photo and personal footer", () => {
  it("passes a founder photo URL or null through to the API", () => {
    const url = "https://images.sequenzy.com/founder-photos/c/1.jpg";
    expect(buildUpdateCompanyBody({ founderPhotoUrl: url })).toEqual({
      founderPhotoUrl: url,
    });
    expect(buildUpdateCompanyBody({ founderPhotoUrl: null })).toEqual({
      founderPhotoUrl: null,
    });
  });

  it("rejects a founder photo that is not a string or null", () => {
    expect(() => buildUpdateCompanyBody({ founderPhotoUrl: 42 })).toThrow(
      "`founderPhotoUrl` must be a URL string"
    );
  });

  it("declares the photo as a nullable string and offers the personal mode", () => {
    const properties = updateCompanyProperties();
    expect(properties["founderPhotoUrl"]?.type).toEqual(["string", "null"]);
    expect(properties["footerStyle"]?.enum).not.toContain("personal");
    expect(properties["footerMode"]?.enum).toEqual(["branded", "personal"]);
    expect(
      buildUpdateCompanyBody({ footerMode: "personal", footerStyle: "band" })
    ).toEqual({ footerMode: "personal", footerStyle: "band" });
  });

  it("accepts a footer mode on its own and rejects a non-string one", () => {
    expect(buildUpdateCompanyBody({ footerMode: "branded" })).toEqual({
      footerMode: "branded",
    });
    expect(() => buildUpdateCompanyBody({ footerMode: 1 })).toThrow(
      "footerMode"
    );
  });
});

describe("update_company founder photo upload", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcp-founder-photo-"));
  const photo = join(dir, "sarah.png");
  writeFileSync(photo, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const PNG_BASE64 = "iVBORw==";

  function recorder() {
    const calls: Array<{ method: string; path: string; body: unknown }> = [];
    const request = (async (method: string, path: string, body: unknown) => {
      calls.push({ method, path, body });
      return { company: { id: "comp_1" }, call: calls.length };
    }) as Parameters<typeof sendUpdateCompany>[2];
    return { calls, request };
  }

  it("refuses a file path on a remote connection, before any request", async () => {
    localFileUploads = false;
    const { calls, request } = recorder();
    const refused = await sendUpdateCompany(
      "comp_1",
      { founderPhotoFilePath: photo },
      request
    ).catch((error: unknown) => error);
    expect(String(refused)).toContain(
      "only supported when the MCP server runs locally"
    );
    expect(calls).toEqual([]);
  });

  it("uploads base64 on its own when it is the only field", async () => {
    const { calls, request } = recorder();
    await sendUpdateCompany(
      "comp_1",
      { founderPhotoBase64: `data:image/png;base64,${PNG_BASE64}` },
      request
    );
    expect(calls).toEqual([
      {
        method: "PUT",
        path: "/api/v1/companies/comp_1/founder-photo",
        body: { imageBase64: PNG_BASE64 },
      },
    ]);
  });

  it("saves other settings first and returns the upload's company", async () => {
    localFileUploads = true;
    const { calls, request } = recorder();
    const result = await sendUpdateCompany(
      "comp_1",
      { founderName: "Sarah", founderPhotoFilePath: photo },
      request
    );
    expect(calls).toEqual([
      {
        method: "PATCH",
        path: "/api/v1/companies/comp_1",
        body: { founderName: "Sarah" },
      },
      {
        method: "PUT",
        path: "/api/v1/companies/comp_1/founder-photo",
        body: { imageBase64: PNG_BASE64 },
      },
    ]);
    expect(result).toMatchObject({ call: 2 });
  });

  it("rejects conflicting, empty or unsupported photo inputs before any request", async () => {
    localFileUploads = true;
    const { calls, request } = recorder();
    const notes = join(dir, "notes.txt");
    writeFileSync(notes, "hi");
    for (const [args, message] of [
      [
        { founderPhotoBase64: PNG_BASE64, founderPhotoFilePath: photo },
        "not both",
      ],
      [
        {
          founderPhotoBase64: PNG_BASE64,
          founderPhotoUrl: "https://x.test/a.png",
        },
        "not both",
      ],
      [{ founderPhotoBase64: " " }, "must be a non-empty string"],
      [{ founderPhotoBase64: 42 }, "must be a non-empty string"],
      [{ founderPhotoBase64: "not base64!" }, "valid base64"],
      [{ founderPhotoFilePath: notes }, "Unsupported image type"],
    ] as const) {
      const refused = await sendUpdateCompany(
        "comp_1",
        args as Record<string, unknown>,
        request
      ).catch((error: unknown) => error);
      expect(String(refused)).toContain(message);
    }
    expect(calls).toEqual([]);
  });

  it("declares both inputs and hides the file path from the OpenAI profile", () => {
    const properties = updateCompanyProperties();
    expect(properties["founderPhotoFilePath"]?.type).toBe("string");
    expect(properties["founderPhotoBase64"]?.type).toBe("string");
    const tool = accountToolDefinitions.find(
      (definition) => definition.name === "update_company"
    ) as Tool;
    const profiled = withOpenAiToolProfile(tool);
    const profiledProperties = profiled?.inputSchema.properties ?? {};
    expect(profiledProperties).not.toHaveProperty("founderPhotoFilePath");
    expect(profiledProperties).toHaveProperty("founderPhotoBase64");
  });
});
