import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");

function source(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

describe("WalletConnect build wiring", () => {
  it("defines the Pages project id into the Vite client bundle", () => {
    const viteConfig = source("vite.config.ts");
    expect(viteConfig).toContain("walletConnectProjectIdFromSources");
    expect(viteConfig).toContain("__VAULT_WALLETCONNECT_PROJECT_ID__");
    expect(viteConfig).toContain("vault-walletconnect-project-id");
    expect(viteConfig).not.toContain("console.log");
  });

  it("depends on the WalletConnect provider the connector imports at click time", () => {
    const pkg = JSON.parse(source("package.json")) as { dependencies: Record<string, string> };
    expect(pkg.dependencies["@walletconnect/ethereum-provider"]).toMatch(/^\^2\./);
    expect(pkg.dependencies["@coinbase/wallet-sdk"]).toBeTruthy();
    expect(pkg.dependencies["@metamask/connect-evm"]).toBeTruthy();
  });

  it("renders the storefront before the runtime project id lookup", () => {
    const main = source("src/main.tsx");
    const provider = source("src/providers/VaultWalletProvider.tsx");
    expect(main).not.toContain("resolveWalletConnectProjectId");
    expect(main).toContain("createRoot");
    expect(provider).toContain("resolveWalletConnectProjectId");
    expect(provider).toContain("upgradeWagmiConfig");
  });

  it("builds the WalletConnect connector from the shared plan", () => {
    const wagmi = source("src/lib/wagmi.ts");
    expect(wagmi).toContain("evmConnectorPlan");
    expect(wagmi).toContain("walletConnect(");
    expect(wagmi).toContain("initWagmiConfig");
  });

  it("forwards the Pages variable name into the GitHub Actions build", () => {
    const workflow = source(".github/workflows/deploy.yml");
    expect(workflow).toContain("WALLETCONNECT_PROJECT_ID: ${{ secrets.WALLETCONNECT_PROJECT_ID }}");
    expect(workflow).toContain("VITE_WALLETCONNECT_PROJECT_ID: ${{ secrets.VITE_WALLETCONNECT_PROJECT_ID }}");
  });
});
