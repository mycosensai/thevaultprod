/**
 * OAuth 2.0 Callback Handlers
 * Handles the authorization code callback for Google, X, and GitHub
 */

import type { Context } from "hono";
import { setCookie } from "hono/cookie";
import {
  verifyState,
  exchangeCode,
  fetchProfile,
  type OAuthProvider,
} from "./oauth-providers";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";
import * as jose from "jose";
import { env } from "./lib/env";
import { getSessionCookieOptions } from "./lib/cookies";
import { logAudit, getClientIP, isTokenRevoked, isUserSessionRevoked } from "./security";
import { getRawD1 } from "./queries/connection";

// Read during a request. Module init runs before Pages bindings exist, and
// env.appSecret would generate a random dev fallback, which Workers reject.
function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(env.appSecret);
}

async function createOAuthSessionToken(payload: {
  userId: number;
  provider: string;
}): Promise<string> {
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function handleOAuthCallback(c: Context, provider: OAuthProvider) {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");
  const errorDescription = c.req.query("error_description");

  if (error) {
    console.warn(`[OAuth ${provider}] Error: ${error} - ${errorDescription}`);
    return c.redirect("/?oauth_error=" + encodeURIComponent(error), 302);
  }

  if (!code || !state) {
    return c.redirect("/?oauth_error=missing_params", 302);
  }

  // Verify the signed state (CSRF protection)
  const stateData = await verifyState(state);
  if (!stateData || stateData.provider !== provider) {
    console.warn(`[OAuth ${provider}] Invalid state parameter`);
    return c.redirect("/?oauth_error=invalid_state", 302);
  }

  try {
    // Exchange code for access token
    const tokenResult = await exchangeCode(provider, code, stateData.pkce);
    if (tokenResult.error || !tokenResult.access_token) {
      console.warn(`[OAuth ${provider}] Token exchange failed:`, tokenResult.error);
      return c.redirect("/?oauth_error=token_exchange_failed", 302);
    }

    // Fetch user profile
    const profile = await fetchProfile(provider, tokenResult.access_token);

    // Upsert user in database
    const db = getDb();

    // Check if user exists by provider+id or email
    const [existingByProvider] = await db
      .select()
      .from(users)
      .where(
        sql`${users.oauthProvider} = ${provider} AND ${users.oauthProviderId} = ${profile.id}`
      )
      .limit(1);

    let userId: number;

    if (existingByProvider) {
      // Update existing OAuth user
      await db
        .update(users)
        .set({
          name: profile.name,
          email: profile.email || existingByProvider.email,
          avatar: profile.avatar || existingByProvider.avatar,
          lastSignInAt: new Date(),
        })
        .where(eq(users.id, existingByProvider.id));
      userId = existingByProvider.id;
    } else if (profile.email) {
      // Check by email for account linking
      const [existingByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, profile.email))
        .limit(1);

      if (existingByEmail && profile.emailVerified) {
        // Link OAuth to existing account — only when the provider verified
        // the email, otherwise this is account takeover by unverified email.
        await db
          .update(users)
          .set({
            oauthProvider: provider,
            oauthProviderId: profile.id,
            name: profile.name || existingByEmail.name,
            avatar: profile.avatar || existingByEmail.avatar,
            lastSignInAt: new Date(),
          })
          .where(eq(users.id, existingByEmail.id));
        userId = existingByEmail.id;
      } else {
        // Create new user
        const result = await db.insert(users).values({
          oauthProvider: provider,
          oauthProviderId: profile.id,
          name: profile.name,
          email: profile.email,
          avatar: profile.avatar,
          role: "user",
        });
        userId = Number(result.meta.last_row_id);
      }
    } else {
      // No email, create by provider
      const result = await db.insert(users).values({
        oauthProvider: provider,
        oauthProviderId: profile.id,
        name: profile.name,
        avatar: profile.avatar,
        role: "user",
      });
      userId = Number(result.meta.last_row_id);
    }

    // Create session token
    const sessionToken = await createOAuthSessionToken({
      userId,
      provider,
    });

    // Set session cookie
    const cookieOpts = getSessionCookieOptions(c.req.raw.headers);
    setCookie(c, "vault_session", sessionToken, {
      ...cookieOpts,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    logAudit({
      ip: getClientIP(c.req.raw),
      method: "GET",
      path: `/api/oauth/callback/${provider}`,
      userId,
      action: "oauth_login",
      details: `provider:${provider} email:${profile.email || "none"}`,
    });

    return c.redirect("/", 302);
  } catch (err) {
    const name = err instanceof Error ? err.name : "Error";
    console.error(`[OAuth ${provider}] Callback error: ${name}`);
    return c.redirect("/?oauth_error=callback_failed", 302);
  }
}

/**
 * Verify an OAuth session cookie and return the user
 */
export async function verifyOAuthSession(
  headers: Headers
): Promise<{ id: number; name: string | null; email: string | null; avatar: string | null; role: string } | null> {
  const cookieHeader = headers.get("cookie");
  if (!cookieHeader) return null;

  // Parse cookies manually
  const cookies: Record<string, string> = {};
  for (const pair of cookieHeader.split(";")) {
    const [key, ...rest] = pair.trim().split("=");
    if (key && rest.length > 0) cookies[key] = rest.join("=");
  }

  const token = cookies["vault_session"];
  if (!token) return null;

  try {
    const { payload } = await jose.jwtVerify(token, getJwtSecret(), {
      clockTolerance: 60,
    });
    const userId = payload.userId as number;
    if (!userId) return null;

    const d1 = getRawD1() ?? undefined;
    if (await isTokenRevoked(token, d1)) return null;
    const issuedAt = typeof payload.iat === "number" ? payload.iat * 1000 + 999 : 0;
    if (await isUserSessionRevoked(userId, issuedAt, d1)) return null;

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user?.id) return null;
    return {
      id: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      avatar: user.avatar ?? null,
      role: user.role,
    };
  } catch {
    return null;
  }
}
