import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery } from "./middleware";
import { getDb, getRawD1 } from "./queries/connection";
import { supportRequests } from "@db/schema";
import { checkRateLimit, getClientIP } from "./security";

const SUPPORT_EMAIL = "ratchetkrewelabs@gmail.com";

const createInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(320),
  topic: z.enum(["order", "listing", "payment", "verification", "other"]),
  message: z.string().trim().min(10).max(4000),
});

async function ensureSupportTable(): Promise<void> {
  const d1 = getRawD1();
  if (!d1) return;
  await d1
    .prepare(
      `CREATE TABLE IF NOT EXISTS support_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        topic TEXT NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER,
        created_at INTEGER NOT NULL
      )`,
    )
    .bind()
    .run();
}

export const supportRouter = createRouter({
  create: publicQuery.input(createInput).mutation(async ({ input, ctx }) => {
    const limit = await checkRateLimit(
      ctx.req,
      {
        windowMs: 60 * 60_000,
        maxRequests: 5,
        keyGenerator: (req) => `support:${getClientIP(req)}`,
      },
      getRawD1() ?? undefined,
    );
    if (!limit.allowed) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many support requests. Email us if this continues." });
    }

    try {
      await ensureSupportTable();
      const db = getDb();
      await db.insert(supportRequests).values({
        name: input.name,
        email: input.email,
        topic: input.topic,
        message: input.message,
        userId: ctx.user?.id ?? null,
      });
    } catch (error) {
      console.error("[support] could not store ticket");
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `We could not save that request. Email ${SUPPORT_EMAIL} and we will pick it up.`,
      });
    }

    return {
      success: true,
      message: "Ticket received. We will reply to the email you entered.",
    };
  }),
});
