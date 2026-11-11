import {
  chooseWalletConnectProjectId,
  firstWalletConnectProjectId,
} from "@/lib/wallet-connect-project-id";

export function readBuildTimeWalletConnectProjectId(): string {
  const defined =
    typeof __VAULT_WALLETCONNECT_PROJECT_ID__ === "string" ? __VAULT_WALLETCONNECT_PROJECT_ID__ : "";
  return firstWalletConnectProjectId([
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
    import.meta.env.VITE_REOWN_PROJECT_ID,
    defined,
  ]);
}

async function fetchWalletConnectConfig(): Promise<unknown> {
  const response = await fetch("/api/wallet-connect-config", {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(2_500),
  });
  if (!response.ok) return null;
  return response.json() as Promise<unknown>;
}

export async function resolveWalletConnectProjectId(): Promise<string> {
  const buildTime = readBuildTimeWalletConnectProjectId();
  if (buildTime) return buildTime;
  try {
    return chooseWalletConnectProjectId("", await fetchWalletConnectConfig());
  } catch {
    return "";
  }
}
