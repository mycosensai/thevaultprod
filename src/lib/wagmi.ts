import { BASE_RPC_URLS, ETHEREUM_RPC_URLS } from "@contracts/public-rpc";
import { fallback } from "viem";
import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import {
  evmConnectorPlan,
  normalizeWalletConnectProjectId,
  type EvmConnectorId,
} from "@/lib/wallet-connect-project-id";
import { readBuildTimeWalletConnectProjectId } from "@/lib/resolve-wallet-connect-project-id";

const metadata = {
  name: "The Vault DFW",
  description: "Luxury consignment and auction marketplace",
  url: "https://thevaultdfw.win",
  icons: ["https://thevaultdfw.win/favicon.svg"],
} as const;

function createConnector(id: EvmConnectorId, projectId: string) {
  switch (id) {
    case "metaMask":
      return metaMask();
    case "coinbaseWallet":
      return coinbaseWallet({ appName: metadata.name });
    case "rainbow":
      return injected({ target: "rainbow" });
    case "phantom":
      return injected({ target: "phantom" });
    case "backpack":
      return injected({ target: "backpack" });
    case "injected":
      return injected();
    case "walletConnect":
      return walletConnect({
        projectId,
        showQrModal: true,
        metadata: {
          name: metadata.name,
          description: metadata.description,
          url: metadata.url,
          icons: [...metadata.icons],
        },
      });
    default: {
      const unreachable: never = id;
      throw new Error(`Unsupported wallet connector: ${String(unreachable)}`);
    }
  }
}

function createVaultWagmiConfig(projectId: string) {
  const connectors = evmConnectorPlan(projectId).map((id) => createConnector(id, projectId));
  return createConfig({
    chains: [base, mainnet],
    connectors,
    transports: {
      [base.id]: fallback(BASE_RPC_URLS.map((url) => http(url))),
      [mainnet.id]: fallback(ETHEREUM_RPC_URLS.map((url) => http(url))),
    },
    ssr: false,
  });
}

type VaultWagmiConfig = ReturnType<typeof createVaultWagmiConfig>;

let wagmiConfig: VaultWagmiConfig | null = null;

function hasWalletConnectConnector(config: VaultWagmiConfig): boolean {
  return config.connectors.some((connector) => `${connector.id} ${connector.name}`.toLowerCase().includes("walletconnect"));
}

export function initWagmiConfig(projectId: string): VaultWagmiConfig {
  if (wagmiConfig) return wagmiConfig;
  wagmiConfig = createVaultWagmiConfig(normalizeWalletConnectProjectId(projectId));
  return wagmiConfig;
}

export function getWagmiConfig(): VaultWagmiConfig {
  return wagmiConfig ?? initWagmiConfig(readBuildTimeWalletConnectProjectId());
}

export function upgradeWagmiConfig(projectId: string): VaultWagmiConfig {
  const current = getWagmiConfig();
  const normalized = normalizeWalletConnectProjectId(projectId);
  if (!normalized || hasWalletConnectConnector(current)) return current;
  wagmiConfig = createVaultWagmiConfig(normalized);
  return wagmiConfig;
}
