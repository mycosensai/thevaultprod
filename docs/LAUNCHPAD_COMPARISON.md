# Launchpad comparison

Checked against official docs and one Base RPC read on 10 November 2026. The winner is **Clanker v5 on Base**.

The cost that matters here is what the creator pays or gives up: the deploy fee, plus the share of ongoing trade or LP fees taken by the protocol. Security is anti-sniper protection, whether liquidity can be pulled, whether the token has an admin key, and whether the contracts were audited.

## Decision

Clanker v5 on Base.

- Deploy fee: `nativeLaunchFee()` on factory `0x572e88D3cD7f23E4241EB6ceDD96667271bF09A0` returned 0 on 10 November 2026 via `https://mainnet.base.org`. The creator still pays Base gas. Source: [Clanker v5 contracts](https://docs.clanker.world/references/core-contracts/v5).
- Ongoing take at the minimum 1% buy and sell tax: Clanker keeps 0.50% of the trade and the creator keeps 0.50%. At 5% the protocol take is still 0.50%. At 8% it is 0.80%. At 10% it is 1.00%, which is the cap. Source: [Creator rewards and fees](https://docs.clanker.world/general/creator-rewards-and-fees).
- Anti-sniper: on by default. Trades in the first 20 seconds pay a fee that starts at 99% and falls to the normal tax. The extra fee goes to Clanker. Exact-output swaps revert during the window. The creator's own launch buy does not pay it. This route sends no creator buy, so there is no slippage setting to get wrong.
- Liquidity: the hook places the full supply and blocks every liquidity add and removal. The token has no owner, minter, pauser, or upgrade path. Pool tax terms are frozen. The v5 contracts are not upgradeable. Source: [v5 contracts](https://clanker.gitbook.io/documentation/references/core-contracts/v5).
- Audits: Clanker lists an XORS review for v5 dated November 2026, plus earlier Macro, Cantina, and Quantstamp reviews for v4 and older. The XORS PDF was not read line by line for this change. A separate Guardian review dated August 2026 reported high findings and a moderate confidence score, and that review is not a clean bill of health. Sources: [Audits](https://docs.clanker.world/references/audits), [Guardian portfolio](https://guardian.security/portfolio/clanker/).
- Signing: `clanker-sdk` v5 `deploy()` builds `createLaunch` and the connected wallet sends it. No partner API key and no server-side key.

Flaunch, Zora custom pairs, Virtuals, and a minimum Meteora DBC config can leave the creator with more of the fee. They do not match Clanker's combination of a zero documented deploy fee, a mandatory on-chain decaying sniper fee, and liquidity that the protocol says can never be removed. That is why they are not clearly better.

The factory owner can change the launch policy for future tokens, including `nativeLaunchFee`. Existing pools stay frozen. This app rejects any launch whose transaction value is above 0 wei, so a new deploy fee does not get paid silently.

## Comparison

| Launchpad | Chain | Deploy cost | Protocol take from trades | Anti-sniper | Liquidity / admin | Audit notes |
| --- | --- | --- | --- | --- | --- | --- |
| Clanker v5 | Base | 0 native fee, plus gas. Verified on chain 10 Nov 2026. | 0.50% of volume at a 1–5% tax. Cap 1%. | 99% to the normal tax over 20 seconds. On by default. | Liquidity cannot be removed. Token has no owner. Terms frozen. | XORS listed for v5, Nov 2026. Guardian Aug 2026 review was not clean. |
| Zora coins | Base | No create fee on custom pairs. | Custom pairs: creator 0.70%, protocol 0.25%, Doppler 0.05% of a 1% fee. Creator/content coins pay the creator 0.50% of volume and lock 20% of fees as LP. | 99% to the base fee over 10 seconds. | Fee schedules have changed over time. Permanent "cannot remove liquidity" is not stated the way Clanker states it. | [Zora rewards](https://docs.zora.co/coins/contracts/rewards), [custom pairs](https://support.zora.co/en/articles/4641857) |
| Flaunch | Base | Gas. No separate deploy fee in the FAQ. | 1% swap fee. Protocol fee switch is documented as off, with a governance maximum of 10% of that fee. A creator can currently keep the rest. | 30 minute fixed-price fair launch, plus optional CAPTCHA. Not a decaying on-chain sniper tax. | Whitepaper says the liquidity position is burned. Fee switch can be enabled later. | Omniscia synopsis and Enigma Dark reviews. [FAQ](https://docs.flaunch.gg/protocol/frequently-asked-questions), [fee switch](https://docs.flaunch.gg/community/governance/protocol-fee-switch), [audits](https://docs.flaunch.gg/protocol/audits) |
| Virtuals | Base | Creation is free. Optional modules cost VIRTUAL. | 1% fee, 70% creator and 30% treasury, so 0.30% of volume to the protocol. | No decaying sniper fee in the launch-mechanics page. | LP tokens locked 10 years after graduation at 42,000 VIRTUAL. Built for agent tokens. | [Launch mechanics](https://whitepaper.virtuals.io/about-virtuals/capital-formation-layer/virtuals-launch-mechanics). FAQ says current as of 14 Aug 2026. |
| pump.fun | Solana | Docs do not list a separate deploy fee beyond network rent. | Bonding curve: creator 0.30%, protocol 0.95%, LP 0%. Total 1.25%. | No decaying sniper fee in the bonding-curve docs. | Graduation migrates liquidity to PumpSwap and burns the LP tokens. | [Fees](https://pump.fun/docs/fees), updated 17 Oct 2026. [Program readme](https://github.com/pump-fun/pump-public-docs/blob/main/docs/PUMP_PROGRAM_README.md) |
| Bags | Solana | Wallet signs. Rent not quoted as a protocol deploy fee. | Default config: 2% total. Pre-migration protocol pool 1%, claimers pool 1%. | Meteora can schedule a high starting fee. The default Bags config shown is flat. | Graduates to Meteora DAMM v2. | [Customize fees](https://docs.bags.fm/how-to-guides/customize-token-fees) |
| Raydium LaunchLab | Solana | Platform-specific. | Creator fee rate is set by the platform, not one published creator cost. | Depends on the platform config. | Post-2026-08-17 upgrade notes assign some fee-key share to the platform. | [Creator fees](https://docs.raydium.io/user-flows/how-creator-fees-work) |
| Meteora DBC | Solana | Account rent. | Protocol receives 20% of the trading fee. Minimum base fee is 0.25%, so the protocol floor is about 0.05% of volume if nobody else takes a cut. | Optional linear or exponential scheduler, up to a 99% cap. | Locking depends on the migration config. | [DBC fees](https://docs.meteora.ag/core-products/dbc/fees/overview), [scheduler](https://docs.meteora.ag/core-products/dbc/fees/fee-scheduler) |
| LetsBonk | Solana | A third-party measurement on 21–23 Oct 2026 reported about 0.0206 SOL of rent. Not re-measured here. | That same write-up says 1.25% on the curve and 0.30% after migration, and that platform revenue buys BONK. | Not documented here as a decaying sniper fee. | Uses Raydium LaunchLab. | [Jumpbit comparison](https://jumpbit.io/en/resources/compare/bags-vs-letsbonk). This is not a first-party fee table. |

## What this repo does

`blockchain.certify` remains the entry point. It stores a pending intent for the listing seller and the connected Base wallet. The browser then calls `clanker-sdk/v5` so that wallet signs `createLaunch`. `blockchain.confirmLaunch` reads the transaction from the public Base RPC list and accepts it only when:

- the signer is the intent wallet and the call is to the v5 factory
- the value is 0 wei
- the call is `createLaunch`, not a creator buy
- buy and sell tax are 1%, anti-sniper is on, metadata is immutable, and the creator receives the full creator share
- the metadata context contains this intent's nonce
- the receipt has one `Launched` event whose creator is that wallet and whose token ends in `cccc`
- the on-chain name and symbol match the listing
- the same transaction or token is not reused

## Sources

- [Clanker token deployments](https://docs.clanker.world/general/token-deployments)
- [Clanker v5 contracts](https://docs.clanker.world/references/core-contracts/v5)
- [Clanker creator rewards](https://docs.clanker.world/general/creator-rewards-and-fees)
- [Clanker SDK v5](https://docs.clanker.world/sdk-reference/v5)
- [Clanker audits](https://docs.clanker.world/references/audits)
- [Clanker deployed contracts](https://docs.clanker.world/references/deployed-contracts)
- [Zora coin rewards](https://docs.zora.co/coins/contracts/rewards)
- [Zora coins](https://docs.zora.co/coins)
- [Zora custom pairs](https://support.zora.co/en/articles/4641857)
- [Flaunch FAQ](https://docs.flaunch.gg/protocol/frequently-asked-questions)
- [Flaunch sniper protection](https://docs.flaunch.gg/features/sniper-protection)
- [Flaunch fee switch](https://docs.flaunch.gg/community/governance/protocol-fee-switch)
- [Flaunch whitepaper](https://docs.flaunch.gg/community/whitepaper)
- [Flaunch audits](https://docs.flaunch.gg/protocol/audits)
- [Virtuals launch mechanics](https://whitepaper.virtuals.io/about-virtuals/capital-formation-layer/virtuals-launch-mechanics)
- [pump.fun fees](https://pump.fun/docs/fees)
- [pump.fun bonding curve](https://pump.fun/docs/bonding-curve)
- [Bags fee configs](https://docs.bags.fm/how-to-guides/customize-token-fees)
- [Raydium creator fees](https://docs.raydium.io/user-flows/how-creator-fees-work)
- [Meteora DBC fees](https://docs.meteora.ag/core-products/dbc/fees/overview)
- [Meteora fee scheduler](https://docs.meteora.ag/core-products/dbc/fees/fee-scheduler)
- [Jumpbit Bags vs LetsBonk](https://jumpbit.io/en/resources/compare/bags-vs-letsbonk)
