import * as cookie from "cookie";
import type { CookieOptions } from "hono/utils/cookie";

export const LOCAL_AUTH_COOKIE = "vault_local_session";
export const OAUTH_SESSION_COOKIE = "vault_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function isLocalhost(headers: Headers): boolean {
  const host = (headers.get("host") || "").toLowerCase();
  return host.startsWith("localhost:") || host === "localhost" || host.startsWith("127.0.0.1:");
}

/**
 * First-party session cookies. SameSite=Lax is sent on the OAuth top-level
 * return and is not sent on cross-site POSTs. SameSite=None is not required
 * because the API and the SPA share the Pages host.
 */
export function getSessionCookieOptions(headers: Headers): CookieOptions {
  const localhost = isLocalhost(headers);

  return {
    httpOnly: true,
    path: "/",
    sameSite: "Lax",
    secure: !localhost,
  };
}

export function readRequestCookie(headers: Headers, name: string): string | null {
  const raw = headers.get("cookie");
  if (!raw) return null;
  const value = cookie.parse(raw)[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function serializeSessionCookie(name: string, value: string, requestHeaders: Headers, maxAge: number): string {
  const opts = getSessionCookieOptions(requestHeaders);
  return cookie.serialize(name, value, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: opts.secure,
    maxAge,
  });
}

export function appendSessionCookie(target: Headers, name: string, value: string, requestHeaders: Headers, maxAge: number): void {
  target.append("set-cookie", serializeSessionCookie(name, value, requestHeaders, maxAge));
}
