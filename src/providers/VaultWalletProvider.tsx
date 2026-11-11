import { SOLANA_RPC_URLS } from "@contracts/public-rpc";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, useWallet, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useEffect, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";
import { getWagmiConfig } from "@/lib/wagmi";

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
  const wagmiConfig = getWagmiConfig();
  return (
    <WagmiProvider config={wagmiConfig} reconnectOnMount>
      <ConnectionProvider endpoint={SOLANA_RPC_URLS[0]}>
        <WalletProvider wallets={solanaWallets} autoConnect>
          <SolanaSelectionConnect>{children}</SolanaSelectionConnect>
        </WalletProvider>
      </ConnectionProvider>
    </WagmiProvider>
  );
}
