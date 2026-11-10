import { describe, expect, it, vi } from "vitest";
import { encodeAbiParameters, encodeEventTopics, encodeFunctionData, getAddress, zeroAddress, type Hex } from "viem";
import { CLANKER_V5_FACTORY, VAULT_TOKEN_IMAGE } from "@contracts/clanker";
import { splitClankerTax, describeMinimumClankerFees } from "./lib/clanker-fees";
import { clankerLaunchAbi, launchedEvent, verifyLaunchTransaction, type ChainLaunchTx } from "./lib/clanker-verify";
import { changeForTarget, fdvUsd, priceToken0InToken1 } from "./lib/pool-math";
import { publicRpc } from "./lib/base-rpc";
import { runCertify, runConfirm, tokenNameFromTitle, tokenSymbolFromTitle, type CertRecord, type ListingRecord, type TokenizationStore } from "./lib/tokenization";
import { TokenizationError } from "./lib/tokenization-error";

const WALLET = "0x1111111111111111111111111111111111111111" as const;
const TOKEN = "0x222222222222222222222222222222222222cccc" as const;
const TX = `0x${"ab".repeat(32)}` as const;
const POOL = `0x${"cd".repeat(32)}` as Hex;

const listing: ListingRecord = {
  id: 9,
  title: "Rolex Submariner",
  description: "A steel sports watch.",
  sellerId: 7,
  price: "12000",
};

function memoryStore(): TokenizationStore & { certs: CertRecord[] } {
  const certs: CertRecord[] = [];
  let nextId = 1;
  return {
    certs,
    async getListing(id) {
      return id === listing.id ? listing : null;
    },
    async getCertByListing(listingId) {
      return (
        certs
          .filter((cert) => cert.listingId === listingId && (cert.status === "pending" || cert.status === "minted"))
          .sort((left, right) => right.id - left.id)[0] ?? null
      );
    },
    async getCertByTx(txHash) {
      return certs.find((cert) => cert.blockHash === txHash.toLowerCase()) ?? null;
    },
    async getCertByToken(token) {
      return certs.find((cert) => cert.contractAddress === token) ?? null;
    },
    async insertCert(row) {
      const cert: CertRecord = {
        id: nextId++,
        listingId: row.listingId,
        userId: row.userId,
        certificateHash: row.certificateHash,
        contractAddress: null,
        tokenId: row.tokenId,
        blockHash: null,
        blockNumber: null,
        network: row.network,
        itemName: row.itemName,
        itemDescription: row.itemDescription,
        metadataUri: row.metadataUri,
        status: row.status,
        certificationFee: row.certificationFee,
        createdAt: new Date(),
      };
      certs.push(cert);
      return cert;
    },
    async updateCert(id, patch) {
      const cert = certs.find((row) => row.id === id);
      if (!cert) throw new Error("missing cert");
      Object.assign(cert, patch);
    },
    async markListingTokenized() {
      return undefined;
    },
  };
}

function launchCall(args: {
  name: string;
  symbol: string;
  description: string;
  contractURI: string;
  nonce: string;
  listingId: number;
  antiSnipe?: boolean;
  value?: bigint;
  buy?: boolean;
}) {
  const params = {
    creator: zeroAddress,
    feeSlots: [{ recipient: WALLET, admin: WALLET, relativeWeightBps: 10_000, isCreator: true }],
    tokenName: args.name,
    tokenSymbol: args.symbol,
    tokenContractURI: args.contractURI,
    creatorSalt: `0x${"11".repeat(32)}` as Hex,
    quoteToken: zeroAddress,
    expectedConfigVersion: 1n,
    deadline: BigInt(Math.floor(Date.now() / 1000) + 900),
    metadataEditable: false,
    metadataKeys: ["image", "metadata", "context"],
    metadataValues: [
      VAULT_TOKEN_IMAGE,
      JSON.stringify({ description: args.description }),
      JSON.stringify({
        interface: "The Vault DFW",
        platform: "thevaultdfw",
        messageId: args.nonce,
        id: String(args.listingId),
      }),
    ],
    taxConfiguration: {
      buyTaxRate: 1_000_000,
      sellTaxRate: 1_000_000,
      creatorAllocationShare: 100_000_000,
      burnAllocationShare: 0,
      dividendAllocationShare: 0,
      integratorAllocationShare: 0,
      minimumDividendHolding: 0n,
    },
    creatorFeeRecipient: WALLET,
    integratorFeeRecipient: zeroAddress,
    antiSnipeEnabled: args.antiSnipe ?? true,
  };
  const input = args.buy
    ? encodeFunctionData({
        abi: clankerLaunchAbi,
        functionName: "createLaunchAndBuy",
        args: [params, { fundingToken: zeroAddress, amountIn: 0n, minAmountOut: 0n, routeData: "0x" }],
      })
    : encodeFunctionData({ abi: clankerLaunchAbi, functionName: "createLaunch", args: [params] });
  const topics = encodeEventTopics({
    abi: [launchedEvent],
    eventName: "Launched",
    args: { token: TOKEN, poolId: POOL, originalCreator: WALLET },
  });
  const data = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "int24" }],
    [zeroAddress, 1_000_000_000n * 10n ** 18n, 200],
  );
  const tx: ChainLaunchTx = {
    from: WALLET,
    to: CLANKER_V5_FACTORY,
    value: args.value ?? 0n,
    input,
    status: "success",
    blockTimestamp: Math.floor(Date.now() / 1000),
    blockNumber: 53_331_367n,
    logs: [{ address: CLANKER_V5_FACTORY, topics: [...topics] as Hex[], data }],
  };
  return tx;
}

describe("Clanker fee math", () => {
  it("keeps the 1% tax at the 0.5% protocol floor", () => {
    const split = splitClankerTax(10_000n, 1);
    expect(split).toEqual({ tax: 100n, protocol: 50n, creator: 50n });
    expect(describeMinimumClankerFees().buyProtocolBps).toBe(50);
    expect(describeMinimumClankerFees().buyCreatorBps).toBe(50);
  });

  it("matches the published 5%, 8%, and 10% examples", () => {
    expect(splitClankerTax(10_000n, 5)).toEqual({ tax: 500n, protocol: 50n, creator: 450n });
    expect(splitClankerTax(10_000n, 8)).toEqual({ tax: 800n, protocol: 80n, creator: 720n });
    expect(splitClankerTax(10_000n, 10)).toEqual({ tax: 1000n, protocol: 100n, creator: 900n });
  });
});

describe("pool math", () => {
  it("prices a 1:1 sqrtPriceX96 as one", () => {
    expect(priceToken0InToken1(2n ** 96n, 18, 18)).toBeCloseTo(1, 8);
  });

  it("inverts the 24h change when the target is token1", () => {
    const direct = changeForTarget(100, 0, true);
    const inverse = changeForTarget(100, 0, false);
    expect(direct).not.toBeNull();
    expect(inverse).not.toBeNull();
    expect(direct! > 0).toBe(true);
    expect(inverse! < 0).toBe(true);
  });

  it("derives FDV from total supply", () => {
    expect(fdvUsd(2, 1_000n * 10n ** 18n, 18)).toBeCloseTo(2000, 6);
  });
});

describe("public RPC fallback", () => {
  it("uses the next endpoint when the first fails", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x1" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(publicRpc(["https://rpc.example/a", "https://rpc.example/b"], "eth_chainId", [])).resolves.toBe("0x1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.unstubAllGlobals();
  });
});

describe("tokenization route", () => {
  const seller = { id: 7, role: "user" };

  it("derives the token identity from the listing, not client text", () => {
    expect(tokenNameFromTitle("  Rolex <Submariner>  ")).toBe("Rolex Submariner");
    expect(tokenSymbolFromTitle("Rolex Submariner!")).toBe("ROLEXS");
    expect(tokenSymbolFromTitle("A")).toBe("VAULT");
  });

  it("refuses a non-owner and never returns key material", async () => {
    const store = memoryStore();
    await expect(runCertify({ listingId: 9, walletAddress: WALLET }, { id: 8, role: "user" }, store)).rejects.toBeInstanceOf(TokenizationError);
    const intent = await runCertify({ listingId: 9, walletAddress: WALLET }, seller, store);
    expect(intent.status).toBe("pending_signature");
    expect(intent.launch?.name).toBe("Rolex Submariner");
    expect(intent.launch?.symbol).toBe("ROLEXS");
    expect(JSON.stringify(intent)).not.toMatch(/secretKey|privateKey|secret_key/i);
    expect(intent.fees.nativeLaunchFeeWei).toBe("0");
    expect(intent.fees.devBuy).toBe(false);
  });

  it("rejects a Solana-shaped wallet", async () => {
    await expect(
      runCertify({ listingId: 9, walletAddress: "hd6xBJDfRokQheqb3jTzh7ahQZYVWy8kKKiF9XSN4Rn" }, seller, memoryStore()),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("replays the same pending intent and blocks a second wallet", async () => {
    const store = memoryStore();
    const first = await runCertify({ listingId: 9, walletAddress: WALLET }, seller, store);
    const second = await runCertify({ listingId: 9, walletAddress: WALLET }, seller, store);
    expect(second.launch?.nonce).toBe(first.launch?.nonce);
    await expect(
      runCertify({ listingId: 9, walletAddress: "0x2222222222222222222222222222222222222222" }, seller, store),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("confirms a wallet-signed Clanker launch and rejects replays", async () => {
    const store = memoryStore();
    const intent = await runCertify({ listingId: 9, walletAddress: WALLET }, seller, store);
    const launch = intent.launch;
    if (!launch) throw new Error("missing launch");
    const tx = launchCall({
      name: launch.name,
      symbol: launch.symbol,
      description: launch.description,
      contractURI: launch.contractURI,
      nonce: launch.nonce,
      listingId: launch.listingId,
    });
    const confirmed = await runConfirm(
      { listingId: 9, txHash: TX },
      seller,
      store,
      async () => tx,
      async () => ({ name: launch.name, symbol: launch.symbol }),
    );
    expect(confirmed.token).toBe(getAddress(TOKEN));
    expect(confirmed.launchpad).toBe("clanker-v5");
    const again = await runConfirm(
      { listingId: 9, txHash: TX },
      seller,
      store,
      async () => tx,
      async () => ({ name: launch.name, symbol: launch.symbol }),
    );
    expect(again.message).toMatch(/already confirmed/);
    await expect(
      runConfirm(
        { listingId: 9, txHash: `0x${"12".repeat(32)}` },
        seller,
        store,
        async () => tx,
        async () => ({ name: launch.name, symbol: launch.symbol }),
      ),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects fee, sniper, and dev-buy deviations", async () => {
    const store = memoryStore();
    const intent = await runCertify({ listingId: 9, walletAddress: WALLET }, seller, store);
    const launch = intent.launch;
    if (!launch) throw new Error("missing launch");
    const base = {
      name: launch.name,
      symbol: launch.symbol,
      description: launch.description,
      contractURI: launch.contractURI,
      nonce: launch.nonce,
      listingId: launch.listingId,
    };
    const readToken = async () => ({ name: launch.name, symbol: launch.symbol });
    await expect(runConfirm({ listingId: 9, txHash: TX }, seller, store, async () => launchCall({ ...base, value: 1n }), readToken)).rejects.toThrow(/native fee/);
    await expect(runConfirm({ listingId: 9, txHash: TX }, seller, store, async () => launchCall({ ...base, antiSnipe: false }), readToken)).rejects.toThrow(/Anti-sniper/);
    await expect(runConfirm({ listingId: 9, txHash: TX }, seller, store, async () => launchCall({ ...base, buy: true }), readToken)).rejects.toThrow(/Creator buys/);
    expect(() =>
      verifyLaunchTransaction(launchCall({ ...base, value: 1n }), {
        listingId: launch.listingId,
        wallet: WALLET,
        name: launch.name,
        symbol: launch.symbol,
        nonce: launch.nonce,
        contractURI: launch.contractURI,
        image: launch.image,
        description: launch.description,
        expiresAt: launch.expiresAt,
        createdAtMs: Date.now(),
      }),
    ).toThrow(/native fee/);
  });
});
