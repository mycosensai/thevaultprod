import { eq } from "drizzle-orm";
import { commissionTiers } from "@db/schema";
import { commissionRateString } from "../../src/lib/commission-policy";

type CommissionTierRow = {
  minAmount: string;
  maxAmount: string | null;
  rate: string;
};

/**
 * Match active tiers by numeric price. min_amount is stored as text, so
 * SQL string ordering would treat "10000" as less than "5000".
 */
export async function getCommissionRateFromTiers(db: any, value: number): Promise<string> {
  const tiers = (await db
    .select()
    .from(commissionTiers)
    .where(eq(commissionTiers.isActive, true))) as CommissionTierRow[];

  const ranked = tiers
    .map((tier) => {
      const min = Number(tier.minAmount);
      const max =
        tier.maxAmount == null || tier.maxAmount === ""
          ? Number.POSITIVE_INFINITY
          : Number(tier.maxAmount);
      return { rate: String(tier.rate), min, max };
    })
    .filter(
      (tier) =>
        Number.isFinite(tier.min) &&
        (tier.max === Number.POSITIVE_INFINITY || Number.isFinite(tier.max)),
    )
    .sort((a, b) => b.min - a.min || a.max - b.max);

  const match = ranked.find((tier) => value >= tier.min && value <= tier.max);
  if (match) return match.rate;

  return commissionRateString(value);
}
