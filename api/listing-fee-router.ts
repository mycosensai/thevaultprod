/**
 * Listing fee records.
 * The Vault does not charge a listing fee. createCheckout keeps the old
 * procedure name so existing clients do not start a paid checkout.
 */

import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, listingFees } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { env } from "./lib/env";
import { logAudit, getClientIP, isCheckoutRedirectAllowed } from "./security";
import { TRPCError } from "@trpc/server";
import { paymentProviderError } from "./lib/stripe-error";
import { canManageOwnedRow } from "./security";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeFetch(endpoint: string, body?: URLSearchParams): Promise<any> {
  if (!env.stripeSecretKey) throw new Error("Stripe not configured");
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body?.toString(),
  });
  if (!res.ok) {
    await res.text();
    throw paymentProviderError(res.status);
  }
  return res.json();
}

export const listingFeeRouter = createRouter({
  /**
   * Confirm a listing without charging a listing fee.
   * successUrl and cancelUrl stay in the input for older clients.
   */
  createCheckout: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isCheckoutRedirectAllowed(input.successUrl, ctx.req) || !isCheckoutRedirectAllowed(input.cancelUrl, ctx.req)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Checkout redirect URL is not allowed" });
      }
      const db = getDb();
      const user = ctx.user!;

      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);

      if (!listing) throw new Error("Listing not found");
      if (listing.sellerId !== user.id && user.role !== "admin") {
        throw new Error("You do not own this listing");
      }

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "listingFee.createCheckout",
        userId: user.id,
        action: "listing_fee_waived",
        details: `listing:${input.listingId} amount:0.00`,
      });

      return {
        success: true,
        alreadyPaid: true,
        url: null,
        amount: "0.00",
        message: "The Vault does not charge a listing fee. Commission is collected only when the item sells.",
      };
    }),

  /**
   * Verify listing fee payment from Stripe webhook or manual check
   */
  verifyPayment: authedQuery
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const session = await stripeFetch(`/checkout/sessions/${input.sessionId}`);

      if (session.payment_status !== "paid") {
        return { success: false, status: session.payment_status, message: "Payment not complete" };
      }

      const [fee] = await db
        .select()
        .from(listingFees)
        .where(eq(listingFees.stripeSessionId, input.sessionId))
        .limit(1);

      if (!fee) {
        return { success: false, message: "Fee record not found" };
      }

      if (!canManageOwnedRow(ctx.user, fee.userId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      }

      if (fee.status === "paid") {
        return { success: true, alreadyPaid: true, listingId: fee.listingId };
      }

      // Mark fee as paid
      await db
        .update(listingFees)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(listingFees.id, fee.id));

      // Activate listing
      if (fee.listingId) {
        await db
          .update(listings)
          .set({ status: "active" })
          .where(eq(listings.id, fee.listingId));
      }

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "listingFee.verifyPayment",
        userId: fee.userId || undefined,
        action: "listing_fee_paid",
        details: `fee:${fee.id} listing:${fee.listingId} session:${input.sessionId}`,
      });

      return {
        success: true,
        listingId: fee.listingId,
        amount: fee.amount,
        message: "Listing fee paid. Your item is now live on the exchange.",
      };
    }),

  /**
   * Check if a listing fee has been paid
   */
  checkStatus: authedQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      const [fee] = await db
        .select()
        .from(listingFees)
        .where(eq(listingFees.listingId, input.listingId))
        .limit(1);

      if (!fee) {
        return { paid: false, status: "not_found" };
      }

      if (!canManageOwnedRow(ctx.user, fee.userId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Forbidden" });
      }

      return {
        paid: fee.status === "paid",
        status: fee.status,
        amount: fee.amount,
        paidAt: fee.paidAt,
      };
    }),

  /**
   * Get all listing fees for current user
   */
  myFees: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(listingFees)
      .where(eq(listingFees.userId, ctx.user!.id))
      .orderBy(desc(listingFees.createdAt));
  }),

  /**
   * Get listing fee stats (admin)
   */
  stats: adminQuery.query(async () => {
    const db = getDb();
    const fees = await db.select().from(listingFees);

    const paid = fees.filter((f) => f.status === "paid");
    const totalRevenue = paid.reduce((s, f) => s + Number(f.amount || 0), 0);

    return {
      totalFees: fees.length,
      paidFees: paid.length,
      pendingFees: fees.filter((f) => f.status === "pending").length,
      totalRevenue: totalRevenue.toFixed(2),
    };
  }),
});
