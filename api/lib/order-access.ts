export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type OrderUpdateRequest = {
  paymentStatus?: "pending" | "completed" | "failed" | "refunded";
  orderStatus?: OrderStatus;
  trackingNumber?: string;
};

type OrderSnapshot = {
  userId: number | null;
  paymentStatus: string | null;
  orderStatus: string | null;
};

function isBuyerStatus(status: OrderStatus): status is "cancelled" | "delivered" {
  switch (status) {
    case "cancelled":
    case "delivered":
      return true;
    case "pending":
    case "confirmed":
    case "shipped":
    case "refunded":
      return false;
    default: {
      const unreachable: never = status;
      return unreachable;
    }
  }
}

/**
 * Buyers may cancel before shipment or confirm delivery after the seller
 * marks the order shipped. They cannot set payment, tracking, or fulfillment.
 * Sellers can confirm and ship only after payment. Refunds stay with admins.
 */
export function orderUpdateDenial(input: {
  actorId: number;
  actorRole: string | null | undefined;
  order: OrderSnapshot;
  sellerId: number | null;
  next: OrderUpdateRequest;
}): string | null {
  const isAdmin = input.actorRole === "admin";
  const isBuyer = input.order.userId != null && input.order.userId === input.actorId;
  const isSeller = input.sellerId != null && input.sellerId === input.actorId;
  if (!isAdmin && !isBuyer && !isSeller) return "Forbidden";

  if (input.next.paymentStatus && !isAdmin) return "Forbidden";

  const tracking = input.next.trackingNumber?.trim();
  if (tracking) {
    if (!isAdmin && !isSeller) return "Only the seller can add a tracking number";
    if (!isAdmin && input.order.paymentStatus !== "completed") {
      return "Tracking can be added after payment is completed";
    }
  }

  const nextStatus = input.next.orderStatus;
  if (!nextStatus || isAdmin) return null;

  const current = input.order.orderStatus || "pending";
  if (isSeller) {
    switch (nextStatus) {
      case "confirmed":
      case "shipped":
        if (input.order.paymentStatus !== "completed") {
          return "Order status cannot advance before payment is completed";
        }
        return null;
      case "cancelled":
        if (current === "delivered" || current === "refunded") return "This order can no longer be cancelled";
        return null;
      case "pending":
      case "delivered":
      case "refunded":
        return "Sellers cannot set that order status";
      default: {
        const unreachable: never = nextStatus;
        return unreachable;
      }
    }
  }

  if (!isBuyerStatus(nextStatus)) return "Buyers cannot change the order to that status";
  switch (nextStatus) {
    case "cancelled":
      if (current === "shipped" || current === "delivered" || current === "refunded" || current === "cancelled") {
        return "This order can no longer be cancelled";
      }
      return null;
    case "delivered":
      if (input.order.paymentStatus !== "completed" || current !== "shipped") {
        return "You can confirm delivery only after the seller marks the order shipped";
      }
      return null;
    default: {
      const unreachable: never = nextStatus;
      return unreachable;
    }
  }
}
