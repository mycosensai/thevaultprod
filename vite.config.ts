import fs from "node:fs"
import path from "node:path"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig } from "vite"
import { walletConnectEnvFileNames, walletConnectProjectIdFromSources } from "./api/lib/wallet-connect-build-env"

function readWalletConnectEnvFiles(cwd: string, mode: string): Record<string, string | undefined> {
  const fileContents: Record<string, string | undefined> = {}
  for (const fileName of walletConnectEnvFileNames(mode)) {
    try {
      fileContents[fileName] = fs.readFileSync(path.join(cwd, fileName), "utf8")
    } catch {
      fileContents[fileName] = undefined
    }
  }
  return fileContents
}

function walletConnectProjectIdPlugin(projectId: string) {
  const replacement = JSON.stringify(projectId)
  return {
    name: "vault-walletconnect-project-id",
    enforce: "pre" as const,
    transform(code: string) {
      if (!code.includes("__VAULT_WALLETCONNECT_PROJECT_ID__")) return null
      return code.replaceAll("__VAULT_WALLETCONNECT_PROJECT_ID__", replacement)
    },
  }
}

export default defineConfig(({ mode }) => {
  const walletConnectProjectId = walletConnectProjectIdFromSources({
    fileContents: readWalletConnectEnvFiles(process.cwd(), mode),
    mode,
    processEnv: process.env,
  })

  return {
  plugins: [
    walletConnectProjectIdPlugin(walletConnectProjectId),
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: ".",
      filename: "sw.js",
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        id: "com.thevaultdfw.marketplace",
        name: "The Vault DFW",
        short_name: "The Vault",
        description: "Elite collector marketplace — buy, sell, appraise, and securely checkout rare collectibles.",
        start_url: "/",
        display: "standalone",
        orientation: "portrait-primary",
        background_color: "#080808",
        theme_color: "#C9A84C",
        categories: ["marketplace", "shopping", "collectibles"],
        lang: "en-US",
        dir: "ltr",
        prefer_related_applications: false,
        scope: "/",
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://localhost:8788",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      "@walletconnect/ethereum-provider",
      "@coinbase/wallet-sdk",
      "@metamask/connect-evm",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "./contracts"),
      "@db": path.resolve(__dirname, "./db"),
      "db": path.resolve(__dirname, "./db"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "esnext",
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          router: ["react-router"],
          trpc: ["@trpc/client", "@trpc/react-query"],
        },
      },
    },
  },
  define: {
    __VAULT_WALLETCONNECT_PROJECT_ID__: JSON.stringify(walletConnectProjectId),
  },
}})