import { BASE_RPC_URLS, ETHEREUM_RPC_URLS } from "@contracts/public-rpc";
import { walletConnectProjectIdOrEmpty } from "@contracts/walletconnect";
import { createConfig, http, type Config } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { fallback } from "viem";

const BUILD_PROJECT_ID = walletConnectProjectIdOrEmpty(
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || import.meta.env.VITE_REOWN_PROJECT_ID || "",
);

export function createWagmiConfig(projectId: string): Config {
  const acceptedId = walletConnectProjectIdOrEmpty(projectId);
  const connectors = [
    metaMask(),
    coinbaseWallet({ appName: "The Vault DFW", preference: "all" }),
    injected({ target: "rainbow" }),
    injected({ target: "phantom" }),
    injected({ target: "backpack" }),
    injected(),
  ];

  if (acceptedId) {
    connectors.push(
      walletConnect({
        projectId: acceptedId,
        showQrModal: true,
        metadata: {
          name: "The Vault DFW",
          description: "Luxury consignment and auction marketplace",
          url: "https://thevaultdfw.win",
          icons: ["https://thevaultdfw.win/favicon.svg"],
        },
      }),
    );
  }

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

let activeConfig = createWagmiConfig(BUILD_PROJECT_ID);

export function getBuildWalletConnectProjectId(): string {
  return BUILD_PROJECT_ID;
}

export function getWagmiConfig(): Config {
  return activeConfig;
}

export function setActiveWagmiConfig(projectId: string): Config {
  activeConfig = createWagmiConfig(projectId);
  return activeConfig;
}
