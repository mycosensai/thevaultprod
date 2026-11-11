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

The toolbar uses wagmi for EVM wallets and Solana wallet-adapter for Phantom, Solflare, and Backpack. MetaMask, Coinbase Wallet, Rainbow, and Phantom on EVM use injected connectors. WalletConnect is added when a Reown project id is available. `@walletconnect/ethereum-provider`, `@coinbase/wallet-sdk`, and `@metamask/connect-evm` are direct dependencies because wagmi loads them only when those connectors are clicked.

Vite only inlines `VITE_` variables by itself. `vite.config.ts` also reads `WALLETCONNECT_PROJECT_ID` and `REOWN_PROJECT_ID` (the names used on Cloudflare Pages) and inlines `__VAULT_WALLETCONNECT_PROJECT_ID__` only when the value is a Reown project id. The first valid id wins:

- `VITE_WALLETCONNECT_PROJECT_ID`
- `VITE_REOWN_PROJECT_ID`
- `WALLETCONNECT_PROJECT_ID`
- `REOWN_PROJECT_ID`

The value has to be a Reown project id: 32 hex characters, or a UUID. Other values are ignored and are not copied into the bundle. Do not commit the id.

If that id was not present for `vite build`, the storefront still renders immediately and then requests `GET /api/wallet-connect-config` in the background. The Pages Function reads the same names from the runtime environment of the project that is serving the site and returns only a valid project id. WalletConnect is added when that response arrives. GitHub Actions builds `dist` and then uploads it, so a Pages secret is not visible to that Vite build unless the repository secret of the same name is set. The Function still sees the Pages runtime variable after the upload.

## Deploy

A push to `main` runs `.github/workflows/deploy.yml`. That job uses Node 22, builds `dist`, and runs `wrangler pages deploy dist --project-name thevault-77h`. The live domain is a CNAME to that Pages project. There is no second deploy workflow and no Worker `main` entry. Pages Functions stay in `functions/`.

This app is not deployed to Vercel. Set these where the Pages build runs, because `VITE_` values are inlined by Vite. In GitHub Actions they are read from repository secrets of the same name:

- `WALLETCONNECT_PROJECT_ID` or `VITE_WALLETCONNECT_PROJECT_ID` from https://cloud.reown.com if you want the WalletConnect QR option. Leave both empty to ship injected wallets only. Do not commit the id. The Pages project name is `WALLETCONNECT_PROJECT_ID`. The GitHub Actions build reads a repository secret of either name.
- `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_STRIPE_PUBLISHABLE_KEY` for the existing sign-in and card checkout.
- Server secrets stay in Cloudflare: `APP_SECRET`, `CLERK_SECRET_KEY`, `STRIPE_SECRET_KEY`, and the existing Solana treasury variables for direct checkout. Token launches do not add a server key.

Clanker launches use the public factory `0x572e88D3cD7f23E4241EB6ceDD96667271bF09A0`. The route refuses any launch transaction with a non-zero ETH value, so a future factory deploy fee fails closed until that cap is reviewed.

See `docs/LAUNCHPAD_COMPARISON.md` for the launchpad choice.
