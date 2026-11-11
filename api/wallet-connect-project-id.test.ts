import { describe, expect, it } from "vitest";
import { readWalletConnectAssignments, walletConnectProjectIdFromSources } from "./lib/wallet-connect-build-env";
import {
  chooseWalletConnectProjectId,
  evmConnectorPlan,
  normalizeWalletConnectProjectId,
  walletConnectProjectIdFromEnv,
} from "../src/lib/wallet-connect-project-id";
import { walletConnectConfigResponse } from "../functions/api/wallet-connect-config";

const FIXTURE_UUID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const OTHER_UUID = "bbbbbbbb-cccc-4ddd-8eee-ffffffffffff";
const FIXTURE_HEX = "0123456789abcdef0123456789abcdef";
const NOT_A_PROJECT_ID = "sk_live_should_not_leak";

describe("WalletConnect project id", () => {
  it("accepts a UUID or 32 hex characters and ignores everything else", () => {
    expect(normalizeWalletConnectProjectId(`  ${FIXTURE_UUID}  `)).toBe(FIXTURE_UUID);
    expect(normalizeWalletConnectProjectId(FIXTURE_HEX)).toBe(FIXTURE_HEX);
    expect(normalizeWalletConnectProjectId(NOT_A_PROJECT_ID)).toBe("");
    expect(normalizeWalletConnectProjectId("")).toBe("");
    expect(normalizeWalletConnectProjectId(undefined)).toBe("");
  });

  it("prefers the Vite name and falls through to the Pages name", () => {
    expect(
      walletConnectProjectIdFromEnv({
        VITE_WALLETCONNECT_PROJECT_ID: FIXTURE_UUID,
        WALLETCONNECT_PROJECT_ID: OTHER_UUID,
      }),
    ).toBe(FIXTURE_UUID);

    expect(
      walletConnectProjectIdFromEnv({
        VITE_WALLETCONNECT_PROJECT_ID: "",
        WALLETCONNECT_PROJECT_ID: FIXTURE_UUID,
      }),
    ).toBe(FIXTURE_UUID);

    expect(
      walletConnectProjectIdFromEnv({
        VITE_WALLETCONNECT_PROJECT_ID: NOT_A_PROJECT_ID,
        WALLETCONNECT_PROJECT_ID: FIXTURE_HEX,
      }),
    ).toBe(FIXTURE_HEX);
  });

  it("uses the build-time id before a runtime payload", () => {
    expect(chooseWalletConnectProjectId(FIXTURE_UUID, { projectId: OTHER_UUID })).toBe(FIXTURE_UUID);
    expect(chooseWalletConnectProjectId("", { projectId: FIXTURE_UUID, APP_SECRET: "super-secret-value" })).toBe(FIXTURE_UUID);
    expect(chooseWalletConnectProjectId("", { projectId: NOT_A_PROJECT_ID })).toBe("");
    expect(chooseWalletConnectProjectId(NOT_A_PROJECT_ID, null)).toBe("");
  });

  it("adds WalletConnect to the EVM connector plan only when the id is valid", () => {
    expect(evmConnectorPlan("")).toEqual(["metaMask", "coinbaseWallet", "rainbow", "phantom", "backpack", "injected"]);
    expect(evmConnectorPlan(FIXTURE_UUID)).toEqual([
      "metaMask",
      "coinbaseWallet",
      "rainbow",
      "phantom",
      "backpack",
      "injected",
      "walletConnect",
    ]);
    expect(evmConnectorPlan(NOT_A_PROJECT_ID)).not.toContain("walletConnect");
  });

  it("reads only the project id keys from an env file", () => {
    const assignments = readWalletConnectAssignments(`
# comment
APP_SECRET=super-secret-value
export WALLETCONNECT_PROJECT_ID="${FIXTURE_UUID}" # publishable
STRIPE_SECRET_KEY=${NOT_A_PROJECT_ID}
`);
    expect(assignments).toEqual({ WALLETCONNECT_PROJECT_ID: FIXTURE_UUID });
    expect(JSON.stringify(assignments)).not.toContain("super-secret-value");
    expect(JSON.stringify(assignments)).not.toContain(NOT_A_PROJECT_ID);
  });

  it("lets a non-empty process env override env files, and ignores an empty process value", () => {
    const fileContents = {
      ".env": `WALLETCONNECT_PROJECT_ID=${FIXTURE_UUID}\n`,
      ".env.production": `VITE_WALLETCONNECT_PROJECT_ID=${OTHER_UUID}\n`,
      ".env../secrets": `VITE_WALLETCONNECT_PROJECT_ID=${OTHER_UUID}\n`,
    };

    expect(walletConnectProjectIdFromSources({ fileContents, mode: "production", processEnv: {} })).toBe(OTHER_UUID);
    expect(
      walletConnectProjectIdFromSources({
        fileContents,
        mode: "production",
        processEnv: { VITE_WALLETCONNECT_PROJECT_ID: "" },
      }),
    ).toBe(OTHER_UUID);
    expect(
      walletConnectProjectIdFromSources({
        fileContents,
        mode: "production",
        processEnv: { VITE_WALLETCONNECT_PROJECT_ID: FIXTURE_HEX },
      }),
    ).toBe(FIXTURE_HEX);
    expect(walletConnectProjectIdFromSources({ fileContents, mode: "../secrets", processEnv: {} })).toBe(FIXTURE_UUID);
    expect(
      walletConnectProjectIdFromSources({
        fileContents,
        mode: "production",
        processEnv: { VITE_WALLETCONNECT_PROJECT_ID: NOT_A_PROJECT_ID, WALLETCONNECT_PROJECT_ID: FIXTURE_UUID },
      }),
    ).toBe(FIXTURE_UUID);
  });

  it("returns a public config body that never echoes unrelated env values", async () => {
    const enabled = walletConnectConfigResponse({
      WALLETCONNECT_PROJECT_ID: FIXTURE_UUID,
      APP_SECRET: "super-secret-value",
      STRIPE_SECRET_KEY: NOT_A_PROJECT_ID,
    });
    expect(enabled.headers.get("cache-control")).toBe("no-store");
    const enabledBody = await enabled.json();
    expect(enabledBody).toEqual({ enabled: true, projectId: FIXTURE_UUID });
    expect(JSON.stringify(enabledBody)).not.toContain("super-secret-value");
    expect(JSON.stringify(enabledBody)).not.toContain(NOT_A_PROJECT_ID);

    const disabled = walletConnectConfigResponse({ WALLETCONNECT_PROJECT_ID: NOT_A_PROJECT_ID });
    const disabledText = await disabled.text();
    expect(JSON.parse(disabledText)).toEqual({ enabled: false });
    expect(disabledText).not.toContain(NOT_A_PROJECT_ID);
  });

});
