/**
 * Reown / WalletConnect project ids are public client identifiers, 32 hex chars.
 * Anything else is rejected so a mis-named secret is not echoed to the browser.
 */
const WALLETCONNECT_PROJECT_ID_PATTERN = /^[a-f0-9]{32}$/i;

export function walletConnectProjectIdOrEmpty(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return WALLETCONNECT_PROJECT_ID_PATTERN.test(trimmed) ? trimmed : "";
}
