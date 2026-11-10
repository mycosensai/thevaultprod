import { REFERENCE_TOKENS } from "@contracts/reference-tokens";
import {
  AERODROME_FACTORY_BASE,
  BASE_RPC_URLS,
  BASE_USDC,
  BASE_WETH,
  UNISWAP_V3_FACTORY_BASE,
} from "@contracts/public-rpc";
import { decodeFunctionResult, encodeFunctionData, getAddress, type Hex } from "viem";
import { publicRpc, readErc20, readErc20Balance, readSolBalance } from "./base-rpc";
import {
  averageTick,
  changeForTarget,
  fdvUsd,
  liquidityUsd,
  poolSidePrices,
  priceToken0InToken1,
  reservePriceToken0,
  usdPriceFromPool,
} from "./pool-math";

const UNI_FEES = [500, 3000, 10000, 100] as const;
const ZERO = "0x0000000000000000000000000000000000000000";

const factoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

const v3Abi = [
  {
    type: "function",
    name: "slot0",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { type: "uint160" },
      { type: "int24" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint16" },
      { type: "uint8" },
      { type: "bool" },
    ],
  },
  {
    type: "function",
    name: "observe",
    stateMutability: "view",
    inputs: [{ name: "secondsAgos", type: "uint32[]" }],
    outputs: [{ type: "int56[]" }, { type: "uint160[]" }],
  },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

const aeroFactoryAbi = [
  {
    type: "function",
    name: "getPool",
    stateMutability: "view",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "stable", type: "bool" },
    ],
    outputs: [{ type: "address" }],
  },
] as const;

const aeroPoolAbi = [
  {
    type: "function",
    name: "getReserves",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
  },
  { type: "function", name: "token0", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "token1", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

const balanceAbi = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

interface CacheEntry<T> {
  at: number;
  value: T;
}

const cache = new Map<string, CacheEntry<unknown>>();

function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.value);
  return load().then((value) => {
    cache.set(key, { at: Date.now(), value });
    return value;
  });
}

const encodeCall = encodeFunctionData as (params: {
  abi: readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}) => Hex;

const decodeCall = decodeFunctionResult as (params: {
  abi: readonly unknown[];
  functionName: string;
  data: Hex;
}) => unknown;

async function callView<T>(to: string, abi: readonly unknown[], functionName: string, args: readonly unknown[] = []): Promise<T> {
  const data = encodeCall({ abi, functionName, args });
  const raw = await publicRpc<string>(BASE_RPC_URLS, "eth_call", [{ to, data }, "latest"]);
  if (typeof raw !== "string" || !raw.startsWith("0x")) throw new Error("Bad eth_call");
  return decodeCall({ abi, functionName, data: raw as Hex }) as T;
}

function isZero(address: string): boolean {
  return address.toLowerCase() === ZERO;
}

async function bestUniPool(token: string, quote: string): Promise<string | null> {
  let best: { pool: string; balance: bigint } | null = null;
  for (const fee of UNI_FEES) {
    const pool = await callView<string>(UNISWAP_V3_FACTORY_BASE, factoryAbi, "getPool", [getAddress(token), getAddress(quote), fee]);
    if (isZero(pool)) continue;
    let balance = 0n;
    try {
      balance = await callView<bigint>(quote, balanceAbi, "balanceOf", [getAddress(pool)]);
    } catch {
      balance = 0n;
    }
    if (!best || balance > best.balance) best = { pool: getAddress(pool), balance };
  }
  return best?.pool ?? null;
}

export interface QuotedToken {
  address: string;
  symbol: string;
  name: string;
  kind: "reference" | "vault";
  priceUsd: number | null;
  fdvUsd: number | null;
  liquidityUsd: number | null;
  change24hPct: number | null;
  pool: string | null;
  poolProtocol: "uniswap-v3" | "aerodrome" | null;
  totalSupply: string | null;
  decimals: number | null;
  holding: string | null;
  error: string | null;
}

function formatBalance(balance: bigint, decimals: number): string {
  const scale = 10n ** BigInt(decimals);
  const whole = balance / scale;
  const fraction = (balance % scale).toString().padStart(decimals, "0").slice(0, 4);
  return `${whole.toString()}.${fraction}`;
}

async function quoteUniswap(token: string, decimals: number, ethPriceUsd: number) {
  const usdcPool = await bestUniPool(token, BASE_USDC);
  const pool = usdcPool ?? (await bestUniPool(token, BASE_WETH));
  if (!pool) return null;
  const quote = usdcPool ? BASE_USDC : BASE_WETH;
  const quotePrice = usdcPool ? 1 : ethPriceUsd;
  const quoteDecimals = usdcPool ? 6 : 18;
  const [slot0, token0, token1] = await Promise.all([
    callView<readonly [bigint, number, number, number, number, number, boolean]>(pool, v3Abi, "slot0"),
    callView<string>(pool, v3Abi, "token0"),
    callView<string>(pool, v3Abi, "token1"),
  ]);
  const token0IsTarget = token0.toLowerCase() === token.toLowerCase();
  const decimals0 = token0IsTarget ? decimals : quoteDecimals;
  const decimals1 = token0IsTarget ? quoteDecimals : decimals;
  const priceUsd = usdPriceFromPool({
    token,
    token0,
    token1,
    sqrtPriceX96: slot0[0],
    decimals0,
    decimals1,
    quotePriceUsd: quotePrice,
  });
  if (priceUsd === null) return null;
  const price0 = priceToken0InToken1(slot0[0], decimals0, decimals1);
  const sides = poolSidePrices(price0, token0.toLowerCase() === quote.toLowerCase(), quotePrice);
  let change24hPct: number | null = null;
  try {
    const observed = await callView<readonly [readonly bigint[], readonly bigint[]]>(pool, v3Abi, "observe", [[0, 86_400]]);
    const tickThen = averageTick(observed[0][0] ?? 0n, observed[0][1] ?? 0n, 86_400n);
    if (tickThen !== null) change24hPct = changeForTarget(Number(slot0[1]), tickThen, token0IsTarget);
  } catch {
    change24hPct = null;
  }
  const [balance0, balance1, meta] = await Promise.all([
    callView<bigint>(token0, balanceAbi, "balanceOf", [pool]),
    callView<bigint>(token1, balanceAbi, "balanceOf", [pool]),
    readErc20(token),
  ]);
  return {
    priceUsd,
    fdvUsd: fdvUsd(priceUsd, meta.totalSupply, meta.decimals),
    liquidityUsd: sides
      ? liquidityUsd({ balance0, decimals0, price0Usd: sides.price0Usd, balance1, decimals1, price1Usd: sides.price1Usd })
      : null,
    change24hPct,
    pool,
    poolProtocol: "uniswap-v3" as const,
    totalSupply: meta.totalSupply.toString(),
    decimals: meta.decimals,
    error: null,
  };
}

async function quoteAerodrome(token: string, decimals: number, ethPriceUsd: number) {
  for (const quote of [BASE_USDC, BASE_WETH]) {
    for (const stable of [false, true]) {
      const pool = await callView<string>(AERODROME_FACTORY_BASE, aeroFactoryAbi, "getPool", [getAddress(token), getAddress(quote), stable]);
      if (isZero(pool)) continue;
      const [reserves, token0, token1, meta] = await Promise.all([
        callView<readonly [bigint, bigint, bigint]>(pool, aeroPoolAbi, "getReserves"),
        callView<string>(pool, aeroPoolAbi, "token0"),
        callView<string>(pool, aeroPoolAbi, "token1"),
        readErc20(token),
      ]);
      const quotePrice = quote.toLowerCase() === BASE_USDC.toLowerCase() ? 1 : ethPriceUsd;
      const quoteDecimals = quote.toLowerCase() === BASE_USDC.toLowerCase() ? 6 : 18;
      const token0IsTarget = token0.toLowerCase() === token.toLowerCase();
      const decimals0 = token0IsTarget ? decimals : quoteDecimals;
      const decimals1 = token0IsTarget ? quoteDecimals : decimals;
      const price0 = reservePriceToken0(reserves[0], reserves[1], decimals0, decimals1);
      if (price0 === null) continue;
      const priceUsd = token0IsTarget ? price0 * quotePrice : quotePrice / price0;
      const sides = poolSidePrices(price0, !token0IsTarget, quotePrice);
      return {
        priceUsd,
        fdvUsd: fdvUsd(priceUsd, meta.totalSupply, meta.decimals),
        liquidityUsd: sides
          ? liquidityUsd({
              balance0: reserves[0],
              decimals0,
              price0Usd: sides.price0Usd,
              balance1: reserves[1],
              decimals1,
              price1Usd: sides.price1Usd,
            })
          : null,
        change24hPct: null,
        pool: getAddress(pool),
        poolProtocol: "aerodrome" as const,
        totalSupply: meta.totalSupply.toString(),
        decimals: meta.decimals,
        error: null,
      };
    }
  }
  return null;
}

async function ethPriceUsd(): Promise<number> {
  return cached("eth-usd", 60_000, async () => {
    const pool = await bestUniPool(BASE_WETH, BASE_USDC);
    if (!pool) throw new Error("WETH/USDC pool unavailable");
    const [slot0, token0, token1] = await Promise.all([
      callView<readonly [bigint, number]>(pool, v3Abi, "slot0"),
      callView<string>(pool, v3Abi, "token0"),
      callView<string>(pool, v3Abi, "token1"),
    ]);
    const token0IsWeth = token0.toLowerCase() === BASE_WETH.toLowerCase();
    const price = usdPriceFromPool({
      token: BASE_WETH,
      token0,
      token1,
      sqrtPriceX96: slot0[0],
      decimals0: token0IsWeth ? 18 : 6,
      decimals1: token0IsWeth ? 6 : 18,
      quotePriceUsd: 1,
    });
    if (price === null) throw new Error("WETH price unavailable");
    return price;
  });
}

export interface VaultTokenRef {
  address: string;
  symbol: string;
  name: string;
}

function emptyQuote(target: { address: string; symbol: string; name: string; kind: "reference" | "vault" }, error: string): QuotedToken {
  return {
    address: target.address,
    symbol: target.symbol,
    name: target.name,
    kind: target.kind,
    priceUsd: null,
    fdvUsd: null,
    liquidityUsd: null,
    change24hPct: null,
    pool: null,
    poolProtocol: null,
    totalSupply: null,
    decimals: null,
    holding: null,
    error,
  };
}

export async function quoteMarkets(input: { wallet?: string; solanaWallet?: string; vaultTokens: VaultTokenRef[] }) {
  const notes: string[] = [];
  let eth: number | null = null;
  try {
    eth = await ethPriceUsd();
  } catch {
    notes.push("WETH/USDC price is unavailable from the public Base RPCs.");
  }

  const targets = [
    ...REFERENCE_TOKENS.map((token) => ({ ...token, kind: "reference" as const })),
    ...input.vaultTokens.map((token) => ({ ...token, kind: "vault" as const, decimals: 18 })),
  ];
  const tokens: QuotedToken[] = [];
  for (const target of targets) {
    try {
      const quote = await cached(`quote:${target.address.toLowerCase()}:${eth ?? "noeth"}`, 45_000, async () => {
        if (eth === null) return null;
        return (await quoteUniswap(target.address, target.decimals, eth)) ?? (await quoteAerodrome(target.address, target.decimals, eth));
      });
      let holding: string | null = null;
      if (input.wallet && quote?.decimals != null) {
        try {
          holding = formatBalance(await readErc20Balance(target.address, input.wallet), quote.decimals);
        } catch {
          holding = null;
        }
      }
      tokens.push({
        address: getAddress(target.address),
        symbol: target.symbol,
        name: target.name,
        kind: target.kind,
        priceUsd: quote?.priceUsd ?? null,
        fdvUsd: quote?.fdvUsd ?? null,
        liquidityUsd: quote?.liquidityUsd ?? null,
        change24hPct: quote?.change24hPct ?? null,
        pool: quote?.pool ?? null,
        poolProtocol: quote?.poolProtocol ?? null,
        totalSupply: quote?.totalSupply ?? null,
        decimals: quote?.decimals ?? null,
        holding,
        error: quote ? null : "No Uniswap v3 or Aerodrome pool was readable.",
      });
    } catch {
      tokens.push(emptyQuote(target, "Public RPC quote failed."));
    }
  }

  let solana: { address: string; lamports: string; sol: string } | null = null;
  if (input.solanaWallet) {
    try {
      const lamports = await readSolBalance(input.solanaWallet);
      solana = { address: input.solanaWallet, lamports: lamports.toString(), sol: formatBalance(lamports, 9) };
    } catch {
      notes.push("Solana balance is unavailable from the public RPCs.");
    }
  }

  return {
    updatedAt: Date.now(),
    source: "public-rpc" as const,
    ethPriceUsd: eth,
    numeraire: "Base USDC pool price, treated as 1 USD",
    changeMethod: "Uniswap v3 spot versus the 24 hour time-weighted tick. Aerodrome reserves have no 24h oracle.",
    tokens,
    solana,
    notes,
    rpc: { base: [...BASE_RPC_URLS] },
  };
}
