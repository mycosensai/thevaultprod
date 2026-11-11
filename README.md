# The Vault DFW

Luxury consignment marketplace. Token launches are signed by the seller on Base through Clanker v5. The server never holds a wallet key.

## Token prices

The Tokens page (`/tokens` and `/token-gallery`) reads prices from free public RPC endpoints. It does not call a paid market-data API.

Base, tried in order:

- `https://mainnet.base.org`
- `https://base.llamarpc.com`
- `https://base.publicnode.com`
- `https://1rpc.io/base`

Ethereum, used only so a connected wallet can switch chains:

- `https://ethereum.publicnode.com`
- `https://eth.llamarpc.com`
- `https://cloudflare-eth.com`

Solana balances:

- `https://api.mainnet-beta.solana.com`
- `https://solana-rpc.publicnode.com`

USD prices come from Uniswap v3 pool state on Base, with Aerodrome reserve balances as a fallback. USDC in those pools is the numeraire and is treated as 1 USD. FDV is that price times total supply. The 24 hour figure is the spot tick versus the Uniswap v3 24 hour time-weighted tick. Aerodrome pools do not expose that oracle, so their 24 hour change is blank. Responses are cached for about 45 seconds and RPC calls are paced.

Reference tokens live in `contracts/reference-tokens.ts`. The defaults are AERO (`0x940181a94A35A4569E4529A3CDfB74e38FD98631`) and VIRTUAL (`0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b`).

## Wallet connect

The toolbar uses wagmi for EVM wallets and Solana wallet-adapter for Phantom, Solflare, and Backpack. MetaMask, Coinbase Wallet, Rainbow, and Phantom on EVM use injected connectors. WalletConnect is added when `VITE_WALLETCONNECT_PROJECT_ID` is present at build time, or when Pages serves a 32-hex `WALLETCONNECT_PROJECT_ID` from `GET /api/public-config`. Injected wallets work without either.

## Deploy

The live site is the Cloudflare Pages project `thevault` (not `thevault-77h`), built from Git on branch `main`. Pages Functions stay in `functions/`. There is no Worker `main` entry. `.github/workflows/deploy.yml` is manual only and targets `--project-name thevault`; do not run it until `CLOUDFLARE_API_TOKEN` is rotated.

This app is not deployed to Vercel. `VITE_` values are inlined by Vite at build time. On the Pages project, set:

- `VITE_WALLETCONNECT_PROJECT_ID` if the Git build should inline the Reown project id. A Pages secret named only `WALLETCONNECT_PROJECT_ID` is not visible to Vite; the Function reads that name at request time instead. Do not commit the id.
- `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` for the existing sign-in and card checkout.
- Server secrets stay in Cloudflare: `APP_SECRET`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, and the existing Solana treasury variables for direct checkout. Token launches do not add a server key.

Clanker launches use the public factory `0x572e88D3cD7f23E4241EB6ceDD96667271bF09A0`. The route refuses any launch transaction with a non-zero ETH value, so a future factory deploy fee fails closed until that cap is reviewed.

See `docs/LAUNCHPAD_COMPARISON.md` for the launchpad choice.
