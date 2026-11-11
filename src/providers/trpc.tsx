import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";

export const trpc = createTRPCReact<AppRouter>();

function clearLegacyAuthStorage() {
  try {
    sessionStorage.removeItem("local_auth_token");
    localStorage.removeItem("local_auth_token");
    localStorage.removeItem("vault_auth_present");
  } catch (err) {
    console.error("Unable to clear legacy auth storage", err);
  }
}

clearLegacyAuthStorage();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      headers() {
        let sessionId: string | null = null;

        try {
          sessionId = localStorage.getItem("vault_session_id");
        } catch (err) {
          console.error("Unable to access session storage", err);
        }

        const headers: Record<string, string> = {
          "x-client-version": "vault-v3",
        };

        if (sessionId) {
          headers["x-session-id"] = sessionId;
        }

        return headers;
      },
      async fetch(input, init) {
        try {
          const response = await globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
            headers: {
              ...(init?.headers ?? {}),
              Accept: "application/json",
            },
          });

          if (response.status === 401) {
            clearLegacyAuthStorage();
          }

          return response;
        } catch (err) {
          console.error("TRPC network request failed", err);
          throw err;
        }
      },
    }),
  ],
});

export function TRPCProvider({ children }: { children: ReactNode }) {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}