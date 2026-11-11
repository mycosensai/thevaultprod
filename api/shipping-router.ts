/**
 * Shipping Calculator Router
 * Provides shipping rate estimates for FedEx, UPS, USPS
 * Uses carrier APIs (simulated when keys not available)
 * Integrates with sale completion flow
 */

import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { shippingQuotes, listings, saleTransactions } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { logAudit, getClientIP } from "./security";

// ─── Simulated Shipping Rates ───
// In production, these would call actual carrier APIs
// FedEx: https://developer.fedex.com/
// UPS: https://developer.ups.com/
// USPS: https://developer.usps.com/

interface SimulatedRate {
  carrier: string;
  service: string;
  cost: number;
  days: number;
  insurance: number;
}

function simulateShippingRates(
  originZip: string,
  destZip: string,
  weight: number,
  declaredValue: number
): SimulatedRate[] {
  const distance = Math.abs(parseInt(originZip || "10001") - parseInt(destZip || "90210"));
  const baseCost = Math.max(12, distance * 0.015 + weight * 0.5);
  const insuranceRate = declaredValue > 500 ? declaredValue * 0.005 : 0;

  return [
    {
      carrier: "usps",
      service: "Priority Mail",
      cost: Math.round((baseCost * 0.8 + insuranceRate) * 100) / 100,
      days: Math.max(2, Math.ceil(distance / 800)),
      insurance: insuranceRate,
    },
    {
      carrier: "usps",
      service: "Priority Mail Express",
      cost: Math.round((baseCost * 1.4 + insuranceRate + 15) * 100) / 100,
      days: Math.max(1, Math.ceil(distance / 1200)),
      insurance: insuranceRate,
    },
    {
      carrier: "ups",
      service: "UPS Ground",
      cost: Math.round((baseCost * 1.0 + insuranceRate) * 100) / 100,
      days: Math.max(1, Math.ceil(distance / 500)),
      insurance: insuranceRate,
    },
    {
      carrier: "ups",
      service: "UPS 2nd Day Air",
      cost: Math.round((baseCost * 1.8 + insuranceRate + 20) * 100) / 100,
      days: Math.max(2, Math.min(2, Math.ceil(distance / 1000))),
      insurance: insuranceRate,
    },
    {
      carrier: "fedex",
      service: "FedEx Ground",
      cost: Math.round((baseCost * 1.05 + insuranceRate) * 100) / 100,
      days: Math.max(1, Math.ceil(distance / 480)),
      insurance: insuranceRate,
    },
    {
      carrier: "fedex",
      service: "FedEx 2Day",
      cost: Math.round((baseCost * 1.9 + insuranceRate + 18) * 100) / 100,
      days: 2,
      insurance: insuranceRate,
    },
  ];
}

const CARRIER_LINKS: Record<string, string> = {
  usps: "https://postcalc.usps.com/",
  ups: "https://www.ups.com/ups/quote",
  fedex: "https://www.fedex.com/en-us/shipping/rates.html",
  dhl: "https://www.dhl.com/us-en/home/quote.html",
};

export const shippingRouter = createRouter({
  /**
   * Get shipping rate estimates for an item
   */
  getRates: publicQuery
    .input(
      z.object({
        listingId: z.number(),
        originZip: z.string().min(5).max(10),
        destinationZip: z.string().min(5).max(10),
        packageWeight: z.number().positive().default(2), // lbs
        packageDimensions: z.string().optional(),
        declaredValue: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);

      if (!listing) throw new Error("Listing not found");

      const value = input.declaredValue || Number(listing.price) || 1000;
      const rates = simulateShippingRates(
        input.originZip,
        input.destinationZip,
        input.packageWeight,
        value
      );

      // Store quotes in DB
      for (const rate of rates) {
        await db.insert(shippingQuotes).values({
          listingId: input.listingId,
          sellerId: listing.sellerId,
          carrier: rate.carrier,
          serviceLevel: rate.service,
          estimatedCost: String(rate.cost),
          estimatedDays: rate.days,
          originZip: input.originZip,
          destinationZip: input.destinationZip,
          packageWeight: String(input.packageWeight),
          packageDimensions: input.packageDimensions || null,
          insuranceAmount: String(rate.insurance),
          isInsured: rate.insurance > 0,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });
      }

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "shipping.getRates",
        userId: ctx.user?.id,
        action: "shipping_quotes_generated",
        details: `listing:${input.listingId} origin:${input.originZip} dest:${input.destinationZip}`,
      });

      return {
        success: true,
        rates: rates.map((r) => ({
          ...r,
          carrierUrl: CARRIER_LINKS[r.carrier],
        })),
        itemValue: value,
        note: "These are estimated rates. Click carrier links for exact pricing.",
      };
    }),

  /**
   * Select a shipping quote and attach to a sale
   */
  selectQuote: authedQuery
    .input(
      z.object({
        quoteId: z.number(),
        saleTransactionId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const [quote] = await db
        .select()
        .from(shippingQuotes)
        .where(eq(shippingQuotes.id, input.quoteId))
        .limit(1);

      if (!quote) throw new Error("Quote not found");

      // Update sale transaction with shipping info
      await db
        .update(saleTransactions)
        .set({
          shippingCarrier: quote.carrier,
          shippingQuoteId: input.quoteId,
        })
        .where(eq(saleTransactions.id, input.saleTransactionId));

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "shipping.selectQuote",
        userId: ctx.user!.id,
        action: "shipping_quote_selected",
        details: `quote:${input.quoteId} sale:${input.saleTransactionId}`,
      });

      return { success: true };
    }),

  /**
   * Get carrier booking links
   */
  carrierLinks: publicQuery.query(() => {
    return [
      { name: "USPS", url: CARRIER_LINKS.usps, logo: "usps" },
      { name: "UPS", url: CARRIER_LINKS.ups, logo: "ups" },
      { name: "FedEx", url: CARRIER_LINKS.fedex, logo: "fedex" },
      { name: "DHL", url: CARRIER_LINKS.dhl, logo: "dhl" },
    ];
  }),

  /**
   * Get shipping history for a listing
   */
  getHistory: authedQuery
    .input(z.object({ listingId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const rows = await db
        .select()
        .from(shippingQuotes)
        .where(eq(shippingQuotes.listingId, input.listingId))
        .orderBy(desc(shippingQuotes.createdAt));
      if (ctx.user.role === "admin") return rows;
      return rows.filter((row) => row.sellerId === ctx.user.id || row.buyerId === ctx.user.id);
    }),
});
