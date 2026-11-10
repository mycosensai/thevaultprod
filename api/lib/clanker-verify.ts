import {
  CLANKER_INTERFACE,
  CLANKER_PLATFORM,
  CLANKER_SHARE_SCALE,
  CLANKER_TAX_RATE_ONE_PERCENT,
  CLANKER_V5_FACTORY,
  MAX_NATIVE_LAUNCH_FEE_WEI,
  VAULT_TOKEN_IMAGE,
} from "@contracts/clanker";
import { decodeEventLog, decodeFunctionData, getAddress, type Hex, zeroAddress } from "viem";
import { TokenizationError } from "./tokenization-error";

const feeSlot = [
  { name: "recipient", type: "address" },
  { name: "admin", type: "address" },
  { name: "relativeWeightBps", type: "uint16" },
  { name: "isCreator", type: "bool" },
] as const;

const taxConfiguration = [
  { name: "buyTaxRate", type: "uint32" },
  { name: "sellTaxRate", type: "uint32" },
  { name: "creatorAllocationShare", type: "uint32" },
  { name: "burnAllocationShare", type: "uint32" },
  { name: "dividendAllocationShare", type: "uint32" },
  { name: "integratorAllocationShare", type: "uint32" },
  { name: "minimumDividendHolding", type: "uint256" },
] as const;

const launchParams = [
  { name: "creator", type: "address" },
  { name: "feeSlots", type: "tuple[]", components: feeSlot },
  { name: "tokenName", type: "string" },
  { name: "tokenSymbol", type: "string" },
  { name: "tokenContractURI", type: "string" },
  { name: "creatorSalt", type: "bytes32" },
  { name: "quoteToken", type: "address" },
  { name: "expectedConfigVersion", type: "uint64" },
  { name: "deadline", type: "uint64" },
  { name: "metadataEditable", type: "bool" },
  { name: "metadataKeys", type: "string[]" },
  { name: "metadataValues", type: "string[]" },
  { name: "taxConfiguration", type: "tuple", components: taxConfiguration },
  { name: "creatorFeeRecipient", type: "address" },
  { name: "integratorFeeRecipient", type: "address" },
  { name: "antiSnipeEnabled", type: "bool" },
] as const;

export const clankerLaunchAbi = [
  {
    type: "function",
    name: "createLaunch",
    stateMutability: "payable",
    inputs: [{ name: "launchParams", type: "tuple", components: launchParams }],
    outputs: [
      { name: "token", type: "address" },
      { name: "poolId", type: "bytes32" },
    ],
  },
  {
    type: "function",
    name: "createLaunchAndBuy",
    stateMutability: "payable",
    inputs: [
      { name: "launchParams", type: "tuple", components: launchParams },
      {
        name: "launchBuyParams",
        type: "tuple",
        components: [
          { name: "fundingToken", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "minAmountOut", type: "uint256" },
          { name: "routeData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "token", type: "address" },
      { name: "poolId", type: "bytes32" },
      { name: "amountOut", type: "uint256" },
    ],
  },
] as const;

export const launchedEvent = {
  type: "event",
  name: "Launched",
  inputs: [
    { name: "token", type: "address", indexed: true },
    { name: "poolId", type: "bytes32", indexed: true },
    { name: "originalCreator", type: "address", indexed: true },
    { name: "quoteToken", type: "address", indexed: false },
    { name: "launchSupply", type: "uint256", indexed: false },
    { name: "tickSpacing", type: "int24", indexed: false },
  ],
} as const;

export interface ExpectedLaunch {
  listingId: number;
  wallet: `0x${string}`;
  name: string;
  symbol: string;
  nonce: string;
  contractURI: string;
  image: string;
  description: string;
  expiresAt: number;
  createdAtMs: number;
}

export interface ChainLaunchTx {
  from: string;
  to: string | null;
  value: bigint;
  input: Hex;
  status: "success" | "reverted";
  blockTimestamp: number;
  blockNumber: bigint;
  logs: { address: string; topics: Hex[]; data: Hex }[];
}

export interface VerifiedLaunch {
  token: `0x${string}`;
  poolId: Hex;
}

function sameAddress(left: string, right: string): boolean {
  try {
    return getAddress(left) === getAddress(right);
  } catch {
    return false;
  }
}

function fail(message: string): never {
  throw new TokenizationError("BAD_REQUEST", message);
}

export function verifyLaunchTransaction(tx: ChainLaunchTx, expected: ExpectedLaunch): VerifiedLaunch {
  if (tx.status !== "success") fail("Launch transaction reverted.");
  if (!tx.to || !sameAddress(tx.to, CLANKER_V5_FACTORY)) fail("Launch transaction was not sent to the Clanker v5 factory.");
  if (!sameAddress(tx.from, expected.wallet)) fail("Launch transaction was not signed by the listing wallet.");
  if (tx.value > MAX_NATIVE_LAUNCH_FEE_WEI) fail("Launch transaction includes a native fee above the Vault cap of 0 wei.");

  const blockMs = tx.blockTimestamp * 1000;
  if (blockMs > expected.expiresAt + 120_000) fail("Launch transaction is outside the intent window.");
  if (blockMs + 120_000 < expected.createdAtMs) fail("Launch transaction predates this intent.");

  const decoded = (() => {
    try {
      return decodeFunctionData({ abi: clankerLaunchAbi, data: tx.input });
    } catch {
      return fail("Launch calldata is not a Clanker createLaunch.");
    }
  })();

  if (decoded.functionName !== "createLaunch") {
    fail("Creator buys are disabled. The launch must be createLaunch with no swap and no slippage.");
  }

  const params = decoded.args[0];
  const creatorIsCaller = sameAddress(params.creator, zeroAddress) || sameAddress(params.creator, expected.wallet);
  if (!creatorIsCaller) fail("Launch creator is not the connected wallet.");
  if (!sameAddress(params.creatorFeeRecipient, expected.wallet)) fail("Creator rewards are not assigned to the connected wallet.");
  if (!sameAddress(params.integratorFeeRecipient, zeroAddress)) fail("Launch includes an integrator fee.");
  if (!sameAddress(params.quoteToken, zeroAddress)) fail("Launch must be paired with native ETH.");
  if (params.metadataEditable) fail("Token metadata must be immutable.");
  if (!params.antiSnipeEnabled) fail("Anti-sniper fee must be enabled.");
  if (params.tokenName !== expected.name) fail("Token name does not match the listing.");
  if (params.tokenSymbol !== expected.symbol) fail("Token symbol does not match the listing.");
  if (params.tokenContractURI !== expected.contractURI) fail("Token contract URI does not match the listing.");

  const slots = params.feeSlots;
  const creatorSlot = slots.find((slot) => slot.isCreator);
  const weight = slots.reduce((sum, slot) => sum + slot.relativeWeightBps, 0);
  if (!creatorSlot || !sameAddress(creatorSlot.recipient, expected.wallet) || !sameAddress(creatorSlot.admin, expected.wallet)) {
    fail("Creator fee slot is not the connected wallet.");
  }
  if (creatorSlot.relativeWeightBps !== 10_000 || weight !== 10_000 || slots.length !== 1) {
    fail("Creator must receive 100% of the creator fee share.");
  }

  const tax = params.taxConfiguration;
  if (tax.buyTaxRate !== CLANKER_TAX_RATE_ONE_PERCENT || tax.sellTaxRate !== CLANKER_TAX_RATE_ONE_PERCENT) {
    fail("Buy and sell tax must stay at the 1% minimum.");
  }
  if (tax.burnAllocationShare !== 0 || tax.dividendAllocationShare !== 0 || tax.integratorAllocationShare !== 0) {
    fail("Burn, dividend, and integrator shares must be zero.");
  }
  if (tax.creatorAllocationShare !== CLANKER_SHARE_SCALE) fail("Creator allocation must be the full remainder.");
  if (tax.minimumDividendHolding !== 0n) fail("Dividend holding minimum must be zero.");

  if (params.metadataKeys.length !== 3 || params.metadataKeys[0] !== "image" || params.metadataKeys[2] !== "context") {
    fail("Launch metadata keys are not the Clanker v5 set.");
  }
  if (params.metadataValues[0] !== expected.image || params.metadataValues[0] !== VAULT_TOKEN_IMAGE) {
    fail("Launch image does not match the Vault image.");
  }

  let context: { interface?: string; platform?: string; messageId?: string; id?: string };
  let metadata: { description?: string };
  try {
    metadata = JSON.parse(params.metadataValues[1] || "{}") as { description?: string };
    context = JSON.parse(params.metadataValues[2] || "{}") as typeof context;
  } catch {
    fail("Launch metadata is not valid JSON.");
  }
  if (metadata.description !== expected.description) fail("Launch description does not match the listing.");
  if (context.interface !== CLANKER_INTERFACE || context.platform !== CLANKER_PLATFORM) fail("Launch context is not The Vault.");
  if (context.messageId !== expected.nonce || context.id !== String(expected.listingId)) {
    fail("Launch context does not match this intent.");
  }

  const launched = tx.logs.flatMap((log) => {
    if (!sameAddress(log.address, CLANKER_V5_FACTORY)) return [];
    try {
      if (log.topics.length === 0) return [];
      const event = decodeEventLog({
        abi: [launchedEvent],
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
      return event.eventName === "Launched" ? [event.args] : [];
    } catch {
      return [];
    }
  });
  if (launched.length !== 1) fail("Launch receipt does not contain one Clanker Launched event.");
  const event = launched[0];
  if (!event) fail("Launch receipt does not contain one Clanker Launched event.");
  const token = getAddress(event.token);
  if (!token.toLowerCase().endsWith("cccc")) fail("Clanker v5 token address must end in cccc.");
  if (!sameAddress(event.originalCreator, expected.wallet)) fail("On-chain creator is not the connected wallet.");
  if (!sameAddress(event.quoteToken, zeroAddress)) fail("On-chain pair is not native ETH.");
  return { token, poolId: event.poolId };
}
