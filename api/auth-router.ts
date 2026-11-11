import { Session } from "@contracts/constants";
import {
  appendSessionCookie,
  LOCAL_AUTH_COOKIE,
  OAUTH_SESSION_COOKIE,
  readRequestCookie,
} from "./lib/cookies";
import { toPublicUser } from "./lib/public-user";
import { getRawD1 } from "./queries/connection";
import { revokeAllUserSessions, revokeToken } from "./security";
import { createRouter, authedQuery } from "./middleware";

export const authRouter = createRouter({
  me: authedQuery.query((opts) => toPublicUser(opts.ctx.user)),
  logout: authedQuery.mutation(async ({ ctx }) => {
    const headerToken = ctx.req.headers.get("x-local-auth-token");
    const localToken = readRequestCookie(ctx.req.headers, LOCAL_AUTH_COOKIE);
    const oauthToken = readRequestCookie(ctx.req.headers, OAUTH_SESSION_COOKIE);
    const d1 = getRawD1() ?? undefined;

    for (const token of [headerToken, localToken, oauthToken]) {
      if (token) await revokeToken(token, d1);
    }
    if (ctx.user?.id) await revokeAllUserSessions(ctx.user.id, d1);

    appendSessionCookie(ctx.resHeaders, Session.cookieName, "", ctx.req.headers, 0);
    appendSessionCookie(ctx.resHeaders, OAUTH_SESSION_COOKIE, "", ctx.req.headers, 0);
    appendSessionCookie(ctx.resHeaders, LOCAL_AUTH_COOKIE, "", ctx.req.headers, 0);

    return { success: true };
  }),
});
