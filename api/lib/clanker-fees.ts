import { CLANKER_BUY_FEE_PERCENT, CLANKER_SELL_FEE_PERCENT } from "@contracts/clanker";

export interface TaxSplit {
  tax: bigint;
  protocol: bigint;
  creator: bigint;
}

/**
 * Clanker v5 steady-state split.
 * Protocol takes the larger of 10% of the tax and 0.5% of the trade, capped at 1% of the trade.
 */
export function splitClankerTax(tradeAmount: bigint, taxPercent: number): TaxSplit {
  if (!Number.isInteger(taxPercent) || taxPercent < 1 || taxPercent > 10) {
    throw new Error("Clanker tax must be an integer from 1 to 10 percent.");
  }
  if (tradeAmount < 0n) throw new Error("Trade amount cannot be negative.");

  const tax = (tradeAmount * BigInt(taxPercent)) / 100n;
  const tenPercentOfTax = tax / 10n;
  const minimumProtocol = (tradeAmount * 5n) / 1000n;
  const maximumProtocol = tradeAmount / 100n;
  let protocol = tenPercentOfTax > minimumProtocol ? tenPercentOfTax : minimumProtocol;
  if (protocol > maximumProtocol) protocol = maximumProtocol;
  if (protocol > tax) protocol = tax;
  return { tax, protocol, creator: tax - protocol };
}

export function describeMinimumClankerFees() {
  const sample = 1_000_000n;
  const buy = splitClankerTax(sample, CLANKER_BUY_FEE_PERCENT);
  const sell = splitClankerTax(sample, CLANKER_SELL_FEE_PERCENT);
  const bps = (part: bigint) => Number((part * 10_000n) / sample);
  return {
    buyFeePercent: CLANKER_BUY_FEE_PERCENT,
    sellFeePercent: CLANKER_SELL_FEE_PERCENT,
    buyProtocolBps: bps(buy.protocol),
    buyCreatorBps: bps(buy.creator),
    sellProtocolBps: bps(sell.protocol),
    sellCreatorBps: bps(sell.creator),
    nativeLaunchFeeWei: "0",
    sniperStartPercent: 99,
    sniperWindowSeconds: 20,
    devBuy: false,
  };
}
