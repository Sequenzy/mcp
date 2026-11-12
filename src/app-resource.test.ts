import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { expect, it } from "bun:test";

import { OPENAI_APP_WIDGET_DOMAIN, readAppResource } from "./app-resource.js";

const loadBundle = (path: string) => import(path);

it("serves its UI after the MCP code is bundled into an isolated API deployment", async () => {
  const directory = await mkdtemp(join(tmpdir(), "sequenzy-app-bundle-"));
  try {
    const result = await Bun.build({
      entrypoints: [new URL("./app-resource.ts", import.meta.url).pathname],
      target: "bun",
    });
    expect(result.success).toBe(true);
    const path = join(directory, "api.js");
    await writeFile(path, await result.outputs[0].text());
    const bundle = await loadBundle(path);
    expect(bundle.readAppResource().contents[0].text).toContain(
      "Sequence flow"
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

it("keeps the committed app bundle aligned with its browser source", async () => {
  const child = Bun.spawn(
    [
      process.execPath,
      new URL("../scripts/build-app.ts", import.meta.url).pathname,
      "--check",
    ],
    { stdout: "pipe", stderr: "pipe" }
  );
  const stderr = await new Response(child.stderr).text();
  expect(await child.exited, stderr).toBe(0);
});

it("gives the OpenAI widget a dedicated domain and a narrow image allowlist", () => {
  const [openAi] = readAppResource("openai").contents;
  expect(openAi._meta.ui.domain).toBe(OPENAI_APP_WIDGET_DOMAIN);
  expect(openAi._meta["openai/widgetDomain"]).toBe(OPENAI_APP_WIDGET_DOMAIN);
  expect(openAi._meta.ui.csp.connectDomains).toEqual([]);
  expect(openAi._meta.ui.csp.resourceDomains).toContain(
    "https://api.sequenzy.com"
  );
  expect(openAi._meta.ui.csp.resourceDomains).not.toContain("https:");

  const [standard] = readAppResource("standard").contents;
  expect(standard._meta.ui).not.toHaveProperty("domain");
  expect(standard._meta).not.toHaveProperty("openai/widgetDomain");
});

it("gives the Muse view the shared origin and a description for directory review", () => {
  const [muse] = readAppResource("muse").contents;
  expect(muse._meta.ui.domain).toBe(OPENAI_APP_WIDGET_DOMAIN);
  expect(muse._meta["openai/widgetDomain"]).toBe(OPENAI_APP_WIDGET_DOMAIN);
  expect(muse._meta["openai/widgetDescription"]).toContain("previews");
  expect(muse.uri).toBe("ui://sequenzy/previews-v1.html");
  expect(muse.mimeType).toBe("text/html;profile=mcp-app");
  // Muse loads the same email images as the standard surface.
  expect(muse._meta.ui.csp.resourceDomains).toEqual(["https:"]);

  const [openAi] = readAppResource("openai").contents;
  expect(openAi._meta).not.toHaveProperty("openai/widgetDescription");
  const [standard] = readAppResource("standard").contents;
  expect(standard._meta).not.toHaveProperty("openai/widgetDescription");
});
