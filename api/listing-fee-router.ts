/**
 * $20 One-Time Listing Fee System
 * Integrated with Stripe Checkout
 * Sellers must pay before their listing goes live on the exchange
 */

import { z } from "zod";
import { createRouter, publicQuery, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, listingFees } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { env } from "./lib/env";
import { logAudit, getClientIP, isCheckoutRedirectAllowed } from "./security";
import { TRPCError } from "@trpc/server";

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
    const err = await res.text();
    throw new Error(`Stripe API error: ${err}`);
  }
  return res.json();
}

const FEE_AMOUNT_CENTS = 2000; // $20.00
const FEE_AMOUNT_DOLLARS = "20.00";

export const listingFeeRouter = createRouter({
  /**
   * Create a Stripe Checkout session for the $20 listing fee
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

      // Verify listing exists and belongs to user
      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);

      if (!listing) throw new Error("Listing not found");
      if (listing.sellerId !== user.id && user.role !== "admin") {
        throw new Error("You do not own this listing");
      }

      // Check if fee already paid
      const existing = await db
        .select()
        .from(listingFees)
        .where(eq(listingFees.listingId, input.listingId))
        .limit(1);

      if (existing.length > 0 && existing[0].status === "paid") {
        return {
          success: true,
          alreadyPaid: true,
          feeId: existing[0].id,
          message: "Listing fee already paid.",
        };
      }

      // Create Stripe Checkout session
      const body = new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": `The Vault Listing Fee - "${listing.title}"`,
        "line_items[0][price_data][product_data][description]": "One-time fee to list your item on The Vault exchange. Includes AI buyer search.",
        "line_items[0][price_data][unit_amount]": String(FEE_AMOUNT_CENTS),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        "metadata[listingId]": String(input.listingId),
        "metadata[userId]": String(user.id),
        "metadata[feeType]": "listing_fee",
      });

      const session = await stripeFetch("/checkout/sessions", body);

      // Create fee record
      const insertResult = await db.insert(listingFees).values({
        userId: user.id,
        listingId: input.listingId,
        stripeSessionId: session.id,
        amount: FEE_AMOUNT_DOLLARS,
        status: "pending",
      });
      const feeId = Number(insertResult.meta.last_row_id);

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "listingFee.createCheckout",
        userId: user.id,
        action: "listing_fee_checkout_created",
        details: `listing:${input.listingId} fee:${feeId} session:${session.id}`,
      });

      return {
        success: true,
        feeId,
        sessionId: session.id,
        url: session.url,
        amount: FEE_AMOUNT_DOLLARS,
      };
    }),

  /**
   * Verify listing fee payment from Stripe webhook or manual check
   */
  verifyPayment: publicQuery
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
  checkStatus: publicQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();

      const [fee] = await db
        .select()
        .from(listingFees)
        .where(eq(listingFees.listingId, input.listingId))
        .limit(1);

      if (!fee) {
        return { paid: false, status: "not_found" };
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
