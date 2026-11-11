/**
 * Email Router
 * Handles sending appraisal results via email
 * Integrated with Resend API for Cloudflare Workers
 */

import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { appraisals } from "@db/schema";
import { eq } from "drizzle-orm";
import { env } from "./lib/env";
import { sendEmail, buildAppraisalEmail } from "./email-service";
import { logAudit, getClientIP } from "./security";
import { commissionRateString } from "../src/lib/commission-policy";

export const emailRouter = createRouter({
  /**
   * Send appraisal results via email
   * Requires appraisalId and recipient email
   */
  sendAppraisalResult: authedQuery
    .input(
      z.object({
        appraisalId: z.number(),
        email: z.string().email(),
        paymentLink: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Fetch the appraisal
      const [appraisal] = await db
        .select()
        .from(appraisals)
        .where(eq(appraisals.id, input.appraisalId))
        .limit(1);

      if (!appraisal) {
        return { success: false, error: "Appraisal not found" };
      }

      // Only the appraisal's owner (or an admin) may email it out.
      const appraisalOwner = (appraisal as any).userId;
      if (ctx.user.role !== "admin" && appraisalOwner !== ctx.user.id) {
        return { success: false, error: "Forbidden" };
      }

      const ev = Number(appraisal.estimatedValue) || 0;
      const low = Number(appraisal.valueRangeLow) || ev * 0.5;
      const high = Number(appraisal.valueRangeHigh) || ev * 1.5;
      const commissionRate = appraisal.commissionRate || commissionRateString(ev);
      const commissionEstimate = ev * (parseFloat(commissionRate) / 100);

      // Build payment link if not provided
      const payLink =
        input.paymentLink ||
        `${ctx.req ? new URL(ctx.req.url).origin : "https://thevaultdfw.win"}/proverify?appraisalId=${input.appraisalId}`;

      // Build email content
      const { html, text } = buildAppraisalEmail(
        appraisal.itemName,
        ev,
        low,
        high,
        appraisal.confidence || "medium",
        appraisal.condition || "Not assessed",
        appraisal.marketAnalysis || "No market analysis available.",
        commissionRate,
        commissionEstimate,
        payLink
      );

      // Send email
      const result = await sendEmail({
        to: input.email,
        subject: `Your AI Appraisal for "${appraisal.itemName}" — $${ev.toLocaleString()}`,
        html,
        text,
      });

      if (!result.success) {
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "email.sendAppraisalResult",
          userId: ctx.user?.id,
          action: "email_failed",
          details: `appraisal:${input.appraisalId} to:${input.email} error:${result.error}`,
        });
        return { success: false, error: result.error };
      }

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "email.sendAppraisalResult",
        userId: ctx.user?.id,
        action: "email_sent",
        details: `appraisal:${input.appraisalId} to:${input.email} value:$${ev}`,
      });

      return {
        success: true,
        message: `Appraisal sent to ${input.email}`,
        emailId: result.id,
      };
    }),

  /**
   * Test email configuration
   */
  testConfig: adminQuery.query(async () => {
    return { configured: !!(env as any).resendApiKey };
  }),
});
