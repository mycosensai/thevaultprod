import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, orders } from "@db/schema";
import { eq, desc } from "drizzle-orm";
import { ORDER_STATUSES, orderUpdateDenial } from "./lib/order-access";

export const ordersRouter = createRouter({
  list: publicQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user?.id;
    if (!userId) return [];
    return db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .limit(100);
  }),

  create: authedQuery
    .input(
      z.object({
        listingId: z.number(),
        listingImage: z.string().optional(),
        paymentMethod: z
          .enum(["stripe", "dex", "solana_wallet", "other"])
          .optional(),
        shippingAddress: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      // Server-authoritative money fields: derive title/amount/commission
      // from the DB listing row; never trust client-supplied values.
      const [listing] = await db
        .select()
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .limit(1);
      if (!listing) throw new Error("Listing not found");

      const amount = Number(listing.price);
      const commission = amount * (Number(listing.commissionRate) / 100);

      const result = await db.insert(orders).values({
        userId: ctx.user.id,
        listingId: input.listingId,
        listingTitle: listing.title,
        listingImage: input.listingImage || null,
        amount: String(amount),
        commission: String(commission),
        paymentMethod: input.paymentMethod || "other",
        paymentStatus: "pending",
        orderStatus: "pending",
        shippingAddress: input.shippingAddress || null,
      });
      return { id: Number(result.meta.last_row_id), success: true };
    }),

  updateStatus: authedQuery
    .input(
      z.object({
        orderId: z.number(),
        paymentStatus: z
          .enum(["pending", "completed", "failed", "refunded"])
          .optional(),
        orderStatus: z.enum(ORDER_STATUSES).optional(),
        trackingNumber: z.string().max(80).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });

      const [listing] = await db
        .select({ sellerId: listings.sellerId })
        .from(listings)
        .where(eq(listings.id, order.listingId))
        .limit(1);

      const denial = orderUpdateDenial({
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        order: {
          userId: order.userId,
          paymentStatus: order.paymentStatus,
          orderStatus: order.orderStatus,
        },
        sellerId: listing?.sellerId ?? null,
        next: {
          paymentStatus: input.paymentStatus,
          orderStatus: input.orderStatus,
          trackingNumber: input.trackingNumber,
        },
      });
      if (denial) throw new TRPCError({ code: "FORBIDDEN", message: denial });

      const updateData: Record<string, string> = {};
      if (input.paymentStatus) updateData.paymentStatus = input.paymentStatus;
      if (input.orderStatus) updateData.orderStatus = input.orderStatus;
      if (input.trackingNumber?.trim()) updateData.trackingNumber = input.trackingNumber.trim();

      if (Object.keys(updateData).length === 0) return { success: true };

      await db.update(orders).set(updateData).where(eq(orders.id, input.orderId));
      return { success: true };
    }),

  getById: publicQuery
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!order) return null;
      const isAdmin = ctx.user?.role === "admin";
      const isOwner = order.userId != null && order.userId === ctx.user?.id;
      if (!isAdmin && !isOwner) return null;
      return order;
    }),
});
