/** Free public endpoints. No API keys. Callers try the list in order. */
export const BASE_RPC_URLS = [
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  "https://base.publicnode.com",
  "https://1rpc.io/base",
] as const;

export const ETHEREUM_RPC_URLS = [
  "https://ethereum.publicnode.com",
  "https://eth.llamarpc.com",
  "https://cloudflare-eth.com",
] as const;

export const SOLANA_RPC_URLS = [
  "https://api.mainnet-beta.solana.com",
  "https://solana-rpc.publicnode.com",
] as const;

export const BASE_WETH = "0x4200000000000000000000000000000000000006" as const;
export const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as const;
export const UNISWAP_V3_FACTORY_BASE = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD" as const;
export const AERODROME_FACTORY_BASE = "0x420DD381b31aEf6683db6B902084cB0FFECe40Da" as const;
