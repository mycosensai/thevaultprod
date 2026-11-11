import {
  WALLET_CONNECT_PROJECT_ID_ENV_KEYS,
  walletConnectProjectIdFromEnv,
  type WalletConnectProjectIdEnvKey,
} from "../../src/lib/wallet-connect-project-id";

const ENV_KEY_SET = new Set<string>(WALLET_CONNECT_PROJECT_ID_ENV_KEYS);

function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  const quote = trimmed[0];
  if (quote === "\"" || quote === "'") {
    const end = trimmed.indexOf(quote, 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  const comment = trimmed.search(/\s+#/);
  return (comment === -1 ? trimmed : trimmed.slice(0, comment)).trim();
}

export function readWalletConnectAssignments(contents: string): Partial<Record<WalletConnectProjectIdEnvKey, string>> {
  const found: Partial<Record<WalletConnectProjectIdEnvKey, string>> = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
    const separator = normalized.indexOf("=");
    if (separator <= 0) continue;
    const key = normalized.slice(0, separator).trim();
    if (!ENV_KEY_SET.has(key)) continue;
    found[key as WalletConnectProjectIdEnvKey] = parseEnvValue(normalized.slice(separator + 1));
  }
  return found;
}

function safeMode(mode: string): string {
  return /^[A-Za-z0-9_-]+$/.test(mode) ? mode : "";
}

export function walletConnectEnvFileNames(mode: string): string[] {
  const modeName = safeMode(mode);
  return [".env", ".env.local", modeName ? `.env.${modeName}` : "", modeName ? `.env.${modeName}.local` : ""].filter(
    (name): name is string => Boolean(name),
  );
}

export function walletConnectProjectIdFromSources(options: {
  fileContents: Record<string, string | undefined>;
  mode: string;
  processEnv: Record<string, string | undefined>;
}): string {
  const merged: Partial<Record<WalletConnectProjectIdEnvKey, string>> = {};
  for (const fileName of walletConnectEnvFileNames(options.mode)) {
    const contents = options.fileContents[fileName];
    if (typeof contents !== "string") continue;
    Object.assign(merged, readWalletConnectAssignments(contents));
  }

  for (const key of WALLET_CONNECT_PROJECT_ID_ENV_KEYS) {
    const fromProcess = options.processEnv[key];
    if (typeof fromProcess === "string" && fromProcess.trim()) {
      merged[key] = fromProcess;
    }
  }

  return walletConnectProjectIdFromEnv(merged);
}
