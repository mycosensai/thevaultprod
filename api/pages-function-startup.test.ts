import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Cloudflare rejects Workers whose module startup performs I/O, starts a
 * timer, or generates random values. Pages evaluates this graph while
 * publishing the Function, before request bindings exist.
 */
const entrypoints = [
  "./router.ts",
  "./context.ts",
  "../functions/[[path]].ts",
  "../functions/api/db/health.ts",
] as const;

async function importFunctionGraph(): Promise<void> {
  for (const entry of entrypoints) {
    await import(entry);
  }
}

describe("Pages Function module startup", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("does not generate random values while the function graph evaluates", async () => {
    vi.resetModules();
    const hits: string[] = [];
    const record = (label: string) => {
      const stack = new Error(label).stack ?? label;
      hits.push(stack.split("\n").slice(0, 6).join("\n"));
    };

    vi.spyOn(crypto, "randomUUID").mockImplementation(() => {
      record("randomUUID");
      return "00000000-0000-4000-8000-000000000000";
    });
    vi.spyOn(crypto, "getRandomValues").mockImplementation((array) => {
      record("getRandomValues");
      return array;
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      record("Math.random");
      return 0;
    });

    await importFunctionGraph();

    expect(hits).toEqual([]);
  });
});
