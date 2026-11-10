/**
 * Cloudflare Pages Functions Entry Point
 * Replaces Node.js boot.ts -- runs as a Cloudflare Worker with D1
 */
import { Hono } from "hono";
import type { Context } from "hono";
import { cors } from "hono/cors";
import { trimTrailingSlash } from "hono/trailing-slash";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

declare global {
  var __cfExecCtx: ExecutionContext | undefined
}

import { appRouter } from "../api/router";
import { createContext } from "../api/context";
import { setDb } from "../api/queries/connection";
import { setCloudflareEnv, assertAppSecretConfigured } from "../api/lib/env";
import { handleOAuthCallback } from "../api/oauth-handlers";
import type { OAuthProvider } from "../api/oauth-providers";
import { checkRateLimit, getSecurityHeaders, getCorsConfig, publicAuthMessage } from "../api/security";
import { walletConnectProjectIdOrEmpty } from "../contracts/walletconnect";

type Env = Record<string, unknown> & {
  DB?: D1Database;
  thevault?: D1Database;
};

type AuthInput = {
  name?: string;
  email?: string;
  password?: string;
};

type StripeEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;
const STRIPE_ALLOWED_EVENTS = new Set([
  "checkout.session.completed",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "charge.refunded",
]);

function getD1(env: Env): D1Database | undefined {
  return env.DB || env.thevault;
}

function getRequestContext(c: Context<{ Bindings: Env }>) {
  return {
    req: c.req.raw,
    resHeaders: new Headers(),
  } as const;
}

function applyContextCookies(response: Response, resHeaders: Headers): Response {
  const cookies = typeof resHeaders.getSetCookie === "function" ? resHeaders.getSetCookie() : [];
  for (const cookie of cookies) {
    response.headers.append("set-cookie", cookie);
  }
  return response;
}

function getEnvString(env: Env, name: string): string {
  const value = env[name];
  return typeof value === "string" ? value : "";
}

function parseStripeSignature(header: string): { timestamp: number; signatures: string[] } {
  const parts = header.split(",").map((part) => part.trim());
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3))
    .filter(Boolean);

  const timestamp = Number(timestampPart?.slice(2));
  return { timestamp, signatures };
}

function hexToBytes(hex: string): Uint8Array {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return new Uint8Array();
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyStripeSignature(rawBody: string, signatureHeader: string, signingSecret: string) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) return { ok: false, error: "Invalid Stripe signature header" };

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    return { ok: false, error: "Stripe webhook timestamp outside tolerance" };
  }

  const expected = await hmacSha256Hex(signingSecret, `${timestamp}.${rawBody}`);
  const expectedBytes = hexToBytes(expected);
  const matched = signatures.some((sig) => timingSafeEqual(expectedBytes, hexToBytes(sig)));

  return matched ? { ok: true } : { ok: false, error: "Stripe signature verification failed" };
}

const app = new Hono<{ Bindings: Env }>();

// ─── Initialize environment & DB ───
app.use(async (c, next) => {
  setCloudflareEnv(c.env as unknown as Record<string, unknown>);
  globalThis.__cfExecCtx = c.executionCtx;

  const db = getD1(c.env);
  if (db) {
    setDb(db);
  }

  // Fail hard when the JWT signing secret is unset in production —
  // no hardcoded fallback exists, so auth would otherwise be forgeable.
  assertAppSecretConfigured();

  await next();
});

// ─── Security headers ───
app.use(async (c, next) => {
  await next();
  const headers = getSecurityHeaders();
  for (const [key, value] of Object.entries(headers)) {
    c.header(key, value);
  }
});

// ─── CORS ───
app.use("/api/*", cors(getCorsConfig()));

// ─── Trailing slash ───
app.use(trimTrailingSlash());

// ─── Rate limiting ───
app.use("/api/*", async (c, next) => {
  if (c.req.path === "/api/stripe/webhook") {
    await next();
    return;
  }

  const isAuth =
    c.req.path.includes("/api/auth/") ||
    c.req.path.includes("/api/oauth/callback/") ||
    c.req.path.includes("localAuth.login") ||
    c.req.path.includes("localAuth.register") ||
    c.req.path.includes("oauth.initiate") ||
    c.req.path.includes("oauth.callback");

  const config = isAuth ? { maxRequests: 5, windowMs: 60_000 } : undefined;
  const result = await checkRateLimit(c.req.raw, config, getD1(c.env));

  if (!result.allowed) {
    return c.json(
      {
        ok: false,
        error: "Too many requests",
        retryAfter: Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000)),
      },
      429,
    );
  }

  await next();
});

// Public client config. The project id is a Reown client identifier, not a
// server secret. Non-matching values are dropped and never logged.
app.get("/api/public-config", (c) => {
  const walletConnectProjectId = walletConnectProjectIdOrEmpty(c.env.WALLETCONNECT_PROJECT_ID);
  return c.json({
    walletConnectEnabled: walletConnectProjectId.length > 0,
    walletConnectProjectId,
  });
});

// ─── Health ───
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    status: "ok",
    version: "v3.0.0",
    database: getD1(c.env) ? "bound" : "missing",
    timestamp: new Date().toISOString(),
  }),
);

app.get("/api/db/health", async (c) => {
  const db = getD1(c.env);

  if (!db) {
    return c.json({ ok: false, error: "D1 binding missing" }, 500);
  }

  try {
    await db.prepare("SELECT 1 as ok").first();
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false, error: "D1 query failed" }, 500);
  }
});

// ─── Stripe webhook ───
app.post("/api/stripe/webhook", async (c) => {
  const db = getD1(c.env);
  if (!db) return c.json({ ok: false, error: "D1 binding missing" }, 500);

  const signingSecret = getEnvString(c.env, "STRIPE_WEBHOOK_SECRET");
  if (!signingSecret) return c.json({ ok: false, error: "Stripe webhook secret missing" }, 500);

  const signatureHeader = c.req.header("Stripe-Signature") || "";
  if (!signatureHeader) return c.json({ ok: false, error: "Missing Stripe-Signature header" }, 400);

  const rawBody = await c.req.text();
  const verified = await verifyStripeSignature(rawBody, signatureHeader, signingSecret);
  if (!verified.ok) return c.json({ ok: false, error: verified.error }, 400);

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return c.json({ ok: false, error: "Invalid JSON payload" }, 400);
  }

  if (!event.id || !event.type) return c.json({ ok: false, error: "Invalid Stripe event" }, 400);

  // Atomic idempotency claim: INSERT ... ON CONFLICT DO NOTHING on the
  // primary key makes exactly one isolate win; losers short-circuit as a
  // duplicate before any side effects run. (SELECT-then-insert was racy
  // under Stripe's at-least-once redelivery.)
  const claimed = await db
    .prepare(
      "INSERT INTO webhook_events (id, provider, event_type, processed_at, metadata) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING"
    )
    .bind(event.id, "stripe", event.type, Date.now(), JSON.stringify({ pending: true }))
    .run();
  if (!claimed?.meta?.changes) {
    return c.json({ ok: true, duplicate: true, eventId: event.id });
  }

  if (!STRIPE_ALLOWED_EVENTS.has(event.type)) {
    await db
      .prepare("UPDATE webhook_events SET metadata = ? WHERE id = ?")
      .bind(JSON.stringify({ ignored: true, processed_at: Date.now() }), event.id)
      .run();
    return c.json({ ok: true, ignored: true, type: event.type });
  }

  const object = event.data?.object || {};
  const sessionId = typeof object.id === "string" ? object.id : "";

  if (event.type === "checkout.session.completed" && sessionId) {
    await db.prepare("UPDATE stripe_sessions SET status = ? WHERE session_id = ?").bind("completed", sessionId).run();
    const session = await db.prepare("SELECT listing_id FROM stripe_sessions WHERE session_id = ? LIMIT 1").bind(sessionId).first<{ listing_id: number }>();
    if (session?.listing_id) {
      // Conditional inventory lock: only the first finalizer wins the listing
      await db.prepare("UPDATE listings SET status = ? WHERE id = ? AND status != ?").bind("sold", session.listing_id, "sold").run();
    }
  }

  if (event.type === "payment_intent.payment_failed" && sessionId) {
    await db.prepare("UPDATE stripe_sessions SET status = ? WHERE session_id = ?").bind("failed", sessionId).run();
  }

  await db
    .prepare("UPDATE webhook_events SET metadata = ? WHERE id = ?")
    .bind(JSON.stringify({ sessionId, processed_at: Date.now() }), event.id)
    .run();

  return c.json({ ok: true, eventId: event.id, type: event.type });
});

function parseOAuthProvider(value: string): OAuthProvider | null {
  switch (value) {
    case "google":
    case "x":
    case "github":
      return value;
    default:
      return null;
  }
}

// ─── OAuth provider redirect target ───
app.get("/api/oauth/callback/:provider", async (c) => {
  const provider = parseOAuthProvider(c.req.param("provider"));
  if (!provider) return c.json({ ok: false, error: "Unknown OAuth provider" }, 400);
  return handleOAuthCallback(c, provider);
});

// ─── Auth routes ───
app.post("/api/auth/register", async (c) => {
  let input: AuthInput;
  try {
    input = await c.req.json<AuthInput>();
  } catch {
    return c.json({ ok: false, error: "Invalid request body" }, 400);
  }

  const context = getRequestContext(c);
  try {
    const caller = appRouter.createCaller(await createContext(context));
    const result = await caller.localAuth.register({
      name: String(input.name || ""),
      email: String(input.email || ""),
      password: String(input.password || ""),
    });
    return applyContextCookies(c.json({ ok: true, ...result }), context.resHeaders);
  } catch (error) {
    return c.json({ ok: false, error: publicAuthMessage(error) }, 400);
  }
});

app.post("/api/auth/login", async (c) => {
  let input: AuthInput;
  try {
    input = await c.req.json<AuthInput>();
  } catch {
    return c.json({ ok: false, error: "Invalid request body" }, 400);
  }

  const context = getRequestContext(c);
  try {
    const caller = appRouter.createCaller(await createContext(context));
    const result = await caller.localAuth.login({
      email: String(input.email || ""),
      password: String(input.password || ""),
    });
    return applyContextCookies(c.json({ ok: true, ...result }), context.resHeaders);
  } catch (error) {
    return c.json({ ok: false, error: publicAuthMessage(error) }, 400);
  }
});

// ─── tRPC handler ───
async function handleTRPC(c: Context<{ Bindings: Env }>) {
  try {
    return await fetchRequestHandler({
      endpoint: "/api/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext,
      onError: (opts) => {
        console.error(`[tRPC] ${opts.error.code} | ${opts.path} | ${opts.error.message}`);
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[tRPC Handler Error]", message)
    return c.json({ error: "Internal server error" }, 500)
  }
}

app.all("/api/trpc", handleTRPC);
app.all("/api/trpc/*", handleTRPC);

app.all("/api/*", (c) => c.json({ error: "API route not found", path: c.req.path }, 404));

// Cloudflare Pages onRequest
export const onRequest = async (context: { request: Request; env: Env }) => {
  return app.fetch(context.request, context.env, context);
};