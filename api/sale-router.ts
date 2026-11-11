/**
 * Sale Completion & Commission Payout Router
 * Handles the full sale lifecycle:
 * 1. Buyer expresses interest via social lead
 * 2. Seller creates a sale transaction
 * 3. Payment processed via Stripe
 * 4. Shipping arranged
 * 5. Item marked shipped/delivered
 * 6. Commission calculated and held
 * 7. Seller payout processed after delivery
 */

import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, saleTransactions, sellerPayouts } from "@db/schema";
import { getCommissionRateFromTiers } from "./lib/commission";
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

/**
 * Calculate commission based on sale price using commission tiers
 */
async function calculateCommission(db: any, salePrice: number): Promise<{ rate: number; amount: number }> {
  const rate = Number(await getCommissionRateFromTiers(db, salePrice));
  const amount = (salePrice * rate) / 100;
  return { rate, amount };
}

export const saleRouter = createRouter({
  /**
   * Create a sale transaction when buyer is found
   */
  createSale: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        buyerEmail: z.string().email(),
        buyerName: z.string().min(1),
        salePrice: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const seller = ctx.user!;

      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);

      if (!listing) throw new Error("Listing not found");
      if (listing.sellerId !== seller.id && seller.role !== "admin") {
        throw new Error("You do not own this listing");
      }

      const { rate, amount } = await calculateCommission(db, input.salePrice);
      const sellerPayout = input.salePrice - amount;

      const insertResult = await db.insert(saleTransactions).values({
        listingId: input.listingId,
        sellerId: seller.id,
        buyerEmail: input.buyerEmail,
        buyerName: input.buyerName,
        salePrice: String(input.salePrice),
        commissionRate: String(rate),
        commissionAmount: String(amount),
        sellerPayout: String(sellerPayout),
        status: "pending",
      });
      const saleId = Number(insertResult.meta.last_row_id);

      // Mark listing as pending sale (not sold yet until payment)
      await db
        .update(listings)
        .set({ status: "pending" })
        .where(eq(listings.id, input.listingId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "sale.createSale",
        userId: seller.id,
        action: "sale_created",
        details: `sale:${saleId} listing:${input.listingId} price:${input.salePrice} commission:${amount}`,
      });

      return {
        success: true,
        saleId,
        salePrice: input.salePrice,
        commissionRate: rate,
        commissionAmount: amount,
        sellerPayout,
        message: `Sale recorded. Commission: ${rate}% ($${amount.toFixed(2)}). Your payout: $${sellerPayout.toFixed(2)}.`,
      };
    }),

  /**
   * Create Stripe payment intent for buyer to pay
   */
  createBuyerPayment: authedQuery
    .input(
      z.object({
        saleId: z.number(),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!isCheckoutRedirectAllowed(input.successUrl, ctx.req) || !isCheckoutRedirectAllowed(input.cancelUrl, ctx.req)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Checkout redirect URL is not allowed" });
      }
      const db = getDb();

      const [sale] = await db
        .select()
        .from(saleTransactions)
        .where(eq(saleTransactions.id, input.saleId))
        .limit(1);

      if (!sale) throw new Error("Sale not found");
      if (sale.sellerId !== ctx.user!.id && ctx.user!.role !== "admin") {
        throw new Error("Unauthorized");
      }

      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, sale.listingId))
        .limit(1);

      const body = new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": listing?.title || "Vault Purchase",
        "line_items[0][price_data][product_data][description]": `Purchase from The Vault exchange. Item sold by verified seller.`,
        "line_items[0][price_data][unit_amount]": String(Math.round(Number(sale.salePrice) * 100)),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        "metadata[saleId]": String(sale.id),
        "metadata[listingId]": String(sale.listingId),
        "metadata[sellerId]": String(sale.sellerId),
      });

      const session = await stripeFetch("/checkout/sessions", body);

      return {
        success: true,
        sessionId: session.id,
        url: session.url,
        amount: sale.salePrice,
      };
    }),

  /**
   * Mark sale as payment received
   */
  recordPayment: adminQuery
    .input(z.object({ saleId: z.number(), stripePaymentIntentId: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      await db
        .update(saleTransactions)
        .set({
          status: "payment_received",
          stripePaymentIntentId: input.stripePaymentIntentId,
        })
        .where(eq(saleTransactions.id, input.saleId));

      return { success: true, status: "payment_received" };
    }),

  /**
   * Mark item as shipped
   */
  markShipped: authedQuery
    .input(
      z.object({
        saleId: z.number(),
        carrier: z.enum(["fedex", "ups", "usps", "dhl"]),
        trackingNumber: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [sale] = await db
        .select()
        .from(saleTransactions)
        .where(eq(saleTransactions.id, input.saleId))
        .limit(1);

      if (!sale) throw new Error("Sale not found");
      if (sale.sellerId !== ctx.user!.id && ctx.user!.role !== "admin") {
        throw new Error("Unauthorized");
      }

      await db
        .update(saleTransactions)
        .set({
          status: "shipped",
          shippingCarrier: input.carrier,
          shippingTrackingNumber: input.trackingNumber,
          shippedAt: new Date(),
        })
        .where(eq(saleTransactions.id, input.saleId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "sale.markShipped",
        userId: ctx.user!.id,
        action: "item_shipped",
        details: `sale:${input.saleId} carrier:${input.carrier} tracking:${input.trackingNumber}`,
      });

      return { success: true, status: "shipped" };
    }),

  /**
   * Mark item as delivered
   */
  markDelivered: authedQuery
    .input(z.object({ saleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [sale] = await db
        .select()
        .from(saleTransactions)
        .where(eq(saleTransactions.id, input.saleId))
        .limit(1);

      if (!sale) throw new Error("Sale not found");
      if (sale.sellerId !== ctx.user!.id && ctx.user!.role !== "admin") {
        throw new Error("Unauthorized");
      }

      await db
        .update(saleTransactions)
        .set({
          status: "delivered",
          deliveredAt: new Date(),
        })
        .where(eq(saleTransactions.id, input.saleId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "sale.markDelivered",
        userId: ctx.user!.id,
        action: "item_delivered",
        details: `sale:${input.saleId}`,
      });

      return { success: true, status: "delivered" };
    }),

  /**
   * Complete sale and process seller payout
   */
  completeSale: authedQuery
    .input(z.object({ saleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [sale] = await db
        .select()
        .from(saleTransactions)
        .where(eq(saleTransactions.id, input.saleId))
        .limit(1);

      if (!sale) throw new Error("Sale not found");
      if (sale.sellerId !== ctx.user!.id && ctx.user!.role !== "admin") {
        throw new Error("Unauthorized");
      }

      if (sale.status !== "delivered" && sale.status !== "shipped") {
        throw new Error("Item must be shipped or delivered before completing");
      }

      // Mark listing as sold
      await db
        .update(listings)
        .set({ status: "sold" })
        .where(eq(listings.id, sale.listingId));

      // Create payout record
      const payoutInsert = await db.insert(sellerPayouts).values({
        sellerId: sale.sellerId,
        saleTransactionId: sale.id,
        amount: sale.sellerPayout,
        status: "pending",
      });
      const payoutId = Number(payoutInsert.meta.last_row_id);

      // Update sale as completed
      await db
        .update(saleTransactions)
        .set({ status: "completed", completedAt: new Date() })
        .where(eq(saleTransactions.id, input.saleId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "sale.completeSale",
        userId: ctx.user!.id,
        action: "sale_completed",
        details: `sale:${input.saleId} payout:${payoutId} amount:${sale.sellerPayout}`,
      });

      return {
        success: true,
        status: "completed",
        payoutId,
        sellerPayout: Number(sale.sellerPayout),
        commissionAmount: Number(sale.commissionAmount),
        message: `Sale complete! Commission of $${Number(sale.commissionAmount).toFixed(2)} retained. Payout of $${Number(sale.sellerPayout).toFixed(2)} will be processed to your account.`,
      };
    }),

  /**
   * Get my sales (as seller)
   */
  mySales: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(saleTransactions)
      .where(eq(saleTransactions.sellerId, ctx.user!.id))
      .orderBy(desc(saleTransactions.createdAt));
  }),

  /**
   * Get sale by ID with details
   */
  getSale: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [sale] = await db
        .select()
        .from(saleTransactions)
        .where(eq(saleTransactions.id, input.id))
        .limit(1);
      if (!sale) return null;

      // Sellers see their own sales; buyers their own purchases; admins everything.
      if (
        ctx.user.role !== "admin" &&
        sale.sellerId !== ctx.user.id &&
        sale.buyerId !== ctx.user.id
      ) {
        return null;
      }

      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, sale.listingId))
        .limit(1);

      return { sale, listing: listing || null };
    }),

  /**
   * Get sale stats
   */
  stats: adminQuery.query(async () => {
    const db = getDb();
    const sales = await db.select().from(saleTransactions);
    const payouts = await db.select().from(sellerPayouts);

    const completed = sales.filter((s) => s.status === "completed");
    const totalRevenue = completed.reduce((s, x) => s + Number(x.salePrice || 0), 0);
    const totalCommission = completed.reduce((s, x) => s + Number(x.commissionAmount || 0), 0);
    const totalPayouts = payouts.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount || 0), 0);

    return {
      totalSales: sales.length,
      completedSales: completed.length,
      pendingSales: sales.filter((s) => s.status === "pending").length,
      shippedSales: sales.filter((s) => s.status === "shipped").length,
      totalRevenue: totalRevenue.toFixed(2),
      totalCommission: totalCommission.toFixed(2),
      totalPayouts: totalPayouts.toFixed(2),
    };
  }),
});
