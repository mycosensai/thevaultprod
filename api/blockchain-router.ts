import { z } from "zod";
import { createRouter, publicQuery, authedQuery } from "./middleware";
import { getDb, getRawD1 } from "./queries/connection";
import { blockchainCerts, listings } from "@db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import { logAudit, getClientIP, checkRateLimit } from "./security";
import { TRPCError } from "@trpc/server";
import { autoTriggerFromAction } from "./lib/auto-trigger";
import { readErc20, readLaunchTransaction } from "./lib/base-rpc";
import { quoteMarkets } from "./lib/token-market";
import { TokenizationError } from "./lib/tokenization-error";
import {
  runCertify,
  runConfirm,
  type CertRecord,
  type TokenizationStore,
} from "./lib/tokenization";

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/;
const SOL_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

function asTokenizationError(error: unknown): TRPCError | null {
  if (!(error instanceof TokenizationError)) return null;
  return new TRPCError({ code: error.code, message: error.message });
}

function toCert(row: typeof blockchainCerts.$inferSelect): CertRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    userId: row.userId,
    certificateHash: row.certificateHash,
    contractAddress: row.contractAddress,
    tokenId: row.tokenId,
    blockHash: row.blockHash,
    blockNumber: row.blockNumber,
    network: row.network,
    itemName: row.itemName,
    itemDescription: row.itemDescription,
    metadataUri: row.metadataUri,
    status: row.status,
    certificationFee: row.certificationFee,
    createdAt: row.createdAt,
  };
}

function store(): TokenizationStore {
  const db = getDb();
  return {
    async getListing(id) {
      const [row] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
      if (!row) return null;
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        sellerId: row.sellerId,
        price: row.price,
      };
    },
    async getCertByListing(listingId) {
      const [row] = await db
        .select()
        .from(blockchainCerts)
        .where(and(eq(blockchainCerts.listingId, listingId), inArray(blockchainCerts.status, ["pending", "minted"])))
        .orderBy(desc(blockchainCerts.id))
        .limit(1);
      return row ? toCert(row) : null;
    },
    async getCertByTx(txHash) {
      const [row] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.blockHash, txHash.toLowerCase())).limit(1);
      return row ? toCert(row) : null;
    },
    async getCertByToken(token) {
      const [row] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.contractAddress, token)).limit(1);
      return row ? toCert(row) : null;
    },
    async insertCert(row) {
      const result = await db.insert(blockchainCerts).values(row);
      const id = Number(result.meta.last_row_id);
      const [created] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.id, id)).limit(1);
      if (!created) throw new TokenizationError("PRECONDITION_FAILED", "Launch intent could not be stored.");
      return toCert(created);
    },
    async updateCert(id, patch) {
      await db.update(blockchainCerts).set({ ...patch, updatedAt: new Date() }).where(eq(blockchainCerts.id, id));
    },
    async markListingTokenized(listingId, certId, token) {
      await db
        .update(listings)
        .set({ isCertified: true, tokenContractAddress: token, certificationId: certId })
        .where(eq(listings.id, listingId));
    },
  };
}

function publicCert(row: typeof blockchainCerts.$inferSelect) {
  return {
    ...row,
    verificationUrl: `https://thevaultdfw.win/listing/${row.listingId}`,
  };
}

export const blockchainRouter = createRouter({
  certify: authedQuery
    .input(
      z.object({
        listingId: z.number().int().positive(),
        itemName: z.string().min(1).max(500),
        itemDescription: z.string().max(5000).optional(),
        walletAddress: z.string().regex(EVM_ADDRESS),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
      try {
        const result = await runCertify(
          { listingId: input.listingId, walletAddress: input.walletAddress },
          { id: ctx.user.id, role: ctx.user.role },
          store(),
        );
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "blockchain.certify",
          userId: ctx.user.id,
          action: result.alreadyLaunched ? "tokenize_existing" : "tokenize_intent",
          details: `listing:${input.listingId} cert:${result.certId} wallet:${input.walletAddress.slice(0, 8)}`,
        });
        return result;
      } catch (error) {
        const mapped = asTokenizationError(error);
        if (mapped) throw mapped;
        throw error;
      }
    }),

  confirmLaunch: authedQuery
    .input(
      z.object({
        listingId: z.number().int().positive(),
        txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in required." });
      try {
        const db = getDb();
        const [listing] = await db.select().from(listings).where(eq(listings.id, input.listingId)).limit(1);
        const result = await runConfirm(
          input,
          { id: ctx.user.id, role: ctx.user.role },
          store(),
          readLaunchTransaction,
          async (token) => {
            const erc20 = await readErc20(token);
            return { name: erc20.name, symbol: erc20.symbol };
          },
        );
        if (result.status === "minted" && listing && result.message.startsWith("Token launched")) {
          autoTriggerFromAction(
            "tokenize",
            listing.title,
            undefined,
            listing.price ? Number(listing.price) : undefined,
            listing.id,
          );
        }
        logAudit({
          ip: getClientIP(ctx.req),
          method: "POST",
          path: "blockchain.confirmLaunch",
          userId: ctx.user.id,
          action: "tokenize_confirmed",
          details: `listing:${input.listingId} tx:${input.txHash.slice(0, 10)}`,
        });
        return result;
      } catch (error) {
        const mapped = asTokenizationError(error);
        if (mapped) throw mapped;
        throw error;
      }
    }),

  market: publicQuery
    .input(
      z
        .object({
          wallet: z.string().regex(EVM_ADDRESS).optional(),
          solanaWallet: z.string().regex(SOL_ADDRESS).optional(),
        })
        .optional(),
    )
    .query(async ({ input, ctx }) => {
      // Pass the D1 binding so the counter is durable across isolates
      // (same wiring as the Hono middleware rate limiter).
      const limit = await checkRateLimit(
        ctx.req,
        {
          windowMs: 60_000,
          maxRequests: 20,
          keyGenerator: (req) => `token-market:${getClientIP(req)}`,
        },
        getRawD1() ?? undefined
      );
      if (!limit.allowed) {
        throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Token quotes are rate limited. Try again in a minute." });
      }
      const vaultTokens: { address: string; symbol: string; name: string }[] = [];
      try {
        const db = getDb();
        const rows = await db
          .select()
          .from(blockchainCerts)
          .where(eq(blockchainCerts.status, "minted"))
          .orderBy(desc(blockchainCerts.createdAt))
          .limit(12);
        for (const row of rows) {
          if (row.contractAddress && EVM_ADDRESS.test(row.contractAddress)) {
            vaultTokens.push({
              address: row.contractAddress,
              symbol: row.tokenId || "VAULT",
              name: row.itemName,
            });
          }
        }
      } catch {
        // Reference quotes still load when the certificate table is unavailable.
      }
      try {
        return await quoteMarkets({
          wallet: input?.wallet,
          solanaWallet: input?.solanaWallet,
          vaultTokens,
        });
      } catch {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Public RPC quotes are unavailable." });
      }
    }),

  getById: publicQuery.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = getDb();
    const [row] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.id, input.id)).limit(1);
    return row ? publicCert(row) : null;
  }),

  getByListing: publicQuery.input(z.object({ listingId: z.number().int().positive() })).query(async ({ input }) => {
    const db = getDb();
    const [row] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.listingId, input.listingId)).limit(1);
    return row ? publicCert(row) : null;
  }),

  verify: publicQuery.input(z.object({ certificateHash: z.string().min(8).max(200) })).query(async ({ input }) => {
    const db = getDb();
    const [row] = await db.select().from(blockchainCerts).where(eq(blockchainCerts.certificateHash, input.certificateHash)).limit(1);
    if (!row) return { valid: false, message: "Certificate not found in Vault records" };
    const onBase = row.network === "base" && Boolean(row.contractAddress?.startsWith("0x"));
    return {
      valid: row.status === "minted" && onBase,
      cert: {
        id: row.id,
        contractAddress: row.contractAddress,
        tokenId: row.tokenId,
        blockHash: row.blockHash,
        blockNumber: row.blockNumber,
        itemName: row.itemName,
        status: row.status,
      },
      message:
        row.status === "minted" && onBase
          ? "Certificate verified against a confirmed Base transaction."
          : "Certificate is not a confirmed Base token launch.",
      network: row.network,
      verificationSteps: onBase
        ? [
            "1. The seller signed a Clanker v5 createLaunch from their own wallet.",
            "2. The transaction called the Base factory and included the intent nonce.",
            "3. The receipt contains one Launched event and the token name matches the listing.",
          ]
        : ["This record predates wallet-signed Clanker launches and is not treated as an on-chain token."],
    };
  }),

  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(blockchainCerts)
      .where(inArray(blockchainCerts.status, ["minted", "pending"]))
      .orderBy(desc(blockchainCerts.createdAt))
      .limit(50);
  }),
});
