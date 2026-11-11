/**
 * Reown / WalletConnect project ids are publishable client identifiers.
 * Accept only the shapes Cloud issues (32 hex chars, or a UUID) so a
 * mis-named secret cannot be copied into the client bundle or a public response.
 */
const HEX_PROJECT_ID = /^[0-9a-f]{32}$/i;
const UUID_PROJECT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const WALLET_CONNECT_PROJECT_ID_ENV_KEYS = [
  "VITE_WALLETCONNECT_PROJECT_ID",
  "VITE_REOWN_PROJECT_ID",
  "WALLETCONNECT_PROJECT_ID",
  "REOWN_PROJECT_ID",
] as const;

export type WalletConnectProjectIdEnvKey = (typeof WALLET_CONNECT_PROJECT_ID_ENV_KEYS)[number];

export const BASE_EVM_CONNECTORS = [
  "metaMask",
  "coinbaseWallet",
  "rainbow",
  "phantom",
  "backpack",
  "injected",
] as const;

export type EvmConnectorId = (typeof BASE_EVM_CONNECTORS)[number] | "walletConnect";

export function normalizeWalletConnectProjectId(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (HEX_PROJECT_ID.test(trimmed) || UUID_PROJECT_ID.test(trimmed)) return trimmed;
  return "";
}

export function firstWalletConnectProjectId(candidates: readonly unknown[]): string {
  for (const candidate of candidates) {
    const projectId = normalizeWalletConnectProjectId(candidate);
    if (projectId) return projectId;
  }
  return "";
}

export function walletConnectProjectIdFromEnv(env: object): string {
  const record = env as Record<string, unknown>;
  return firstWalletConnectProjectId(WALLET_CONNECT_PROJECT_ID_ENV_KEYS.map((key) => record[key]));
}

export function projectIdFromConfigPayload(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  return normalizeWalletConnectProjectId((payload as { projectId?: unknown }).projectId);
}

export function chooseWalletConnectProjectId(buildTime: unknown, runtimePayload: unknown): string {
  return normalizeWalletConnectProjectId(buildTime) || projectIdFromConfigPayload(runtimePayload);
}

export function evmConnectorPlan(projectId: unknown): EvmConnectorId[] {
  const plan: EvmConnectorId[] = [...BASE_EVM_CONNECTORS];
  if (normalizeWalletConnectProjectId(projectId)) plan.push("walletConnect");
  return plan;
}
