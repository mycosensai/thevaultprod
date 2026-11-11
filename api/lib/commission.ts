import { and, desc, eq, isNull, lte } from "drizzle-orm";
import { commissionTiers } from "@db/schema";
import { commissionRateString } from "../../src/lib/commission-policy";

export async function getCommissionRateFromTiers(db: any, value: number): Promise<string> {
  const tier = await db
    .select()
    .from(commissionTiers)
    .where(
      and(
        eq(commissionTiers.isActive, true),
        lte(commissionTiers.minAmount, String(value)),
      ),
    )
    .orderBy(desc(commissionTiers.minAmount))
    .limit(1);

  const candidate = tier[0];
  if (candidate) {
    if (!candidate.maxAmount || Number(value) <= Number(candidate.maxAmount)) {
      return String(candidate.rate);
    }
  }

  const fallback = await db
    .select()
    .from(commissionTiers)
    .where(and(eq(commissionTiers.isActive, true), isNull(commissionTiers.maxAmount)))
    .limit(1);
  if (fallback[0]) return String(fallback[0].rate);

  return commissionRateString(value);
}
