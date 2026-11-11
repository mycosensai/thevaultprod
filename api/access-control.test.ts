import { afterEach, describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";
import { resetCloudflareEnv, setCloudflareEnv } from "./lib/env";
import { isCheckoutRedirectAllowed } from "./security";
import { onRequest } from "../functions/[[path]]";
import { onRequestGet } from "../functions/api/db/health";

const APP_SECRET = "p".repeat(32);

function context(user?: User): TrpcContext {
  return {
    req: new Request("https://thevaultdfw.win/api/trpc", { headers: { host: "thevaultdfw.win" } }),
    resHeaders: new Headers(),
    user,
  };
}

const member = { id: 4, role: "user" } as User;

describe("internal API access", () => {
  afterEach(() => {
    resetCloudflareEnv();
  });

  it("rejects anonymous agent, outreach, social, and fee stats", async () => {
    const caller = appRouter.createCaller(context());
    await expect(caller.agent.dashboardStats()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.agent.fleetOverview()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.agent.listSessions({ limit: 10 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.agent.listProjects()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.outreach.stats()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.social.stats()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.listingFee.stats()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.crypto.getStatus({ paymentId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a signed-in non-admin from agent ops", async () => {
    const caller = appRouter.createCaller(context(member));
    await expect(caller.agent.dashboardStats()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.agent.fleetOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.agent.listSessions({ limit: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("omits stacks from production tRPC errors", async () => {
    const response = await onRequest({
      request: new Request("https://thevaultdfw.win/api/trpc/agent.dashboardStats"),
      env: { ENVIRONMENT: "production", APP_SECRET, VAULT_DOMAIN: "thevaultdfw.win" },
    });
    expect(response.status).toBe(401);
    const body = await response.text();
    expect(body).toContain("UNAUTHORIZED");
    expect(body).not.toContain("\"stack\"");
    expect(body).not.toMatch(/functions\/\[\[path\]\]\.ts/);
  });

  it("does not list database tables from either health function", async () => {
    const db = {
      prepare(sql: string) {
        return {
          bind() {
            return this;
          },
          async first() {
            return { ok: 1 };
          },
          async all() {
            return { results: [{ name: "users" }, { name: "agent_projects" }] };
          },
          async run() {
            return { success: true };
          },
          sql,
        };
      },
    };
    const specific = await onRequestGet({ env: { DB: db as never } });
    const specificBody = await specific.json();
    expect(specificBody).toEqual({ ok: true });

    const caught = await onRequest({
      request: new Request("https://thevaultdfw.win/api/db/health"),
      env: { DB: db, APP_SECRET },
    });
    const caughtBody = await caught.json();
    expect(caughtBody).toEqual({ ok: true });
    expect(JSON.stringify(caughtBody)).not.toContain("agent_projects");
  });

  it("allows Vault checkout redirects and rejects other hosts", () => {
    setCloudflareEnv({ ENVIRONMENT: "production", APP_SECRET, VAULT_DOMAIN: "thevaultdfw.win" });
    const request = new Request("https://thevaultdfw.win/checkout/1", { headers: { host: "thevaultdfw.win" } });
    expect(isCheckoutRedirectAllowed("https://thevaultdfw.win/browse?success=true", request)).toBe(true);
    expect(isCheckoutRedirectAllowed("https://evil.example/phish", request)).toBe(false);
    expect(isCheckoutRedirectAllowed("http://thevaultdfw.win/browse", request)).toBe(false);
  });
});
