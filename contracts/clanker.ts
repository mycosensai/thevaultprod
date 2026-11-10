/** Clanker v5 on Base. Factory matches clanker-sdk TAX_ADDRESSES and the published docs. */
export const BASE_CHAIN_ID = 8453;

export const CLANKER_V5_FACTORY = "0x572e88D3cD7f23E4241EB6ceDD96667271bF09A0" as const;

/** Factory minimum. Lowest steady-state tax, so the smallest protocol take. */
export const CLANKER_BUY_FEE_PERCENT = 1;
export const CLANKER_SELL_FEE_PERCENT = 1;

/** 1e8 = 100%. clanker-sdk feeToTaxRate encodes 1% as 1_000_000. */
export const CLANKER_TAX_RATE_ONE_PERCENT = 1_000_000;
export const CLANKER_SHARE_SCALE = 100_000_000;

export const VAULT_TOKEN_IMAGE = "https://thevaultdfw.win/favicon.svg";
export const LAUNCH_TTL_MS = 20 * 60 * 1000;

/** Reject any launch that attaches ETH. nativeLaunchFee() on this factory was 0 on 2026-11-10. */
export const MAX_NATIVE_LAUNCH_FEE_WEI = 0n;

export const CLANKER_INTERFACE = "The Vault DFW";
export const CLANKER_PLATFORM = "thevaultdfw";
