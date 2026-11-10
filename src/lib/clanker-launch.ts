import { BASE_CHAIN_ID } from "@contracts/clanker";
import { BASE_RPC_URLS } from "@contracts/public-rpc";
import { createPublicClient, fallback, http, type Hex } from "viem";
import { base } from "viem/chains";
import { getWalletClient, switchChain } from "wagmi/actions";
import { wagmiConfig } from "@/lib/wagmi";

export interface VaultLaunchRequest {
  chainId: number;
  name: string;
  symbol: string;
  wallet: `0x${string}`;
  nonce: string;
  image: string;
  description: string;
  contractURI: string;
  listingId: number;
}

export async function launchVaultToken(launch: VaultLaunchRequest): Promise<Hex> {
  if (launch.chainId !== BASE_CHAIN_ID) {
    throw new Error("Vault token launches are on Base.");
  }
  await switchChain(wagmiConfig, { chainId: base.id });
  const walletClient = await getWalletClient(wagmiConfig, { chainId: base.id });
  if (!walletClient?.account) throw new Error("Connect a Base wallet before launching.");

  const publicClient = createPublicClient({
    chain: base,
    transport: fallback(BASE_RPC_URLS.map((url) => http(url, { timeout: 8_000 }))),
  });
  const { Clanker } = await import("clanker-sdk/v5");
  const clanker = new Clanker({
    wallet: walletClient as never,
    publicClient: publicClient as never,
  });
  const result = await clanker.deploy(
    {
      chainId: base.id,
      name: launch.name,
      symbol: launch.symbol,
      image: launch.image,
      tokenAdmin: launch.wallet,
      contractURI: launch.contractURI,
      metadataEditable: false,
      antiSnipeEnabled: true,
      buyFee: 1,
      sellFee: 1,
      metadata: { description: launch.description },
      context: {
        interface: "The Vault DFW",
        platform: "thevaultdfw",
        messageId: launch.nonce,
        id: String(launch.listingId),
      },
      rewards: {
        recipients: [{ recipient: launch.wallet, admin: launch.wallet, bps: 10_000, token: "Paired" }],
      },
      pool: { pairedToken: "WETH" },
    },
    { deadlineSeconds: 900 },
  );
  if (result.error || !result.txHash) {
    throw new Error(result.error?.message || "The wallet did not send the launch.");
  }
  return result.txHash;
}
