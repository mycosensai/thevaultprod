import { describe, expect, it } from "vitest";
import { orderUpdateDenial } from "./order-access";

const buyer = { actorId: 4, actorRole: "user" as const };
const seller = { actorId: 9, actorRole: "user" as const };
const admin = { actorId: 1, actorRole: "admin" as const };

describe("order status permissions", () => {
  it("stops a buyer from shipping, tracking, or marking payment complete", () => {
    const order = { userId: 4, paymentStatus: "completed", orderStatus: "confirmed" };
    expect(orderUpdateDenial({ ...buyer, order, sellerId: 9, next: { orderStatus: "shipped" } })).toMatch(/Buyers cannot/);
    expect(orderUpdateDenial({ ...buyer, order, sellerId: 9, next: { trackingNumber: "1Z" } })).toMatch(/seller/);
    expect(orderUpdateDenial({ ...buyer, order, sellerId: 9, next: { paymentStatus: "completed" } })).toBe("Forbidden");
    expect(orderUpdateDenial({ ...buyer, order, sellerId: 9, next: { orderStatus: "refunded" } })).toMatch(/Buyers cannot/);
  });

  it("lets a buyer cancel before shipment and confirm delivery after it ships", () => {
    expect(orderUpdateDenial({
      ...buyer,
      order: { userId: 4, paymentStatus: "pending", orderStatus: "pending" },
      sellerId: 9,
      next: { orderStatus: "cancelled" },
    })).toBeNull();
    expect(orderUpdateDenial({
      ...buyer,
      order: { userId: 4, paymentStatus: "completed", orderStatus: "shipped" },
      sellerId: 9,
      next: { orderStatus: "delivered" },
    })).toBeNull();
    expect(orderUpdateDenial({
      ...buyer,
      order: { userId: 4, paymentStatus: "completed", orderStatus: "confirmed" },
      sellerId: 9,
      next: { orderStatus: "delivered" },
    })).toMatch(/confirm delivery/);
  });

  it("lets the seller ship a paid order and blocks a refund", () => {
    const paid = { userId: 4, paymentStatus: "completed", orderStatus: "confirmed" };
    expect(orderUpdateDenial({ ...seller, order: paid, sellerId: 9, next: { orderStatus: "shipped", trackingNumber: "9400" } })).toBeNull();
    expect(orderUpdateDenial({
      ...seller,
      order: { userId: 4, paymentStatus: "pending", orderStatus: "pending" },
      sellerId: 9,
      next: { orderStatus: "shipped" },
    })).toMatch(/payment/);
    expect(orderUpdateDenial({ ...seller, order: paid, sellerId: 9, next: { orderStatus: "refunded" } })).toMatch(/Sellers cannot/);
  });

  it("lets an admin correct payment and status", () => {
    expect(orderUpdateDenial({
      ...admin,
      order: { userId: 4, paymentStatus: "pending", orderStatus: "pending" },
      sellerId: 9,
      next: { paymentStatus: "refunded", orderStatus: "refunded" },
    })).toBeNull();
  });
});
