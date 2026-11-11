/**
 * Published Vault sale commission.
 * Under $1,000: 5%. From $1,000 through $10,000: 7%. Over $10,000: 5%.
 * Listing is free. There is no monthly fee and no other charge.
 */

export type CommissionTier = {
  rate: number
  range: string
  label: string
  matches: (value: number) => boolean
}

export const COMMISSION_TIERS: CommissionTier[] = [
  {
    rate: 5,
    range: "Under $1,000",
    label: "Entry",
    matches: (value) => value > 0 && value < 1000,
  },
  {
    rate: 7,
    range: "$1,000 - $10,000",
    label: "Standard",
    matches: (value) => value >= 1000 && value <= 10000,
  },
  {
    rate: 5,
    range: "Over $10,000",
    label: "Elite",
    matches: (value) => value > 10000,
  },
]

export const COMMISSION_POLICY_SENTENCE =
  "Commission is 5% on items under $1,000, 7% on items from $1,000 to $10,000, and 5% on items over $10,000."

export const NO_EXTRA_FEES_SENTENCE =
  "There is no listing fee, no monthly fees, and no hidden charges."

export function commissionRatePercent(price: number): number {
  if (!Number.isFinite(price) || price < 1000) return 5
  if (price <= 10000) return 7
  return 5
}

export function commissionRateString(price: number): string {
  return commissionRatePercent(price).toFixed(2)
}

export function commissionBreakdown(price: number): {
  rate: number
  commission: number
  payout: number
} {
  const rate = commissionRatePercent(price)
  const commission = (price * rate) / 100
  const payout = price - commission
  return { rate, commission, payout }
}

export function formatUsd(amount: number): string {
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
