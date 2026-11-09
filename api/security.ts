import { env } from "./lib/env";

/** Minimal D1 (or D1-compatible) shape so security state can live in durable storage. */
export interface D1Like {
  prepare(sql: string): {
    bind(...values: unknown[]): { all(): Promise<any>; run(): Promise<any> };
  };
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lastSeen: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const MAX_RATE_LIMIT_ENTRIES = 10000;

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 60,
};

export const STRICT_RATE_LIMIT: RateLimitConfig = {
  windowMs: 60 * 1000,
  maxRequests: 5,
};

function pruneRateLimitStore(now: number) {
  if (rateLimitStore.size < MAX_RATE_LIMIT_ENTRIES) {
    return;
  }

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now - entry.lastSeen > 15 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
}

export function getClientIP(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * D1-backed fixed-window counter. Survives isolate recycling and is shared
 * across isolates in a colo, unlike the in-process Map fallback.
 */
async function checkRateLimitD1(
  db: D1Like,
  key: string,
  config: RateLimitConfig,
  now: number,
): Promise<RateLimitResult> {
  const stmt = db.prepare(
    "SELECT count, window_start FROM rate_limit_counters WHERE key = ?"
  );
  const existing = await stmt.bind(key).all();
  const row = existing?.results?.[0];

  if (!row || now - Number(row.window_start) > config.windowMs) {
    await db
      .prepare(
        "INSERT INTO rate_limit_counters (key, window_start, count, last_seen) VALUES (?, ?, 1, ?) " +
          "ON CONFLICT(key) DO UPDATE SET window_start = ?, count = 1, last_seen = ?"
      )
      .bind(key, now, now, now, now)
      .run();
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs };
  }

  const count = Number(row.count);
  if (count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: Number(row.window_start) + config.windowMs };
  }

  await db
    .prepare("UPDATE rate_limit_counters SET count = count + 1, last_seen = ? WHERE key = ?")
    .bind(now, key)
    .run();
  return {
    allowed: true,
    remaining: config.maxRequests - count - 1,
    resetAt: Number(row.window_start) + config.windowMs,
  };
}

export async function checkRateLimit(
  req: Request,
  config: RateLimitConfig = DEFAULT_RATE_LIMIT,
  d1?: D1Like,
): Promise<RateLimitResult> {
  const key = (config.keyGenerator || getClientIP)(req);
  const now = Date.now();

  if (d1) {
    try {
      return await checkRateLimitD1(d1, key, config, now);
    } catch (err) {
      // Durable counter failed (e.g. table missing on an un-migrated env):
      // degrade to the in-process fallback rather than blocking traffic.
      console.error("[security] D1 rate limit failed, using in-process fallback:", err);
    }
  }

  pruneRateLimitStore(now);

  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
      lastSeen: now,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  entry.lastSeen = now;

  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.windowStart + config.windowMs,
    };
  }

  entry.count++;

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.windowStart + config.windowMs,
  };
}

const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*>/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
];

export function sanitizeInput(input: string): string {
  const truncated = input.slice(0, 5000);

  let sanitized = truncated;

  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[removed]");
  }

  return sanitized
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

export function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeInput(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => (typeof item === "string" ? sanitizeInput(item) : item));
    } else {
      result[key] = value;
    }
  }

  return result;
}

export function sanitizeForPrompt(input: string): string {
  return input
    .replace(/\{\}/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .substring(0, 2000);
}

export function getSecurityHeaders(): Record<string, string> {
  return {
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-DNS-Prefetch-Control": "off",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "accelerometer=(), ambient-light-sensor=(), autoplay=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(self), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(self), picture-in-picture=(), publickey-credentials-get=(self), screen-wake-lock=(), usb=(), xr-spatial-tracking=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-site",
    "Cross-Origin-Embedder-Policy": "credentialless",
    "Origin-Agent-Cluster": "?1",
    "Content-Security-Policy":
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' https://js.stripe.com https://appleid.cdn-apple.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "connect-src 'self' https://api.stripe.com https://api.mainnet-beta.solana.com https://api.opensea.io https://api.rarible.org https://api.magiceden.dev https://appleid.apple.com https://accounts.google.com https://oauth2.googleapis.com https://api.github.com https://api.x.com; " +
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://appleid.apple.com; " +
      "media-src 'none'; " +
      "worker-src 'self' blob:; " +
      "object-src 'none'; " +
      "base-uri 'self'; " +
      "form-action 'self' https://appleid.apple.com https://accounts.google.com https://github.com https://x.com; " +
      "frame-ancestors 'none'; " +
      "upgrade-insecure-requests;",
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };
}

function normalizeAllowedHost(value: string): string {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, "").split("/")[0].toLowerCase();
  }
}

export function getCorsConfig() {
  return {
    origin: (origin: string): string | null => {
      if (!origin) return null;

      let hostname = "";

      try {
        hostname = new URL(origin).hostname.toLowerCase();
      } catch {
        return null;
      }

      if (!env.isProduction && ["localhost", "127.0.0.1"].includes(hostname)) {
        return origin;
      }

      const allowedDomain = env.vaultDomain ? normalizeAllowedHost(env.vaultDomain) : "thevaultdfw.win";

      if (hostname === allowedDomain || hostname.endsWith(`.${allowedDomain}`)) {
        return origin;
      }

      return null;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] as string[],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Local-Auth-Token",
      "X-Session-Id",
      "X-Agent-Token",
      "X-Requested-With",
      "Stripe-Signature",
      "X-CC-Webhook-Signature",
      "X-Client-Version",
    ],
    exposeHeaders: ["Retry-After"],
    credentials: true,
    maxAge: 86400,
  };
}

interface AuditLogEntry {
  timestamp: string;
  ip: string;
  method: string;
  path: string;
  userId?: number;
  action: string;
  details?: string;
  userAgent?: string;
}

const auditLog: AuditLogEntry[] = [];
const MAX_AUDIT_LOG = 10000;

export function logAudit(entry: Omit<AuditLogEntry, "timestamp">): void {
  const logEntry: AuditLogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  auditLog.push(logEntry);

  if (auditLog.length > MAX_AUDIT_LOG) {
    auditLog.splice(0, auditLog.length - MAX_AUDIT_LOG);
  }

  console.log(
    `[AUDIT] ${logEntry.timestamp} | ${logEntry.ip} | ${logEntry.method} ${logEntry.path} | ${logEntry.action}${entry.userId ? ` | user:${entry.userId}` : ""}${entry.details ? ` | ${entry.details}` : ""}`,
  );
}

export function getAuditLog(
  limit: number = 100,
  filter?: { ip?: string; userId?: number; action?: string },
): AuditLogEntry[] {
  let logs = [...auditLog].reverse();

  if (filter?.ip) logs = logs.filter((l) => l.ip === filter.ip);
  if (filter?.userId) logs = logs.filter((l) => l.userId === filter.userId);
  if (filter?.action) logs = logs.filter((l) => l.action === filter.action);

  return logs.slice(0, limit);
}

const revokedTokens = new Set<string>();
const revokedUserSessions = new Map<number, number>();

async function revokeTokenD1(db: D1Like, token: string): Promise<void> {
  await db
    .prepare("INSERT OR IGNORE INTO revoked_tokens (token, created_at) VALUES (?, ?)")
    .bind(token, Date.now())
    .run();
}

/** Revocation state lives in D1 when available (shared across isolates). */
export async function revokeToken(token: string, d1?: D1Like): Promise<void> {
  if (token.length >= 4096) return;
  if (d1) {
    try {
      await revokeTokenD1(d1, token);
      return;
    } catch (err) {
      console.error("[security] D1 token revocation failed, using in-process fallback:", err);
    }
  }
  revokedTokens.add(token);
}

export async function revokeAllUserSessions(userId: number, d1?: D1Like): Promise<void> {
  if (d1) {
    try {
      await dbUpsertRevocation(d1, userId);
      return;
    } catch (err) {
      console.error("[security] D1 session revocation failed, using in-process fallback:", err);
    }
  }
  revokedUserSessions.set(userId, Date.now());
}

async function dbUpsertRevocation(d1: D1Like, userId: number): Promise<void> {
  const now = Date.now();
  await db
    .prepare(
      "INSERT INTO user_session_revocations (user_id, revoked_at) VALUES (?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET revoked_at = ?"
    )
    .bind(userId, now, now)
    .run();
}

export async function isTokenRevoked(token: string, d1?: D1Like): Promise<boolean> {
  if (d1) {
    try {
      const res = await d1
        .prepare("SELECT 1 as x FROM revoked_tokens WHERE token = ? LIMIT 1")
        .bind(token)
        .all();
      if (res?.results?.length) return true;
      return false;
    } catch (err) {
      console.error("[security] D1 token lookup failed, using in-process fallback:", err);
    }
  }
  return revokedTokens.has(token);
}

export async function isUserSessionRevoked(userId: number, tokenIssuedAt: number, d1?: D1Like): Promise<boolean> {
  if (d1) {
    try {
      const res = await d1
        .prepare("SELECT revoked_at FROM user_session_revocations WHERE user_id = ? LIMIT 1")
        .bind(userId)
        .all();
      const row = res?.results?.[0];
      if (row) return tokenIssuedAt < Number(row.revoked_at);
      return false;
    } catch (err) {
      console.error("[security] D1 session lookup failed, using in-process fallback:", err);
    }
  }
  const revokedAt = revokedUserSessions.get(userId);
  return revokedAt ? tokenIssuedAt < revokedAt : false;
}

export function validateUrl(url: string, allowedHosts?: string[]): boolean {
  try {
    const parsed = new URL(url);

    if (env.isProduction && parsed.protocol !== "https:") return false;
    if (env.isProduction && (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")) return false;
    if (allowedHosts && !allowedHosts.includes(parsed.hostname)) return false;
    if (parsed.username || parsed.password) return false;

    return true;
  } catch {
    return false;
  }
}

export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) errors.push("Minimum 8 characters");
  if (password.length > 128) errors.push("Maximum 128 characters");
  if (!/[A-Z]/.test(password)) errors.push("At least one uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("At least one lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("At least one number");
  if (!/[^A-Za-z0-9]/.test(password)) errors.push("At least one special character");

  return {
    valid: errors.length === 0,
    errors,
  };
}
