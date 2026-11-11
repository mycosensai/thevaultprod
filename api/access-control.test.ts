import { afterEach, describe, expect, it } from "vitest";
import type { User } from "@db/schema";
import { appRouter } from "./router";
import type { TrpcContext } from "./context";
import { resetCloudflareEnv, setCloudflareEnv } from "./lib/env";
import { canManageOwnedRow, isCheckoutRedirectAllowed, publicAuthMessage } from "./security";
import { paymentProviderError } from "./lib/stripe-error";
import { toPublicUser } from "./lib/public-user";
import { getSessionCookieOptions, serializeSessionCookie, LOCAL_AUTH_COOKIE } from "./lib/cookies";
import { TRPCError } from "@trpc/server";
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
    await expect(caller.shipping.getHistory({ listingId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.listingFee.verifyPayment({ sessionId: "cs_test_example" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.listingFee.checkStatus({ listingId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.outreach.getLeads({ listingId: 1 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.social.updateMentionStatus({ mentionId: 1, status: "contacted" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
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
    const spoofedHost = new Request("https://thevaultdfw.win/checkout/1", { headers: { host: "evil.example" } });
    expect(isCheckoutRedirectAllowed("https://evil.example/phish", spoofedHost)).toBe(false);
    const preview = new Request("https://abc.thevault.pages.dev/checkout/1");
    expect(isCheckoutRedirectAllowed("https://abc.thevault.pages.dev/browse", preview)).toBe(true);
    expect(isCheckoutRedirectAllowed("https://evil.example/phish", preview)).toBe(false);
  });

  it("keeps session cookies httpOnly and does not return password hashes", async () => {
    const options = getSessionCookieOptions(new Headers({ host: "thevaultdfw.win" }));
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(options.sameSite).toBe("Lax");
    const serialized = serializeSessionCookie(LOCAL_AUTH_COOKIE, "session-token", new Headers({ host: "thevaultdfw.win" }), 60);
    expect(serialized.toLowerCase()).toContain("httponly");
    expect(serialized.toLowerCase()).toContain("secure");
    expect(serialized.toLowerCase()).toContain("samesite=lax");
    expect(serialized.toLowerCase()).not.toContain("samesite=none");

    const user = toPublicUser({ id: 4, email: "member@thevaultdfw.win", password: "pbkdf2$120000$salt$hash" });
    expect(user).not.toHaveProperty("password");
    expect(JSON.stringify(user)).not.toContain("pbkdf2");

    expect(canManageOwnedRow({ id: 4, role: "user" }, 4)).toBe(true);
    expect(canManageOwnedRow({ id: 4, role: "user" }, 9)).toBe(false);
    expect(canManageOwnedRow({ id: 4, role: "admin" }, 9)).toBe(true);

    expect(publicAuthMessage(new Error("SELECT password FROM users"))).toBe("Authentication failed");
    expect(publicAuthMessage(new TRPCError({ code: "UNAUTHORIZED", message: "Invalid email or password" }))).toBe(
      "Invalid email or password",
    );
    expect(paymentProviderError(402).message).toBe("Payment provider request failed");
    expect(paymentProviderError(402).message).not.toContain("Stripe API error");
  });

  it("clears local and oauth cookies on logout", async () => {
    const resHeaders = new Headers();
    const caller = appRouter.createCaller({
      req: new Request("https://thevaultdfw.win/api/trpc", {
        headers: {
          host: "thevaultdfw.win",
          cookie: "vault_local_session=local-token; vault_session=oauth-token",
        },
      }),
      resHeaders,
      user: member,
    });
    await caller.auth.logout();
    const cookies = typeof resHeaders.getSetCookie === "function" ? resHeaders.getSetCookie() : [resHeaders.get("set-cookie") ?? ""];
    const joined = cookies.join("\n").toLowerCase();
    expect(joined).toContain("vault_local_session=");
    expect(joined).toContain("vault_session=");
    expect(joined).toContain("httponly");
    expect(joined).toContain("samesite=lax");
    expect(joined).not.toContain("local-token");
    expect(joined).not.toContain("oauth-token");
  });
});
