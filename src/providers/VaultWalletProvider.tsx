import { SOLANA_RPC_URLS } from "@contracts/public-rpc";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { readBuildTimeWalletConnectProjectId, resolveWalletConnectProjectId } from "@/lib/resolve-wallet-connect-project-id";
import { getWagmiConfig, upgradeWagmiConfig } from "@/lib/wagmi";

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
  const [wagmiConfig, setWagmiConfig] = useState(getWagmiConfig);

  useEffect(() => {
    if (readBuildTimeWalletConnectProjectId()) return;
    let cancelled = false;
    void resolveWalletConnectProjectId().then((projectId) => {
      if (cancelled) return;
      const next = upgradeWagmiConfig(projectId);
      setWagmiConfig((current) => (current === next ? current : next));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const walletConnectReady = wagmiConfig.connectors.some((connector) =>
    `${connector.id} ${connector.name}`.toLowerCase().includes("walletconnect"),
  );

  return (
    <WagmiProvider key={walletConnectReady ? "walletconnect" : "injected"} config={wagmiConfig} reconnectOnMount>
      <ConnectionProvider endpoint={SOLANA_RPC_URLS[0]}>
        <WalletProvider wallets={solanaWallets} autoConnect>
          <SolanaSelectionConnect>{children}</SolanaSelectionConnect>
        </WalletProvider>
      </ConnectionProvider>
    </WagmiProvider>
  );
}
