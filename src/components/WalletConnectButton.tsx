import { useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { walletConnectEnabled } from "@/lib/wagmi";

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

function evmLabel(id: string, name: string) {
  const haystack = `${id} ${name}`.toLowerCase();
  if (haystack.includes("metamask")) return "MetaMask";
  if (haystack.includes("coinbase")) return "Coinbase Wallet";
  if (haystack.includes("rainbow")) return "Rainbow";
  if (haystack.includes("phantom")) return "Phantom";
  if (haystack.includes("backpack")) return "Backpack";
  if (haystack.includes("walletconnect")) return "WalletConnect";
  if (haystack.includes("injected")) return "Browser wallet";
  return name || "Browser wallet";
}

export function WalletConnectButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const solana = useWallet();
  const solanaAddress = solana.publicKey?.toBase58() ?? "";

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!panel.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, [open]);

  const summary = isConnected && address ? shortAddress(address) : solana.connected && solanaAddress ? shortAddress(solanaAddress) : "Connect";

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={
          compact
            ? "flex w-full items-center justify-center gap-2 border border-[#C9A84C] px-5 py-3 font-cinzel text-xs tracking-[3px] text-[#C9A84C] uppercase"
            : "inline-flex items-center gap-2 border border-[#C9A84C] px-4 py-2 font-cinzel text-[10px] tracking-[2px] text-[#C9A84C] uppercase transition-all hover:bg-[#C9A84C] hover:text-[#080808]"
        }
      >
        <Wallet className="h-3.5 w-3.5" />
        {summary}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 border border-[#C9A84C]/30 bg-[#080808] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <p className="mb-2 font-cinzel text-[8px] tracking-[3px] text-[#8A6E2F] uppercase">Base and Ethereum</p>
          <div className="space-y-1">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => {
                  connect({ connector, chainId: base.id });
                  setOpen(false);
                }}
                className="block w-full px-2 py-2 text-left text-[11px] text-[#F5EED8] hover:bg-[#C9A84C]/10 hover:text-[#E8CB7A]"
              >
                {evmLabel(connector.id, connector.name)}
              </button>
            ))}
            {!walletConnectEnabled && (
              <p className="px-2 py-1 text-[10px] leading-relaxed text-[#8A6E2F]">WalletConnect stays off until a project id is set at build time.</p>
            )}
          </div>
          <p className="mt-3 mb-2 font-cinzel text-[8px] tracking-[3px] text-[#8A6E2F] uppercase">Solana</p>
          <div className="space-y-1">
            {solana.wallets.map((wallet) => (
              <button
                key={wallet.adapter.name}
                type="button"
                onClick={() => {
                  if (solana.wallet?.adapter.name === wallet.adapter.name) {
                    void solana.connect();
                  } else {
                    solana.select(wallet.adapter.name);
                  }
                  setOpen(false);
                }}
                className="block w-full px-2 py-2 text-left text-[11px] text-[#F5EED8] hover:bg-[#C9A84C]/10 hover:text-[#E8CB7A]"
              >
                {wallet.adapter.name}
              </button>
            ))}
          </div>
          {(isConnected || solana.connected) && (
            <div className="mt-3 border-t border-[#C9A84C]/20 pt-3">
              {isConnected && chainId !== base.id && (
                <button
                  type="button"
                  onClick={() => switchChain({ chainId: base.id })}
                  className="mb-2 block w-full text-left text-[10px] tracking-[1px] text-[#C9A84C] uppercase"
                >
                  Switch to Base
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  disconnect();
                  void solana.disconnect();
                  setOpen(false);
                }}
                className="block w-full text-left text-[10px] tracking-[1px] text-[#C8BC98] uppercase"
              >
                Disconnect
              </button>
            </div>
          )}
          {error && <p className="mt-2 text-[10px] text-red-400">{error.message}</p>}
        </div>
      )}
    </div>
  );
}
