import { describe, expect, it } from "vitest";
import { getCommissionRateFromTiers } from "./lib/commission";
import {
  commissionBreakdown,
  commissionRatePercent,
  commissionRateString,
  formatUsd,
} from "../src/lib/commission-policy";

function tierDb(rows: Array<{ minAmount: string; maxAmount: string | null; rate: string }>) {
  return {
    select: () => ({
      from: () => ({
        where: async () => rows,
      }),
    }),
  };
}

describe("published commission policy", () => {
  it("charges 5% under $1,000", () => {
    expect(commissionRatePercent(0)).toBe(5);
    expect(commissionRatePercent(999.99)).toBe(5);
    expect(commissionRateString(250)).toBe("5.00");
  });

  it("charges 7% from $1,000 through $10,000", () => {
    expect(commissionBreakdown(1000)).toEqual({
      rate: 7,
      commission: 70,
      payout: 930,
    });
    expect(commissionBreakdown(10000)).toEqual({
      rate: 7,
      commission: 700,
      payout: 9300,
    });
    expect(commissionRateString(7500)).toBe("7.00");
  });

  it("charges 5% over $10,000", () => {
    expect(commissionRatePercent(10000.01)).toBe(5);
    expect(commissionBreakdown(20000)).toEqual({
      rate: 5,
      commission: 1000,
      payout: 19000,
    });
    expect(formatUsd(commissionBreakdown(10000.01).commission)).toBe("500.00");
    expect(formatUsd(commissionBreakdown(1000).payout)).toBe("930.00");
  });

  it("uses the published brackets when commission tier rows are missing", async () => {
    const db = tierDb([]);
    await expect(getCommissionRateFromTiers(db, 500)).resolves.toBe("5.00");
    await expect(getCommissionRateFromTiers(db, 1000)).resolves.toBe("7.00");
    await expect(getCommissionRateFromTiers(db, 10000)).resolves.toBe("7.00");
    await expect(getCommissionRateFromTiers(db, 10000.01)).resolves.toBe("5.00");
  });

  it("matches stored tier thresholds as numbers", async () => {
    const db = tierDb([
      { minAmount: "1000", maxAmount: "10000", rate: "7.00" },
      { minAmount: "10000.01", maxAmount: null, rate: "5.00" },
    ]);
    await expect(getCommissionRateFromTiers(db, 5000)).resolves.toBe("7.00");
    await expect(getCommissionRateFromTiers(db, 10000)).resolves.toBe("7.00");
    await expect(getCommissionRateFromTiers(db, 10000.01)).resolves.toBe("5.00");
  });

  it("does not apply a $10,000 open tier to a $5,000 sale", async () => {
    const db = tierDb([{ minAmount: "10000", maxAmount: null, rate: "5.00" }]);
    await expect(getCommissionRateFromTiers(db, 5000)).resolves.toBe("7.00");
  });
});
