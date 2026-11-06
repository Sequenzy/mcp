import { describe, expect, it, mock } from "bun:test";

import {
  fetchWithTransientRetry,
  TRANSIENT_RETRY_DELAYS_MS,
} from "./transient-retry.js";

function sequence(...outcomes: Array<Response | Error>) {
  const queue = [...outcomes];
  return mock(async () => {
    const next = queue.shift();
    if (!next) throw new Error("unexpected extra request");
    if (next instanceof Error) throw next;
    return next;
  });
}

function recordSleeps() {
  const sleeps: number[] = [];
  return {
    sleeps,
    sleep: async (ms: number) => {
      sleeps.push(ms);
    },
  };
}

describe("fetchWithTransientRetry", () => {
  it("returns the first response without waiting when it succeeds", async () => {
    const send = sequence(new Response("ok"));
    const { sleeps, sleep } = recordSleeps();

    const response = await fetchWithTransientRetry("GET", send, { sleep });

    expect(await response.text()).toBe("ok");
    expect(send).toHaveBeenCalledTimes(1);
    expect(sleeps).toEqual([]);
  });

  it("retries a GET through a deploy swap: network error, then 502, then success", async () => {
    const send = sequence(
      new Error("ECONNREFUSED"),
      new Response("bad gateway", { status: 502 }),
      new Response("ok")
    );
    const { sleeps, sleep } = recordSleeps();

    const response = await fetchWithTransientRetry("GET", send, { sleep });

    expect(response.status).toBe(200);
    expect(sleeps).toEqual([250, 1000]);
  });

  it("retries 503 and 504 but not other errors", async () => {
    for (const status of [503, 504]) {
      const send = sequence(new Response("", { status }), new Response("ok"));
      const response = await fetchWithTransientRetry("GET", send, {
        sleep: async () => undefined,
      });
      expect(response.status).toBe(200);
    }

    for (const status of [400, 404, 429, 500]) {
      const send = sequence(new Response("", { status }));
      const response = await fetchWithTransientRetry("GET", send, {
        sleep: async () => undefined,
      });
      expect(response.status).toBe(status);
      expect(send).toHaveBeenCalledTimes(1);
    }
  });

  it("returns the last transient response once the retries run out", async () => {
    const send = sequence(
      ...Array.from(
        { length: TRANSIENT_RETRY_DELAYS_MS.length + 1 },
        () => new Response("", { status: 502 })
      )
    );
    const { sleeps, sleep } = recordSleeps();

    const response = await fetchWithTransientRetry("GET", send, { sleep });

    expect(response.status).toBe(502);
    expect(sleeps).toEqual([...TRANSIENT_RETRY_DELAYS_MS]);
  });

  it("rethrows the last network error once the retries run out", async () => {
    const send = sequence(new Error("down"), new Error("still down"));

    await Promise.resolve(
      expect(
        fetchWithTransientRetry("GET", send, {
          delaysMs: [10],
          sleep: async () => undefined,
        })
      ).rejects.toThrow("still down")
    );
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("never repeats a write, whatever the failure", async () => {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const failing = sequence(new Response("", { status: 502 }));
      const response = await fetchWithTransientRetry(method, failing, {
        sleep: async () => undefined,
      });
      expect(response.status).toBe(502);
      expect(failing).toHaveBeenCalledTimes(1);

      const offline = sequence(new Error("offline"));
      await Promise.resolve(
        expect(
          fetchWithTransientRetry(method, offline, {
            sleep: async () => undefined,
          })
        ).rejects.toThrow("offline")
      );
      expect(offline).toHaveBeenCalledTimes(1);
    }
  });

  it("waits for a short Retry-After and gives up on a long one", async () => {
    const short = sequence(
      new Response("", { status: 503, headers: { "Retry-After": "3" } }),
      new Response("ok")
    );
    const { sleeps, sleep } = recordSleeps();
    expect(
      (await fetchWithTransientRetry("GET", short, { sleep })).status
    ).toBe(200);
    expect(sleeps).toEqual([3000]);

    const long = sequence(
      new Response("", { status: 503, headers: { "Retry-After": "120" } })
    );
    const response = await fetchWithTransientRetry("GET", long, {
      sleep: async () => undefined,
    });
    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(long).toHaveBeenCalledTimes(1);
  });

  it("still retries when the failed body cannot be cancelled", async () => {
    const stubborn = new ReadableStream({
      cancel() {
        throw new Error("already torn down");
      },
    });
    const send = sequence(
      new Response(stubborn, { status: 502 }),
      new Response("ok")
    );

    const response = await fetchWithTransientRetry("GET", send, {
      sleep: async () => undefined,
    });

    expect(response.status).toBe(200);
  });

  it("waits with the default timer when no sleep is injected", async () => {
    const send = sequence(
      new Response("", { status: 502 }),
      new Response("ok")
    );
    const startedAt = Date.now();

    const response = await fetchWithTransientRetry("GET", send, {
      delaysMs: [20],
    });

    expect(response.status).toBe(200);
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(15);
  });
});
