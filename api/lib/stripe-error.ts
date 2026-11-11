import { TRPCError } from "@trpc/server";

/**
 * Provider bodies can echo request details. Callers discard the body and
 * return this generic error. The status is logged without the payload.
 */
export function paymentProviderError(status: number): TRPCError {
  console.error("[payments] provider request failed", status);
  return new TRPCError({
    code: "BAD_GATEWAY",
    message: "Payment provider request failed",
  });
}
