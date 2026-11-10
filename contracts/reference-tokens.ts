import { BASE_CHAIN_ID } from "./clanker";

export interface ReferenceToken {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  chainId: number;
}

/**
 * Side-by-side Base markets. symbol() was read from https://mainnet.base.org on 2026-11-10.
 * Change this list to point the Tokens page at different reference tokens.
 */
export const REFERENCE_TOKENS: readonly ReferenceToken[] = [
  {
    symbol: "AERO",
    name: "Aerodrome",
    address: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    decimals: 18,
    chainId: BASE_CHAIN_ID,
  },
  {
    symbol: "VIRTUAL",
    name: "Virtuals Protocol",
    address: "0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b",
    decimals: 18,
    chainId: BASE_CHAIN_ID,
  },
];
