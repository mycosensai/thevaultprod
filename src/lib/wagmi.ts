import { BASE_RPC_URLS, ETHEREUM_RPC_URLS } from "@contracts/public-rpc";
import { createConfig, http } from "wagmi";
import { base, mainnet } from "wagmi/chains";
import { coinbaseWallet, injected, metaMask, walletConnect } from "wagmi/connectors";
import { fallback } from "viem";

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || import.meta.env.VITE_REOWN_PROJECT_ID || "";

const connectors = [
  metaMask(),
  coinbaseWallet({ appName: "The Vault DFW", preference: "all" }),
  injected({ target: "rainbow" }),
  injected({ target: "phantom" }),
  injected({ target: "backpack" }),
  injected(),
];

if (projectId) {
  connectors.push(
    walletConnect({
      projectId,
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

export const walletConnectEnabled = Boolean(projectId);

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  connectors,
  transports: {
    [base.id]: fallback(BASE_RPC_URLS.map((url) => http(url))),
    [mainnet.id]: fallback(ETHEREUM_RPC_URLS.map((url) => http(url))),
  },
  ssr: false,
});
