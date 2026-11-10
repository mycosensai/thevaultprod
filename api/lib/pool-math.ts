const Q96 = 2n ** 96n;

export function amountToNumber(amount: bigint, decimals: number): number {
  if (decimals < 0 || decimals > 36) return Number.NaN;
  const scale = 10n ** BigInt(decimals);
  const whole = amount / scale;
  const fraction = amount % scale;
  return Number(whole) + Number(fraction) / Number(scale);
}

/** Uniswap v3 price of token0 quoted in token1. */
export function priceToken0InToken1(sqrtPriceX96: bigint, decimals0: number, decimals1: number): number {
  if (sqrtPriceX96 <= 0n) return Number.NaN;
  const numerator = sqrtPriceX96 * sqrtPriceX96;
  const denominator = Q96 * Q96;
  const decimalShift = decimals0 - decimals1;
  const scale = 10n ** 18n;
  const adjusted =
    decimalShift >= 0
      ? (numerator * scale * 10n ** BigInt(decimalShift)) / denominator
      : (numerator * scale) / (denominator * 10n ** BigInt(-decimalShift));
  return Number(adjusted) / 1e18;
}

export function usdPriceFromPool(input: {
  token: string;
  token0: string;
  token1: string;
  sqrtPriceX96: bigint;
  decimals0: number;
  decimals1: number;
  quotePriceUsd: number;
}): number | null {
  const token = input.token.toLowerCase();
  const token0 = input.token0.toLowerCase();
  const token1 = input.token1.toLowerCase();
  const price0 = priceToken0InToken1(input.sqrtPriceX96, input.decimals0, input.decimals1);
  if (!Number.isFinite(price0) || price0 <= 0 || !Number.isFinite(input.quotePriceUsd) || input.quotePriceUsd <= 0) {
    return null;
  }
  if (token === token0) return price0 * input.quotePriceUsd;
  if (token === token1) return input.quotePriceUsd / price0;
  return null;
}

export function averageTick(tickCumulativeNow: bigint, tickCumulativeThen: bigint, seconds: bigint): number | null {
  if (seconds <= 0n) return null;
  return Number(tickCumulativeNow - tickCumulativeThen) / Number(seconds);
}

/** Percent change of the target token, not of token0 when the target is token1. */
export function changeForTarget(tickNow: number, tickThen: number, targetIsToken0: boolean): number | null {
  if (!Number.isFinite(tickNow) || !Number.isFinite(tickThen)) return null;
  const now0 = 1.0001 ** tickNow;
  const then0 = 1.0001 ** tickThen;
  if (!Number.isFinite(now0) || !Number.isFinite(then0) || then0 === 0 || now0 === 0) return null;
  const now = targetIsToken0 ? now0 : 1 / now0;
  const then = targetIsToken0 ? then0 : 1 / then0;
  if (then === 0) return null;
  return ((now - then) / then) * 100;
}

export function liquidityUsd(input: {
  balance0: bigint;
  decimals0: number;
  price0Usd: number;
  balance1: bigint;
  decimals1: number;
  price1Usd: number;
}): number | null {
  if (!Number.isFinite(input.price0Usd) || !Number.isFinite(input.price1Usd)) return null;
  const side0 = amountToNumber(input.balance0, input.decimals0) * input.price0Usd;
  const side1 = amountToNumber(input.balance1, input.decimals1) * input.price1Usd;
  if (!Number.isFinite(side0) || !Number.isFinite(side1)) return null;
  return side0 + side1;
}

export function fdvUsd(priceUsd: number, totalSupply: bigint, decimals: number): number | null {
  if (!Number.isFinite(priceUsd) || priceUsd < 0) return null;
  const supply = amountToNumber(totalSupply, decimals);
  if (!Number.isFinite(supply)) return null;
  return priceUsd * supply;
}

export function reservePriceToken0(reserve0: bigint, reserve1: bigint, decimals0: number, decimals1: number): number | null {
  if (reserve0 <= 0n || reserve1 <= 0n) return null;
  const left = amountToNumber(reserve0, decimals0);
  const right = amountToNumber(reserve1, decimals1);
  if (!Number.isFinite(left) || !Number.isFinite(right) || left === 0) return null;
  return right / left;
}

export function poolSidePrices(price0InToken1: number, token0IsQuote: boolean, quotePriceUsd: number): { price0Usd: number; price1Usd: number } | null {
  if (!Number.isFinite(price0InToken1) || price0InToken1 <= 0 || !Number.isFinite(quotePriceUsd)) return null;
  if (token0IsQuote) {
    return { price0Usd: quotePriceUsd, price1Usd: quotePriceUsd / price0InToken1 };
  }
  return { price0Usd: price0InToken1 * quotePriceUsd, price1Usd: quotePriceUsd };
}
