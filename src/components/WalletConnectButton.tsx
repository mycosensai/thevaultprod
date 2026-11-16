import { useEffect, useRef, useState } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { Wallet } from "lucide-react";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { base } from "wagmi/chains";
import { useWalletNotice } from "@/providers/VaultWalletProvider";

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

export function WalletConnectButton({ compact = false, iconOnly = false }: { compact?: boolean; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const { notice, report } = useWalletNotice();
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending, error } = useConnect();
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
  const walletConnectReady = connectors.some((connector) => `${connector.id} ${connector.name}`.toLowerCase().includes("walletconnect"));
  const feedback = notice || error?.message || "";

  const connectEvm = (connector: (typeof connectors)[number]) => {
    const label = evmLabel(connector.id, connector.name);
    report(null);
    const injected = label === "Browser wallet";
    const hasBrowserWallet = typeof window !== "undefined" && "ethereum" in window && Boolean((window as Window & { ethereum?: unknown }).ethereum);
    if (injected && !hasBrowserWallet) {
      report("No browser wallet was detected. Install a wallet extension, then try Browser wallet again.");
      return;
    }
    void connectAsync({ connector, chainId: base.id })
      .then(() => setOpen(false))
      .catch((connectError: unknown) => {
        const message = connectError instanceof Error ? connectError.message : "Could not connect that wallet.";
        if (injected && /provider not found|ethereum/i.test(message)) {
          report("No browser wallet was detected. Install a wallet extension, then try Browser wallet again.");
          return;
        }
        report(message);
      });
  };

  return (
    <div className="relative" ref={panel}>
      <button
        type="button"
        aria-label={iconOnly ? summary : undefined}
        onClick={() => setOpen((value) => !value)}
        className={
          iconOnly
            ? "inline-flex h-10 w-10 shrink-0 items-center justify-center border border-[#C9A84C] text-[#C9A84C]"
            : compact
            ? "flex w-full items-center justify-center gap-2 border border-[#C9A84C] px-5 py-3 font-cinzel text-xs tracking-[2px] text-[#C9A84C] uppercase"
            : "inline-flex shrink-0 items-center gap-2 whitespace-nowrap border border-[#C9A84C] px-4 py-2 font-cinzel text-[10px] tracking-[2px] text-[#C9A84C] uppercase transition-all hover:bg-[#C9A84C] hover:text-[#080808]"
        }
      >
        <Wallet className="h-3.5 w-3.5" />
        {iconOnly ? null : summary}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(16rem,calc(100vw-1.5rem))] border border-[#C9A84C]/30 bg-[#080808] p-3 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
          <p className="mb-2 font-cinzel text-[8px] tracking-[3px] text-[#8A6E2F] uppercase">Base and Ethereum</p>
          <div className="space-y-1">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                type="button"
                disabled={isPending}
                onClick={() => connectEvm(connector)}
                className="block w-full px-2 py-2 text-left text-[11px] text-[#F5EED8] hover:bg-[#C9A84C]/10 hover:text-[#E8CB7A]"
              >
                {evmLabel(connector.id, connector.name)}
              </button>
            ))}
            {!walletConnectReady && (
              <p className="px-2 py-1 text-[10px] leading-relaxed text-[#8A6E2F]">WalletConnect stays off until a project id is configured for this site.</p>
            )}
          </div>
          <p className="mt-3 mb-2 font-cinzel text-[8px] tracking-[3px] text-[#8A6E2F] uppercase">Solana</p>
          <div className="space-y-1">
            {solana.wallets.map((wallet) => (
              <button
                key={wallet.adapter.name}
                type="button"
                onClick={() => {
                  report(null);
                  if (wallet.readyState !== WalletReadyState.Installed && wallet.readyState !== WalletReadyState.Loadable) {
                    report(`${wallet.adapter.name} is not available in this browser. Install it, then try again.`);
                    return;
                  }
                  if (solana.wallet?.adapter.name === wallet.adapter.name) {
                    void solana.connect()
                      .then(() => setOpen(false))
                      .catch((connectError: unknown) => {
                        report(connectError instanceof Error ? connectError.message : `Could not connect ${wallet.adapter.name}.`);
                      });
                    return;
                  }
                  solana.select(wallet.adapter.name);
                  report(`Connecting ${wallet.adapter.name}…`);
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
          {feedback && <p className="mt-2 text-[10px] leading-relaxed text-red-300">{feedback}</p>}
        </div>
      )}
    </div>
  );
}
