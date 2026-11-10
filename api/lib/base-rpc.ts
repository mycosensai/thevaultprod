import { BASE_RPC_URLS, SOLANA_RPC_URLS } from "@contracts/public-rpc";
import { decodeFunctionResult, encodeFunctionData, type Hex } from "viem";
import type { ChainLaunchTx } from "./clanker-verify";

const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "totalSupply", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

let rpcQueue: Promise<void> = Promise.resolve();
let lastRpcAt = 0;

async function paceRpc(): Promise<void> {
  const run = rpcQueue.then(async () => {
    const wait = Math.max(0, lastRpcAt + 80 - Date.now());
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
    lastRpcAt = Date.now();
  });
  rpcQueue = run.then(
    () => undefined,
    () => undefined,
  );
  await run;
}

export async function publicRpc<T>(urls: readonly string[], method: string, params: unknown[]): Promise<T> {
  let lastError = "Public RPC unavailable";
  for (const url of urls) {
    await paceRpc();
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!response.ok) {
        lastError = `HTTP ${response.status}`;
        continue;
      }
      const body = (await response.json()) as { result?: T; error?: { message?: string } };
      if (body.error) {
        lastError = body.error.message || "RPC error";
        continue;
      }
      if (body.result === undefined) {
        lastError = "Empty RPC result";
        continue;
      }
      return body.result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "RPC failed";
    }
  }
  throw new Error(lastError);
}

async function baseCall(to: string, data: Hex): Promise<Hex> {
  const result = await publicRpc<string>(BASE_RPC_URLS, "eth_call", [{ to, data }, "latest"]);
  if (!result.startsWith("0x")) throw new Error("Bad eth_call result");
  return result as Hex;
}

export async function readErc20(token: string): Promise<{ name: string; symbol: string; decimals: number; totalSupply: bigint }> {
  const [nameRaw, symbolRaw, decimalsRaw, supplyRaw] = await Promise.all([
    baseCall(token, encodeFunctionData({ abi: erc20Abi, functionName: "name" })),
    baseCall(token, encodeFunctionData({ abi: erc20Abi, functionName: "symbol" })),
    baseCall(token, encodeFunctionData({ abi: erc20Abi, functionName: "decimals" })),
    baseCall(token, encodeFunctionData({ abi: erc20Abi, functionName: "totalSupply" })),
  ]);
  return {
    name: decodeFunctionResult({ abi: erc20Abi, functionName: "name", data: nameRaw }),
    symbol: decodeFunctionResult({ abi: erc20Abi, functionName: "symbol", data: symbolRaw }),
    decimals: Number(decodeFunctionResult({ abi: erc20Abi, functionName: "decimals", data: decimalsRaw })),
    totalSupply: decodeFunctionResult({ abi: erc20Abi, functionName: "totalSupply", data: supplyRaw }),
  };
}

export async function readErc20Balance(token: string, wallet: string): Promise<bigint> {
  const data = encodeFunctionData({ abi: erc20Abi, functionName: "balanceOf", args: [wallet as `0x${string}`] });
  const raw = await baseCall(token, data);
  return decodeFunctionResult({ abi: erc20Abi, functionName: "balanceOf", data: raw });
}

interface JsonRpcTx {
  from?: string;
  to?: string | null;
  value?: string;
  input?: string;
}

interface JsonRpcLog {
  address?: string;
  topics?: string[];
  data?: string;
}

interface JsonRpcReceipt {
  status?: string;
  blockNumber?: string;
  logs?: JsonRpcLog[];
}

function hexToBigint(value: string | undefined | null): bigint {
  if (!value) return 0n;
  return BigInt(value);
}

export async function readLaunchTransaction(txHash: string): Promise<ChainLaunchTx> {
  const [tx, receipt] = await Promise.all([
    publicRpc<JsonRpcTx | null>(BASE_RPC_URLS, "eth_getTransactionByHash", [txHash]),
    publicRpc<JsonRpcReceipt | null>(BASE_RPC_URLS, "eth_getTransactionReceipt", [txHash]),
  ]);
  if (!tx || !receipt?.blockNumber) throw new Error("Transaction is not on Base yet.");
  const block = await publicRpc<{ timestamp?: string } | null>(BASE_RPC_URLS, "eth_getBlockByNumber", [receipt.blockNumber, false]);
  if (!block?.timestamp) throw new Error("Block timestamp is unavailable.");
  return {
    from: tx.from || "",
    to: tx.to || null,
    value: hexToBigint(tx.value),
    input: (tx.input || "0x") as Hex,
    status: receipt.status === "0x1" ? "success" : "reverted",
    blockNumber: hexToBigint(receipt.blockNumber),
    blockTimestamp: Number(hexToBigint(block.timestamp)),
    logs: (receipt.logs || []).map((log) => ({
      address: log.address || "",
      topics: (log.topics || []) as Hex[],
      data: (log.data || "0x") as Hex,
    })),
  };
}

export async function readSolBalance(address: string): Promise<bigint> {
  const result = await publicRpc<{ value?: number | string }>(SOLANA_RPC_URLS, "getBalance", [address]);
  if (typeof result?.value === "number") return BigInt(result.value);
  if (typeof result?.value === "string") return BigInt(result.value);
  throw new Error("Solana balance unavailable");
}
