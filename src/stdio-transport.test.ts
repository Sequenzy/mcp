import { PassThrough } from "node:stream";

import { expect, it } from "bun:test";

import { createStdioTransport } from "./stdio-transport.js";

it.each(["", "\r\n", "\v"])(
  "receives a 10MB base64 image over stdio with %j whitespace",
  async (whitespace) => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const transport = createStdioTransport(stdin, stdout);
    const received = new Promise<unknown>((resolve, reject) => {
      transport.onmessage = resolve;
      transport.onerror = reject;
    });
    const message = {
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "upload_image_asset",
        arguments: {
          filename: "header.gif",
          imageBase64: Buffer.alloc(10 * 1024 * 1024)
            .toString("base64")
            .replace(/.{64}/g, (chunk) => chunk + whitespace),
        },
      },
    };
    await transport.start();
    try {
      stdin.write(`${JSON.stringify(message)}\n`);
      expect(await received).toEqual(message);
    } finally {
      await transport.close();
      stdin.destroy();
      stdout.destroy();
    }
  }
);
