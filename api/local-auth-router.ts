import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb, getRawD1 } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { SignJWT, jwtVerify } from "jose";
import { TRPCError } from "@trpc/server";
import { validatePasswordStrength, logAudit, getClientIP, isTokenRevoked, isUserSessionRevoked } from "./security";
import { env } from "./lib/env";
import { appendSessionCookie, LOCAL_AUTH_COOKIE, readRequestCookie, SESSION_MAX_AGE_SECONDS } from "./lib/cookies";
import { toPublicUser } from "./lib/public-user";

// Lazy JWT secret — resolved on first use, refreshed if APP_SECRET changes.
// Nothing here runs at module load: Pages evaluates this file before bindings exist.
let jwtSecretValue = "";
let jwtSecretCache: Uint8Array | null = null;
function getJwtSecret(): Uint8Array {
  const secret = env.appSecret;
  if (!secret) {
    throw new Error("APP_SECRET is not configured");
  }
  if (jwtSecretCache && jwtSecretValue === secret) return jwtSecretCache;
  jwtSecretValue = secret;
  jwtSecretCache = new TextEncoder().encode(secret);
  return jwtSecretCache;
}

async function createToken(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Reduced from 30 days to 7 days
    .sign(getJwtSecret());
}

function localAuthTokenFromRequest(headers: Headers): string | null {
  return readRequestCookie(headers, LOCAL_AUTH_COOKIE) || headers.get("x-local-auth-token");
}

export async function verifyLocalToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      clockTolerance: 60,
    });
    const userId = payload.sub ? parseInt(payload.sub, 10) : null;
    if (!userId) return null;
    const d1 = getRawD1() ?? undefined;
    if (await isTokenRevoked(token, d1)) return null;
    // iat is whole seconds. Compare at the end of that second so a logout
    // and a new login in the same second do not revoke the new token.
    const issuedAt = typeof payload.iat === "number" ? payload.iat * 1000 + 999 : 0;
    if (await isUserSessionRevoked(userId, issuedAt, d1)) return null;
    return userId;
  } catch {
    return null;
  }
}

function issueLocalSession(ctx: { req: Request; resHeaders: Headers }, token: string) {
  appendSessionCookie(ctx.resHeaders, LOCAL_AUTH_COOKIE, token, ctx.req.headers, SESSION_MAX_AGE_SECONDS);
}

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().max(320),
        password: z.string().min(8).max(255),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Validate password strength
      const strength = validatePasswordStrength(input.password);
      if (!strength.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Password too weak: ${strength.errors.join(", ")}`,
        });
      }

      const db = getDb();
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        // Log the attempt but don't reveal email exists
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "localAuth.register",
          action: "register_duplicate_email",
          details: `email:${input.email}`,
        });
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      const hashedPassword = await hashPassword(input.password);
      const insertResult = await db.insert(users).values({
        name: input.name,
        email: input.email,
        password: hashedPassword,
        role: "user",
      });
      const userId = Number(insertResult.meta.last_row_id);

      const token = await createToken(userId);
      issueLocalSession(ctx, token);

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "localAuth.register",
        action: "user_registered",
        details: `user:${userId}`,
      });

      return {
        user: {
          id: userId,
          name: input.name,
          email: input.email,
        },
      };
    }),

  login: publicQuery
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!user || !user.password) {
        // Generic error to prevent user enumeration
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "localAuth.login",
          action: "login_failed",
          details: `email:${input.email} reason:invalid_credentials`,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const valid = await verifyPassword(input.password, user.password);
      if (!valid) {
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "localAuth.login",
          action: "login_failed",
          details: `user:${user.id} reason:wrong_password`,
        });
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      const token = await createToken(user.id);
      issueLocalSession(ctx, token);

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "localAuth.login",
        userId: user.id,
        action: "login_success",
      });

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    const token = localAuthTokenFromRequest(ctx.req.headers);
    if (!token) return null;

    const userId = await verifyLocalToken(token);
    if (!userId) return null;

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user ? toPublicUser(user) : null;
  }),
});
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(input: string): Uint8Array<ArrayBuffer> {
  const bin = atob(input);
  const bytes = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 120_000, hash: "SHA-256" }, key, 256);
  return `pbkdf2$120000$${bytesToBase64(salt)}$${bytesToBase64(new Uint8Array(bits))}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationStr, saltB64, hashB64] = stored.split("$");
  if (scheme !== "pbkdf2" || !iterationStr || !saltB64 || !hashB64) return false;
  const iterations = Number(iterationStr);
  const salt = base64ToBytes(saltB64);
  const expected = base64ToBytes(hashB64);
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, expected.length * 8);
  const actual = new Uint8Array(bits);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= actual[i] ^ expected[i];
  return diff === 0;
}
