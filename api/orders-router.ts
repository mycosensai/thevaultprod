import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { listings, orders } from "@db/schema";
import { eq, desc } from "drizzle-orm";

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
        orderStatus: z
          .enum([
            "pending",
            "confirmed",
            "shipped",
            "delivered",
            "cancelled",
            "refunded",
          ])
          .optional(),
        trackingNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);
      if (!order) throw new Error("Order not found");

      const isAdmin = ctx.user.role === "admin";
      const isOwner = order.userId === ctx.user.id;
      if (!isAdmin && !isOwner) throw new Error("Forbidden");

      const updateData: any = {};
      // Payment status is payment-system-authoritative: admin only.
      if (input.paymentStatus) {
        if (!isAdmin) throw new Error("Forbidden");
        updateData.paymentStatus = input.paymentStatus;
      }
      if (input.orderStatus) updateData.orderStatus = input.orderStatus;
      if (input.trackingNumber)
        updateData.trackingNumber = input.trackingNumber;

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
