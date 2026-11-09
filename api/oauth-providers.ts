/**
 * Multi-Provider OAuth 2.0 Configuration
 * Supports: Google, X (Twitter), GitHub
 * Uses PKCE + Web Crypto API (Cloudflare Workers compatible)
 */

import { env } from "./lib/env";
import * as jose from "jose";

export type OAuthProvider = "google" | "x" | "github";

interface ProviderConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
  profileParser: (data: any) => {
    id: string;
    name: string;
    email: string | null;
    emailVerified: boolean;
    avatar: string | null;
  };
}

const CALLBACK_BASE = `${env.isProduction ? "https" : "http"}://localhost:3000`;

export const PROVIDER_CONFIGS: Record<OAuthProvider, ProviderConfig> = {
  google: {
    name: "Google",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scope: "openid email profile",
    profileParser: (data) => ({
      id: data.id,
      name: data.name || "Google User",
      email: data.email || null,
      emailVerified: Boolean(data.verified_email),
      avatar: data.picture || null,
    }),
  },
  x: {
    name: "X",
    authUrl: "https://x.com/i/oauth2/authorize",
    tokenUrl: "https://api.x.com/2/oauth2/token",
    profileUrl: "https://api.x.com/2/users/me?user.fields=profile_image_url",
    scope: "tweet.read users.read",
    profileParser: (data) => ({
      id: data.data?.id,
      name: data.data?.name || "X User",
      email: null,
      avatar: data.data?.profile_image_url || null,
    }),
  },
  github: {
    name: "GitHub",
    authUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    profileUrl: "https://api.github.com/user",
    scope: "read:user user:email",
    profileParser: (data) => ({
      id: String(data.id),
      name: data.name || data.login || "GitHub User",
      email: data.email || null,
      // Public /user email is only present (and public) when verified by GitHub.
      emailVerified: Boolean(data.email),
      avatar: data.avatar_url || null,
    }),
  },
};

// ─── Web Crypto PKCE Utilities ───

function bufferToBase64URL(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function sha256(plaintext: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  return crypto.subtle.digest("SHA-256", data);
}

export async function generatePKCE() {
  const verifierBytes = new Uint8Array(32);
  crypto.getRandomValues(verifierBytes);
  const verifier = bufferToBase64URL(verifierBytes);
  const challenge = bufferToBase64URL(await sha256(verifier));
  return { verifier, challenge };
}

// ─── Secure State JWT ───

function getStateSecret(): Uint8Array {
  return new TextEncoder().encode(env.appSecret);
}

interface StatePayload {
  provider: OAuthProvider;
  redirectUri: string;
  pkce: string;
  nonce: string;
}

export async function signState(payload: StatePayload): Promise<string> {
  return new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getStateSecret());
}

export async function verifyState(
  token: string
): Promise<StatePayload | null> {
  try {
    const { payload } = await jose.jwtVerify(token, getStateSecret(), {
      clockTolerance: 30,
    });
    return {
      provider: payload.provider as OAuthProvider,
      redirectUri: payload.redirectUri as string,
      pkce: payload.pkce as string,
      nonce: payload.nonce as string,
    };
  } catch {
    return null;
  }
}

// ─── URL Builders ───

export function getClientId(provider: OAuthProvider): string {
  if (provider === "google") return env.googleClientId;
  if (provider === "x") return env.xClientId;
  if (provider === "github") return env.githubClientId;
  return "";
}

export function getClientSecret(provider: OAuthProvider): string {
  if (provider === "google") return env.googleClientSecret;
  if (provider === "x") return env.xClientSecret;
  if (provider === "github") return env.githubClientSecret;
  return "";
}

export function isProviderConfigured(provider: OAuthProvider): boolean {
  return !!getClientId(provider) && !!getClientSecret(provider);
}

export async function buildAuthUrl(
  provider: OAuthProvider
): Promise<{ url: string; error?: string }> {
  const config = PROVIDER_CONFIGS[provider];
  const clientId = getClientId(provider);

  if (!clientId) {
    return {
      url: "",
      error: `${config.name} OAuth is not configured. Add ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET to your environment.`,
    };
  }

  const redirectUri = `${CALLBACK_BASE}/api/oauth/callback/${provider}`;
  const { verifier, challenge } = await generatePKCE();
  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = bufferToBase64URL(nonceBytes);

  const state = await signState({
    provider,
    redirectUri,
    pkce: verifier,
    nonce,
  });

  const url = new URL(config.authUrl);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  if (provider === "google") {
    url.searchParams.set("nonce", nonce);
    url.searchParams.set("access_type", "offline");
  }

  return { url: url.toString() };
}

// ─── Token Exchange ───

export async function exchangeCode(
  provider: OAuthProvider,
  code: string,
  pkce: string
): Promise<{ access_token: string; error?: string }> {
  const config = PROVIDER_CONFIGS[provider];
  const clientId = getClientId(provider);
  const clientSecret = getClientSecret(provider);
  const redirectUri = `${CALLBACK_BASE}/api/oauth/callback/${provider}`;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: pkce,
  });

  const resp = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: body.toString(),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return { access_token: "", error: `Token exchange failed: ${text}` };
  }

  const data = (await resp.json()) as { access_token?: string };
  return { access_token: data.access_token ?? "" };
}

// ─── Profile Fetch ───

export async function fetchProfile(
  provider: OAuthProvider,
  accessToken: string
): Promise<{
  id: string;
  name: string;
  email: string | null;
  avatar: string | null;
}> {
  const config = PROVIDER_CONFIGS[provider];

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };

  const resp = await fetch(config.profileUrl, { headers });

  if (!resp.ok) {
    throw new Error(`Profile fetch failed: ${resp.status}`);
  }

  const data = await resp.json();
  return config.profileParser(data);
}
