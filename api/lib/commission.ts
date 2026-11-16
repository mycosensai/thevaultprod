import { commissionRateString } from "../../src/lib/commission-policy";

/**
 * Sale commission is the published policy in src/lib/commission-policy.ts.
 * Stored commission_tiers rows are not consulted: a stale 5/7/10/5 table
 * must not change Stripe, listings, or appraisals, and a tier-table outage
 * must not block a sale.
 */
export async function getCommissionRateFromTiers(_db: unknown, value: number): Promise<string> {
  return commissionRateString(value);
}
