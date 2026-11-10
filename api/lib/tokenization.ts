import {
  BASE_CHAIN_ID,
  CLANKER_INTERFACE,
  CLANKER_PLATFORM,
  CLANKER_V5_FACTORY,
  LAUNCH_TTL_MS,
  VAULT_TOKEN_IMAGE,
} from "@contracts/clanker";
import { getAddress } from "viem";
import { describeMinimumClankerFees } from "./clanker-fees";
import { verifyLaunchTransaction, type ChainLaunchTx } from "./clanker-verify";
import { TokenizationError } from "./tokenization-error";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const TX_HASH = /^0x[a-fA-F0-9]{64}$/;

export interface ListingRecord {
  id: number;
  title: string;
  description: string | null;
  sellerId: number | null;
  price: string | null;
}

export interface CertRecord {
  id: number;
  listingId: number;
  userId: number | null;
  certificateHash: string;
  contractAddress: string | null;
  tokenId: string | null;
  blockHash: string | null;
  blockNumber: number | null;
  network: string | null;
  itemName: string;
  itemDescription: string | null;
  metadataUri: string | null;
  status: string;
  certificationFee: string | null;
  createdAt: Date;
}

export interface LaunchPayload {
  v: 1;
  wallet: `0x${string}`;
  nonce: string;
  name: string;
  symbol: string;
  listingId: number;
  expiresAt: number;
  image: string;
  description: string;
  contractURI: string;
  factory: `0x${string}`;
  chainId: number;
}

export interface TokenizationStore {
  getListing(id: number): Promise<ListingRecord | null>;
  getCertByListing(listingId: number): Promise<CertRecord | null>;
  getCertByTx(txHash: string): Promise<CertRecord | null>;
  getCertByToken(token: string): Promise<CertRecord | null>;
  insertCert(row: {
    listingId: number;
    userId: number;
    certificateHash: string;
    tokenId: string;
    network: string;
    itemName: string;
    itemDescription: string | null;
    metadataUri: string;
    status: string;
    certificationFee: string;
  }): Promise<CertRecord>;
  updateCert(
    id: number,
    patch: Partial<Pick<CertRecord, "status" | "contractAddress" | "blockHash" | "blockNumber" | "metadataUri" | "tokenId">>,
  ): Promise<void>;
  markListingTokenized(listingId: number, certId: number, token: string): Promise<void>;
}

export interface Actor {
  id: number;
  role: string;
}

export function tokenNameFromTitle(title: string): string {
  const cleaned = title.replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) throw new TokenizationError("BAD_REQUEST", "Listing title cannot be used as a token name.");
  return cleaned.slice(0, 32);
}

export function tokenSymbolFromTitle(title: string): string {
  const symbol = title.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
  return symbol.length < 2 ? "VAULT" : symbol;
}

export function assertEvmAddress(value: string): `0x${string}` {
  if (!EVM_ADDRESS.test(value)) {
    throw new TokenizationError("BAD_REQUEST", "Wallet must be a 20-byte hex address. The launch is signed on Base.");
  }
  return getAddress(value);
}

export function parseLaunchPayload(metadataUri: string | null): LaunchPayload | null {
  if (!metadataUri) return null;
  try {
    const value = JSON.parse(metadataUri) as Partial<LaunchPayload>;
    if (value.v !== 1) return null;
    if (typeof value.wallet !== "string" || !EVM_ADDRESS.test(value.wallet)) return null;
    if (typeof value.nonce !== "string" || value.nonce.length < 8) return null;
    if (typeof value.name !== "string" || typeof value.symbol !== "string") return null;
    if (typeof value.listingId !== "number" || typeof value.expiresAt !== "number") return null;
    if (typeof value.contractURI !== "string" || typeof value.description !== "string") return null;
    if (value.factory !== CLANKER_V5_FACTORY || value.chainId !== BASE_CHAIN_ID) return null;
    if (value.image !== VAULT_TOKEN_IMAGE) return null;
    return {
      v: 1,
      wallet: getAddress(value.wallet),
      nonce: value.nonce,
      name: value.name,
      symbol: value.symbol,
      listingId: value.listingId,
      expiresAt: value.expiresAt,
      image: VAULT_TOKEN_IMAGE,
      description: value.description,
      contractURI: value.contractURI,
      factory: CLANKER_V5_FACTORY,
      chainId: BASE_CHAIN_ID,
    };
  } catch {
    return null;
  }
}

async function certificateHash(listingId: number, nonce: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${listingId}:${nonce}:thevaultdfw:clanker-v5`));
  return `0x${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function launchDescription(listing: ListingRecord): string {
  const raw = (listing.description || listing.title).replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim();
  return `Vault listing ${listing.id}. ${raw}`.slice(0, 280);
}

function contractUriFor(listingId: number): string {
  return `https://thevaultdfw.win/listing/${listingId}`;
}

function toPublicLaunch(payload: LaunchPayload, certId: number) {
  return {
    certId,
    chainId: payload.chainId,
    factory: payload.factory,
    listingId: payload.listingId,
    name: payload.name,
    symbol: payload.symbol,
    wallet: payload.wallet,
    nonce: payload.nonce,
    image: payload.image,
    description: payload.description,
    contractURI: payload.contractURI,
    expiresAt: payload.expiresAt,
    buyFeePercent: 1 as const,
    sellFeePercent: 1 as const,
    antiSnipeEnabled: true as const,
    metadataEditable: false as const,
    devBuy: false as const,
    quote: "ETH" as const,
    rewardsBps: 10_000 as const,
    context: {
      interface: CLANKER_INTERFACE,
      platform: CLANKER_PLATFORM,
      messageId: payload.nonce,
      id: String(payload.listingId),
    },
    fees: describeMinimumClankerFees(),
  };
}

function assertOwner(listing: ListingRecord, actor: Actor) {
  if (actor.role === "admin") return;
  if (!listing.sellerId || listing.sellerId !== actor.id) {
    throw new TokenizationError("FORBIDDEN", "Only the listing seller can tokenize this item.");
  }
}

export async function runCertify(
  input: { listingId: number; walletAddress: string },
  actor: Actor,
  store: TokenizationStore,
  now = Date.now(),
) {
  if (!Number.isInteger(input.listingId) || input.listingId <= 0) {
    throw new TokenizationError("BAD_REQUEST", "Listing id is invalid.");
  }
  const wallet = assertEvmAddress(input.walletAddress);
  const listing = await store.getListing(input.listingId);
  if (!listing) throw new TokenizationError("NOT_FOUND", "Listing not found");
  assertOwner(listing, actor);

  const existing = await store.getCertByListing(listing.id);
  if (existing?.status === "minted") {
    return {
      success: true as const,
      alreadyLaunched: true as const,
      status: "minted" as const,
      certId: existing.id,
      launch: null,
      fees: describeMinimumClankerFees(),
      message: "This listing already has a confirmed token.",
    };
  }

  if (existing?.status === "pending") {
    const payload = parseLaunchPayload(existing.metadataUri);
    if (payload && payload.expiresAt > now) {
      if (getAddress(payload.wallet) !== wallet) {
        throw new TokenizationError("CONFLICT", "A launch is already waiting for a different wallet.");
      }
      return {
        success: true as const,
        alreadyLaunched: false as const,
        status: "pending_signature" as const,
        certId: existing.id,
        launch: toPublicLaunch(payload, existing.id),
        fees: describeMinimumClankerFees(),
        message: "Sign the pending Clanker launch with the connected wallet.",
      };
    }
    await store.updateCert(existing.id, { status: "failed" });
  }

  const nonce = crypto.randomUUID();
  const payload: LaunchPayload = {
    v: 1,
    wallet,
    nonce,
    name: tokenNameFromTitle(listing.title),
    symbol: tokenSymbolFromTitle(listing.title),
    listingId: listing.id,
    expiresAt: now + LAUNCH_TTL_MS,
    image: VAULT_TOKEN_IMAGE,
    description: launchDescription(listing),
    contractURI: contractUriFor(listing.id),
    factory: CLANKER_V5_FACTORY,
    chainId: BASE_CHAIN_ID,
  };
  const cert = await store.insertCert({
    listingId: listing.id,
    userId: actor.id,
    certificateHash: await certificateHash(listing.id, nonce),
    tokenId: payload.symbol,
    network: "base",
    itemName: listing.title,
    itemDescription: listing.description,
    metadataUri: JSON.stringify(payload),
    status: "pending",
    certificationFee: "0",
  });

  return {
    success: true as const,
    alreadyLaunched: false as const,
    status: "pending_signature" as const,
    certId: cert.id,
    launch: toPublicLaunch(payload, cert.id),
    fees: describeMinimumClankerFees(),
    message: "Sign the Clanker v5 launch in your wallet. The Vault does not hold a key.",
  };
}

export async function runConfirm(
  input: { listingId: number; txHash: string },
  actor: Actor,
  store: TokenizationStore,
  readTx: (txHash: string) => Promise<ChainLaunchTx>,
  readToken: (token: string) => Promise<{ name: string; symbol: string }>,
) {
  if (!TX_HASH.test(input.txHash)) throw new TokenizationError("BAD_REQUEST", "Transaction hash is invalid.");
  const listing = await store.getListing(input.listingId);
  if (!listing) throw new TokenizationError("NOT_FOUND", "Listing not found");
  assertOwner(listing, actor);

  const cert = await store.getCertByListing(input.listingId);
  if (!cert) throw new TokenizationError("PRECONDITION_FAILED", "Create a launch intent before confirming.");
  if (cert.userId !== actor.id && actor.role !== "admin") {
    throw new TokenizationError("FORBIDDEN", "Only the seller who started this launch can confirm it.");
  }
  if (cert.status === "minted") {
    if (cert.blockHash?.toLowerCase() === input.txHash.toLowerCase()) {
      return {
        success: true as const,
        status: "minted" as const,
        certId: cert.id,
        token: cert.contractAddress,
        txHash: input.txHash,
        message: "Launch was already confirmed.",
      };
    }
    throw new TokenizationError("CONFLICT", "This listing is already tokenized.");
  }

  const payload = parseLaunchPayload(cert.metadataUri);
  if (!payload || cert.status !== "pending") {
    throw new TokenizationError("PRECONDITION_FAILED", "This certificate is not a pending Clanker launch.");
  }

  const priorTx = await store.getCertByTx(input.txHash);
  if (priorTx && priorTx.id !== cert.id) {
    throw new TokenizationError("CONFLICT", "That transaction is already used by another certificate.");
  }

  let tx: ChainLaunchTx;
  try {
    tx = await readTx(input.txHash);
  } catch {
    throw new TokenizationError("PRECONDITION_FAILED", "Base RPC could not load that transaction.");
  }

  const verified = verifyLaunchTransaction(tx, {
    listingId: payload.listingId,
    wallet: payload.wallet,
    name: payload.name,
    symbol: payload.symbol,
    nonce: payload.nonce,
    contractURI: payload.contractURI,
    image: payload.image,
    description: payload.description,
    expiresAt: payload.expiresAt,
    createdAtMs: cert.createdAt.getTime(),
  });

  const priorToken = await store.getCertByToken(verified.token);
  if (priorToken && priorToken.id !== cert.id) throw new TokenizationError("CONFLICT", "That token is already recorded.");

  let onchain: { name: string; symbol: string };
  try {
    onchain = await readToken(verified.token);
  } catch {
    throw new TokenizationError("PRECONDITION_FAILED", "Base RPC could not read the launched token.");
  }
  if (onchain.name !== payload.name || onchain.symbol !== payload.symbol) {
    throw new TokenizationError("BAD_REQUEST", "On-chain token name or symbol does not match the listing.");
  }

  await store.updateCert(cert.id, {
    status: "minted",
    contractAddress: verified.token,
    blockHash: input.txHash.toLowerCase(),
    blockNumber: Number(tx.blockNumber),
    tokenId: payload.symbol,
  });
  await store.markListingTokenized(listing.id, cert.id, verified.token);

  return {
    success: true as const,
    status: "minted" as const,
    certId: cert.id,
    token: verified.token,
    poolId: verified.poolId,
    txHash: input.txHash,
    network: "base" as const,
    launchpad: "clanker-v5" as const,
    message: "Token launched on Base through Clanker v5.",
  };
}
