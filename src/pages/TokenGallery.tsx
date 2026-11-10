import { useState } from "react";
import { Link } from "react-router";
import { useAccount } from "wagmi";
import { useWallet } from "@solana/wallet-adapter-react";
import { REFERENCE_TOKENS } from "@contracts/reference-tokens";
import { trpc } from "@/providers/trpc";
import { Coins, Diamond, Loader2, ShieldCheck } from "lucide-react";

function money(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1) return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
  return `$${value.toPrecision(3)}`;
}

function changeLabel(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function TokenGallery() {
  const { address } = useAccount();
  const solana = useWallet();
  const solanaAddress = solana.publicKey?.toBase58();
  const { data: certs, isLoading } = trpc.blockchain.list.useQuery();
  const { data: listingsData } = trpc.listings.certified.useQuery();
  const market = trpc.blockchain.market.useQuery({
    wallet: address,
    solanaWallet: solanaAddress,
  });
  const quotes = market.data?.tokens ?? [];
  const references = REFERENCE_TOKENS.map((token) => quotes.find((quote) => quote.address.toLowerCase() === token.address.toLowerCase()));
  const vaultQuotes = quotes.filter((quote) => quote.kind === "vault");
  const [selected, setSelected] = useState(0);
  const selectedVault = vaultQuotes[selected] ?? vaultQuotes[0];
  const columns = [selectedVault, ...references];

  const mergedItems = (certs || [])
    .map((cert) => ({ cert, listing: (listingsData || []).find((item) => item.id === cert.listingId) }))
    .filter((item) => item.listing);

  return (
    <div className="min-h-screen px-4 pt-24 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 border border-[#C9A84C]/25 px-4 py-1.5">
            <ShieldCheck className="h-3 w-3 text-[#C9A84C]" />
            <span className="text-[8px] font-medium tracking-[4px] text-[#C9A84C] uppercase">Base · Clanker v5</span>
          </div>
          <h1 className="font-cinzel text-2xl font-bold tracking-[4px] text-[#F5EED8] sm:text-3xl md:text-4xl">Tokens</h1>
          <div className="mt-4 mb-4 flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="h-1.5 w-1.5 rotate-45 text-[#C9A84C]" />
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
          <p className="mx-auto max-w-xl font-cormorant text-base text-[#C8BC98] italic">
            Vault launches sit beside {REFERENCE_TOKENS.map((token) => token.symbol).join(" and ")}. Prices are read from public Base DEX pools.
          </p>
        </div>

        <div className="mb-10 border border-[#C9A84C]/15 bg-[#161616] p-5">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-cinzel text-[10px] tracking-[3px] text-[#C9A84C] uppercase">Side by side</p>
              <p className="mt-1 text-[10px] text-[#8A6E2F]">FDV is price times total supply. 24h is spot versus the Uniswap v3 24-hour average tick.</p>
            </div>
            {address ? (
              <p className="font-mono text-[10px] text-[#C8BC98]">{address.slice(0, 6)}…{address.slice(-4)}</p>
            ) : (
              <p className="text-[10px] text-[#8A6E2F]">Connect a wallet in the toolbar to see holdings.</p>
            )}
          </div>
          {vaultQuotes.length > 1 && (
            <label className="mb-4 block text-[10px] tracking-[2px] text-[#8A6E2F] uppercase">
              Your token
              <select
                value={selected}
                onChange={(event) => setSelected(Number(event.target.value))}
                className="mt-2 block w-full border border-[#C9A84C]/20 bg-[#1E1E1E] px-3 py-2 font-cinzel text-xs text-[#F5EED8] outline-none"
              >
                {vaultQuotes.map((quote, index) => (
                  <option key={quote.address} value={index}>
                    {quote.symbol} · {quote.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {market.isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-[#C9A84C]" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead>
                  <tr className="border-b border-[#C9A84C]/15 text-[8px] tracking-[2px] text-[#8A6E2F] uppercase">
                    <th className="py-3 pr-4 font-normal">Metric</th>
                    <th className="py-3 pr-4 font-normal">Your token</th>
                    {REFERENCE_TOKENS.map((token) => (
                      <th key={token.address} className="py-3 pr-4 font-normal">
                        {token.symbol}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="text-sm text-[#F5EED8]">
                  {(
                    [
                      ["Price", (quote: (typeof columns)[number]) => money(quote?.priceUsd)],
                      ["FDV", (quote: (typeof columns)[number]) => money(quote?.fdvUsd)],
                      ["Liquidity", (quote: (typeof columns)[number]) => money(quote?.liquidityUsd)],
                      ["24h", (quote: (typeof columns)[number]) => changeLabel(quote?.change24hPct)],
                      ["Your balance", (quote: (typeof columns)[number]) => quote?.holding ?? "—"],
                    ] as const
                  ).map(([label, render]) => (
                    <tr key={label} className="border-b border-[#C9A84C]/10">
                      <td className="py-3 pr-4 text-[10px] tracking-[2px] text-[#8A6E2F] uppercase">{label}</td>
                      {columns.map((quote, index) => (
                        <td key={`${label}-${index}`} className="py-3 pr-4 font-cinzel text-[#C9A84C]">
                          {quote ? render(quote) : "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {market.data?.ethPriceUsd != null && (
            <p className="mt-3 text-[10px] text-[#8A6E2F]">ETH from the WETH/USDC pool: {money(market.data.ethPriceUsd)}. {market.data.numeraire}.</p>
          )}
          {market.data?.solana && (
            <p className="mt-1 text-[10px] text-[#C8BC98]">Solana wallet {market.data.solana.address.slice(0, 4)}…{market.data.solana.address.slice(-4)} holds {market.data.solana.sol} SOL.</p>
          )}
          {market.error && (
            <p className="mt-3 text-[11px] text-[#C8BC98]">Quotes are unavailable until the public RPC route answers. The table stays in place.</p>
          )}
          {market.data?.notes.map((note) => (
            <p key={note} className="mt-1 text-[10px] text-[#8A6E2F]">{note}</p>
          ))}
        </div>

        <div className="mb-8 flex items-center justify-between">
          <h2 className="font-cinzel text-sm tracking-[3px] text-[#F5EED8] uppercase">Vault launches</h2>
          <Link to="/sell" className="font-cinzel text-[10px] tracking-[2px] text-[#C9A84C] uppercase">
            Launch an item
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#C9A84C]" />
          </div>
        ) : mergedItems.length === 0 ? (
          <div className="border border-[#C9A84C]/15 bg-[#161616] py-20 text-center">
            <Coins className="mx-auto mb-4 h-12 w-12 text-[#C9A84C]/20" />
            <p className="mb-2 font-cinzel text-sm tracking-[2px] text-[#C8BC98] uppercase">No launched items yet</p>
            <p className="mb-4 text-xs text-[#8A6E2F]">A connected seller signs the Clanker launch. The Vault never holds the key.</p>
            <Link to="/sell" className="inline-flex items-center gap-2 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] px-6 py-3 font-cinzel text-[10px] font-bold tracking-[3px] text-[#080808] uppercase">
              List and launch
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {mergedItems.map(({ cert, listing }) => {
              const onBase = cert.network === "base" && Boolean(cert.contractAddress?.startsWith("0x"));
              return (
                <div key={cert.id} className="border border-[#C9A84C]/15 bg-[#161616] transition-all duration-300 hover:-translate-y-1 hover:border-[#C9A84C]">
                  <div className="relative flex h-40 items-center justify-center border-b border-[#C9A84C]/15 bg-gradient-to-b from-[#1E1E1E] to-[#0F0F0F]">
                    <Diamond className="h-14 w-14 text-[#C9A84C]/30" />
                    <div className="absolute top-3 left-3 border border-[#C9A84C]/30 bg-[#080808]/80 px-2.5 py-1">
                      <span className={`font-cinzel text-[7px] tracking-[2px] uppercase ${onBase ? "text-emerald-400" : "text-[#C9A84C]"}`}>
                        {cert.status === "pending" ? "Awaiting signature" : onBase ? "Base" : "Legacy record"}
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <p className="mb-1 text-[8px] tracking-[3px] text-[#8A6E2F] uppercase">{listing?.category?.name}</p>
                    <h3 className="mb-3 line-clamp-2 font-cinzel text-[11px] font-semibold tracking-[1px] text-[#F5EED8]">{listing?.title}</h3>
                    <div className="mb-4 space-y-2 border border-[#C9A84C]/10 bg-[#1E1E1E] p-3 text-[10px]">
                      <div className="flex justify-between gap-3">
                        <span className="text-[#8A6E2F]">Token</span>
                        <span className="truncate font-mono text-[9px] text-[#C9A84C]">{cert.contractAddress || cert.tokenId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#8A6E2F]">Network</span>
                        <span className="text-[#C8BC98]">{cert.network}</span>
                      </div>
                    </div>
                    <div className="flex items-end justify-between border-t border-[#C9A84C]/10 pt-3">
                      <span className="font-cinzel text-base font-bold text-[#C9A84C]">${Number(listing?.price || 0).toLocaleString("en-US")}</span>
                      <Link to={`/certificate/${cert.id}`} className="font-cinzel text-[9px] tracking-[2px] text-[#C9A84C] uppercase">
                        Certificate
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
