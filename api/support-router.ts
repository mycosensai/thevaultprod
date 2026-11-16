import { z } from "zod";
import { desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery, publicQuery } from "./middleware";
import { getDb, getRawD1 } from "./queries/connection";
import { supportRequests } from "@db/schema";
import { sendEmail } from "./email-service";
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

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const supportRouter = createRouter({
  list: adminQuery.query(async () => {
    await ensureSupportTable();
    const db = getDb();
    return db.select().from(supportRequests).orderBy(desc(supportRequests.createdAt)).limit(50);
  }),

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
      const mailed = await sendEmail({
        to: SUPPORT_EMAIL,
        subject: `Vault support: ${input.topic}`,
        text: `From: ${input.name} <${input.email}>\nTopic: ${input.topic}\n\n${input.message}`,
        html: `<p><strong>From:</strong> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p><p><strong>Topic:</strong> ${escapeHtml(input.topic)}</p><pre>${escapeHtml(input.message)}</pre>`,
      });
      if (!mailed.success) {
        console.error("[support] ticket stored; staff email was not sent");
      }
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
