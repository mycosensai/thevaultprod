import { SOLANA_RPC_URLS } from "@contracts/public-rpc";
import { walletConnectProjectIdOrEmpty } from "@contracts/walletconnect";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { getBuildWalletConnectProjectId, setActiveWagmiConfig } from "@/lib/wagmi";

const solanaWallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new BackpackWalletAdapter()];

function SolanaSelectionConnect({ children }: { children: ReactNode }) {
  const { wallet, connect, connected, connecting } = useWallet();
  useEffect(() => {
    if (!wallet || connected || connecting) return;
    connect().catch(() => undefined);
  }, [wallet, connected, connecting, connect]);
  return children;
}

export function VaultWalletProvider({ children }: { children: ReactNode }) {
  const buildId = getBuildWalletConnectProjectId();
  const [projectId, setProjectId] = useState(buildId);
  const config = useMemo(() => setActiveWagmiConfig(projectId), [projectId]);

  useEffect(() => {
    if (buildId) return;
    let cancelled = false;
    fetch("/api/public-config")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { walletConnectProjectId?: unknown } | null) => {
        if (cancelled || !data) return;
        const id = walletConnectProjectIdOrEmpty(data.walletConnectProjectId);
        if (id) setProjectId(id);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [buildId]);

  return (
    <WagmiProvider config={config} reconnectOnMount>
      <ConnectionProvider endpoint={SOLANA_RPC_URLS[0]}>
        <WalletProvider wallets={solanaWallets} autoConnect>
          <SolanaSelectionConnect>{children}</SolanaSelectionConnect>
        </WalletProvider>
      </ConnectionProvider>
    </WagmiProvider>
  );
}
