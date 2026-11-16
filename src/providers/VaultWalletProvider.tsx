import { SOLANA_RPC_URLS } from "@contracts/public-rpc";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { readBuildTimeWalletConnectProjectId, resolveWalletConnectProjectId } from "@/lib/resolve-wallet-connect-project-id";
import { getWagmiConfig, upgradeWagmiConfig } from "@/lib/wagmi";

const solanaWallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new BackpackWalletAdapter()];

const WalletNoticeContext = createContext<{
  notice: string | null;
  report: (message: string | null) => void;
}>({ notice: null, report: () => undefined });

export function useWalletNotice() {
  return useContext(WalletNoticeContext);
}

function SolanaSelectionConnect({ children }: { children: ReactNode }) {
  const { wallet, connect, connected, connecting } = useWallet();
  const { report } = useWalletNotice();
  useEffect(() => {
    if (!wallet || connected || connecting) return;
    connect().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : "Could not connect that Solana wallet.";
      report(message);
    });
  }, [wallet, connected, connecting, connect, report]);
  return children;
}

export function VaultWalletProvider({ children }: { children: ReactNode }) {
  const [wagmiConfig, setWagmiConfig] = useState(getWagmiConfig);
  const [notice, setNotice] = useState<string | null>(null);

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
    <WalletNoticeContext.Provider value={{ notice, report: setNotice }}>
    <WagmiProvider key={walletConnectReady ? "walletconnect" : "injected"} config={wagmiConfig} reconnectOnMount>
      <ConnectionProvider endpoint={SOLANA_RPC_URLS[0]}>
        <WalletProvider wallets={solanaWallets} autoConnect>
          <SolanaSelectionConnect>{children}</SolanaSelectionConnect>
        </WalletProvider>
      </ConnectionProvider>
    </WagmiProvider>
    </WalletNoticeContext.Provider>
  );
}
