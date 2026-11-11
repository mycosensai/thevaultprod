import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import { verifyOAuthSession } from "./oauth-handlers";
import { verifyLocalToken } from "./local-auth-router";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";
import { LOCAL_AUTH_COOKIE, readRequestCookie } from "./lib/cookies";
import { toPublicUser } from "./lib/public-user";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = {
    req: opts.req,
    resHeaders: opts.resHeaders,
  };

  // OAuth session auth
  try {
    const oauthUser = await verifyOAuthSession(opts.req.headers);

    if (oauthUser) {
      ctx.user = toPublicUser(oauthUser) as User;
      return ctx;
    }
  } catch {
    // OAuth session invalid
  }

  // Local auth: httpOnly cookie, then a legacy header for non-browser clients.
  try {
    const localToken = readRequestCookie(opts.req.headers, LOCAL_AUTH_COOKIE) || opts.req.headers.get("x-local-auth-token");

    if (localToken) {
      const userId = await verifyLocalToken(localToken);

      if (userId) {
        const db = getDb();

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, userId))
          .limit(1);

        if (user) {
          ctx.user = toPublicUser(user) as User;
        }
      }
    }
  } catch {
    // Local auth invalid
  }

  return ctx;
}
