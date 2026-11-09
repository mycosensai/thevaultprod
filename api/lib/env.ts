/**
 * Cloudflare Workers Environment
 * No dotenv, no process.env — bindings come from wrangler.toml / dashboard
 */

interface CloudflareEnv {
  APP_SECRET: string;
  APP_ID?: string;
  DATABASE_URL?: string;
  KIMI_AUTH_URL?: string;
  KIMI_OPEN_URL?: string;
  OWNER_UNION_ID?: string;
  STRIPE_SECRET_KEY?: string;
  VITE_STRIPE_PUBLISHABLE_KEY?: string;
  OPENAI_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  X_CLIENT_ID?: string;
  X_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  NODE_ENV?: string;
  VAULT_DOMAIN?: string;
  RESEND_API_KEY?: string;
  // Web3 Treasury
  SOLANA_TREASURY?: string;
  SOLANA_RPC_URL?: string;
  SOL_USD_RATE?: string;
  USDC_USD_RATE?: string;
  TREASURY_WALLET?: string;
  DB?: any;
}

let cfEnv: Partial<CloudflareEnv> = {};

/** Development-only ephemeral secret; production must set APP_SECRET. */
function devFallbackSecret(): string {
  return `dev-only-${globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2)}${Date.now()}`;
}

export function setCloudflareEnv(env: Record<string, unknown>) {
  cfEnv = { ...cfEnv, ...(env as any) };
  const nodeEnv = typeof cfEnv.NODE_ENV === "string" ? cfEnv.NODE_ENV : "";
  if (nodeEnv === "production" && !cfEnv.APP_SECRET) {
    throw new Error(
      "APP_SECRET is not configured: refusing to start in production without a JWT signing secret"
    );
  }
}

/** Fail-hard accessor: no hardcoded fallback secret exists. */
export function assertAppSecretConfigured(): void {
  if (!cfEnv.APP_SECRET) {
    const nodeEnv = typeof cfEnv.NODE_ENV === "string" ? cfEnv.NODE_ENV : "";
    if (nodeEnv === "production") {
      throw new Error("APP_SECRET is not configured: refusing to serve requests in production");
    }
    // Dev: seed an ephemeral random secret so nothing is hardcoded.
    cfEnv.APP_SECRET = devFallbackSecret();
  }
}

export const env = {
  get appId(): string { return cfEnv.APP_ID || ""; },
  get appSecret(): string {
    assertAppSecretConfigured();
    return cfEnv.APP_SECRET as string;
  },
  get isProduction(): boolean { return cfEnv.NODE_ENV === "production"; },
  get databaseUrl(): string { return cfEnv.DATABASE_URL || ""; },
  get kimiAuthUrl(): string { return cfEnv.KIMI_AUTH_URL || ""; },
  get kimiOpenUrl(): string { return cfEnv.KIMI_OPEN_URL || ""; },
  get ownerUnionId(): string { return cfEnv.OWNER_UNION_ID || ""; },
  get stripeSecretKey(): string { return cfEnv.STRIPE_SECRET_KEY || ""; },
  get stripePublishableKey(): string { return cfEnv.VITE_STRIPE_PUBLISHABLE_KEY || ""; },
  get openaiApiKey(): string { return cfEnv.OPENAI_API_KEY || ""; },
  get googleClientId(): string { return cfEnv.GOOGLE_CLIENT_ID || ""; },
  get googleClientSecret(): string { return cfEnv.GOOGLE_CLIENT_SECRET || ""; },
  get xClientId(): string { return cfEnv.X_CLIENT_ID || ""; },
  get xClientSecret(): string { return cfEnv.X_CLIENT_SECRET || ""; },
  get githubClientId(): string { return cfEnv.GITHUB_CLIENT_ID || ""; },
  get githubClientSecret(): string { return cfEnv.GITHUB_CLIENT_SECRET || ""; },
  get vaultDomain(): string { return cfEnv.VAULT_DOMAIN || ""; },
  get resendApiKey(): string { return cfEnv.RESEND_API_KEY || ""; },
  // Web3 Treasury
  get solanaTreasury(): string { return cfEnv.SOLANA_TREASURY || ""; },
  get solanaRpcUrl(): string { return cfEnv.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com"; },
  get solUsdRate(): string { return cfEnv.SOL_USD_RATE || ""; },
  get usdcUsdRate(): string { return cfEnv.USDC_USD_RATE || "1.00"; },
  get treasuryWallet(): string { return cfEnv.TREASURY_WALLET || ""; },
};