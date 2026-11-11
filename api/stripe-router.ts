import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, stripeSessions } from "@db/schema";
import { eq } from "drizzle-orm";
import { env } from "./lib/env";
import { logAudit, getClientIP, isCheckoutRedirectAllowed } from "./security";
import { TRPCError } from "@trpc/server";
import { markListingSold } from "./lib/inventory";

const STRIPE_API = "https://api.stripe.com/v1";

async function stripeFetch(endpoint: string, body?: URLSearchParams, method: string = "POST"): Promise<any> {
  if (!env.stripeSecretKey) throw new Error("Stripe is not configured");
  const res = await fetch(`${STRIPE_API}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body?.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Stripe API error: ${text}`);
  }
  return res.json();
}

const VAULT_BRANDING = {
  display_name: "The Vault",
  background_color: "#080808",
  button_color: "#C9A84C",
};

export const stripeRouter = createRouter({
  createSession: authedQuery
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
      const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
      if (!listing) throw new Error("Listing not found");
      if (listing.status === "sold") throw new Error("Item already sold");

      // Server-authoritative pricing: never trust client-supplied amounts.
      const price = Number(listing.price);
      const commission = price * (Number(listing.commissionRate) / 100);

      const body = new URLSearchParams({
        "payment_method_types[]": "card",
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": listing.title,
        "line_items[0][price_data][product_data][description]": listing.description?.substring(0, 500) || "",
        "line_items[0][price_data][unit_amount]": String(Math.round(price * 100)),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        "metadata[listingId]": String(listing.id),
        "metadata[userId]": ctx.user?.id ? String(ctx.user.id) : "guest",
        "metadata[commission]": String(commission),
      });

      const session = await stripeFetch("/checkout/sessions", body);

      await db.insert(stripeSessions).values({
        sessionId: session.id,
        userId: ctx.user?.id || null,
        listingId: listing.id,
        amount: String(price),
        commission: String(commission),
        status: "pending",
        metadata: JSON.stringify(session.metadata || {}),
      });

      logAudit({
        ip: getClientIP(ctx.req),
        method: "POST",
        path: "stripe.createSession",
        userId: ctx.user?.id,
        action: "checkout_initiated",
        details: `listing:${listing.id} amount:${price}`,
      });

      return { sessionId: session.id, url: session.url };
    }),

  verifySession: authedQuery
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();

      const [sessRecord] = await db
        .select()
        .from(stripeSessions)
        .where(eq(stripeSessions.sessionId, input.sessionId))
        .limit(1);

      // Only the buyer who created the session (or an admin) may poll it.
      if (!sessRecord) return { status: "not_found", amount_total: null, session: null };
      if (ctx.user.role !== "admin" && sessRecord.userId !== ctx.user.id) {
        throw new Error("Forbidden");
      }

      const session = await stripeFetch(`/checkout/sessions/${input.sessionId}`, undefined, "GET");

      if (session.payment_status === "paid") {
        await db.update(stripeSessions).set({ status: "completed" }).where(eq(stripeSessions.sessionId, input.sessionId));
        // Conditional inventory update: only one buyer can win the listing.
        await markListingSold(db, sessRecord.listingId);
      }

      const [updatedRecord] = await db.select().from(stripeSessions).where(eq(stripeSessions.sessionId, input.sessionId)).limit(1);
      return { status: session.payment_status, amount_total: session.amount_total, session: updatedRecord || null };
    }),

  getPublishableKey: publicQuery.query(() => {
    return { key: env.stripePublishableKey || "" };
  }),

  getBranding: publicQuery.query(() => {
    return { displayName: VAULT_BRANDING.display_name, backgroundColor: VAULT_BRANDING.background_color, buttonColor: VAULT_BRANDING.button_color };
  }),
});
