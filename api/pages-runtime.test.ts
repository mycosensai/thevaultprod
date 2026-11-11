import { afterEach, describe, expect, it } from "vitest";
import { resetCloudflareEnv, setCloudflareEnv } from "./lib/env";
import { buildAuthUrl, oauthCallbackBase } from "./oauth-providers";
import { revokeAllUserSessions } from "./security";
import { onRequest } from "../functions/[[path]]";

const APP_SECRET = "p".repeat(32);

function pagesContext(url: string, env: Record<string, unknown> = {}) {
  return {
    request: new Request(url),
    env,
  };
}

describe("Pages runtime wiring", () => {
  afterEach(() => {
    resetCloudflareEnv();
  });

  it("refuses production requests when APP_SECRET is unset", async () => {
    const response = await onRequest(pagesContext("https://thevaultdfw.win/api/health", { ENVIRONMENT: "production" }));
    expect(response.status).toBe(500);
    const body = await response.text();
    expect(body).toBe("Internal Server Error");
    expect(body).not.toMatch(/dev-only-/);
  });

  it("serves health without a secret outside production", async () => {
    const response = await onRequest(pagesContext("https://thevaultdfw.win/api/health", { VAULT_DOMAIN: "thevaultdfw.win" }));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean; database: string };
    expect(body.ok).toBe(true);
    expect(body.database).toBe("missing");
  });

  it("routes the OAuth callback instead of returning the API 404", async () => {
    const response = await onRequest(
      pagesContext("https://thevaultdfw.win/api/oauth/callback/google", {
        VAULT_DOMAIN: "thevaultdfw.win",
        APP_SECRET,
      }),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/?oauth_error=missing_params");
  });

  it("rejects an unknown OAuth provider", async () => {
    const response = await onRequest(
      pagesContext("https://thevaultdfw.win/api/oauth/callback/nope", { APP_SECRET }),
    );
    expect(response.status).toBe(400);
  });

  it("builds the provider redirect from VAULT_DOMAIN at request time", async () => {
    expect(oauthCallbackBase()).toBe("http://localhost:3000");
    setCloudflareEnv({
      VAULT_DOMAIN: "thevaultdfw.win",
      GOOGLE_CLIENT_ID: "google-client",
      GOOGLE_CLIENT_SECRET: "google-secret",
    });
    expect(oauthCallbackBase()).toBe("https://thevaultdfw.win");
    const result = await buildAuthUrl("google");
    const redirect = new URL(result.url).searchParams.get("redirect_uri");
    expect(redirect).toBe("https://thevaultdfw.win/api/oauth/callback/google");
    expect(redirect).not.toContain("localhost");
  });

  it("writes session revocation through the D1 argument", async () => {
    const statements: string[] = [];
    const d1 = {
      prepare(sql: string) {
        statements.push(sql);
        return {
          bind() {
            return {
              async run() {
                return { success: true };
              },
              async all() {
                return { results: [] };
              },
            };
          },
        };
      },
    };
    await revokeAllUserSessions(4, d1);
    expect(statements.some((sql) => sql.includes("user_session_revocations"))).toBe(true);
  });
});
